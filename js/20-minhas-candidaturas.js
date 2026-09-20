// npx json-server --watch db.json --port 3000
// Pendências
// 1. Token JWT

const API_URL = `${API_BASE}/candidaturas`;
const API_URL_CONVITES = `${API_BASE}/convites`;

const sessao = exigirTipo('freelancers');
if (!sessao) {
    throw new Error('Sessão inválida');
}
const freelancerId = sessao.id;
let token;

renderizarSidebar(document.querySelector('.sidebar'), 'freelancers', '20-minhas-candidaturas');
renderizarTopbar(document.querySelector('#header-acoes'), sessao);
renderizarBannerValidacao(document.querySelector('.main'), sessao);

const loadingBar = document.querySelector('#perfil-loading');
const erroBar = document.querySelector('#perfil-erro');
const conteudoPerfil = document.querySelector('#perfil-conteudo');
const filtroTituloVaga = document.querySelector('#filterTituloVaga');
const filtroStatusVaga = document.querySelector('#filterStatusVaga');
const filtroEstado = document.querySelector('#filterEstado');
const filtroCidade = document.querySelector('#filterCidade');
const btnLimparFiltros = document.querySelector('#btnLimparFiltros');
const bodyLista = document.querySelector('tbody');
const mensagemErro = document.querySelector('#msg-error');
const mensagemVazio = document.querySelector('#msg-empty');
const cardFiltros = document.querySelector('#cardFiltros');
const cardTabela = document.querySelector('#cardTabela');
const modalCancelamento = document.querySelector('#modalCancelamento');
const btnConfirmarCancelamento = document.querySelector('#btnConfirmarCancelamento');
const btnFecharCancelamento = document.querySelector('#btnFecharCancelamento');
const btnPaginaAnterior = document.querySelector('#btnPaginaAnterior');
const btnPaginaProxima = document.querySelector('#btnPaginaProxima');
const resumoPaginas = document.querySelector('#resumoPaginas');

const cardConvites = document.querySelector('#cardConvites');
const listaConvites = document.querySelector('#listaConvites');
const modalAceitarConvite = document.querySelector('#modalAceitarConvite');
const conviteTituloModal = document.querySelector('#convite-titulo-modal');
const btnCancelarAceiteConvite = document.querySelector('#btnCancelarAceiteConvite');
const btnConfirmarAceiteConvite = document.querySelector('#btnConfirmarAceiteConvite');

const PAGE_SIZE = 10;

let todasCandidaturas = [];
let itensFiltrados = [];
let paginaAtual = 1;
let candidaturaParaCancelar = null;
let conviteSelecionado = null;

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
        const resposta = await fetch(`${API_URL}?freelancerId=${encodeURIComponent(freelancerId)}`);
        if (!resposta.ok) throw new Error(`Erro HTTP: ${resposta.status}`);

        todasCandidaturas = await resposta.json();

        loadingBar.setAttribute('hidden', '');
        conteudoPerfil.removeAttribute('hidden');

        // Sem nenhuma candidatura: exibe somente a mensagem em vermelho,
        // sem lista nem opção de pesquisa.
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
        mensagemErro.hidden = false;
    }
}

/* ------------------------- filtros e render ------------------------------- */

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
    if (status === 'Em análise' || status === 'Cancelada' || status === 'Rejeitado') return 'badge-danger';
    if (status === 'Selecionado') return 'badge-success';
    return 'badge';
}

function formatarData(str) {
    if (!str) return '';
    const data = new Date(str);
    return isNaN(data.getTime()) ? String(str) : data.toLocaleDateString('pt-BR');
}

function preencherLinha(candidatura) {
    const tableRow = document.createElement('tr');

    const tdTitulo = document.createElement('td');
    tdTitulo.textContent = candidatura.titulo;

    const tdEmpresa = document.createElement('td');
    tdEmpresa.textContent = candidatura.nomeEmpresa || candidatura.empresaNome || '';

    const tdLocal = document.createElement('td');
    tdLocal.textContent = [candidatura.cidade, candidatura.estado].filter(Boolean).join(' - ') || '—';

    const tdValor = document.createElement('td');
    tdValor.textContent = candidatura.valor || '—';

    const tdPrazo = document.createElement('td');
    tdPrazo.textContent = formatarData(candidatura.prazo) || '—';

    const tdDataCandidatura = document.createElement('td');
    tdDataCandidatura.textContent = formatarData(candidatura.dataCandidatura) || '—';

    const tdStatus = document.createElement('td');
    const badgeStatus = document.createElement('span');
    badgeStatus.className = `badge ${obterClasseBadgeStatus(candidatura.status)}`;
    badgeStatus.textContent = candidatura.status;
    tdStatus.appendChild(badgeStatus);

    const tdAcoes = document.createElement('td');
    const divAcoes = document.createElement('div');
    divAcoes.className = 'table-actions';

    const botaoDetalhar = document.createElement('a');
    botaoDetalhar.className = 'btn btn-primary';
    botaoDetalhar.textContent = 'Detalhar';
    botaoDetalhar.href = `/pages/18-vaga-detalhe.html?id=${encodeURIComponent(candidatura.vagaId || candidatura.id)}`;
    divAcoes.appendChild(botaoDetalhar);

    if (candidatura.status === 'Em análise') {
        const botaoCancelar = document.createElement('button');
        botaoCancelar.className = 'btn btn-danger';
        botaoCancelar.type = 'button';
        botaoCancelar.textContent = 'Cancelar';
        botaoCancelar.addEventListener('click', function () {
            candidaturaParaCancelar = candidatura;
            modalCancelamento.hidden = false;
        });
        divAcoes.appendChild(botaoCancelar);
    }

    tdAcoes.appendChild(divAcoes);
    tableRow.appendChild(tdTitulo);
    tableRow.appendChild(tdStatus);
    tableRow.appendChild(tdEmpresa);
    tableRow.appendChild(tdLocal);
    tableRow.appendChild(tdValor);
    tableRow.appendChild(tdPrazo);
    tableRow.appendChild(tdDataCandidatura);
    tableRow.appendChild(tdAcoes);
    bodyLista.appendChild(tableRow);
}

/* ------------------------- eventos de filtro ------------------------------ */

// Filtros aplicados em tempo real, no mesmo padrão do mural de vagas (07).
filtroTituloVaga.addEventListener('input', aplicarFiltros);
filtroStatusVaga.addEventListener('change', aplicarFiltros);
if (filtroEstado) filtroEstado.addEventListener('change', aplicarFiltros);
if (filtroCidade) filtroCidade.addEventListener('input', aplicarFiltros);

btnLimparFiltros.addEventListener('click', function () {
    filtroTituloVaga.value = '';
    filtroStatusVaga.value = '';
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

/* ------------------------- cancelamento ------------------------------------ */

btnFecharCancelamento.addEventListener('click', function () {
    modalCancelamento.hidden = true;
    candidaturaParaCancelar = null;
});

btnConfirmarCancelamento.addEventListener('click', async function () {
    if (!candidaturaParaCancelar) return;

    try {
        const resposta = await fetch(`${API_URL}/${candidaturaParaCancelar.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: 'Cancelada' })
        });

        if (!resposta.ok) throw new Error(`Erro HTTP: ${resposta.status}`);

        modalCancelamento.hidden = true;
        candidaturaParaCancelar = null;
        carregarDadosFreelancer();
    } catch (erro) {
        console.error('Erro ao cancelar candidatura:', erro);
        mensagemErro.hidden = false;
    }
});

/* ------------------------- convites ---------------------------------------- */

async function carregarConvites() {
    if (!cardConvites || !listaConvites) return;

    try {
        const resposta = await fetch(`${API_URL_CONVITES}?freelancerId=${encodeURIComponent(freelancerId)}&status=Pendente`);
        if (!resposta.ok) throw new Error(`Erro HTTP: ${resposta.status}`);

        const convites = await resposta.json();
        listaConvites.innerHTML = '';

        if (convites.length === 0) {
            cardConvites.hidden = true;
            return;
        }

        cardConvites.hidden = false;

        convites.forEach(function (convite) {
            const item = document.createElement('div');
            item.className = 'company-job-item';

            const detalhes = document.createElement('div');
            detalhes.className = 'job-details';
            const nomeEmpresa = document.createElement('h3');
            nomeEmpresa.textContent = convite.empresaNome || 'Empresa';
            const textoVaga = document.createElement('span');
            textoVaga.textContent = `Convidou você para a vaga: ${convite.vagaTitulo}`;
            detalhes.appendChild(nomeEmpresa);
            detalhes.appendChild(textoVaga);

            const acoes = document.createElement('div');
            acoes.className = 'job-actions';

            const btnRecusar = document.createElement('button');
            btnRecusar.className = 'btn btn-outline-purple';
            btnRecusar.style.cssText = 'padding: 6px 12px; font-size: 0.82rem;';
            btnRecusar.textContent = 'Recusar';
            btnRecusar.addEventListener('click', function () {
                recusarConvite(convite.id);
            });

            const btnAceitar = document.createElement('button');
            btnAceitar.className = 'btn btn-purple-bright';
            btnAceitar.style.cssText = 'padding: 6px 12px; font-size: 0.82rem;';
            btnAceitar.textContent = 'Aceitar';
            btnAceitar.addEventListener('click', function () {
                conviteSelecionado = convite;
                if (conviteTituloModal) conviteTituloModal.textContent = convite.vagaTitulo;
                if (modalAceitarConvite) modalAceitarConvite.style.display = 'flex';
            });

            acoes.appendChild(btnRecusar);
            acoes.appendChild(btnAceitar);

            item.appendChild(detalhes);
            item.appendChild(acoes);
            listaConvites.appendChild(item);
        });
    } catch (erro) {
        console.error('Erro ao carregar convites:', erro);
    }
}

async function recusarConvite(conviteId) {
    try {
        const resposta = await fetch(`${API_URL_CONVITES}/${conviteId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Recusado' })
        });
        if (!resposta.ok) throw new Error(`Erro HTTP: ${resposta.status}`);
        carregarConvites();
    } catch (erro) {
        console.error('Erro ao recusar convite:', erro);
        mensagemErro.hidden = false;
    }
}

if (btnCancelarAceiteConvite) {
    btnCancelarAceiteConvite.addEventListener('click', function () {
        conviteSelecionado = null;
        if (modalAceitarConvite) modalAceitarConvite.style.display = 'none';
    });
}

// Aceitar um convite equivale a um match: gera/atualiza a candidatura como
// "Selecionado", rejeita as demais candidaturas em análise daquela vaga,
// encerra a vaga, garante a conversa de chat e cria a Ordem de Serviço.
if (btnConfirmarAceiteConvite) {
    btnConfirmarAceiteConvite.addEventListener('click', async function () {
        if (!conviteSelecionado) return;

        const convite = conviteSelecionado;
        if (modalAceitarConvite) modalAceitarConvite.style.display = 'none';

        btnConfirmarAceiteConvite.disabled = true;
        const textoOriginal = btnConfirmarAceiteConvite.innerHTML;
        btnConfirmarAceiteConvite.innerHTML = '<span class="spinner"></span> Processando...';

        try {
            const respVaga = await fetch(`${API_BASE}/vagas/${convite.vagaId}`);
            const vaga = respVaga.ok ? await respVaga.json() : {};

            const respCandidaturas = await fetch(`${API_BASE}/candidaturas?empresaId=${convite.empresaId}`);
            const candidaturasDaEmpresa = respCandidaturas.ok ? await respCandidaturas.json() : [];
            const candidaturasDaVaga = candidaturasDaEmpresa.filter(function (c) { return String(c.vagaId) === String(convite.vagaId); });
            const candidaturaExistente = candidaturasDaVaga.find(function (c) { return String(c.freelancerId) === String(freelancerId); });

            if (candidaturaExistente) {
                await fetch(`${API_BASE}/candidaturas/${candidaturaExistente.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'Selecionado' })
                });
            } else {
                await fetch(`${API_BASE}/candidaturas`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        vagaId: convite.vagaId,
                        empresaId: convite.empresaId,
                        empresaNome: convite.empresaNome,
                        nomeEmpresa: convite.empresaNome,
                        titulo: convite.vagaTitulo,
                        cidade: vaga.cidade || '',
                        estado: vaga.estado || '',
                        valor: vaga.valor || '',
                        prazo: vaga.prazo || '',
                        dataCandidatura: new Date().toISOString(),
                        freelancerId: freelancerId,
                        freelancerNome: convite.freelancerNome,
                        status: 'Selecionado',
                        tipo: 'Vaga',
                        link: '18-vaga-detalhe.html'
                    })
                });
            }

            // Rejeita as demais candidaturas dessa vaga que ainda estavam em análise.
            await Promise.all(candidaturasDaVaga
                .filter(function (c) { return c.status === 'Em análise' && String(c.freelancerId) !== String(freelancerId); })
                .map(function (c) {
                    return fetch(`${API_BASE}/candidaturas/${c.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'Rejeitado' })
                    });
                }));

            // Encerra a vaga — foi preenchida.
            await fetch(`${API_BASE}/vagas/${convite.vagaId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Encerrada' })
            });

            // Garante a conversa de chat entre freelancer e empresa.
            const respConversas = await fetch(`${API_BASE}/conversas`);
            const todasConversas = respConversas.ok ? await respConversas.json() : [];
            const alvoConversa = [String(freelancerId), String(convite.empresaId)].sort();
            const jaExisteConversa = todasConversas.some(function (c) {
                const par = [String(c.participanteAId), String(c.participanteBId)].sort();
                return par[0] === alvoConversa[0] && par[1] === alvoConversa[1];
            });

            if (!jaExisteConversa) {
                await fetch(`${API_BASE}/conversas`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        participanteAId: freelancerId,
                        participanteANome: convite.freelancerNome,
                        participanteATipo: 'freelancers',
                        participanteBId: convite.empresaId,
                        participanteBNome: convite.empresaNome,
                        participanteBTipo: 'empresas',
                        ultimaMensagem: '',
                        ultimaAtualizacao: new Date().toISOString()
                    })
                });
            }

            // Marca o convite como aceito.
            await fetch(`${API_URL_CONVITES}/${convite.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Aceito' })
            });

            // Gera a Ordem de Serviço (com cidade/estado da vaga).
            const novaOS = {
                titulo: convite.vagaTitulo,
                categoria: vaga.especialidade || 'A definir',
                modalidade: vaga.modalidade || 'Presencial',
                empresaId: convite.empresaId,
                empresaNome: convite.empresaNome,
                freelancerId: freelancerId,
                freelancerNome: convite.freelancerNome,
                cidade: vaga.cidade || '',
                estado: vaga.estado || '',
                valor: vaga.valor || '',
                descricao: `Ordem de serviço gerada a partir do convite aceito para a vaga "${convite.vagaTitulo}".`,
                habilidades: [],
                status: 'Em andamento',
                dataPublicacao: new Date().toISOString(),
                prazo: vaga.prazo || '',
                previsaoConclusao: '',
                avaliacaoFreelancer: 'Pendente',
                avaliacaoConfeccao: 'Pendente',
                observacoes: '',
                referenciaBriefing: '',
                referenciaEntrega: '',
                historico: [
                    { data: new Date().toISOString().slice(0, 10), evento: 'OS criada a partir da aceitação do convite.' }
                ]
            };

            const respOS = await fetch(`${API_BASE}/ordensServico`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(novaOS)
            });
            const osCriada = respOS.ok ? await respOS.json() : null;

            conviteSelecionado = null;
            carregarConvites();
            carregarDadosFreelancer();

            if (osCriada) {
                window.location.href = `/pages/19-ordem-servico-detalhe.html?id=${osCriada.id}`;
            }
        } catch (erro) {
            console.error('Erro ao aceitar convite:', erro);
            mensagemErro.hidden = false;
        } finally {
            btnConfirmarAceiteConvite.disabled = false;
            btnConfirmarAceiteConvite.innerHTML = textoOriginal;
        }
    });
}

/* ------------------------- iniciar ----------------------------------------- */

carregarDadosFreelancer();
carregarConvites();
