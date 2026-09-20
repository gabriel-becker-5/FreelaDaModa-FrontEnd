// Ordens de Serviço (empresa) — padrão da 15-minhas-vagas / 29-minhas-os

const API_URL_OS = `${API_BASE}/ordensServico`;

const sessao = exigirTipo('empresas');
if (!sessao) {
    throw new Error('Sessão inválida');
}
let token;

renderizarSidebar(document.querySelector('.sidebar'), 'empresas', '16-ordens-servico');
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
const tbody = document.querySelector('#tbodyOS');
const msgEmpty = document.querySelector('#msg-empty');
const cardFiltros = document.querySelector('#cardFiltros');
const cardTabela = document.querySelector('#cardTabela');
const btnPaginaAnterior = document.querySelector('#btnPaginaAnterior');
const btnPaginaProxima = document.querySelector('#btnPaginaProxima');
const resumoPaginas = document.querySelector('#resumoPaginas');

const PAGE_SIZE = 10;

let todasOS = [];
let osFiltradas = [];
let paginaAtual = 1;

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

/* ------------------------- badges ----------------------------------------- */

function formatarData(str) {
    if (!str) return '—';
    const data = new Date(str + 'T00:00:00');
    return isNaN(data.getTime()) ? str : data.toLocaleDateString('pt-BR');
}

function classeBadgeStatus(status) {
    if (status === 'Concluída') return 'badge-success';
    if (status === 'Cancelada') return 'badge-danger';
    return 'badge-warning';
}

/* ------------------------- carregar dados --------------------------------- */

async function carregarOrdens() {
    msgEmpty.hidden = true;
    loadingBar.removeAttribute('hidden');
    erroBar.setAttribute('hidden', '');
    conteudoPerfil.setAttribute('hidden', '');

    try {
        const resposta = await fetch(`${API_URL_OS}?empresaId=${encodeURIComponent(sessao.id)}`);
        if (!resposta.ok) throw new Error(`Erro HTTP: ${resposta.status}`);

        todasOS = await resposta.json();

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
        erroBar.removeAttribute('hidden');
    }
}

/* ------------------------- ordenação -------------------------------------- */

function ordenarOS(lista) {
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

    osFiltradas = todasOS.filter(function (os) {
        const bateTermo = !termo || removerAcentos(String(os.titulo || '')).toLowerCase().includes(termo);
        const bateStatus = !status || os.status === status;
        const bateUf = !uf || String(os.estado || '').toUpperCase() === uf.toUpperCase();
        const bateCidade = !cidade || removerAcentos(String(os.cidade || '')).toLowerCase().includes(cidade);
        return bateTermo && bateStatus && bateUf && bateCidade;
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
    tdLocal.textContent = [os.cidade, os.estado].filter(Boolean).join(' - ') || '—';

    const tdValor = document.createElement('td');
    tdValor.textContent = os.valor || '—';

    const tdPrazo = document.createElement('td');
    tdPrazo.textContent = formatarData(os.prazo) || '—';

    const tdDataInicio = document.createElement('td');
    tdDataInicio.textContent = formatarData(os.dataPublicacao) || '—';

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
    linkDetalhar.textContent = 'Ver';
    linkDetalhar.href = `/pages/19-ordem-servico-detalhe.html?id=${encodeURIComponent(os.id)}`;
    divAcoes.appendChild(linkDetalhar);

    const linkEditar = document.createElement('a');
    linkEditar.className = 'btn';
    linkEditar.textContent = 'Editar';
    linkEditar.href = `/pages/14-editar-os.html?id=${encodeURIComponent(os.id)}`;
    divAcoes.appendChild(linkEditar);

    if (os.status === 'Em andamento') {
        const botaoFinalizar = document.createElement('button');
        botaoFinalizar.type = 'button';
        botaoFinalizar.className = 'btn btn-outline';
        botaoFinalizar.innerHTML = '<i class="bi bi-check-circle"></i> Finalizar';
        botaoFinalizar.addEventListener('click', function () {
            alterarStatus(os, 'Concluída');
        });
        divAcoes.appendChild(botaoFinalizar);

        const botaoCancelar = document.createElement('button');
        botaoCancelar.type = 'button';
        botaoCancelar.className = 'btn btn-danger';
        botaoCancelar.innerHTML = '<i class="bi bi-x-circle"></i> Cancelar';
        botaoCancelar.addEventListener('click', function () {
            alterarStatus(os, 'Cancelada');
        });
        divAcoes.appendChild(botaoCancelar);
    }

    tdAcoes.appendChild(divAcoes);

    tr.appendChild(tdTitulo);
    tr.appendChild(tdStatus);
    tr.appendChild(tdLocal);
    tr.appendChild(tdValor);
    tr.appendChild(tdPrazo);
    tr.appendChild(tdDataInicio);
    tr.appendChild(tdFreelancer);
    tr.appendChild(tdAcoes);

    tdTitulo.setAttribute('data-label', 'Título');
    tdStatus.setAttribute('data-label', 'Status');
    tdLocal.setAttribute('data-label', 'Local');
    tdValor.setAttribute('data-label', 'Valor');
    tdPrazo.setAttribute('data-label', 'Prazo');
    tdDataInicio.setAttribute('data-label', 'Data Início');
    tdFreelancer.setAttribute('data-label', 'Freelancer');
    tdAcoes.setAttribute('data-label', 'Ações');

    tbody.appendChild(tr);
}

/* ------------------------- finalizar / cancelar --------------------------- */

async function alterarStatus(os, novoStatus) {
    const finalizando = novoStatus === 'Concluída';
    const confirmou = await modalConfirmar({
        titulo: finalizando ? 'Finalizar ordem de serviço' : 'Cancelar ordem de serviço',
        mensagem: finalizando
            ? `Confirmar a finalização da OS "${os.titulo}"? Ela passará a aguardar avaliação.`
            : `Deseja cancelar a OS "${os.titulo}"? O histórico será preservado e essa ação não poderá ser desfeita.`,
        textoConfirmar: finalizando ? 'Finalizar' : 'Cancelar',
        textoCancelar: 'Voltar',
        perigoso: !finalizando
    });
    if (!confirmou) return;

    try {
        const novoHistorico = (os.historico || []).concat([
            {
                data: hojeLocalISO(),
                evento: finalizando ? 'OS finalizada pela empresa.' : 'OS cancelada pela empresa.'
            }
        ]);

        const resposta = await fetch(`${API_URL_OS}/${os.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: novoStatus, historico: novoHistorico })
        });
        if (!resposta.ok) throw new Error(`Erro HTTP: ${resposta.status}`);

        // Avisa o freelancer sobre a mudança de status da OS.
        if (os.freelancerId) {
            criarNotificacao({
                usuarioId: os.freelancerId,
                usuarioTipo: 'freelancers',
                tipo: 'os',
                titulo: 'Ordem de serviço atualizada',
                mensagem: `A OS "${os.titulo}" foi ${finalizando ? 'finalizada' : 'cancelada'} pela empresa.`,
                link: `/pages/19-ordem-servico-detalhe.html?id=${encodeURIComponent(os.id)}`
            });
        }

        toastMsg(finalizando ? 'Ordem de serviço finalizada com sucesso.' : 'Ordem de serviço cancelada.', 'success');
        carregarOrdens();
    } catch (erro) {
        console.error('Erro ao atualizar status da ordem de serviço:', erro);
        erroBar.textContent = 'Não foi possível atualizar a ordem de serviço. Tente novamente em instantes.';
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
    const totalPaginas = Math.ceil(osFiltradas.length / PAGE_SIZE);
    if (paginaAtual < totalPaginas) {
        paginaAtual++;
        renderizarPagina();
    }
});

carregarOrdens();
