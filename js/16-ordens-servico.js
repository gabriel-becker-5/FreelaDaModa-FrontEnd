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

    // ── 3. Carregar Ordens de Serviço ──
    const loadingSkeleton = document.querySelector('.loading-skeleton');
    const emptyState = document.querySelector('.empty-state');
    const alertaErro = document.querySelector('.alert-error');
    const tabela = document.querySelector('table.table');
    const tbody = tabela ? tabela.querySelector('tbody') : null;

    let todasOrdens = [];

    function classeBadgeStatus(status) {
        if (status === 'Concluída') return 'badge-success';
        if (status === 'Cancelada') return 'badge-danger';
        return 'badge-warning';
    }

    function criarLinha(os) {
        const tr = document.createElement('tr');
        tr.dataset.id = os.id;
        tr.innerHTML = `
            <td data-label="Id">OS-${os.id}</td>
            <td data-label="Título">${os.titulo}</td>
            <td data-label="Freelancer">${os.freelancerNome || '—'}</td>
            <td data-label="Valor">${os.valor ? `R$ ${os.valor}` : '—'}</td>
            <td data-label="Status"><span class="badge ${classeBadgeStatus(os.status)}">${os.status}</span></td>
            <td data-label="Ações">
                <div class="table-actions">
                    <a href="/pages/19-ordem-servico-detalhe.html?id=${os.id}" class="btn btn-primary">Ver</a>
                    <a href="/pages/14-editar-os.html?id=${os.id}" class="btn">Editar</a>
                    <button class="btn btn-finalizar" type="button">Finalizar</button>
                    <button class="btn btn-danger btn-excluir" type="button">Excluir</button>
                </div>
            </td>
        `;
        return tr;
    }

    function renderizarOrdens(lista) {
        if (!tbody) return;
        tbody.innerHTML = '';

        if (lista.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        lista.forEach(function (os) {
            tbody.appendChild(criarLinha(os));
        });
    }

    async function carregarOrdens() {
        if (loadingSkeleton) loadingSkeleton.style.display = 'flex';
        if (emptyState) emptyState.style.display = 'none';
        if (alertaErro) alertaErro.style.display = 'none';

        try {
            const res = await fetch(`${API_BASE}/ordensServico`);
            if (!res.ok) throw new Error('Falha ao buscar ordens de serviço.');

            todasOrdens = await res.json();
            renderizarOrdens(todasOrdens);
        } catch (erro) {
            console.error('Erro ao carregar ordens de serviço:', erro);
            if (alertaErro) alertaErro.style.display = 'block';
        } finally {
            if (loadingSkeleton) loadingSkeleton.style.display = 'none';
        }
    }

    // ── 4. Filtros (busca, status e ordenação) ──
    const inputBusca = document.querySelector('.filters .input-grow, .filters input[placeholder]');
    const selectStatus = document.querySelectorAll('.filters select')[0];
    const selectOrdenar = document.querySelectorAll('.filters select')[1];
    const btnFiltrar = document.querySelector('.filters .btn-primary');

    function aplicarFiltros() {
        const termo = inputBusca ? inputBusca.value.toLowerCase().trim() : '';
        const status = selectStatus ? selectStatus.value : 'Status';
        const ordenacao = selectOrdenar ? selectOrdenar.value : 'Ordenar por';

        let filtradas = todasOrdens.filter(function (os) {
            const bateTermo = !termo || os.titulo.toLowerCase().includes(termo);
            const bateStatus = status === 'Status' || os.status === status;
            return bateTermo && bateStatus;
        });

        if (ordenacao === 'Valor') {
            filtradas = filtradas.slice().sort(function (a, b) { return Number(b.valor || 0) - Number(a.valor || 0); });
        } else if (ordenacao === 'Prazo') {
            filtradas = filtradas.slice().sort(function (a, b) { return new Date(a.prazo || 0) - new Date(b.prazo || 0); });
        } else if (ordenacao === 'Mais recentes') {
            filtradas = filtradas.slice().reverse();
        }

        renderizarOrdens(filtradas);
    }

    if (btnFiltrar) btnFiltrar.addEventListener('click', function (e) {
        e.preventDefault();
        aplicarFiltros();
    });

    // ── 5. Finalizar e Excluir (delegação de eventos no tbody) ──
    if (tbody) {
        tbody.addEventListener('click', async function (e) {
            const linha = e.target.closest('tr');
            if (!linha) return;
            const id = linha.dataset.id;

            if (e.target.closest('.btn-finalizar')) {
                if (!confirm('Confirmar a finalização desta ordem de serviço?')) return;
                try {
                    await fetch(`${API_BASE}/ordensServico/${id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'Concluída' })
                    });
                } catch (erro) {
                    console.error('Erro ao finalizar ordem de serviço:', erro);
                    return;
                }
                const badge = linha.querySelector('.badge');
                if (badge) {
                    badge.className = 'badge badge-success';
                    badge.textContent = 'Concluída';
                }
                const os = todasOrdens.find(function (o) { return String(o.id) === String(id); });
                if (os) os.status = 'Concluída';
                return;
            }

            if (e.target.closest('.btn-excluir')) {
                if (!confirm('Tem certeza que deseja excluir esta ordem de serviço?')) return;
                try {
                    await fetch(`${API_BASE}/ordensServico/${id}`, { method: 'DELETE' });
                } catch (erro) {
                    console.error('Erro ao excluir ordem de serviço:', erro);
                }
                todasOrdens = todasOrdens.filter(function (os) { return String(os.id) !== String(id); });
                linha.remove();
                if (todasOrdens.length === 0 && emptyState) emptyState.style.display = 'block';
            }
        });
    }

    carregarOrdens();
});
