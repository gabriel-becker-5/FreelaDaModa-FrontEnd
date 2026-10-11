// Minhas Candidaturas (Freelancer)

const sessao = exigirTipo('freelancers');
if (!sessao) {
    throw new Error('Sessão inválida');
}

renderizarSidebar(document.querySelector('.sidebar'), 'freelancers', '20-minhas-candidaturas');
renderizarTopbar(document.querySelector('#header-acoes'), sessao);
renderizarBannerValidacao(document.querySelector('.main'), sessao);

const loadingBar = document.querySelector('#perfil-loading');
const erroBar = document.querySelector('#perfil-erro');
const conteudoPerfil = document.querySelector('#perfil-conteudo');
const filtroTituloVaga = document.querySelector('#filterTituloVaga');
const filtroStatusVaga = document.querySelector('#filterStatusVaga');
const filtroOrdenar = document.querySelector('#filtroOrdenar');
const filtroEstado = document.querySelector('#filterEstado');
const filtroCidade = document.querySelector('#filterCidade');
const btnLimparFiltros = document.querySelector('#btnLimparFiltros');
const bodyLista = document.querySelector('tbody');
const mensagemVazio = document.querySelector('#msg-empty');
const cardFiltros = document.querySelector('#cardFiltros');
const cardTabela = document.querySelector('#cardTabela');
const btnPaginaAnterior = document.querySelector('#btnPaginaAnterior');
const btnPaginaProxima = document.querySelector('#btnPaginaProxima');
const resumoPaginas = document.querySelector('#resumoPaginas');

const PAGE_SIZE = 10;

let todasCandidaturas = [];
let itensFiltrados = [];
let paginaAtual = 1;

// Cache em memória por candidatura -> vaga/empresa, para não repetir
// chamadas quando a mesma vaga/empresa aparece em mais de uma candidatura.
const cacheVagas = {}; // vagaId (string) -> vaga mapeada (mapVaga) | null se falhou
const cacheNomesEmpresa = {}; // empresaId (string) -> nome | 'Empresa'

/* ------------------------- menu mobile ------------------------------------ */

const sidebarToggleBtn = document.querySelector('.sidebar-toggle-btn');
const sidebar = document.querySelector('.sidebar');
const sidebarOverlay = document.querySelector('.sidebar-overlay');

function abrirMenu() {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('open');
    sidebarToggleBtn.classList.add('open');
    sidebarToggleBtn.setAttribute('aria-expanded', 'true');
}

function fecharMenu() {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('open');
    sidebarToggleBtn.classList.remove('open');
    sidebarToggleBtn.setAttribute('aria-expanded', 'false');
}

sidebarToggleBtn.addEventListener('click', () => {
    sidebar.classList.contains('open') ? fecharMenu() : abrirMenu();
});
sidebarOverlay.addEventListener('click', fecharMenu);

/* ------------------------- filtros de localidade -------------------------- */

if (filtroEstado) carregarUFs(filtroEstado);
if (filtroEstado && filtroCidade) montarAutocompleteCidade(filtroCidade, filtroEstado);

/* ------------------------- enriquecer com dados da vaga -------------------- */

// GET /User/candidaturas/minhas só devolve id/vagaId/tituloVaga/status/data/
// mensagem — empresa, cidade, estado, valor e prazo vêm da vaga (GET /vagas/{id})
// e do perfil público da empresa (GET /Company/exibirPerfilPublicoEmpresa).
async function buscarVaga(vagaId) {
    if (cacheVagas[vagaId] !== undefined) return cacheVagas[vagaId];
    try {
        const vagaBack = await api(`/vagas/${encodeURIComponent(vagaId)}`, { semRedirect: true });
        cacheVagas[vagaId] = mapVaga(vagaBack);
    } catch (erro) {
        // Vaga excluída (404) ou outra falha: a candidatura continua aparecendo
        // com o que já se tem (tituloVaga/status/data), e "—" nas colunas que
        // dependem da vaga.
        console.error(`Erro ao buscar a vaga ${vagaId}:`, erro);
        cacheVagas[vagaId] = null;
    }
    return cacheVagas[vagaId];
}

async function buscarNomeEmpresa(empresaId) {
    if (cacheNomesEmpresa[empresaId] !== undefined) return cacheNomesEmpresa[empresaId];
    try {
        const perfil = await api(`/Company/exibirPerfilPublicoEmpresa?userId=${encodeURIComponent(empresaId)}`, { semRedirect: true });
        cacheNomesEmpresa[empresaId] = (perfil && perfil.companyName) || 'Empresa';
    } catch (erro) {
        console.error(`Erro ao buscar nome da empresa ${empresaId}:`, erro);
        cacheNomesEmpresa[empresaId] = 'Empresa';
    }
    return cacheNomesEmpresa[empresaId];
}

// Busca as vagas e os nomes das empresas (uma chamada por id distinto, em
// paralelo, com Promise.allSettled) e devolve as candidaturas já com os
// campos que a tabela usa. Uma vaga/empresa que falhar nunca derruba as
// demais nem a lista inteira — só aquela linha fica com "—".
async function enriquecerCandidaturas(candidaturasBack) {
    const vagaIdsUnicos = Array.from(new Set(candidaturasBack.map(function (c) { return String(c.vagaId); }).filter(Boolean)));
    await Promise.allSettled(vagaIdsUnicos.map(buscarVaga));

    const empresaIdsUnicos = Array.from(new Set(
        vagaIdsUnicos
            .map(function (id) { return cacheVagas[id] && cacheVagas[id].empresaId; })
            .filter(Boolean)
            .map(String)
    ));
    await Promise.allSettled(empresaIdsUnicos.map(buscarNomeEmpresa));

    return candidaturasBack.map(function (c) {
        const vaga = cacheVagas[String(c.vagaId)] || null;
        const empresaId = vaga ? vaga.empresaId : null;

        return {
            id: c.id,
            vagaId: c.vagaId,
            titulo: (vaga && vaga.titulo) || c.tituloVaga || 'Vaga',
            status: mapStatusCandidatura(c.status),
            empresaId: empresaId || null,
            empresaNome: empresaId ? (cacheNomesEmpresa[String(empresaId)] || 'Empresa') : '',
            cidade: vaga ? (vaga.cidade || '') : '',
            estado: vaga ? (vaga.estado || '') : '',
            valor: vaga && vaga.valor != null ? Number(vaga.valor) : null,
            prazo: vaga ? (vaga.prazoConclusao || null) : null,
            dataCandidatura: c.dataCandidatura
        };
    });
}

/* ------------------------- carregar dados --------------------------------- */

async function carregarDadosFreelancer() {
    mensagemVazio.hidden = true;
    loadingBar.removeAttribute('hidden');
    erroBar.setAttribute('hidden', '');
    conteudoPerfil.setAttribute('hidden', '');

    try {
        const candidaturasBack = await api('/User/candidaturas/minhas');
        const lista = Array.isArray(candidaturasBack) ? candidaturasBack : [];

        todasCandidaturas = await enriquecerCandidaturas(lista);

        loadingBar.setAttribute('hidden', '');
        conteudoPerfil.removeAttribute('hidden');

        // Sem nenhuma candidatura: exibe somente a mensagem, sem filtros nem tabela.
        if (todasCandidaturas.length === 0) {
            cardFiltros.hidden = true;
            cardTabela.hidden = true;
            mensagemVazio.textContent = 'Você ainda não tem candidaturas.';
            mensagemVazio.hidden = false;
            return;
        }

        cardFiltros.hidden = false;
        cardTabela.hidden = false;
        aplicarFiltros();
    } catch (erro) {
        console.error('Erro ao carregar candidaturas:', erro);
        loadingBar.setAttribute('hidden', '');
        erroBar.textContent = erro.message || 'Não foi possível carregar as candidaturas. Tente novamente mais tarde.';
        erroBar.removeAttribute('hidden');
    }
}

/* ------------------------- filtros e render ------------------------------- */

function ordenarCandidaturas(lista) {
    const ordenacao = filtroOrdenar ? filtroOrdenar.value : 'recentes';

    if (ordenacao === 'valor') {
        // valor já é número (orcamento da vaga) — compara direto.
        lista.sort(function (a, b) { return (b.valor || 0) - (a.valor || 0); });
        return;
    }

    if (ordenacao === 'prazo') {
        lista.sort(function (a, b) {
            const da = a.prazo ? new Date(a.prazo).getTime() : NaN;
            const db_ = b.prazo ? new Date(b.prazo).getTime() : NaN;
            const va = isNaN(da) ? Infinity : da;
            const vb = isNaN(db_) ? Infinity : db_;
            return va - vb;
        });
        return;
    }

    // "Mais recentes": por data da candidatura desc, desempate por id desc.
    lista.sort(function (a, b) {
        const da = a.dataCandidatura ? new Date(a.dataCandidatura).getTime() : 0;
        const db_ = b.dataCandidatura ? new Date(b.dataCandidatura).getTime() : 0;
        if (db_ !== da) return db_ - da;
        return (Number(b.id) || 0) - (Number(a.id) || 0);
    });
}

function aplicarFiltros() {
    const termo = removerAcentos(filtroTituloVaga.value.trim().toLowerCase());
    const status = filtroStatusVaga.value;
    const uf = filtroEstado ? filtroEstado.value : '';
    const cidade = filtroCidade ? removerAcentos(filtroCidade.value.trim().toLowerCase()) : '';

    itensFiltrados = todasCandidaturas.filter(function (candidatura) {
        const bateTermo = !termo || removerAcentos(String(candidatura.titulo || '')).toLowerCase().includes(termo);
        const bateStatus = !status || candidatura.status === status;
        const bateUf = !uf || String(candidatura.estado || '').toUpperCase() === uf.toUpperCase();
        const bateCidade = !cidade || removerAcentos(String(candidatura.cidade || '')).toLowerCase().includes(cidade);
        return bateTermo && bateStatus && bateUf && bateCidade;
    });

    ordenarCandidaturas(itensFiltrados);

    paginaAtual = 1;
    renderizarPagina();
}

function renderizarPagina() {
    const totalPaginas = Math.max(1, Math.ceil(itensFiltrados.length / PAGE_SIZE));
    if (paginaAtual > totalPaginas) paginaAtual = totalPaginas;

    const inicio = (paginaAtual - 1) * PAGE_SIZE;
    const pagina = itensFiltrados.slice(inicio, inicio + PAGE_SIZE);

    bodyLista.innerHTML = '';

    if (itensFiltrados.length === 0) {
        mensagemVazio.textContent = 'Nenhuma candidatura encontrada para os filtros selecionados.';
        mensagemVazio.hidden = false;
        cardTabela.hidden = true;
    } else {
        mensagemVazio.hidden = true;
        cardTabela.hidden = false;
        pagina.forEach(preencherLinha);
    }

    const total = itensFiltrados.length;
    const fim = Math.min(inicio + PAGE_SIZE, total);
    resumoPaginas.textContent = total > 0 ? `Mostrando ${inicio + 1}-${fim} de ${total}` : 'Mostrando 0 de 0';
    btnPaginaAnterior.disabled = paginaAtual <= 1;
    btnPaginaProxima.disabled = paginaAtual >= totalPaginas;
}

function obterClasseBadgeStatus(status) {
    if (status === 'Em análise') return 'badge-warning';
    if (status === 'Rejeitado') return 'badge-danger';
    if (status === 'Selecionado') return 'badge-success';
    return 'badge';
}

function preencherLinha(candidatura) {
    const tableRow = document.createElement('tr');

    const tdTitulo = document.createElement('td');
    tdTitulo.textContent = candidatura.titulo;

    const tdEmpresa = document.createElement('td');
    if (candidatura.empresaId) {
        const linkEmpresa = document.createElement('a');
        linkEmpresa.href = `/pages/26-perfil-empresa-publico.html?id=${encodeURIComponent(candidatura.empresaId)}`;
        linkEmpresa.className = 'text-primary';
        linkEmpresa.textContent = candidatura.empresaNome || 'Empresa';
        tdEmpresa.appendChild(linkEmpresa);
    } else {
        tdEmpresa.textContent = '—';
    }

    const tdLocal = document.createElement('td');
    tdLocal.textContent = [candidatura.cidade, candidatura.estado].filter(Boolean).join(' - ') || '—';

    const tdValor = document.createElement('td');
    tdValor.textContent = candidatura.valor != null ? formatarMoeda(candidatura.valor) : '—';

    const tdPrazo = document.createElement('td');
    tdPrazo.textContent = candidatura.prazo ? formatarData(candidatura.prazo) : '—';

    const tdDataCandidatura = document.createElement('td');
    tdDataCandidatura.textContent = candidatura.dataCandidatura ? formatarData(candidatura.dataCandidatura) : '—';

    const tdStatus = document.createElement('td');
    const badgeStatus = document.createElement('span');
    badgeStatus.className = `badge ${obterClasseBadgeStatus(candidatura.status)}`;
    badgeStatus.textContent = candidatura.status;
    tdStatus.appendChild(badgeStatus);

    // O back não tem endpoint para cancelar candidatura — só o botão
    // "Detalhar" permanece nesta coluna.
    const tdAcoes = document.createElement('td');
    const divAcoes = document.createElement('div');
    divAcoes.className = 'table-actions';

    const botaoDetalhar = document.createElement('a');
    botaoDetalhar.className = 'btn btn-primary';
    botaoDetalhar.textContent = 'Detalhar';
    botaoDetalhar.href = `/pages/18-vaga-detalhe.html?id=${encodeURIComponent(candidatura.vagaId)}`;
    divAcoes.appendChild(botaoDetalhar);

    tdAcoes.appendChild(divAcoes);
    tableRow.appendChild(tdTitulo);
    tableRow.appendChild(tdStatus);
    tableRow.appendChild(tdEmpresa);
    tableRow.appendChild(tdLocal);
    tableRow.appendChild(tdValor);
    tableRow.appendChild(tdPrazo);
    tableRow.appendChild(tdDataCandidatura);
    tableRow.appendChild(tdAcoes);

    tdTitulo.setAttribute('data-label', 'Título');
    tdStatus.setAttribute('data-label', 'Status');
    tdEmpresa.setAttribute('data-label', 'Empresa');
    tdLocal.setAttribute('data-label', 'Local');
    tdValor.setAttribute('data-label', 'Valor');
    tdPrazo.setAttribute('data-label', 'Prazo');
    tdDataCandidatura.setAttribute('data-label', 'Data Candidatura');
    tdAcoes.setAttribute('data-label', 'Ações');

    bodyLista.appendChild(tableRow);
}

/* ------------------------- eventos de filtro ------------------------------ */

filtroTituloVaga.addEventListener('input', aplicarFiltros);
filtroStatusVaga.addEventListener('change', aplicarFiltros);
if (filtroOrdenar) filtroOrdenar.addEventListener('change', aplicarFiltros);
if (filtroEstado) filtroEstado.addEventListener('change', aplicarFiltros);
if (filtroCidade) filtroCidade.addEventListener('input', aplicarFiltros);

btnLimparFiltros.addEventListener('click', function () {
    filtroTituloVaga.value = '';
    filtroStatusVaga.value = '';
    if (filtroOrdenar) filtroOrdenar.value = 'recentes';
    if (filtroEstado) filtroEstado.value = '';
    if (filtroCidade) filtroCidade.value = '';
    aplicarFiltros();
});

btnPaginaAnterior.addEventListener('click', function () {
    if (paginaAtual > 1) {
        paginaAtual--;
        renderizarPagina();
    }
});

btnPaginaProxima.addEventListener('click', function () {
    const totalPaginas = Math.ceil(itensFiltrados.length / PAGE_SIZE);
    if (paginaAtual < totalPaginas) {
        paginaAtual++;
        renderizarPagina();
    }
});

/* ------------------------- iniciar ----------------------------------------- */

carregarDadosFreelancer();
