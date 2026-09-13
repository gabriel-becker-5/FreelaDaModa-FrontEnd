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

    // ── 3. Carregar a Ordem de Serviço ──
    // sem ?id= na url, cai na primeira OS cadastrada
    const params = new URLSearchParams(window.location.search);
    const idOS = params.get('id');

    function formatarDataHora(iso) {
        if (!iso) return '—';
        const data = new Date(iso);
        if (isNaN(data)) return iso;
        return data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    function formatarData(str) {
        if (!str) return '—';
        const data = new Date(str + 'T00:00:00');
        return isNaN(data) ? str : data.toLocaleDateString('pt-BR');
    }

    function classeBadgeStatus(status) {
        if (status === 'Concluída') return 'badge-success';
        if (status === 'Cancelada') return 'badge-danger';
        return 'badge-warning';
    }

    let osAtual = null;

    function renderizarOS(os) {
        osAtual = os;

        document.getElementById('os-titulo').textContent = os.titulo;
        document.getElementById('os-id-display').textContent = `OS-${os.id}`;
        document.getElementById('os-categoria-display').textContent = os.categoria || '—';
        document.getElementById('os-modalidade-display').textContent = os.modalidade || '—';
        document.getElementById('os-empresa-display').textContent = os.empresaNome || '—';
        document.getElementById('os-local-display').textContent = [os.cidade, os.estado].filter(Boolean).join(' - ') || '—';
        document.getElementById('os-data-display').textContent = formatarDataHora(os.dataPublicacao);
        document.getElementById('os-valor-display').textContent = os.valor ? `R$ ${os.valor}` : '—';
        document.getElementById('os-descricao-display').textContent = os.descricao || '—';
        document.getElementById('os-requisitos-display').textContent = os.requisitos || '—';

        const habilidadesEl = document.getElementById('os-habilidades-display');
        habilidadesEl.innerHTML = (os.habilidades && os.habilidades.length)
            ? os.habilidades.map(function (h) { return `<span class="badge">${h}</span>`; }).join('')
            : '<span class="text-muted">Nenhuma habilidade cadastrada.</span>';

        const badgeStatus = document.getElementById('os-status-badge');
        badgeStatus.className = `badge ${classeBadgeStatus(os.status)}`;
        badgeStatus.textContent = os.status;

        document.getElementById('os-freelancer-display').textContent = os.freelancerNome || '—';
        document.getElementById('os-prazo-display').textContent = formatarData(os.prazo);
        document.getElementById('os-previsao-display').textContent = formatarData(os.previsaoConclusao);
        document.getElementById('os-avaliacao-freela-display').textContent = os.avaliacaoFreelancer || 'Pendente';
        document.getElementById('os-avaliacao-conf-display').textContent = os.avaliacaoConfeccao || 'Pendente';
        document.getElementById('os-observacoes-display').textContent = os.observacoes || '—';
        document.getElementById('os-briefing-display').textContent = os.referenciaBriefing || 'Nenhum arquivo anexado.';
        document.getElementById('os-entrega-display').textContent = os.referenciaEntrega || 'Nenhum arquivo anexado.';

        const timeline = document.getElementById('os-timeline');
        timeline.innerHTML = (os.historico && os.historico.length)
            ? os.historico.map(function (item) {
                return `<div class="timeline-item">${formatarData(item.data)} - ${item.evento}</div>`;
            }).join('')
            : '<div class="timeline-item">Nenhum evento registrado.</div>';

        const linkEditar = document.getElementById('os-link-editar');
        if (linkEditar) linkEditar.href = `/pages/14-editar-os.html?id=${os.id}`;
    }

    async function carregarOS() {
        try {
            if (idOS) {
                const res = await fetch(`${API_BASE}/ordensServico/${idOS}`);
                if (!res.ok) throw new Error('OS não encontrada.');
                renderizarOS(await res.json());
            } else {
                const res = await fetch(`${API_BASE}/ordensServico`);
                if (!res.ok) throw new Error('Falha ao carregar ordens de serviço.');
                const todas = await res.json();
                if (todas.length) renderizarOS(todas[0]);
            }
        } catch (erro) {
            console.error('Erro ao carregar Ordem de Serviço:', erro);
        }
    }

    carregarOS();

    // ── 4. Finalizar Ordem de Serviço ──
    const btnFinalizar = document.getElementById('btn-finalizar-os');

    if (btnFinalizar) {
        btnFinalizar.addEventListener('click', async function () {
            if (!osAtual) return;
            if (!confirm('Confirmar a finalização desta Ordem de Serviço?')) return;

            const textoOriginal = btnFinalizar.innerHTML;
            btnFinalizar.disabled = true;
            btnFinalizar.innerHTML = '<span class="spinner"></span> Finalizando...';

            try {
                const novoHistorico = (osAtual.historico || []).concat([
                    { data: new Date().toISOString().slice(0, 10), evento: 'OS finalizada pela empresa.' }
                ]);

                await fetch(`${API_BASE}/ordensServico/${osAtual.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'Concluída', historico: novoHistorico })
                });

                const badgeStatus = document.getElementById('os-status-badge');
                badgeStatus.className = 'badge badge-success';
                badgeStatus.textContent = 'Concluída';

                setTimeout(function () {
                    window.location.href = `/pages/23-avaliacao-os.html?id=${osAtual.id}`;
                }, 800);
            } catch (erro) {
                console.error('Erro ao finalizar Ordem de Serviço:', erro);
                btnFinalizar.disabled = false;
                btnFinalizar.innerHTML = textoOriginal;
                alert('Não foi possível finalizar a OS. Verifique se o json-server está rodando.');
            }
        });
    }
});
