const API_URL = `${API_BASE}/freelancers`;
let todosFreelancers = [];

// freelancerId -> nome do plano de impulsionamento ativo (ex.: "Pro", "Premium")
let impulsoPorFreelancer = {};

// Quanto maior, mais destaque no mural — é o que as empresas pagam pra ter
// quando assinam Impulsionamento (ver pages/10-impulsionamento.html).
const PRIORIDADE_IMPULSO = { 'Pro': 2, 'Premium': 1 };

function prioridadeDoFreelancer(freela) {
    return PRIORIDADE_IMPULSO[impulsoPorFreelancer[freela.id]] || 0;
}

function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, function (ch) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
}

document.addEventListener('DOMContentLoaded', () => {
    verificarUsuarioLogado();
    carregarFreelancers();
    initFiltros();
});

/* -------------------------------------------------------------------------- */
/* 1. VERIFICAR AUTENTICAÇÃO DO USUÁRIO                                      */
/* -------------------------------------------------------------------------- */
function verificarUsuarioLogado() {
    const sessao = JSON.parse(sessionStorage.getItem('usuarioLogado'));
    const greeting = document.getElementById('user-greeting');
    const btnAuth = document.getElementById('btn-auth');
    const linkDashboard = document.getElementById('link-dashboard');

    if (sessao) {
        greeting.textContent = `Olá, ${sessao.nome.split(' ')[0]}!`;
        btnAuth.textContent = 'Sair';
        btnAuth.href = '#';
        btnAuth.addEventListener('click', (e) => {
            e.preventDefault();
            sessionStorage.removeItem('usuarioLogado');
            window.location.reload();
        });

        linkDashboard.href = sessao.tipo === 'empresas'
            ? '/pages/04-dashboard-empresa.html'
            : '/pages/03-dashboard-freelancer.html';
    } else {
        greeting.textContent = '';
        btnAuth.textContent = 'Entrar';
        btnAuth.href = '/pages/02-login.html';
    }
}

/* -------------------------------------------------------------------------- */
/* 2. CARREGAR FREELANCERS DA API (GET)                                      */
/* -------------------------------------------------------------------------- */
async function carregarFreelancers() {
    const container = document.getElementById('lista-freelancers');
    container.innerHTML = '<div class="empty-state"><i class="bi bi-hourglass-split"></i><p>Carregando freelancers...</p></div>';

    try {
        const [response, respostaImpulsionamentos] = await Promise.all([
            fetch(API_URL),
            fetch(`${API_BASE}/impulsionamentos`)
        ]);
        if (!response.ok) throw new Error('Erro ao buscar freelancers.');

        todosFreelancers = await response.json();

        impulsoPorFreelancer = {};
        if (respostaImpulsionamentos.ok) {
            const impulsionamentos = await respostaImpulsionamentos.json();
            impulsionamentos
                .filter(function (imp) { return imp.status === 'ativo'; })
                .forEach(function (imp) { impulsoPorFreelancer[imp.freelancerId] = imp.plano; });
        }

        popularFiltroEspecialidades(todosFreelancers);

        // vindo da lupa da Home via ?busca=
        const termoDaUrl = new URLSearchParams(window.location.search).get('busca');
        if (termoDaUrl) {
            const inputBusca = document.getElementById('filtro-busca');
            if (inputBusca) inputBusca.value = termoDaUrl;
            renderizarFreelancers(filtrarPorTermo(todosFreelancers, termoDaUrl));
        } else {
            renderizarFreelancers(todosFreelancers);
        }
    } catch (error) {
        console.error(error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-exclamation-triangle"></i>
                <p>Não foi possível carregar os freelancers. Certifique-se de que a API (json-server) está ativa.</p>
            </div>
        `;
    }
}

function popularFiltroEspecialidades(freelancers) {
    const select = document.getElementById('filtro-especialidade');
    if (!select) return;

    const especialidades = [...new Set(
        freelancers.flatMap(f => (f.especialidades && f.especialidades.length) ? f.especialidades : [f.especialidade]).filter(Boolean)
    )].sort((a, b) => a.localeCompare(b, 'pt-BR'));

    especialidades.forEach(esp => {
        const option = document.createElement('option');
        option.value = esp;
        option.textContent = esp;
        select.appendChild(option);
    });
}

function filtrarPorTermo(freelancers, termoBruto) {
    const termo = (termoBruto || '').toLowerCase().trim();
    if (!termo) return freelancers;

    return freelancers.filter(f =>
        f.nome.toLowerCase().includes(termo) ||
        (f.especialidade || '').toLowerCase().includes(termo) ||
        (f.especialidades || []).some(e => e.toLowerCase().includes(termo))
    );
}

/* -------------------------------------------------------------------------- */
/* 3. RENDERIZAR CARDS NO HTML                                                */
/* -------------------------------------------------------------------------- */
function renderizarFreelancers(freelancers) {
    const container = document.getElementById('lista-freelancers');
    container.innerHTML = '';

    if (freelancers.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-inbox"></i>
                <h3>Nenhum freelancer encontrado</h3>
                <p>Tente ajustar os filtros ou pesquisar por outro termo.</p>
            </div>
        `;
        return;
    }

    // Quem impulsionou o perfil (Pro/Premium) aparece primeiro — é o que a
    // empresa está pagando por em pages/10-impulsionamento.html. Ordenação
    // estável: dentro do mesmo nível de destaque, mantém a ordem original.
    const freelancersOrdenados = freelancers
        .map(function (freela, indice) { return { freela: freela, indice: indice }; })
        .sort(function (a, b) {
            const diferenca = prioridadeDoFreelancer(b.freela) - prioridadeDoFreelancer(a.freela);
            return diferenca !== 0 ? diferenca : a.indice - b.indice;
        })
        .map(function (item) { return item.freela; });

    freelancersOrdenados.forEach(freela => {
        const card = document.createElement('article');
        const plano = impulsoPorFreelancer[freela.id];
        card.className = 'freelancer-card' + (plano ? ' freelancer-card-destaque' : '');

        const iniciais = iniciaisDoNome(freela.nome);
        const cidadeEstado = [
            freela.enderecoResidencial && freela.enderecoResidencial.cidade,
            freela.enderecoResidencial && freela.enderecoResidencial.estado
        ].filter(Boolean).join(' - ');

        card.innerHTML = `
            ${plano ? `<span class="badge badge-primary-bg freelancer-badge-destaque"><i class="bi bi-star-fill"></i> Destaque ${escapeHtml(plano)}</span>` : ''}
            <div class="profile-avatar-lg">${escapeHtml(iniciais)}</div>
            <h3>${escapeHtml(freela.nome)}</h3>
            <span class="badge freelancer-especialidade">${escapeHtml(freela.especialidade || 'Freelancer')}</span>
            ${cidadeEstado ? `<p class="freelancer-local"><i class="bi bi-geo-alt"></i> ${escapeHtml(cidadeEstado)}</p>` : ''}
            <p class="freelancer-rating">
                <i class="bi bi-star-fill"></i> ${(freela.mediaAvaliacoes ?? 0).toFixed(1)}
                <span>(${freela.totalAvaliacoes || 0} avaliações)</span>
            </p>
            <a href="/pages/25-perfil-freelancer-publico.html?id=${encodeURIComponent(freela.id)}" class="btn btn-outline-primary w-full">Ver perfil</a>
        `;

        container.appendChild(card);
    });
}

function iniciaisDoNome(nome) {
    const partes = (nome || '').trim().split(' ');
    return partes.length > 1
        ? (partes[0][0] + partes[1][0]).toUpperCase()
        : (nome || '??').substring(0, 2).toUpperCase();
}

/* -------------------------------------------------------------------------- */
/* 4. FILTROS DE BUSCA E ESPECIALIDADE                                        */
/* -------------------------------------------------------------------------- */
function initFiltros() {
    const inputBusca = document.getElementById('filtro-busca');
    const selectEspecialidade = document.getElementById('filtro-especialidade');
    const btnLimpar = document.getElementById('btn-limpar-filtros');

    const aplicarFiltros = () => {
        const termo = inputBusca.value.toLowerCase().trim();
        const esp = selectEspecialidade.value;

        const filtrados = todosFreelancers.filter(freela => {
            const bateTermo =
                !termo ||
                freela.nome.toLowerCase().includes(termo) ||
                (freela.especialidade || '').toLowerCase().includes(termo) ||
                (freela.especialidades || []).some(e => e.toLowerCase().includes(termo));

            const bateEsp = esp === '' || (freela.especialidades || [freela.especialidade]).includes(esp);

            return bateTermo && bateEsp;
        });

        renderizarFreelancers(filtrados);
    };

    inputBusca.addEventListener('input', aplicarFiltros);
    selectEspecialidade.addEventListener('change', aplicarFiltros);

    btnLimpar.addEventListener('click', () => {
        inputBusca.value = '';
        selectEspecialidade.value = '';
        renderizarFreelancers(todosFreelancers);
    });
}
