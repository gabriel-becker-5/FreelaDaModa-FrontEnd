// Minhas Vagas publicadas (empresa)

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

// Contagem de candidatos por vaga (id em string -> número de candidaturas
// ativas, ou null se a contagem daquela vaga falhou). Ausente = ainda
// carregando. Preenchida depois da tabela já estar na tela (não bloqueia).
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

/* ------------------------- badges ----------------------------------------- */

function classeBadgeStatus(status) {
    const statusNormalizado = (status || '').toLowerCase();
    if (statusNormalizado.includes('pausada')) return 'badge-warning';
    if (statusNormalizado.includes('encerrada')) return 'badge-danger';
    return 'badge-success';
}

/* ------------------------- contagem de candidatos -------------------------- */

// Uma chamada por vaga, em paralelo (Promise.allSettled) — se alguma falhar,
// só aquela vaga mostra "—" na coluna, sem quebrar as demais.
async function carregarContagemCandidatos(vagas) {
    const resultados = await Promise.allSettled(
        vagas.map(function (vaga) {
            return api(`/User/candidaturas?vagaId=${encodeURIComponent(vaga.id)}`).then(function (lista) {
                const arr = Array.isArray(lista) ? lista : [];
                // Só candidaturas ativas contam — descarta Rejeitada e Cancelada.
                const ativas = arr.filter(function (c) {
                    return c.status !== 'Rejeitada' && c.status !== 'Cancelada';
                });
                return ativas.length;
            });
        })
    );

    resultados.forEach(function (resultado, indice) {
        const vagaId = String(vagas[indice].id);
        if (resultado.status === 'fulfilled') {
            contagemCandidatosPorVaga[vagaId] = resultado.value;
        } else {
            console.error(`Erro ao contar candidatos da vaga ${vagaId}:`, resultado.reason);
            contagemCandidatosPorVaga[vagaId] = null;
        }
    });

    // Atualiza só as células já renderizadas, sem recarregar a tabela.
    tbody.querySelectorAll('[data-td-candidatos]').forEach(function (td) {
        renderizarCelulaCandidatos(td, td.getAttribute('data-td-candidatos'));
    });
}

function renderizarCelulaCandidatos(td, vagaId) {
    const valor = contagemCandidatosPorVaga[String(vagaId)];
    td.innerHTML = '';

    if (valor === undefined) {
        td.textContent = '…';
        return;
    }
    if (valor === null) {
        td.textContent = '—';
        return;
    }

    const link = document.createElement('a');
    link.href = `/pages/17-candidatos-vaga.html?id=${encodeURIComponent(vagaId)}`;
    link.className = 'text-primary';
    const strong = document.createElement('strong');
    strong.textContent = `${valor} candidato${valor === 1 ? '' : 's'}`;
    link.appendChild(strong);
    td.appendChild(link);
}

/* ------------------------- carregar dados --------------------------------- */

function renderizarListaOuVazio() {
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
}

async function carregarVagas() {
    msgEmpty.hidden = true;
    loadingBar.removeAttribute('hidden');
    erroBar.setAttribute('hidden', '');
    conteudoPerfil.setAttribute('hidden', '');

    try {
        // mapVagas já existe em js/api.js (valor <- orcamento, empresaId <- usuarioId).
        const vagasBack = await api(`/vagas?empresaId=${encodeURIComponent(sessao.id)}`);
        todasVagas = mapVagas(vagasBack);
        contagemCandidatosPorVaga = {};

        loadingBar.setAttribute('hidden', '');
        conteudoPerfil.removeAttribute('hidden');

        renderizarListaOuVazio();

        // Não bloqueia a tabela: a contagem de candidatos é buscada depois.
        if (todasVagas.length) carregarContagemCandidatos(todasVagas);
    } catch (erro) {
        console.error('Erro ao carregar minhas vagas:', erro);
        loadingBar.setAttribute('hidden', '');
        erroBar.textContent = erro.message || 'Não foi possível carregar as vagas. Tente novamente mais tarde.';
        erroBar.removeAttribute('hidden');
    }
}

/* ------------------------- ordenação -------------------------------------- */

function ordenarVagas(lista) {
    const ordenacao = filtroOrdenar ? filtroOrdenar.value : 'recentes';

    if (ordenacao === 'valor') {
        // valor já é número (orcamento do back) — compara direto.
        lista.sort(function (a, b) { return (b.valor || 0) - (a.valor || 0); });
        return;
    }

    if (ordenacao === 'prazo') {
        lista.sort(function (a, b) {
            const da = a.prazoConclusao ? new Date(a.prazoConclusao).getTime() : NaN;
            const db_ = b.prazoConclusao ? new Date(b.prazoConclusao).getTime() : NaN;
            const va = isNaN(da) ? Infinity : da;
            const vb = isNaN(db_) ? Infinity : db_;
            return va - vb;
        });
        return;
    }

    // "Mais recentes": por data de publicação desc, desempate por id desc.
    lista.sort(function (a, b) {
        const da = a.dataPublicacao ? new Date(a.dataPublicacao).getTime() : 0;
        const db_ = b.dataPublicacao ? new Date(b.dataPublicacao).getTime() : 0;
        if (db_ !== da) return db_ - da;
        return (Number(b.id) || 0) - (Number(a.id) || 0);
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
        pagina.forEach(function (vaga) { tbody.appendChild(construirLinha(vaga)); });
    }

    const total = vagasFiltradas.length;
    const fim = Math.min(inicio + PAGE_SIZE, total);
    resumoPaginas.textContent = total > 0 ? `Mostrando ${inicio + 1}-${fim} de ${total}` : 'Mostrando 0 de 0';
    btnPaginaAnterior.disabled = paginaAtual <= 1;
    btnPaginaProxima.disabled = paginaAtual >= totalPaginas;
}

function criarBotaoAcao(texto, icone, aoClicar, perigoso) {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'btn btn-outline';
    if (perigoso) {
        botao.style.color = '#d93025';
        botao.style.borderColor = '#ffc1bc';
    }
    botao.innerHTML = `<i class="bi ${icone}"></i> ${escapeHtml(texto)}`;
    botao.addEventListener('click', aoClicar);
    return botao;
}

function construirLinha(vaga) {
    const tr = document.createElement('tr');
    tr.dataset.vagaId = String(vaga.id);
    preencherConteudoLinha(tr, vaga);
    return tr;
}

// Atualiza (ou monta) o conteúdo de uma <tr> para a vaga passada — usado
// tanto na renderização inicial quanto para refletir uma troca de status
// sem recarregar a tabela inteira.
function preencherConteudoLinha(tr, vaga) {
    tr.innerHTML = '';

    const tdTitulo = document.createElement('td');
    tdTitulo.textContent = vaga.titulo;

    const tdStatus = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = `badge ${classeBadgeStatus(vaga.status)}`;
    badge.textContent = vaga.status || 'Aberta';
    tdStatus.appendChild(badge);

    const tdLocal = document.createElement('td');
    tdLocal.textContent = [vaga.cidade, vaga.estado].filter(Boolean).join(' - ') || '—';

    const tdValor = document.createElement('td');
    tdValor.textContent = vaga.valor != null ? formatarMoeda(vaga.valor) : '—';

    const tdPrazo = document.createElement('td');
    tdPrazo.textContent = vaga.prazoConclusao ? formatarData(vaga.prazoConclusao) : '—';

    const tdPublicacao = document.createElement('td');
    tdPublicacao.textContent = vaga.dataPublicacao ? formatarData(vaga.dataPublicacao) : '—';

    const tdCandidatos = document.createElement('td');
    tdCandidatos.setAttribute('data-td-candidatos', String(vaga.id));
    renderizarCelulaCandidatos(tdCandidatos, vaga.id);

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

    if (vaga.status === 'Aberta') {
        divAcoes.appendChild(criarBotaoAcao('Pausar', 'bi-pause-circle', function () {
            atualizarStatusVaga(vaga, 'Pausada', 'Vaga pausada com sucesso.');
        }));
    } else if (vaga.status === 'Pausada') {
        divAcoes.appendChild(criarBotaoAcao('Reabrir', 'bi-play-circle', function () {
            atualizarStatusVaga(vaga, 'Aberta', 'Vaga reaberta com sucesso.');
        }));
    }

    if (vaga.status !== 'Encerrada') {
        divAcoes.appendChild(criarBotaoAcao('Encerrar', 'bi-x-circle', function () {
            encerrarVaga(vaga);
        }, true));
    }

    divAcoes.appendChild(criarBotaoAcao('Excluir', 'bi-trash', function () {
        excluirVaga(vaga);
    }, true));

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
}

// Atualiza só a linha dessa vaga no DOM (se estiver na página atual),
// sem recarregar a tabela inteira nem refazer a busca no back.
function atualizarLinhaNaTela(vaga) {
    const tr = tbody.querySelector(`tr[data-vaga-id="${CSS.escape(String(vaga.id))}"]`);
    if (tr) preencherConteudoLinha(tr, vaga);
}

/* ------------------------- status (pausar/reabrir/encerrar) --------------- */

async function atualizarStatusVaga(vaga, novoStatus, mensagemSucesso) {
    try {
        await api(`/vagas/${encodeURIComponent(vaga.id)}/status`, { method: 'PATCH', body: { status: novoStatus } });
        vaga.status = novoStatus;
        toastMsg(mensagemSucesso, 'success');
        atualizarLinhaNaTela(vaga);
    } catch (erro) {
        console.error('Erro ao atualizar status da vaga:', erro);
        toastMsg(erro.message || 'Não foi possível atualizar o status da vaga. Tente novamente.', 'error');
    }
}

async function encerrarVaga(vaga) {
    const confirmou = await modalConfirmar({
        titulo: 'Encerrar vaga',
        mensagem: `Deseja encerrar a vaga "${vaga.titulo}"? Ela sairá do Mural de Vagas, mas o histórico será preservado.`,
        textoConfirmar: 'Encerrar',
        textoCancelar: 'Cancelar',
        perigoso: true
    });
    if (!confirmou) return;

    await atualizarStatusVaga(vaga, 'Encerrada', 'Vaga encerrada com sucesso.');
}

/* ------------------------- excluir vaga ------------------------------------ */

async function excluirVaga(vaga) {
    const confirmou = await modalConfirmar({
        titulo: 'Excluir vaga',
        mensagem: `Deseja excluir definitivamente a vaga "${vaga.titulo}"? Essa ação não pode ser desfeita.`,
        textoConfirmar: 'Excluir',
        textoCancelar: 'Cancelar',
        perigoso: true
    });
    if (!confirmou) return;

    try {
        // DELETE /vagas/{id} é exclusão lógica no back e devolve 204 sem corpo;
        // api() já trata respostas sem corpo (json fica null) sem lançar erro.
        await api(`/vagas/${encodeURIComponent(vaga.id)}`, { method: 'DELETE' });

        todasVagas = todasVagas.filter(function (v) { return String(v.id) !== String(vaga.id); });
        delete contagemCandidatosPorVaga[String(vaga.id)];

        toastMsg('Vaga excluída com sucesso.', 'success');
        renderizarListaOuVazio();
    } catch (erro) {
        console.error('Erro ao excluir vaga:', erro);
        toastMsg(erro.message || 'Não foi possível excluir a vaga. Tente novamente.', 'error');
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
