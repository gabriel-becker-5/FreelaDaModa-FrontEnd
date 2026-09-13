const API_URL = 'http://localhost:3000/freelancers';
let todosFreelancers = [];

document.addEventListener('DOMContentLoaded', () => {
    verificarUsuarioLogado();
    carregarFreelancers();
    initFiltros();
    initTemaToggle();
});

/* -------------------------------------------------------------------------- */
/* 0. TEMA CLARO / ESCURO                                                     */
/* -------------------------------------------------------------------------- */
function initTemaToggle() {
    const botaoTema = document.querySelector('.theme-toggle');
    if (!botaoTema) return;

    botaoTema.addEventListener('click', () => {
        const atual = document.documentElement.getAttribute('data-theme');
        document.documentElement.setAttribute('data-theme', atual === 'dark' ? 'light' : 'dark');
    });
}

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
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Erro ao buscar freelancers.');

        todosFreelancers = await response.json();

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

    freelancers.forEach(freela => {
        const card = document.createElement('article');
        card.className = 'freelancer-card';

        const iniciais = iniciaisDoNome(freela.nome);
        const cidadeEstado = [
            freela.enderecoResidencial && freela.enderecoResidencial.cidade,
            freela.enderecoResidencial && freela.enderecoResidencial.estado
        ].filter(Boolean).join(' - ');

        card.innerHTML = `
            <div class="profile-avatar-lg">${iniciais}</div>
            <h3>${freela.nome}</h3>
            <span class="badge freelancer-especialidade">${freela.especialidade || 'Freelancer'}</span>
            ${cidadeEstado ? `<p class="freelancer-local"><i class="bi bi-geo-alt"></i> ${cidadeEstado}</p>` : ''}
            <p class="freelancer-rating">
                <i class="bi bi-star-fill"></i> ${(freela.mediaAvaliacoes ?? 0).toFixed(1)}
                <span>(${freela.totalAvaliacoes || 0} avaliações)</span>
            </p>
            <a href="/pages/25-perfil-freelancer-publico.html" class="btn btn-outline-primary w-full">Ver perfil</a>
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
