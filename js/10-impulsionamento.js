document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    const sessao = exigirTipo('freelancers');
    if (!sessao) return;
    const freelancerId = sessao.id;

    renderizarSidebar(document.querySelector('.sidebar'), 'freelancers', '10-impulsionamento');
    renderizarTopbar(document.querySelector('#header-acoes'), sessao);
    renderizarBannerValidacao(document.querySelector('.main'), sessao);
    configurarMenuMobile();

    const cardPlanoAtual = document.querySelector('.grid-2 .card:first-child');
    const tituloPlanoAtual = cardPlanoAtual ? cardPlanoAtual.querySelectorAll('p')[0] : null;
    const cardProximaCobranca = document.querySelectorAll('.grid-2 .card')[1];
    const containerPlanos = document.getElementById('planos-impulsionamento');

    let impulsionamentoAtual = null;

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

        containerPlanos.querySelectorAll('.card').forEach(function (card) {
            const btn = card.querySelector('button');
            const nomePlano = card.querySelector('h3').textContent.trim();
            if (!btn) return;
            btn.textContent = nomePlano === registro.plano ? 'Plano atual' : 'Assinar';
            btn.classList.toggle('btn-primary', nomePlano !== registro.plano);
        });
    }

    async function carregarImpulsionamento() {
        try {
            const res = await fetch(`${API_BASE}/impulsionamentos?freelancerId=${encodeURIComponent(freelancerId)}`);
            if (!res.ok) throw new Error('Falha ao carregar impulsionamento.');
            const registros = await res.json();
            if (registros.length) {
                // Prioriza um plano "ativo"; um registro antigo "inativo" não
                // pode ser exibido como "Plano atual".
                const ativo = registros.find(function (r) { return r.status === 'ativo'; });
                renderizarImpulsionamento(ativo || registros[registros.length - 1]);
            }
        } catch (erro) {
            console.error('Erro ao carregar impulsionamento:', erro);
        }
    }

    // Assinar Plano de Impulsionamento (grava via PATCH/POST).
    function configurarBotoesAssinar() {
        containerPlanos.querySelectorAll('.card button').forEach(function (btn) {
            const card = btn.closest('.card');
            const nomePlano = card.querySelector('h3');
            const preco = card.querySelector('p.preco-plano');
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

                const hoje = hojeLocalISO();
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
                    }

                    // Recarrega do banco (não depende do body da resposta, que pode
                    // vir vazio/204 no back real).
                    await carregarImpulsionamento();
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
    }

    // Carrega o catálogo de planos de impulsionamento a partir da API (fonte de
    // verdade) e renderiza os cards.
    async function carregarPlanos() {
        try {
            const res = await fetch(`${API_BASE}/planos?tipo=impulsionamento`);
            if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
            const planos = await res.json();

            containerPlanos.innerHTML = '';
            planos.forEach(function (plano) {
                const card = document.createElement('div');
                card.className = 'card stack-sm';

                const nome = document.createElement('h3');
                nome.textContent = plano.nome;

                const preco = document.createElement('p');
                preco.className = 'preco-plano';
                preco.style.cssText = 'font-size: 22px; font-weight: 800; color: var(--color-primary);';
                if (plano.valor) {
                    preco.textContent = `${plano.valor} /mês`;
                } else {
                    preco.textContent = 'Sob consulta';
                }

                const descricao = document.createElement('p');
                descricao.textContent = plano.descricao || '';

                const botao = document.createElement('button');
                botao.type = 'button';
                botao.className = 'btn btn-primary';
                botao.textContent = 'Assinar';

                card.appendChild(nome);
                card.appendChild(preco);
                card.appendChild(descricao);
                card.appendChild(botao);
                containerPlanos.appendChild(card);
            });

            configurarBotoesAssinar();
            carregarImpulsionamento();
        } catch (erro) {
            console.error('Erro ao carregar planos:', erro);
            containerPlanos.innerHTML = '<p style="color: var(--text-muted);">Não foi possível carregar os planos.</p>';
        }
    }

    carregarPlanos();
});
