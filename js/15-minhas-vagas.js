document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    // ── 2. Menu Lateral no Celular (Hambúrguer) ──
    // esta página não tem o botão no HTML, então os ifs abaixo só não quebram
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

    // ── 3. Proteção de Rota (só empresa logada) ──
    const sessao = JSON.parse(sessionStorage.getItem('usuarioLogado') || 'null');
    if (!sessao || sessao.tipo !== 'empresas') {
        // Sem sessão de empresa, não há vagas para listar; volta para o login.
        alert('Acesso restrito! Faça login com a conta da sua empresa.');
        window.location.href = '/pages/02-login.html';
        return;
    }

    // ── 4. Carregar Minhas Vagas ──
    const tbody = document.querySelector('table.table tbody');
    const paginationInfo = document.querySelector('.pagination span');
    const PAGE_SIZE = 5;

    let todasVagas = [];
    let paginaAtual = 1;

    function escapeHtml(str) {
        return String(str ?? '').replace(/[&<>"']/g, function (ch) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
        });
    }

    function classeBadgeStatus(status) {
        const statusNormalizado = (status || '').toLowerCase();
        if (statusNormalizado.includes('aberta') || statusNormalizado === 'ativa') return 'badge-success';
        if (statusNormalizado.includes('pausada')) return 'badge-warning';
        if (statusNormalizado.includes('encerrada')) return 'badge-danger';
        return 'badge-success';
    }

    function criarLinha(vaga) {
        const tr = document.createElement('tr');
        tr.dataset.id = vaga.id;
        tr.innerHTML = `
            <td data-label="ID"><strong>VG-${escapeHtml(vaga.id)}</strong></td>
            <td data-label="Título">${escapeHtml(vaga.titulo)}</td>
            <td data-label="Valor">${escapeHtml(vaga.valor || '—')}</td>
            <td data-label="Status"><span class="badge ${classeBadgeStatus(vaga.status)}">${escapeHtml(vaga.status || 'Aberta')}</span></td>
            <td data-label="Candidatos"><a href="/pages/17-candidatos-vaga.html" class="text-primary"><strong>—</strong></a></td>
            <td data-label="Ações">
                <div class="table-actions">
                    <a href="/pages/18-vaga-detalhe.html" class="btn btn-ghost" title="Ver Detalhes"><i class="bi bi-eye"></i></a>
                    <a href="/pages/13-editar-vaga.html" class="btn btn-ghost" title="Editar"><i class="bi bi-pencil"></i></a>
                    <button class="btn btn-ghost btnExcluir" title="Excluir"><i class="bi bi-trash" style="color: var(--danger);"></i></button>
                </div>
            </td>
        `;
        return tr;
    }

    function renderizarPagina() {
        if (!tbody) return;
        tbody.innerHTML = '';

        const inicio = (paginaAtual - 1) * PAGE_SIZE;
        const pagina = todasVagas.slice(inicio, inicio + PAGE_SIZE);

        if (pagina.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Nenhuma vaga encontrada.</td></tr>';
        } else {
            pagina.forEach(function (vaga) { tbody.appendChild(criarLinha(vaga)); });
        }

        if (paginationInfo) {
            const fim = Math.min(inicio + PAGE_SIZE, todasVagas.length);
            paginationInfo.textContent = todasVagas.length
                ? `Mostrando ${inicio + 1}-${fim} de ${todasVagas.length} vagas`
                : 'Nenhuma vaga publicada ainda.';
        }
    }

    async function carregarVagas() {
        try {
            const res = await fetch(`${API_BASE}/vagas?empresaId=${sessao.id}`);
            if (!res.ok) throw new Error('Falha ao carregar vagas.');
            todasVagas = await res.json();
            aplicarFiltros();
        } catch (erro) {
            console.error('Erro ao carregar minhas vagas:', erro);
            if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="text-center">Erro ao carregar vagas.</td></tr>';
        }
    }

    // ── 5. Filtros (status, título e ordenação) ──
    const formFiltros = document.getElementById('formFiltros');
    const selectStatus = document.getElementById('filtroStatus');
    const inputBusca = document.getElementById('buscaTitulo');
    const selectOrdenar = document.getElementById('ordenarPor');

    let vagasFiltradas = [];

    function aplicarFiltros() {
        const status = selectStatus ? selectStatus.value : 'todas';
        const termo = inputBusca ? inputBusca.value.toLowerCase().trim() : '';
        const ordenacao = selectOrdenar ? selectOrdenar.value : 'recentes';

        vagasFiltradas = todasVagas.filter(function (vaga) {
            const bateStatus = status === 'todas' || (vaga.status || '').toLowerCase() === status;
            const bateTermo = !termo || vaga.titulo.toLowerCase().includes(termo);
            return bateStatus && bateTermo;
        });

        if (ordenacao === 'valor') {
            vagasFiltradas.sort(function (a, b) {
                return parseFloat((b.valor || '0').replace(/\D/g, '')) - parseFloat((a.valor || '0').replace(/\D/g, ''));
            });
        }

        todasVagas = vagasFiltradas;
        paginaAtual = 1;
        renderizarPagina();
    }

    if (formFiltros) {
        formFiltros.addEventListener('submit', function (e) {
            e.preventDefault();
            aplicarFiltros();
        });
    }

    // ── 6. Paginação ──
    const botoesPagina = document.querySelectorAll('.pages .page-btn');
    botoesPagina.forEach(function (btn, indice) {
        btn.addEventListener('click', function () {
            botoesPagina.forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            paginaAtual = indice + 1;
            renderizarPagina();
        });
    });

    // ── 7. Excluir Vaga (modal de confirmação) ──
    const modalExcluir = document.getElementById('modalExcluir');
    const btnCancelarExclusao = document.getElementById('btnCancelarExclusao');
    const btnConfirmarExclusao = document.getElementById('btnConfirmarExclusao');
    let idParaExcluir = null;

    function abrirModalExclusao(id) {
        idParaExcluir = id;
        if (modalExcluir) modalExcluir.style.display = 'flex';
    }

    function fecharModalExclusao() {
        idParaExcluir = null;
        if (modalExcluir) modalExcluir.style.display = 'none';
    }

    if (tbody) {
        tbody.addEventListener('click', function (e) {
            const botaoExcluir = e.target.closest('.btnExcluir');
            if (!botaoExcluir) return;
            const linha = botaoExcluir.closest('tr');
            abrirModalExclusao(linha.dataset.id);
        });
    }

    if (btnCancelarExclusao) btnCancelarExclusao.addEventListener('click', fecharModalExclusao);

    if (btnConfirmarExclusao) {
        btnConfirmarExclusao.addEventListener('click', async function () {
            if (!idParaExcluir) return;
            try {
                const res = await fetch(`${API_BASE}/vagas/${idParaExcluir}`, { method: 'DELETE' });
                if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
            } catch (erro) {
                console.error('Erro ao excluir vaga:', erro);
                alert('Não foi possível excluir a vaga. Verifique se o json-server está rodando.');
                fecharModalExclusao();
                return;
            }
            todasVagas = todasVagas.filter(function (v) { return String(v.id) !== String(idParaExcluir); });
            renderizarPagina();
            fecharModalExclusao();
        });
    }

    carregarVagas();
});
