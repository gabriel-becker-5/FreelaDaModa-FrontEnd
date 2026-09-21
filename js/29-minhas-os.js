// Minhas Ordens de Serviço (Freelancer e Empresa)
const API_URL_OS = `${API_BASE}/ordensServico`;

const sessao = exigirTipo('freelancers');
if (!sessao) {
    throw new Error('Sessão inválida');
}
const freelancerId = sessao.id;
let token;

renderizarSidebar(document.querySelector('.sidebar'), 'freelancers', '29-minhas-os');
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
const mensagemErro = document.querySelector('#msg-error');
const mensagemVazio = document.querySelector('#msg-empty');
const cardFiltros = document.querySelector('#cardFiltros');
const cardTabela = document.querySelector('#cardTabela');
const btnPaginaAnterior = document.querySelector('#btnPaginaAnterior');
const btnPaginaProxima = document.querySelector('#btnPaginaProxima');
const resumoPaginas = document.querySelector('#resumoPaginas');

const PAGE_SIZE = 10;

let todasOS = [];
let itensFiltrados = [];
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

/* ------------------------- carregar dados --------------------------------- */

async function carregarDadosFreelancer() {
    mensagemErro.hidden = true;
    mensagemVazio.hidden = true;
    loadingBar.removeAttribute('hidden');
    erroBar.setAttribute('hidden', '');
    conteudoPerfil.setAttribute('hidden', '');

    try {
        const resposta = await fetch(`${API_URL_OS}?freelancerId=${encodeURIComponent(freelancerId)}`);
        if (!resposta.ok) throw new Error(`Erro HTTP: ${resposta.status}`);

        todasOS = await resposta.json();

        loadingBar.setAttribute('hidden', '');
        conteudoPerfil.removeAttribute('hidden');

        // Sem nenhuma OS: exibe somente a mensagem em vermelho,
        // sem lista nem opção de pesquisa.
        if (todasOS.length === 0) {
            cardFiltros.hidden = true;
            cardTabela.hidden = true;
            mensagemVazio.textContent = 'Você ainda não tem ordens de serviço.';
            mensagemVazio.hidden = false;
            return;
        }

        cardFiltros.hidden = false;
        cardTabela.hidden = false;
        aplicarFiltros();
    } catch (erro) {
        console.error('Erro ao carregar ordens de serviço:', erro);
        loadingBar.setAttribute('hidden', '');
        mensagemErro.hidden = false;
    }
}

/* ------------------------- filtros e render ------------------------------- */

function ordenarOS(lista) {
    const ordenacao = filtroOrdenar ? filtroOrdenar.value : 'recentes';

    if (ordenacao === 'valor') {
        lista.sort(function (a, b) { return moedaParaNumero(b.valor) - moedaParaNumero(a.valor); });
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

    // "Mais recentes": por data de início (dataPublicacao).
    lista.sort(function (a, b) {
        const da = a.dataPublicacao ? new Date(a.dataPublicacao).getTime() : 0;
        const db_ = b.dataPublicacao ? new Date(b.dataPublicacao).getTime() : 0;
        return db_ - da;
    });
}

function aplicarFiltros() {
    const termo = removerAcentos(filtroTituloVaga.value.trim().toLowerCase());
    const status = filtroStatusVaga.value;
    const uf = filtroEstado ? filtroEstado.value : '';
    const cidade = filtroCidade ? removerAcentos(filtroCidade.value.trim().toLowerCase()) : '';

    itensFiltrados = todasOS.filter(function (os) {
        const bateTermo = !termo || removerAcentos(String(os.titulo || '')).toLowerCase().includes(termo);
        const bateStatus = !status || os.status === status;
        const bateUf = !uf || String(os.estado || '').toUpperCase() === uf.toUpperCase();
        const bateCidade = !cidade || removerAcentos(String(os.cidade || '')).toLowerCase().includes(cidade);
        return bateTermo && bateStatus && bateUf && bateCidade;
    });

    ordenarOS(itensFiltrados);

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
        mensagemVazio.textContent = 'Nenhuma ordem de serviço encontrada para os filtros selecionados.';
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
    if (status === 'Cancelada') return 'badge-danger';
    if (status === 'Em andamento') return 'badge-warning';
    if (status === 'Concluída') return 'badge-success';
    return 'badge';
}

function preencherLinha(os) {
    const tableRow = document.createElement('tr');

    const tdTitulo = document.createElement('td');
    tdTitulo.textContent = os.titulo;

    const tdEmpresa = document.createElement('td');
    if (os.empresaId) {
        const linkEmpresa = document.createElement('a');
        linkEmpresa.href = `/pages/26-perfil-empresa-publico.html?id=${encodeURIComponent(os.empresaId)}`;
        linkEmpresa.className = 'text-primary';
        linkEmpresa.textContent = os.empresaNome || '';
        tdEmpresa.appendChild(linkEmpresa);
    } else {
        tdEmpresa.textContent = os.empresaNome || '';
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
    const badgeStatus = document.createElement('span');
    badgeStatus.className = `badge ${obterClasseBadgeStatus(os.status)}`;
    badgeStatus.textContent = os.status;
    tdStatus.appendChild(badgeStatus);

    const tdAcoes = document.createElement('td');
    const divAcoes = document.createElement('div');
    divAcoes.className = 'table-actions';

    const botaoDetalhar = document.createElement('a');
    botaoDetalhar.className = 'btn btn-primary';
    botaoDetalhar.textContent = 'Detalhar';
    botaoDetalhar.href = `/pages/19-ordem-servico-detalhe.html?id=${encodeURIComponent(os.id)}`;
    divAcoes.appendChild(botaoDetalhar);

    if (os.status === 'Em andamento') {
        const botaoCancelar = document.createElement('button');
        botaoCancelar.className = 'btn btn-outline';
        botaoCancelar.style.color = '#d93025';
        botaoCancelar.style.borderColor = '#ffc1bc';
        botaoCancelar.innerHTML = '<i class="bi bi-x-circle"></i> Encerrar';
        botaoCancelar.type = 'button';
        botaoCancelar.addEventListener('click', async function () {
            const confirmou = await modalConfirmar({
                titulo: 'Confirmar cancelamento',
                mensagem: 'Você tem certeza que deseja cancelar esta ordem de serviço? Essa ação não poderá ser desfeita.',
                textoConfirmar: 'Confirmar cancelamento',
                textoCancelar: 'Cancelar',
                perigoso: true
            });
            if (!confirmou) return;

            try {
                const novoHistorico = (os.historico || []).concat([
                    { data: hojeLocalISO(), evento: 'OS cancelada pelo freelancer.' }
                ]);
                const resposta = await fetch(`${API_URL_OS}/${os.id}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ status: 'Cancelada', historico: novoHistorico })
                });

                if (!resposta.ok) throw new Error(`Erro HTTP: ${resposta.status}`);

                mostrarMensagem('Ordem de serviço cancelada.', 'success');
                carregarDadosFreelancer();
            } catch (erro) {
                console.error('Erro ao cancelar ordem de serviço:', erro);
                mensagemErro.hidden = false;
            }
        });
        divAcoes.appendChild(botaoCancelar);
    }

    if (os.status === 'Concluída' && os.avaliacaoFreelancer !== 'Avaliado') {
        const botaoAvaliar = document.createElement('a');
        botaoAvaliar.className = 'btn';
        botaoAvaliar.textContent = 'Avaliar';
        botaoAvaliar.href = `/pages/23-avaliacao-os.html?id=${encodeURIComponent(os.id)}`;
        divAcoes.appendChild(botaoAvaliar);
    }

    tdAcoes.appendChild(divAcoes);
    tableRow.appendChild(tdTitulo);
    tableRow.appendChild(tdStatus);
    tableRow.appendChild(tdEmpresa);
    tableRow.appendChild(tdLocal);
    tableRow.appendChild(tdValor);
    tableRow.appendChild(tdPrazo);
    tableRow.appendChild(tdDataInicio);
    tableRow.appendChild(tdAcoes);

    tdTitulo.setAttribute('data-label', 'Título');
    tdStatus.setAttribute('data-label', 'Status');
    tdEmpresa.setAttribute('data-label', 'Empresa');
    tdLocal.setAttribute('data-label', 'Local');
    tdValor.setAttribute('data-label', 'Valor');
    tdPrazo.setAttribute('data-label', 'Prazo');
    tdDataInicio.setAttribute('data-label', 'Data Início');
    tdAcoes.setAttribute('data-label', 'Ações');

    bodyLista.appendChild(tableRow);
}

/* ------------------------- eventos de filtro ------------------------------ */

// Filtros aplicados em tempo real, no mesmo padrão do mural de vagas (07).
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
