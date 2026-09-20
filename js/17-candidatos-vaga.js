// Candidatos da Vaga (empresa) — padrão da 20-minhas-candidaturas

const API_URL = `${API_BASE}/candidaturas`;

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

let vagaAtual = null;
let todosCandidatos = [];

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

/* ------------------------- mensagens -------------------------------------- */

function mostrarMensagem(texto, tipo) {
    if (!mensagemStatus) return;
    mensagemStatus.className = `alert ${tipo === 'success' ? 'alert-success' : 'alert-error'}`;
    mensagemStatus.innerHTML = `<i class="bi ${tipo === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'}"></i> ${texto}`;
    mensagemStatus.removeAttribute('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function iniciais(nome) {
    const partes = String(nome || '').trim().split(' ').filter(Boolean);
    if (partes.length === 0) return '--';
    return partes.length > 1
        ? `${partes[0][0]}${partes[1][0]}`.toUpperCase()
        : partes[0].substring(0, 2).toUpperCase();
}

function classeBadgeStatus(status) {
    if (status === 'Selecionado' || status === 'Aprovado') return 'badge-success';
    if (status === 'Rejeitado' || status === 'Rejeitada' || status === 'Cancelada') return 'badge-danger';
    return 'badge-warning';
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
        const resVaga = await fetch(`${API_BASE}/vagas/${vagaId}`);
        if (!resVaga.ok) throw new Error(`Erro HTTP: ${resVaga.status}`);
        vagaAtual = await resVaga.json();

        if (String(vagaAtual.empresaId) !== String(sessao.id)) {
            loadingBar.setAttribute('hidden', '');
            erroBar.textContent = 'Esta vaga não pertence à sua empresa.';
            erroBar.removeAttribute('hidden');
            return;
        }

        tituloVagaEl.textContent = `${vagaAtual.titulo} (VG-${vagaAtual.id})`;

        // O json-server beta não filtra de forma confiável por "?vagaId="
        // (a coleção mistura ids e quebra a indexação), então filtramos no cliente.
        const resCandidaturas = await fetch(`${API_URL}?empresaId=${encodeURIComponent(sessao.id)}`);
        if (!resCandidaturas.ok) throw new Error(`Erro HTTP: ${resCandidaturas.status}`);
        const todasCandidaturas = await resCandidaturas.json();
        const candidaturas = todasCandidaturas.filter(c => String(c.vagaId) === String(vagaId));

        todosCandidatos = await Promise.all(candidaturas.map(async (candidatura) => {
            try {
                const resFreela = await fetch(`${API_BASE}/freelancers/${candidatura.freelancerId}`);
                const freela = resFreela.ok ? await resFreela.json() : null;
                return { candidatura, freela };
            } catch (erro) {
                return { candidatura, freela: null };
            }
        }));

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
        erroBar.removeAttribute('hidden');
    }
}

/* ------------------------- filtros e render ------------------------------- */

function renderizarCandidatos() {
    const termo = removerAcentos(filtroNome.value.trim().toLowerCase());
    const status = filtroStatus.value;

    const filtrados = todosCandidatos.filter(function ({ candidatura, freela }) {
        const nome = (freela && freela.nome) || candidatura.freelancerNome || '';
        const bateTermo = !termo || removerAcentos(String(nome)).toLowerCase().includes(termo);
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

function preencherLinha({ candidatura, freela }) {
    const nome = (freela && freela.nome) || candidatura.freelancerNome || 'Freelancer';
    const especialidades = (freela && Array.isArray(freela.especialidades)) ? freela.especialidades : [];
    const disponibilidade = (freela && freela.disponibilidadeHorario) || 'Não informado';
    const media = (freela && freela.mediaAvaliacoes) ? Number(freela.mediaAvaliacoes).toFixed(1) : '—';
    const totalAvaliacoes = (freela && freela.totalAvaliacoes) || 0;
    const podeAgir = candidatura.status === 'Em análise';

    const tr = document.createElement('tr');
    tr.dataset.candidaturaId = candidatura.id;

    const tdProfissional = document.createElement('td');
    const divProfissional = document.createElement('div');
    divProfissional.style.cssText = 'display: flex; align-items: center; gap: 12px;';
    const avatar = document.createElement('div');
    avatar.className = 'chat-avatar';
    avatar.textContent = iniciais(nome);
    const divInfo = document.createElement('div');
    const strongNome = document.createElement('strong');
    strongNome.textContent = nome;
    const divAvaliacao = document.createElement('div');
    divAvaliacao.style.cssText = 'font-size: 12px; color: var(--text-secondary);';
    divAvaliacao.innerHTML = `<i class="bi bi-star-fill" style="color: #f2bb55;"></i> ${media} (${totalAvaliacoes} avaliações)`;
    divInfo.appendChild(strongNome);
    divInfo.appendChild(divAvaliacao);
    divProfissional.appendChild(avatar);
    divProfissional.appendChild(divInfo);
    tdProfissional.appendChild(divProfissional);

    const tdEspecialidades = document.createElement('td');
    const divEspec = document.createElement('div');
    divEspec.style.cssText = 'display: flex; gap: 4px; flex-wrap: wrap;';
    if (especialidades.length) {
        especialidades.forEach(function (esp) {
            const badge = document.createElement('span');
            badge.className = 'badge';
            badge.style.fontSize = '10px';
            badge.textContent = esp;
            divEspec.appendChild(badge);
        });
    } else {
        const muted = document.createElement('span');
        muted.className = 'text-muted';
        muted.textContent = '—';
        divEspec.appendChild(muted);
    }
    tdEspecialidades.appendChild(divEspec);

    const tdDisponibilidade = document.createElement('td');
    tdDisponibilidade.textContent = disponibilidade;

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
            selecionarCandidato(candidatura, freela);
        });
        divAcoes.appendChild(botaoSelecionar);

        const botaoRejeitar = document.createElement('button');
        botaoRejeitar.type = 'button';
        botaoRejeitar.className = 'btn btn-outline';
        botaoRejeitar.style.color = '#d93025';
        botaoRejeitar.style.borderColor = '#ffc1bc';
        botaoRejeitar.innerHTML = '<i class="bi bi-x-circle-fill"></i> Rejeitar';
        botaoRejeitar.addEventListener('click', function () {
            rejeitarCandidato(candidatura, freela);
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

async function atualizarStatusCandidatura(candidaturaId, novoStatus) {
    try {
        const res = await fetch(`${API_URL}/${candidaturaId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: novoStatus })
        });
        if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
        return true;
    } catch (erro) {
        console.error('Erro ao atualizar candidatura:', erro);
        mostrarMensagem('Não foi possível atualizar a candidatura. Tente novamente em instantes.', 'error');
        return false;
    }
}

async function rejeitarCandidato(candidatura, freela) {
    const nomeCandidato = (freela && freela.nome) || candidatura.freelancerNome || 'este candidato';

    const confirmou = await modalConfirmar({
        titulo: 'Rejeitar candidato',
        mensagem: `Deseja rejeitar ${nomeCandidato}? A candidatura sairá da análise e esta ação não poderá ser desfeita.`,
        textoConfirmar: 'Rejeitar',
        textoCancelar: 'Cancelar',
        perigoso: true
    });
    if (!confirmou) return;

    const sucesso = await atualizarStatusCandidatura(candidatura.id, 'Rejeitado');
    if (sucesso) {
        candidatura.status = 'Rejeitado';
        renderizarCandidatos();
    }
}

async function garantirConversaDoMatch(freelancerId, freelancerNome, empresaId, empresaNome) {
    if (!freelancerId || !empresaId) return;

    try {
        const res = await fetch(`${API_BASE}/conversas`);
        if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
        const todasConversas = await res.json();

        const alvo = [String(freelancerId), String(empresaId)].sort();
        const jaExiste = todasConversas.some(function (c) {
            const par = [String(c.participanteAId), String(c.participanteBId)].sort();
            return par[0] === alvo[0] && par[1] === alvo[1];
        });

        if (jaExiste) return;

        await fetch(`${API_BASE}/conversas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                participanteAId: freelancerId,
                participanteANome: freelancerNome,
                participanteATipo: 'freelancers',
                participanteBId: empresaId,
                participanteBNome: empresaNome,
                participanteBTipo: 'empresas',
                ultimaMensagem: '',
                ultimaAtualizacao: new Date().toISOString()
            })
        });
    } catch (erro) {
        // Não bloqueia o fluxo de contratação por causa do chat.
        console.error('Erro ao garantir conversa do match:', erro);
    }
}

async function selecionarCandidato(candidatura, freela) {
    const nomeCandidato = (freela && freela.nome) || candidatura.freelancerNome || 'Freelancer';

    const confirmou = await modalConfirmar({
        titulo: 'Confirmar contratação',
        mensagem: `Você está prestes a contratar ${nomeCandidato}. Ao confirmar, os outros candidatos serão dispensados e uma Ordem de Serviço será gerada.`,
        textoConfirmar: 'Sim, contratar',
        textoCancelar: 'Cancelar'
    });
    if (!confirmou) return;

    const aprovou = await atualizarStatusCandidatura(candidatura.id, 'Selecionado');
    if (!aprovou) return;

    await garantirConversaDoMatch(candidatura.freelancerId, nomeCandidato, sessao.id, sessao.nome);

    // Vaga preenchida: encerra para não receber novas candidaturas.
    try {
        await fetch(`${API_BASE}/vagas/${vagaAtual.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Encerrada' })
        });
        vagaAtual.status = 'Encerrada';
    } catch (erro) {
        console.error('Erro ao encerrar a vaga após o match:', erro);
    }

    // Rejeita os demais candidatos ainda "Em análise" (por dado, não por DOM).
    const demais = todosCandidatos.filter(function (item) {
        return item.candidatura.id !== candidatura.id && item.candidatura.status === 'Em análise';
    });
    await Promise.all(demais.map(function (item) {
        return atualizarStatusCandidatura(item.candidatura.id, 'Rejeitado');
    }));

    const novaOS = {
        titulo: vagaAtual.titulo,
        categoria: vagaAtual.especialidade || 'A definir',
        modalidade: vagaAtual.modalidade || 'Presencial',
        empresaId: sessao.id,
        empresaNome: sessao.nome,
        freelancerId: candidatura.freelancerId,
        freelancerNome: nomeCandidato,
        cidade: vagaAtual.cidade || '',
        estado: vagaAtual.estado || '',
        valor: vagaAtual.valor || '',
        descricao: `Ordem de serviço gerada a partir da candidatura de ${nomeCandidato} para a vaga "${vagaAtual.titulo}".`,
        habilidades: [],
        status: 'Em andamento',
        dataPublicacao: new Date().toISOString(),
        prazo: vagaAtual.prazo || '',
        previsaoConclusao: '',
        avaliacaoFreelancer: 'Pendente',
        avaliacaoConfeccao: 'Pendente',
        observacoes: '',
        referenciaBriefing: '',
        referenciaEntrega: '',
        historico: [
            { data: new Date().toISOString().slice(0, 10), evento: 'OS criada a partir da seleção do candidato.' }
        ]
    };

    try {
        const res = await fetch(`${API_BASE}/ordensServico`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(novaOS)
        });
        if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);

        const criada = await res.json();

        mostrarMensagem('Candidato selecionado! Uma Ordem de Serviço foi gerada.', 'success');

        setTimeout(function () {
            window.location.href = `/pages/19-ordem-servico-detalhe.html?id=${criada.id}`;
        }, 2000);
    } catch (erro) {
        console.error('Erro ao criar Ordem de Serviço:', erro);
        mostrarMensagem('A candidatura foi aprovada, mas não foi possível gerar a Ordem de Serviço. Tente novamente em instantes.', 'error');
        carregarCandidatos();
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

carregarCandidatos();
