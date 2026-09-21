// Minhas Vagas publicadas (empresa)
const API_URL = `${API_BASE}/vagas`;

const sessao = exigirTipo('empresas');
if (!sessao) {
    throw new Error('Sessão inválida');
}

renderizarSidebar(document.querySelector('.sidebar'), 'empresas', '15-minhas-vagas');
renderizarTopbar(document.querySelector('#header-acoes'), sessao);
renderizarBannerValidacao(document.querySelector('.main'), sessao);

const loadingBar = document.querySelector('#perfil-loading');
const erroBar = document.querySelector('#perfil-erro');
const conteudoPerfil = document.querySelector('#perfil-conteudo');
const filtroTitulo = document.querySelector('#filtroTitulo');
const filtroStatus = document.querySelector('#filtroStatus');
const filtroOrdenar = document.querySelector('#filtroOrdenar');
const filtroEstado = document.querySelector('#filtroEstado');
const filtroCidade = document.querySelector('#filtroCidade');
const btnLimparFiltros = document.querySelector('#btnLimparFiltros');
const tbody = document.querySelector('#tbodyVagas');
const msgEmpty = document.querySelector('#msg-empty');
const cardFiltros = document.querySelector('#cardFiltros');
const cardTabela = document.querySelector('#cardTabela');
const btnPaginaAnterior = document.querySelector('#btnPaginaAnterior');
const btnPaginaProxima = document.querySelector('#btnPaginaProxima');
const resumoPaginas = document.querySelector('#resumoPaginas');

const PAGE_SIZE = 10;

let todasVagas = [];
let vagasFiltradas = [];
let paginaAtual = 1;
let contagemCandidatosPorVaga = {};

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

/* ------------------------- helpers de exibição ---------------------------- */

/* ------------------------- badges ----------------------------------------- */

function classeBadgeStatus(status) {
    const statusNormalizado = (status || '').toLowerCase();
    if (statusNormalizado.includes('pausada')) return 'badge-warning';
    if (statusNormalizado.includes('encerrada')) return 'badge-danger';
    return 'badge-success';
}

/* ------------------------- carregar dados --------------------------------- */

async function carregarVagas() {
    msgEmpty.hidden = true;
    loadingBar.removeAttribute('hidden');
    erroBar.setAttribute('hidden', '');
    conteudoPerfil.setAttribute('hidden', '');

    try {
        const [resVagas, resCandidaturas] = await Promise.all([
            fetch(`${API_URL}?empresaId=${encodeURIComponent(sessao.id)}`),
            fetch(`${API_BASE}/candidaturas?empresaId=${encodeURIComponent(sessao.id)}`)
        ]);
        if (!resVagas.ok) throw new Error('Erro ao carregar vagas.');

        todasVagas = await resVagas.json();

        contagemCandidatosPorVaga = {};
        if (resCandidaturas.ok) {
            const candidaturas = await resCandidaturas.json();
            candidaturas.forEach(function (candidatura) {
                if (!candidatura.vagaId) return;
                // Só candidaturas ativas (Em análise/Selecionado) contam;
                // canceladas/rejeitadas não inflam o número.
                if (candidatura.status !== 'Em análise' && candidatura.status !== 'Selecionado') return;
                contagemCandidatosPorVaga[candidatura.vagaId] = (contagemCandidatosPorVaga[candidatura.vagaId] || 0) + 1;
            });
        }

        loadingBar.setAttribute('hidden', '');
        conteudoPerfil.removeAttribute('hidden');

        if (todasVagas.length === 0) {
            cardFiltros.hidden = true;
            cardTabela.hidden = true;
            msgEmpty.textContent = 'Você ainda não publicou nenhuma vaga.';
            msgEmpty.hidden = false;
            return;
        }

        cardFiltros.hidden = false;
        cardTabela.hidden = false;
        aplicarFiltros();
    } catch (erro) {
        console.error('Erro ao carregar minhas vagas:', erro);
        loadingBar.setAttribute('hidden', '');
        erroBar.removeAttribute('hidden');
    }
}

/* ------------------------- ordenação -------------------------------------- */

function ordenarVagas(lista) {
    const ordenacao = filtroOrdenar ? filtroOrdenar.value : 'recentes';

    if (ordenacao === 'valor') {
        lista.sort(function (a, b) {
            return moedaParaNumero(b.valor) - moedaParaNumero(a.valor);
        });
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

    // "Mais recentes": por data de publicação (fallback: ordem da API).
    lista.sort(function (a, b) {
        const da = a.dataPublicacao ? new Date(a.dataPublicacao).getTime() : 0;
        const db_ = b.dataPublicacao ? new Date(b.dataPublicacao).getTime() : 0;
        return db_ - da;
    });
}

/* ------------------------- filtros e render ------------------------------- */

function aplicarFiltros() {
    const termo = removerAcentos(filtroTitulo.value.trim().toLowerCase());
    const status = filtroStatus.value;
    const uf = filtroEstado ? filtroEstado.value : '';
    const cidade = filtroCidade ? removerAcentos(filtroCidade.value.trim().toLowerCase()) : '';

    vagasFiltradas = todasVagas.filter(function (vaga) {
        const bateTermo = !termo || removerAcentos(String(vaga.titulo || '')).toLowerCase().includes(termo);
        const bateStatus = !status || String(vaga.status || '').toLowerCase() === status.toLowerCase();
        const bateUf = !uf || String(vaga.estado || '').toUpperCase() === uf.toUpperCase();
        const bateCidade = !cidade || removerAcentos(String(vaga.cidade || '')).toLowerCase().includes(cidade);
        return bateTermo && bateStatus && bateUf && bateCidade;
    });

    ordenarVagas(vagasFiltradas);

    paginaAtual = 1;
    renderizarPagina();
}

function renderizarPagina() {
    const totalPaginas = Math.max(1, Math.ceil(vagasFiltradas.length / PAGE_SIZE));
    if (paginaAtual > totalPaginas) paginaAtual = totalPaginas;

    const inicio = (paginaAtual - 1) * PAGE_SIZE;
    const pagina = vagasFiltradas.slice(inicio, inicio + PAGE_SIZE);

    tbody.innerHTML = '';

    if (vagasFiltradas.length === 0) {
        msgEmpty.textContent = 'Nenhuma vaga encontrada para os filtros selecionados.';
        msgEmpty.hidden = false;
        cardTabela.hidden = true;
    } else {
        msgEmpty.hidden = true;
        cardTabela.hidden = false;
        pagina.forEach(preencherLinha);
    }

    const total = vagasFiltradas.length;
    const fim = Math.min(inicio + PAGE_SIZE, total);
    resumoPaginas.textContent = total > 0 ? `Mostrando ${inicio + 1}-${fim} de ${total}` : 'Mostrando 0 de 0';
    btnPaginaAnterior.disabled = paginaAtual <= 1;
    btnPaginaProxima.disabled = paginaAtual >= totalPaginas;
}

function preencherLinha(vaga) {
    const tr = document.createElement('tr');
    const qtdCandidatos = contagemCandidatosPorVaga[vaga.id] || 0;

    const tdTitulo = document.createElement('td');
    tdTitulo.textContent = vaga.titulo;

    const tdValor = document.createElement('td');
    tdValor.textContent = vaga.valor || '—';

    const tdStatus = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = `badge ${classeBadgeStatus(vaga.status)}`;
    badge.textContent = vaga.status || 'Aberta';
    tdStatus.appendChild(badge);

    const tdCandidatos = document.createElement('td');
    const linkCandidatos = document.createElement('a');
    linkCandidatos.href = `/pages/17-candidatos-vaga.html?id=${encodeURIComponent(vaga.id)}`;
    linkCandidatos.className = 'text-primary';
    const strong = document.createElement('strong');
    strong.textContent = `${qtdCandidatos} candidato${qtdCandidatos === 1 ? '' : 's'}`;
    linkCandidatos.appendChild(strong);
    tdCandidatos.appendChild(linkCandidatos);

    const tdLocal = document.createElement('td');
    tdLocal.textContent = [vaga.cidade, vaga.estado].filter(Boolean).join(' - ') || '—';

    const tdPrazo = document.createElement('td');
    tdPrazo.textContent = formatarData(vaga.prazo) || '—';

    const tdPublicacao = document.createElement('td');
    tdPublicacao.textContent = formatarData(vaga.dataPublicacao) || '—';

    const tdAcoes = document.createElement('td');
    const divAcoes = document.createElement('div');
    divAcoes.className = 'table-actions';

    const linkDetalhes = document.createElement('a');
    linkDetalhes.href = `/pages/18-vaga-detalhe.html?id=${encodeURIComponent(vaga.id)}`;
    linkDetalhes.className = 'btn btn-primary';
    linkDetalhes.textContent = 'Detalhar';
    divAcoes.appendChild(linkDetalhes);

    const linkEditar = document.createElement('a');
    linkEditar.href = `/pages/13-editar-vaga.html?id=${encodeURIComponent(vaga.id)}`;
    linkEditar.className = 'btn btn-outline';
    linkEditar.textContent = 'Editar';
    divAcoes.appendChild(linkEditar);

    if (vaga.status !== 'Encerrada') {
        const botaoEncerrar = document.createElement('button');
        botaoEncerrar.type = 'button';
        botaoEncerrar.className = 'btn btn-outline';
        botaoEncerrar.style.color = '#d93025';
        botaoEncerrar.style.borderColor = '#ffc1bc';
        botaoEncerrar.innerHTML = '<i class="bi bi-x-circle"></i> Encerrar';
        botaoEncerrar.addEventListener('click', function () {
            encerrarVaga(vaga);
        });
        divAcoes.appendChild(botaoEncerrar);
    }

    tdAcoes.appendChild(divAcoes);

    tr.appendChild(tdTitulo);
    tr.appendChild(tdStatus);
    tr.appendChild(tdLocal);
    tr.appendChild(tdValor);
    tr.appendChild(tdPrazo);
    tr.appendChild(tdPublicacao);
    tr.appendChild(tdCandidatos);
    tr.appendChild(tdAcoes);

    tdTitulo.setAttribute('data-label', 'Título');
    tdStatus.setAttribute('data-label', 'Status');
    tdLocal.setAttribute('data-label', 'Local');
    tdValor.setAttribute('data-label', 'Valor');
    tdPrazo.setAttribute('data-label', 'Prazo');
    tdPublicacao.setAttribute('data-label', 'Publicação');
    tdCandidatos.setAttribute('data-label', 'Candidatos');
    tdAcoes.setAttribute('data-label', 'Ações');

    tbody.appendChild(tr);
}

/* ------------------------- encerrar vaga ---------------------------------- */

async function encerrarVaga(vaga) {
    const confirmou = await modalConfirmar({
        titulo: 'Encerrar vaga',
        mensagem: `Deseja encerrar a vaga "${vaga.titulo}"? Ela sairá do Mural de Vagas, mas o histórico será preservado.`,
        textoConfirmar: 'Encerrar',
        textoCancelar: 'Cancelar',
        perigoso: true
    });
    if (!confirmou) return;

    try {
        const res = await fetch(`${API_URL}/${vaga.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Encerrada' })
        });
        if (!res.ok) throw new Error('Falha ao encerrar vaga.');

        toastMsg('Vaga encerrada com sucesso.', 'success');
        carregarVagas();
    } catch (erro) {
        console.error('Erro ao encerrar vaga:', erro);
        erroBar.textContent = 'Não foi possível encerrar a vaga. Tente novamente em instantes.';
        erroBar.removeAttribute('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

/* ------------------------- eventos de filtro ------------------------------ */

filtroTitulo.addEventListener('input', aplicarFiltros);
filtroStatus.addEventListener('change', aplicarFiltros);
filtroOrdenar.addEventListener('change', aplicarFiltros);
if (filtroEstado) filtroEstado.addEventListener('change', aplicarFiltros);
if (filtroCidade) filtroCidade.addEventListener('input', aplicarFiltros);

btnLimparFiltros.addEventListener('click', function () {
    filtroTitulo.value = '';
    filtroStatus.value = '';
    filtroOrdenar.value = 'recentes';
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
    const totalPaginas = Math.ceil(vagasFiltradas.length / PAGE_SIZE);
    if (paginaAtual < totalPaginas) {
        paginaAtual++;
        renderizarPagina();
    }
});

carregarVagas();
