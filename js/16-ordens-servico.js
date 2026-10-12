// Ordens de Serviço (empresa)
//
// Integração com o back (Fase 2.2):
//   GET  /OrdemServico/listar            -> OS do usuário logado (o back já filtra)
//   POST /OrdemServico/{id}/concluir     -> só a empresa dona da OS
//   POST /OrdemServico/{id}/cancelar     -> empresa dona ou freelancer da OS
//
// Usa o helper api(caminho, opcoes) do api.js (Fase 0): o caminho é relativo ao API_BASE,
// o Bearer token é injetado, a resposta já vem sem o envelope (conteúdo de "dados") e,
// em erro, lança um Error com a mensagem do back (erro.status traz o código HTTP;
// em 401 o helper já redireciona para o login).

const API_URL_OS = '/OrdemServico';

const sessao = exigirTipo('empresas');
if (!sessao) {
    throw new Error('Sessão inválida');
}

renderizarSidebar(document.querySelector('.sidebar'), 'empresas', '16-ordens-servico');
renderizarTopbar(document.querySelector('#header-acoes'), sessao);
renderizarBannerValidacao(document.querySelector('.main'), sessao);

const loadingBar = document.querySelector('#perfil-loading');
const erroBar = document.querySelector('#perfil-erro');
const conteudoPerfil = document.querySelector('#perfil-conteudo');
const filtroTitulo = document.querySelector('#filtroTitulo');
const filtroStatus = document.querySelector('#filtroStatus');
const filtroOrdenar = document.querySelector('#filtroOrdenar');
const filtroCidade = document.querySelector('#filtroCidade');
const btnLimparFiltros = document.querySelector('#btnLimparFiltros');
const tbody = document.querySelector('#tbodyOS');
const msgEmpty = document.querySelector('#msg-empty');
const cardFiltros = document.querySelector('#cardFiltros');
const cardTabela = document.querySelector('#cardTabela');
const btnPaginaAnterior = document.querySelector('#btnPaginaAnterior');
const btnPaginaProxima = document.querySelector('#btnPaginaProxima');
const resumoPaginas = document.querySelector('#resumoPaginas');

const PAGE_SIZE = 10;

// Textos exatos de status aceitos pelo back.
const STATUS_EM_ANDAMENTO = 'Em andamento';
const STATUS_CONCLUIDA = 'Concluída';
const STATUS_CANCELADA = 'Cancelada';

let todasOS = [];
let osFiltradas = [];
let paginaAtual = 1;
let acaoEmAndamento = false;

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

/* ------------------------- badges ----------------------------------------- */

function classeBadgeStatus(status) {
    if (status === STATUS_CONCLUIDA) return 'badge-success';
    if (status === STATUS_CANCELADA) return 'badge-danger';
    return 'badge-warning';
}

/* ------------------------- valor ------------------------------------------ */

// O valor pode chegar como número (back) ou como texto "R$ 2.500,00" (mock).
function valorNumerico(valor) {
    if (typeof valor === 'number') return valor;
    return moedaParaNumero(valor);
}

function formatarValor(valor) {
    if (valor === null || valor === undefined || valor === '') return '—';
    if (typeof valor === 'number') {
        return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
    return valor;
}

/* ------------------------- carregar dados --------------------------------- */

async function carregarOrdens() {
    msgEmpty.hidden = true;
    loadingBar.removeAttribute('hidden');
    erroBar.setAttribute('hidden', '');
    conteudoPerfil.setAttribute('hidden', '');

    try {
        // O back já devolve só as OS do usuário logado (dono ou freelancer).
        const dados = await api(`${API_URL_OS}/listar`);

        if (Array.isArray(dados)) {
            todasOS = dados;
        } else if (dados && Array.isArray(dados.dados)) {
            todasOS = dados.dados;
        } else {
            todasOS = [];
        }

        loadingBar.setAttribute('hidden', '');
        conteudoPerfil.removeAttribute('hidden');

        // Sem nenhuma OS: exibe somente a mensagem em vermelho,
        // sem lista nem opção de pesquisa.
        if (todasOS.length === 0) {
            cardFiltros.hidden = true;
            cardTabela.hidden = true;
            msgEmpty.textContent = 'Você ainda não tem ordens de serviço.';
            msgEmpty.hidden = false;
            return;
        }

        cardFiltros.hidden = false;
        cardTabela.hidden = false;
        aplicarFiltros();
    } catch (erro) {
        console.error('Erro ao carregar ordens de serviço:', erro);
        loadingBar.setAttribute('hidden', '');
        erroBar.textContent = (erro && erro.message) || 'Não foi possível carregar as ordens de serviço.';
        erroBar.removeAttribute('hidden');
    }
}

/* ------------------------- ordenação -------------------------------------- */

function ordenarOS(lista) {
    const ordenacao = filtroOrdenar ? filtroOrdenar.value : 'recentes';

    if (ordenacao === 'valor') {
        lista.sort(function (a, b) {
            return valorNumerico(b.valor) - valorNumerico(a.valor);
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

    // "Mais recentes": o back não devolve data de criação da OS, então usa o id
    // (maior id primeiro).
    lista.sort(function (a, b) {
        return (Number(b.id) || 0) - (Number(a.id) || 0);
    });
}

/* ------------------------- filtros e render ------------------------------- */

function aplicarFiltros() {
    const termo = removerAcentos(filtroTitulo.value.trim().toLowerCase());
    const status = filtroStatus.value;
    const cidade = filtroCidade ? removerAcentos(filtroCidade.value.trim().toLowerCase()) : '';

    osFiltradas = todasOS.filter(function (os) {
        const bateTermo = !termo || removerAcentos(String(os.titulo || '')).toLowerCase().includes(termo);
        const bateStatus = !status || os.status === status;
        const bateCidade = !cidade || removerAcentos(String(os.cidade || '')).toLowerCase().includes(cidade);
        return bateTermo && bateStatus && bateCidade;
    });

    ordenarOS(osFiltradas);

    paginaAtual = 1;
    renderizarPagina();
}

function renderizarPagina() {
    const totalPaginas = Math.max(1, Math.ceil(osFiltradas.length / PAGE_SIZE));
    if (paginaAtual > totalPaginas) paginaAtual = totalPaginas;

    const inicio = (paginaAtual - 1) * PAGE_SIZE;
    const pagina = osFiltradas.slice(inicio, inicio + PAGE_SIZE);

    tbody.innerHTML = '';

    if (osFiltradas.length === 0) {
        msgEmpty.textContent = 'Nenhuma ordem de serviço encontrada para os filtros selecionados.';
        msgEmpty.hidden = false;
        cardTabela.hidden = true;
    } else {
        msgEmpty.hidden = true;
        cardTabela.hidden = false;
        pagina.forEach(preencherLinha);
    }

    const total = osFiltradas.length;
    const fim = Math.min(inicio + PAGE_SIZE, total);
    resumoPaginas.textContent = total > 0 ? `Mostrando ${inicio + 1}-${fim} de ${total}` : 'Mostrando 0 de 0';
    btnPaginaAnterior.disabled = paginaAtual <= 1;
    btnPaginaProxima.disabled = paginaAtual >= totalPaginas;
}

function preencherLinha(os) {
    const tr = document.createElement('tr');

    const tdTitulo = document.createElement('td');
    tdTitulo.textContent = os.titulo || '—';

    const tdFreelancer = document.createElement('td');
    if (os.freelancerId) {
        const linkFreelancer = document.createElement('a');
        linkFreelancer.href = `/pages/25-perfil-freelancer-publico.html?id=${encodeURIComponent(os.freelancerId)}`;
        linkFreelancer.className = 'text-primary';
        linkFreelancer.textContent = os.freelancerNome || '—';
        tdFreelancer.appendChild(linkFreelancer);
    } else {
        tdFreelancer.textContent = os.freelancerNome || '—';
    }

    const tdLocal = document.createElement('td');
    tdLocal.textContent = os.cidade || '—';

    const tdValor = document.createElement('td');
    tdValor.textContent = formatarValor(os.valor);

    const tdPrazo = document.createElement('td');
    tdPrazo.textContent = formatarData(os.prazo) || '—';

    const tdStatus = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = `badge ${classeBadgeStatus(os.status)}`;
    badge.textContent = os.status || '';
    tdStatus.appendChild(badge);

    const tdAcoes = document.createElement('td');
    const divAcoes = document.createElement('div');
    divAcoes.className = 'table-actions';

    const linkDetalhar = document.createElement('a');
    linkDetalhar.className = 'btn btn-primary';
    linkDetalhar.textContent = 'Detalhar';
    linkDetalhar.href = `/pages/19-ordem-servico-detalhe.html?id=${encodeURIComponent(os.id)}`;
    divAcoes.appendChild(linkDetalhar);

    // Concluir e Cancelar só existem enquanto a OS está Em andamento
    // (Concluída e Cancelada são estados finais no back).
    if (os.status === STATUS_EM_ANDAMENTO) {
        const botaoFinalizar = document.createElement('button');
        botaoFinalizar.type = 'button';
        botaoFinalizar.className = 'btn btn-outline';
        botaoFinalizar.style.color = '#d93025';
        botaoFinalizar.style.borderColor = '#ffc1bc';
        botaoFinalizar.innerHTML = '<i class="bi bi-check-circle"></i> Encerrar';
        botaoFinalizar.addEventListener('click', function () {
            alterarStatus(os, STATUS_CONCLUIDA);
        });
        divAcoes.appendChild(botaoFinalizar);

        const botaoCancelar = document.createElement('button');
        botaoCancelar.type = 'button';
        botaoCancelar.className = 'btn btn-danger';
        botaoCancelar.innerHTML = '<i class="bi bi-x-circle"></i> Cancelar';
        botaoCancelar.addEventListener('click', function () {
            alterarStatus(os, STATUS_CANCELADA);
        });
        divAcoes.appendChild(botaoCancelar);
    }

    tdAcoes.appendChild(divAcoes);

    tr.appendChild(tdTitulo);
    tr.appendChild(tdStatus);
    tr.appendChild(tdLocal);
    tr.appendChild(tdValor);
    tr.appendChild(tdPrazo);
    tr.appendChild(tdFreelancer);
    tr.appendChild(tdAcoes);

    tdTitulo.setAttribute('data-label', 'Título');
    tdStatus.setAttribute('data-label', 'Status');
    tdLocal.setAttribute('data-label', 'Local');
    tdValor.setAttribute('data-label', 'Valor');
    tdPrazo.setAttribute('data-label', 'Prazo');
    tdFreelancer.setAttribute('data-label', 'Freelancer');
    tdAcoes.setAttribute('data-label', 'Ações');

    tbody.appendChild(tr);
}

/* ------------------------- concluir / cancelar ---------------------------- */

async function alterarStatus(os, novoStatus) {
    if (acaoEmAndamento) return;

    const finalizando = novoStatus === STATUS_CONCLUIDA;
    const confirmou = await modalConfirmar({
        titulo: finalizando ? 'Finalizar ordem de serviço' : 'Cancelar ordem de serviço',
        mensagem: finalizando
            ? `Confirmar a finalização da OS "${os.titulo}"? Essa ação não poderá ser desfeita.`
            : `Deseja cancelar a OS "${os.titulo}"? Essa ação não poderá ser desfeita.`,
        textoConfirmar: finalizando ? 'Finalizar' : 'Cancelar',
        textoCancelar: 'Voltar',
        perigoso: !finalizando
    });
    if (!confirmou) return;

    acaoEmAndamento = true;
    const acao = finalizando ? 'concluir' : 'cancelar';
    let mensagemErro = '';

    try {
        // POST sem corpo; o back valida quem pode e se a OS ainda está Em andamento.
        await api(`${API_URL_OS}/${encodeURIComponent(os.id)}/${acao}`, { method: 'POST' });
        toastMsg(finalizando ? 'Ordem de serviço finalizada com sucesso.' : 'Ordem de serviço cancelada.', 'success');
    } catch (erro) {
        console.error('Erro ao atualizar status da ordem de serviço:', erro);
        mensagemErro = (erro && erro.message) || 'Não foi possível atualizar a ordem de serviço. Tente novamente em instantes.';
    } finally {
        acaoEmAndamento = false;
    }

    // Sucesso ou erro (inclusive 409, OS já concluída/cancelada): recarrega para
    // mostrar o estado real da OS.
    await carregarOrdens();

    if (mensagemErro) {
        erroBar.textContent = mensagemErro;
        erroBar.removeAttribute('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

/* ------------------------- eventos de filtro ------------------------------ */

filtroTitulo.addEventListener('input', aplicarFiltros);
filtroStatus.addEventListener('change', aplicarFiltros);
filtroOrdenar.addEventListener('change', aplicarFiltros);
if (filtroCidade) filtroCidade.addEventListener('input', aplicarFiltros);

btnLimparFiltros.addEventListener('click', function () {
    filtroTitulo.value = '';
    filtroStatus.value = '';
    filtroOrdenar.value = 'recentes';
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
    const totalPaginas = Math.ceil(osFiltradas.length / PAGE_SIZE);
    if (paginaAtual < totalPaginas) {
        paginaAtual++;
        renderizarPagina();
    }
});

carregarOrdens();