document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    const sessao = exigirTipo('freelancers');
    if (!sessao) return;
    const freelancerId = sessao.id;

    renderizarSidebar(document.querySelector('.sidebar'), 'freelancers', '10-impulsionamento');
    renderizarTopbar(document.querySelector('#header-acoes'), sessao);
    renderizarBannerValidacao(document.querySelector('.main'), sessao);

    // ── Menu Lateral no Celular (Hambúrguer) ──
    const sidebarToggleBtn = document.querySelector('.sidebar-toggle-btn');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.querySelector('.sidebar-overlay');

    if (sidebarToggleBtn && sidebar && sidebarOverlay) {
        sidebarToggleBtn.addEventListener('click', function () {
            const abrindo = !sidebar.classList.contains('open');
            sidebar.classList.toggle('open', abrindo);
            sidebarOverlay.classList.toggle('open', abrindo);
            sidebarToggleBtn.setAttribute('aria-expanded', String(abrindo));
        });
        sidebarOverlay.addEventListener('click', function () {
            sidebar.classList.remove('open');
            sidebarOverlay.classList.remove('open');
            sidebarToggleBtn.setAttribute('aria-expanded', 'false');
        });
    }

    const cardPlanoAtual = document.querySelector('.grid-2 .card:first-child');
    const tituloPlanoAtual = cardPlanoAtual ? cardPlanoAtual.querySelectorAll('p')[0] : null;
    const cardProximaCobranca = document.querySelectorAll('.grid-2 .card')[1];
    const botoesAssinar = document.querySelectorAll('section.mt-md .card.stack-sm button');

    let impulsionamentoAtual = null;

    function mostrarMensagem(texto, tipo) {
        const el = document.getElementById('mensagemStatus');
        if (!el) return;
        el.className = `alert alert-${tipo}`;
        el.innerHTML = `<i class="bi ${tipo === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'}"></i> ${texto}`;
        el.hidden = false;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function renderizarImpulsionamento(registro) {
        impulsionamentoAtual = registro;
        if (tituloPlanoAtual) tituloPlanoAtual.textContent = registro.plano;

        if (cardProximaCobranca) {
            const paragrafo = cardProximaCobranca.querySelector('p');
            const badge = cardProximaCobranca.querySelector('.badge');
            if (paragrafo) {
                paragrafo.textContent = registro.plano === 'Free'
                    ? 'Sem cobrança ativa.'
                    : `Ativo desde ${new Date(registro.dataInicio + 'T00:00:00').toLocaleDateString('pt-BR')} — ${registro.valor}`;
            }
            if (badge) badge.textContent = registro.status === 'ativo' ? 'Ativo' : 'Inativo';
        }

        botoesAssinar.forEach(function (btn) {
            const nomePlano = btn.closest('.card').querySelector('h3').textContent.trim();
            btn.textContent = nomePlano === registro.plano ? 'Plano atual' : 'Assinar';
        });
    }

    async function carregarImpulsionamento() {
        try {
            const res = await fetch(`${API_BASE}/impulsionamentos?freelancerId=${encodeURIComponent(freelancerId)}`);
            if (!res.ok) throw new Error('Falha ao carregar impulsionamento.');
            const registros = await res.json();
            if (registros.length) renderizarImpulsionamento(registros[0]);
        } catch (erro) {
            console.error('Erro ao carregar impulsionamento:', erro);
        }
    }

    carregarImpulsionamento();

    // ── Assinar Plano de Impulsionamento (grava via PATCH/POST) ──
    botoesAssinar.forEach(function (btn) {
        const card = btn.closest('.card');
        const nomePlano = card.querySelector('h3');
        const preco = card.querySelector('p');
        if (!nomePlano) return;

        btn.addEventListener('click', async function () {
            if (btn.textContent.trim() === 'Plano atual') return;

            const planoNome = nomePlano.textContent.trim();

            const confirmou = await modalConfirmar({
                titulo: 'Confirmar assinatura',
                mensagem: `Deseja assinar o plano ${planoNome}?`,
                textoConfirmar: 'Assinar',
                textoCancelar: 'Cancelar'
            });
            if (!confirmou) return;

            const textoOriginal = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner"></span> Processando...';

            const hoje = new Date().toISOString().slice(0, 10);
            // Guarda somente o valor ("R$ 14,90"), sem o sufixo "/mês"
            const valorPlano = preco ? preco.textContent.trim().split('/')[0].trim() : '';

            try {
                if (impulsionamentoAtual) {
                    const res = await fetch(`${API_BASE}/impulsionamentos/${impulsionamentoAtual.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            plano: planoNome,
                            valor: valorPlano,
                            status: 'ativo',
                            dataInicio: hoje,
                            dataFim: null
                        })
                    });
                    if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
                    renderizarImpulsionamento(await res.json());
                } else {
                    const res = await fetch(`${API_BASE}/impulsionamentos`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            freelancerId: freelancerId,
                            plano: planoNome,
                            valor: valorPlano,
                            status: 'ativo',
                            dataInicio: hoje,
                            dataFim: null
                        })
                    });
                    if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
                    renderizarImpulsionamento(await res.json());
                }

                mostrarMensagem(`Plano ${planoNome} ativado! Seu perfil agora tem mais destaque no mural.`, 'success');
            } catch (erro) {
                console.error('Erro ao assinar impulsionamento:', erro);
                mostrarMensagem('Não foi possível ativar o plano. Tente novamente.', 'error');
                btn.innerHTML = textoOriginal;
            } finally {
                btn.disabled = false;
            }
        });
    });
});
