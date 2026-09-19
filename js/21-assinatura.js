document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    // ── 2. Menu Lateral no Celular (Hambúrguer) ──
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

    function mostrarMensagem(texto, tipo) {
        const el = document.getElementById('mensagemStatus');
        if (!el) return;
        el.className = `alert alert-${tipo}`; // tipo: 'success' | 'error'
        el.innerHTML = `<i class="bi ${tipo === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'}"></i> ${texto}`;
        el.hidden = false;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // ── 3. Carregar a Assinatura da Empresa ──
    // sem sessão, cai na empresa de exemplo pra não ficar vazio
    const sessao = JSON.parse(sessionStorage.getItem('usuarioLogado') || 'null');
    const empresaId = sessao && sessao.tipo === 'empresas' ? sessao.id : '0UEUrH8HgJE';

    const cardPlanoAtual = document.querySelector('.grid-2 .card:first-child');
    const tituloPlanoAtual = cardPlanoAtual ? cardPlanoAtual.querySelector('p:first-of-type') : null;
    const statusPlanoAtual = cardPlanoAtual ? cardPlanoAtual.querySelectorAll('p')[1] : null;
    const cobrancaPlanoAtual = cardPlanoAtual ? cardPlanoAtual.querySelectorAll('p')[2] : null;
    const cardsPlanos = document.querySelectorAll('.pricing-card, .grid-3 .card.stack-sm');

    let assinaturaAtual = null;

    function renderizarAssinatura(assinatura) {
        assinaturaAtual = assinatura;
        if (tituloPlanoAtual) tituloPlanoAtual.textContent = `Empresa ${assinatura.plano}`;
        if (statusPlanoAtual) statusPlanoAtual.textContent = `Status: ${assinatura.status}`;
        if (cobrancaPlanoAtual) {
            const dataFormatada = new Date(assinatura.proximaCobranca + 'T00:00:00').toLocaleDateString('pt-BR');
            cobrancaPlanoAtual.textContent = `Próxima cobrança: ${dataFormatada}`;
        }

        cardsPlanos.forEach(function (card) {
            const btn = card.querySelector('.btn-contratar');
            const nomePlano = card.querySelector('h3');
            if (!btn || !nomePlano) return;
            const ehPlanoAtual = nomePlano.textContent.trim() === assinatura.plano;
            btn.textContent = ehPlanoAtual ? 'Plano atual' : 'Contratar';
            btn.classList.toggle('btn-primary', !ehPlanoAtual);
        });
    }

    async function carregarAssinatura() {
        try {
            const res = await fetch(`${API_BASE}/assinaturas?empresaId=${empresaId}`);
            if (!res.ok) throw new Error('Falha ao carregar assinatura.');
            const assinaturas = await res.json();
            if (assinaturas.length) renderizarAssinatura(assinaturas[0]);
        } catch (erro) {
            console.error('Erro ao carregar assinatura:', erro);
        }
    }

    carregarAssinatura();

    // ── 4. Contratar Plano (grava via PATCH/POST) ──
    cardsPlanos.forEach(function (card) {
        const btn = card.querySelector('.btn-contratar');
        const nomePlano = card.querySelector('h3');
        const preco = card.querySelector('p');
        if (!btn || !nomePlano) return;

        btn.addEventListener('click', async function () {
            if (btn.textContent.trim() === 'Plano atual') return;

            const confirmou = confirm(`Confirmar contratação do plano ${nomePlano.textContent.trim()}?`);
            if (!confirmou) return;

            const textoOriginal = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner"></span> Processando...';

            const hoje = new Date();
            const proximaCobranca = new Date(hoje.getFullYear(), hoje.getMonth() + 1, hoje.getDate());
            const valorPlano = preco ? preco.textContent.trim().split('/')[0] : '';

            try {
                if (assinaturaAtual) {
                    const novoHistorico = (assinaturaAtual.historico || []).concat([
                        { data: hoje.toISOString().slice(0, 10), plano: nomePlano.textContent.trim(), valor: valorPlano, status: 'pago' }
                    ]);

                    const res = await fetch(`${API_BASE}/assinaturas/${assinaturaAtual.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            plano: nomePlano.textContent.trim(),
                            valor: valorPlano,
                            status: 'ativo',
                            proximaCobranca: proximaCobranca.toISOString().slice(0, 10),
                            historico: novoHistorico
                        })
                    });
                    if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
                    renderizarAssinatura(await res.json());
                } else {
                    const res = await fetch(`${API_BASE}/assinaturas`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            empresaId: empresaId,
                            plano: nomePlano.textContent.trim(),
                            valor: valorPlano,
                            status: 'ativo',
                            proximaCobranca: proximaCobranca.toISOString().slice(0, 10),
                            historico: [{ data: hoje.toISOString().slice(0, 10), plano: nomePlano.textContent.trim(), valor: valorPlano, status: 'pago' }]
                        })
                    });
                    if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
                    renderizarAssinatura(await res.json());
                }

                // Avisa a empresa sobre a cobrança confirmada.
                fetch(`${API_BASE}/notificacoes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        usuarioId: empresaId,
                        usuarioTipo: 'empresas',
                        tipo: 'pagamento',
                        titulo: 'Pagamento confirmado',
                        mensagem: `Pagamento de ${valorPlano} do plano ${nomePlano.textContent.trim()} confirmado. Próxima cobrança em ${proximaCobranca.toLocaleDateString('pt-BR')}.`,
                        lida: false,
                        criadoEm: hoje.toISOString(),
                        link: '/pages/21-assinatura.html'
                    })
                }).catch(function (erro) { console.error('Erro ao criar notificação de pagamento:', erro); });

                mostrarMensagem(`Plano ${nomePlano.textContent.trim()} contratado com sucesso!`, 'success');
            } catch (erro) {
                console.error('Erro ao contratar plano:', erro);
                mostrarMensagem('Não foi possível contratar o plano. Verifique se o json-server está rodando.', 'error');
                btn.innerHTML = textoOriginal;
            } finally {
                btn.disabled = false;
            }
        });
    });

    // ── 5. Ver Detalhes do Plano (modal informativo, sem lógica de pagamento) ──
    const modalDetalhe = document.getElementById('modal-detalhe-plano');
    const detalheNome = document.getElementById('detalhe-plano-nome');
    const detalhePreco = document.getElementById('detalhe-plano-preco');
    const detalheLista = document.getElementById('detalhe-plano-lista');
    const btnFecharDetalhe = document.getElementById('btn-fechar-detalhe-plano');
    const btnContratarDoDetalhe = document.getElementById('btn-contratar-do-detalhe');

    let cardDetalheAberto = null;

    function abrirDetalhePlano(card) {
        if (!modalDetalhe) return;
        cardDetalheAberto = card;

        const nomePlano = card.querySelector('h3');
        const preco = card.querySelector('p');
        const lista = card.querySelector('.pricing-features');
        const btnContratar = card.querySelector('.btn-contratar');

        if (detalheNome) detalheNome.textContent = nomePlano ? nomePlano.textContent.trim() : 'Plano';
        if (detalhePreco) detalhePreco.innerHTML = preco ? preco.innerHTML : '';
        if (detalheLista) detalheLista.innerHTML = lista ? lista.innerHTML : '';
        if (btnContratarDoDetalhe) {
            const ehPlanoAtual = btnContratar && btnContratar.textContent.trim() === 'Plano atual';
            btnContratarDoDetalhe.textContent = ehPlanoAtual ? 'Plano atual' : 'Contratar';
            btnContratarDoDetalhe.classList.toggle('btn-primary', !ehPlanoAtual);
        }

        modalDetalhe.style.display = 'flex';
    }

    function fecharDetalhePlano() {
        modalDetalhe.style.display = 'none';
        cardDetalheAberto = null;
    }

    document.querySelectorAll('.btn-ver-detalhes-plano').forEach(function (botao) {
        botao.addEventListener('click', function () {
            abrirDetalhePlano(botao.closest('.card'));
        });
    });

    if (btnFecharDetalhe) btnFecharDetalhe.addEventListener('click', fecharDetalhePlano);
    if (modalDetalhe) {
        modalDetalhe.addEventListener('click', function (e) {
            if (e.target === modalDetalhe) fecharDetalhePlano();
        });
    }

    // "Contratar" dentro do modal só delega pro botão real do card — mantém
    // uma única fonte de verdade pro fluxo de contratação (sem lógica nova aqui).
    if (btnContratarDoDetalhe) {
        btnContratarDoDetalhe.addEventListener('click', function () {
            if (!cardDetalheAberto) return;
            const btnContratarReal = cardDetalheAberto.querySelector('.btn-contratar');
            fecharDetalhePlano();
            if (btnContratarReal) btnContratarReal.click();
        });
    }
});
