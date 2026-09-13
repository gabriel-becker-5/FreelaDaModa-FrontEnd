document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    const API_BASE = 'http://localhost:3000';

    // ── 1. Alternador de Tema Claro / Escuro ──
    const themeToggle = document.querySelector('.theme-toggle');
    const htmlElement = document.documentElement;

    if (themeToggle) {
        themeToggle.addEventListener('click', function () {
            const atual = htmlElement.getAttribute('data-theme');
            htmlElement.setAttribute('data-theme', atual === 'dark' ? 'light' : 'dark');
        });
    }

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
            const btn = card.querySelector('button');
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
        const btn = card.querySelector('button');
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
                    renderizarAssinatura(await res.json());
                }

                alert(`Plano ${nomePlano.textContent.trim()} contratado com sucesso!`);
            } catch (erro) {
                console.error('Erro ao contratar plano:', erro);
                alert('Não foi possível contratar o plano. Verifique se o json-server está rodando.');
                btn.innerHTML = textoOriginal;
            } finally {
                btn.disabled = false;
            }
        });
    });
});
