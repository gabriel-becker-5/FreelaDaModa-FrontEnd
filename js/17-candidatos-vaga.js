// Candidatos da Vaga (empresa)
//
// Integração com o back (Fase 2.1):
//   GET   /vagas/{id}                                   -> título da vaga
//   GET   /User/candidaturas?vagaId=                    -> candidaturas da vaga
//   POST  /vagas/{vagaId}/contratar  { freelancerId }   -> seleciona o candidato (UMA chamada:
//         aceita a candidatura, rejeita as outras, encerra a vaga e cria a OS Em andamento)
//   PATCH /User/candidaturas/status?vagaId=&freelancerId=&statusCandidatura=Rejeitada  (sem corpo)
//
// REGRA IMPORTANTE: NUNCA aceitar candidato pelo PATCH de status com "Aceita".
// Selecionar é sempre pelo contratar; senão a candidatura fica aceita sem OS e o
// contratar passa a responder 409 para essa vaga. O PATCH serve só para recusar.
//
// ATENÇÃO: "apiFetch" é o NOME PROVISÓRIO do helper da Fase 0 (api.js).
// Quando o api.js entrar na main, troque apenas esse nome (e o formato da URL,
// se o helper receber só o caminho em vez da URL completa). O helper deve:
//   - aceitar opções no formato do fetch (method, headers, body);
//   - injetar o Bearer token;
//   - devolver os dados da resposta;
//   - lançar um Error com a mensagem do back (e, se possível, erro.status).
//
// Do mesmo jeito, "traduzirStatusCandidatura" abaixo é provisório: troque pelo
// mapStatusCandidatura do api.js quando ele existir.
 
const API_URL_VAGAS = `${API_BASE}/vagas`;
const API_URL_CANDIDATURAS = `${API_BASE}/User/candidaturas`;
 
const sessao = exigirTipo('empresas');
if (!sessao) {
    throw new Error('Sessão inválida');
}
 
// A 17 não está no menu lateral; destaca "Minhas Vagas" como contexto.
renderizarSidebar(document.querySelector('.sidebar'), 'empresas', '15-minhas-vagas');
renderizarTopbar(document.querySelector('#header-acoes'), sessao);
renderizarBannerValidacao(document.querySelector('.main'), sessao);
 
const vagaId = new URLSearchParams(window.location.search).get('id');
 
const loadingBar = document.querySelector('#perfil-loading');
const erroBar = document.querySelector('#perfil-erro');
const conteudoPerfil = document.querySelector('#perfil-conteudo');
const tituloVagaEl = document.querySelector('#tituloVaga');
const filtroNome = document.querySelector('#filtroNome');
const filtroStatus = document.querySelector('#filtroStatus');
const btnLimparFiltros = document.querySelector('#btnLimparFiltros');
const tbody = document.querySelector('#tbodyCandidatos');
const msgEmpty = document.querySelector('#msg-empty');
const cardFiltros = document.querySelector('#cardFiltros');
const cardTabela = document.querySelector('#cardTabela');
const mensagemStatus = document.querySelector('#mensagemStatus');
 
// Textos de status usados na tela (o back usa Pendente, Aceita e Rejeitada).
const STATUS_EM_ANALISE = 'Em análise';
const STATUS_SELECIONADO = 'Selecionado';
const STATUS_REJEITADO = 'Rejeitado';
 
let vagaAtual = null;
let todosCandidatos = [];
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
 
/* ------------------------- utilitários ------------------------------------ */
 
function exibirMensagem(texto, tipo) {
    if (!mensagemStatus) return;
    mensagemStatus.className = `alert mb-md alert-${tipo}`;
    mensagemStatus.innerHTML = `<i class="bi ${tipo === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'}"></i> ${escapeHtml(texto)}`;
    mensagemStatus.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
 
function iniciais(nome) {
    const partes = String(nome || '').trim().split(' ').filter(Boolean);
    if (partes.length === 0) return '--';
    return partes.length > 1
        ? `${partes[0][0]}${partes[1][0]}`.toUpperCase()
        : partes[0].substring(0, 2).toUpperCase();
}
 
// Provisório: Pendente = Em análise, Aceita = Selecionado, Rejeitada = Rejeitado.
function traduzirStatusCandidatura(status) {
    if (status === 'Pendente') return STATUS_EM_ANALISE;
    if (status === 'Aceita') return STATUS_SELECIONADO;
    if (status === 'Rejeitada') return STATUS_REJEITADO;
    return status || STATUS_EM_ANALISE;
}
 
function classeBadgeStatus(status) {
    if (status === STATUS_SELECIONADO || status === 'Aprovado') return 'badge-success';
    if (status === STATUS_REJEITADO || status === 'Rejeitada' || status === 'Cancelada') return 'badge-danger';
    return 'badge-warning';
}
 
// O helper pode devolver o objeto direto ou dentro de "dados".
function extrairObjeto(dados) {
    return (dados && dados.id === undefined && dados.dados) ? dados.dados : dados;
}
 
function extrairLista(dados) {
    if (Array.isArray(dados)) return dados;
    if (dados && Array.isArray(dados.dados)) return dados.dados;
    return [];
}
 
// O nome do freelancer ainda não vem do back: sem nome, mostra o número do freelancer
// para as linhas não ficarem todas iguais.
function nomeDoCandidato(candidatura) {
    return candidatura.freelancerNome || `Freelancer #${candidatura.freelancerId}`;
}
 
if (!vagaId) {
    loadingBar.setAttribute('hidden', '');
    erroBar.textContent = 'Nenhuma vaga informada. Volte para "Minhas Vagas" e clique em "Candidatos" novamente.';
    erroBar.removeAttribute('hidden');
}
 
/* ------------------------- carregar candidatos ---------------------------- */
 
async function carregarCandidatos() {
    msgEmpty.hidden = true;
    mensagemStatus.hidden = true;
    loadingBar.removeAttribute('hidden');
    erroBar.setAttribute('hidden', '');
    conteudoPerfil.setAttribute('hidden', '');
 
    try {
        const dadosVaga = await apiFetch(`${API_URL_VAGAS}/${encodeURIComponent(vagaId)}`);
        vagaAtual = extrairObjeto(dadosVaga);
 
        // Quem pode ver as candidaturas desta vaga é decidido pelo back.
        const dadosCandidaturas = await apiFetch(`${API_URL_CANDIDATURAS}?vagaId=${encodeURIComponent(vagaId)}`);
        const candidaturas = extrairLista(dadosCandidaturas);
 
        tituloVagaEl.textContent = (vagaAtual && vagaAtual.titulo) || '—';
 
        todosCandidatos = candidaturas.map(function (candidatura) {
            return {
                candidatura: Object.assign({}, candidatura, { status: traduzirStatusCandidatura(candidatura.status) })
            };
        });
 
        loadingBar.setAttribute('hidden', '');
        conteudoPerfil.removeAttribute('hidden');
 
        if (todosCandidatos.length === 0) {
            cardFiltros.hidden = true;
            cardTabela.hidden = true;
            msgEmpty.textContent = 'Nenhum freelancer se candidatou a esta vaga ainda.';
            msgEmpty.hidden = false;
            return;
        }
 
        cardFiltros.hidden = false;
        cardTabela.hidden = false;
        renderizarCandidatos();
    } catch (erro) {
        console.error('Erro ao carregar candidatos da vaga:', erro);
        loadingBar.setAttribute('hidden', '');
        erroBar.textContent = (erro && erro.message) || 'Não foi possível carregar os candidatos da vaga.';
        erroBar.removeAttribute('hidden');
    }
}
 
/* ------------------------- filtros e render ------------------------------- */
 
function renderizarCandidatos() {
    const termo = removerAcentos(filtroNome.value.trim().toLowerCase());
    const status = filtroStatus.value;
 
    const filtrados = todosCandidatos.filter(function ({ candidatura }) {
        const bateTermo = !termo || removerAcentos(String(nomeDoCandidato(candidatura))).toLowerCase().includes(termo);
        const bateStatus = !status || candidatura.status === status;
        return bateTermo && bateStatus;
    });
 
    tbody.innerHTML = '';
 
    if (filtrados.length === 0) {
        msgEmpty.textContent = 'Nenhum candidato encontrado para os filtros selecionados.';
        msgEmpty.hidden = false;
        cardTabela.hidden = true;
        return;
    }
 
    msgEmpty.hidden = true;
    cardTabela.hidden = false;
    filtrados.forEach(preencherLinha);
}
 
function preencherLinha({ candidatura }) {
    const nome = nomeDoCandidato(candidatura);
    const podeAgir = candidatura.status === STATUS_EM_ANALISE;
 
    const tr = document.createElement('tr');
 
    const tdProfissional = document.createElement('td');
    const divProfissional = document.createElement('div');
    divProfissional.style.cssText = 'display: flex; align-items: center; gap: 12px;';
    const avatar = document.createElement('div');
    avatar.className = 'chat-avatar';
    avatar.textContent = iniciais(nome);
    const divInfo = document.createElement('div');
    const strongNome = document.createElement('strong');
    strongNome.textContent = nome;
    divInfo.appendChild(strongNome);
    divProfissional.appendChild(avatar);
    divProfissional.appendChild(divInfo);
    tdProfissional.appendChild(divProfissional);
 
    // Especialidades e disponibilidade ainda não vêm nas candidaturas do back.
    const tdEspecialidades = document.createElement('td');
    const muted = document.createElement('span');
    muted.className = 'text-muted';
    muted.textContent = '—';
    tdEspecialidades.appendChild(muted);
 
    const tdDisponibilidade = document.createElement('td');
    tdDisponibilidade.textContent = '—';
 
    const tdStatus = document.createElement('td');
    const badgeStatus = document.createElement('span');
    badgeStatus.className = `badge ${classeBadgeStatus(candidatura.status)}`;
    badgeStatus.textContent = candidatura.status;
    tdStatus.appendChild(badgeStatus);
 
    const tdAcoes = document.createElement('td');
    const divAcoes = document.createElement('div');
    divAcoes.className = 'table-actions';
 
    const linkPerfil = document.createElement('a');
    linkPerfil.href = `/pages/25-perfil-freelancer-publico.html?id=${encodeURIComponent(candidatura.freelancerId)}`;
    linkPerfil.className = 'btn btn-outline';
    linkPerfil.innerHTML = '<i class="bi bi-person-lines-fill"></i> Ver Perfil';
    divAcoes.appendChild(linkPerfil);
 
    if (podeAgir) {
        const botaoSelecionar = document.createElement('button');
        botaoSelecionar.type = 'button';
        botaoSelecionar.className = 'btn btn-primary';
        botaoSelecionar.style.background = 'var(--success)';
        botaoSelecionar.style.borderColor = 'var(--success)';
        botaoSelecionar.innerHTML = '<i class="bi bi-check-circle-fill"></i> Selecionar';
        botaoSelecionar.addEventListener('click', function () {
            selecionarCandidato(candidatura);
        });
        divAcoes.appendChild(botaoSelecionar);
 
        const botaoRejeitar = document.createElement('button');
        botaoRejeitar.type = 'button';
        botaoRejeitar.className = 'btn btn-outline';
        botaoRejeitar.style.color = '#d93025';
        botaoRejeitar.style.borderColor = '#ffc1bc';
        botaoRejeitar.innerHTML = '<i class="bi bi-x-circle-fill"></i> Rejeitar';
        botaoRejeitar.addEventListener('click', function () {
            rejeitarCandidato(candidatura);
        });
        divAcoes.appendChild(botaoRejeitar);
    }
 
    tdAcoes.appendChild(divAcoes);
 
    tr.appendChild(tdProfissional);
    tr.appendChild(tdEspecialidades);
    tr.appendChild(tdDisponibilidade);
    tr.appendChild(tdStatus);
    tr.appendChild(tdAcoes);
    tbody.appendChild(tr);
}
 
/* ------------------------- ações ------------------------------------------ */
 
// Recusar: PATCH de status com Rejeitada, sem corpo.
async function rejeitarCandidato(candidatura) {
    if (acaoEmAndamento) return;
 
    const nomeCandidato = candidatura.freelancerNome || 'este candidato';
 
    const confirmou = await modalConfirmar({
        titulo: 'Rejeitar candidato',
        mensagem: `Deseja rejeitar ${nomeCandidato}? A candidatura sairá da análise e esta ação não poderá ser desfeita.`,
        textoConfirmar: 'Rejeitar',
        textoCancelar: 'Cancelar',
        perigoso: true
    });
    if (!confirmou) return;
 
    acaoEmAndamento = true;
    let textoErro = '';
 
    try {
        const query = `vagaId=${encodeURIComponent(vagaId)}`
            + `&freelancerId=${encodeURIComponent(candidatura.freelancerId)}`
            + `&statusCandidatura=Rejeitada`;
        await apiFetch(`${API_URL_CANDIDATURAS}/status?${query}`, { method: 'PATCH' });
    } catch (erro) {
        console.error('Erro ao rejeitar candidatura:', erro);
        textoErro = (erro && erro.message) || 'Não foi possível atualizar a candidatura. Tente novamente em instantes.';
    } finally {
        acaoEmAndamento = false;
    }
 
    // Sucesso ou erro: recarrega para mostrar o estado real das candidaturas.
    await carregarCandidatos();
 
    if (textoErro) {
        exibirMensagem(textoErro, 'error');
    } else {
        exibirMensagem('Candidato rejeitado.', 'success');
    }
}
 
// Selecionar: UMA chamada ao contratar (nunca PATCH com "Aceita").
async function selecionarCandidato(candidatura) {
    if (acaoEmAndamento) return;
 
    const nomeCandidato = candidatura.freelancerNome || 'este candidato';
 
    const confirmou = await modalConfirmar({
        titulo: 'Confirmar contratação',
        mensagem: `Você está prestes a contratar ${nomeCandidato}. Ao confirmar, os outros candidatos serão dispensados, a vaga será encerrada e uma Ordem de Serviço será gerada.`,
        textoConfirmar: 'Sim, contratar',
        textoCancelar: 'Cancelar'
    });
    if (!confirmou) return;
 
    acaoEmAndamento = true;
    let ordemServicoId = null;
    let textoErro = '';
 
    try {
        const resposta = await apiFetch(`${API_URL_VAGAS}/${encodeURIComponent(vagaId)}/contratar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ freelancerId: Number(candidatura.freelancerId) })
        });
 
        // Sucesso: { sucesso, mensagem, dados: { ordemServicoId } } (o helper pode já devolver só "dados").
        if (resposta) {
            ordemServicoId = resposta.ordemServicoId !== undefined
                ? resposta.ordemServicoId
                : (resposta.dados && resposta.dados.ordemServicoId);
        }
    } catch (erro) {
        console.error('Erro ao contratar candidato:', erro);
        // 400, 403, 404 e 409 trazem a mensagem do back em erro.message.
        textoErro = (erro && erro.message) || 'Não foi possível contratar o candidato. Tente novamente em instantes.';
    } finally {
        acaoEmAndamento = false;
    }
 
    if (textoErro) {
        // Recarrega: o estado pode ter mudado (vaga já encerrada, candidatura já rejeitada...).
        await carregarCandidatos();
        exibirMensagem(textoErro, 'error');
        return;
    }
 
    exibirMensagem('Candidato selecionado! Uma Ordem de Serviço foi gerada.', 'success');
 
    if (ordemServicoId) {
        setTimeout(function () {
            window.location.href = `/pages/19-ordem-servico-detalhe.html?id=${encodeURIComponent(ordemServicoId)}`;
        }, 2000);
    } else {
        // Contratou, mas o back não devolveu o id da OS: mostra a lista atualizada.
        await carregarCandidatos();
        exibirMensagem('Candidato selecionado! Uma Ordem de Serviço foi gerada.', 'success');
    }
}
 
/* ------------------------- eventos de filtro ------------------------------ */
 
filtroNome.addEventListener('input', renderizarCandidatos);
filtroStatus.addEventListener('change', renderizarCandidatos);
 
btnLimparFiltros.addEventListener('click', function () {
    filtroNome.value = '';
    filtroStatus.value = '';
    renderizarCandidatos();
});
 
if (vagaId) carregarCandidatos();
 
