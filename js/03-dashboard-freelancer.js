const API_BASE = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', () => {
    protegerRota();
    carregarDadosFreelancer();
    carregarVagasRecomendadas();
    initLogout();
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
/* 1. PROTEÇÃO DE ROTA (Verifica se está logado como freelancer)             */
/* -------------------------------------------------------------------------- */
function protegerRota() {
    const sessao = JSON.parse(sessionStorage.getItem('usuarioLogado'));

    if (!sessao) {
        alert('Acesso restrito! Por favor, faça login para acessar seu painel.');
        window.location.href = '/pages/02-login.html';
        return;
    }

    if (sessao.tipo !== 'freelancers') {
        alert('Este painel é exclusivo para Freelancers. Redirecionando para seu painel de Empresa...');
        window.location.href = '/pages/04-dashboard-empresa.html';
    }
}

/* -------------------------------------------------------------------------- */
/* 2. CARREGAR DADOS DO PERFIL (Do db.json ou sessionStorage)                 */
/* -------------------------------------------------------------------------- */
async function carregarDadosFreelancer() {
    const sessao = JSON.parse(sessionStorage.getItem('usuarioLogado'));
    if (!sessao) return;

    try {
        const response = await fetch(`${API_BASE}/freelancers/${sessao.id}`);
        if (!response.ok) throw new Error('Não foi possível obter os dados do freelancer.');

        const freela = await response.json();

        // Atualiza elementos na tela
        const primeiroNome = freela.nome.split(' ')[0];
        document.getElementById('welcome-name').textContent = `Olá, ${primeiroNome}!`;
        document.getElementById('profile-nome').textContent = freela.nome;
        document.getElementById('profile-email').textContent = freela.email;
        document.getElementById('profile-tipo').textContent = freela.tipoNegocio || 'Autônomo';
        document.getElementById('profile-exp').textContent = freela.experiencia || 'Não informado';
        document.getElementById('profile-disp').textContent = freela.disponibilidade || 'Sob demanda';

        if (freela.enderecoResidencial) {
            document.getElementById('profile-local').textContent = `${freela.enderecoResidencial.cidade || ''} / ${freela.enderecoResidencial.estado || ''}`;
        }

        // Iniciais para o Avatar
        const partesNome = freela.nome.split(' ');
        const iniciais = partesNome.length > 1 
            ? `${partesNome[0][0]}${partesNome[1][0]}`.toUpperCase()
            : partesNome[0].substring(0, 2).toUpperCase();
        document.getElementById('avatar-iniciais').textContent = iniciais;

    } catch (error) {
        console.error('Erro ao carregar perfil:', error);
        // Fallback usando dados da sessão
        document.getElementById('welcome-name').textContent = `Olá, ${sessao.nome}!`;
        document.getElementById('profile-nome').textContent = sessao.nome;
        document.getElementById('profile-email').textContent = sessao.email;
    }
}

/* -------------------------------------------------------------------------- */
/* 3. CARREGAR VAGAS RECOMENDADAS                                             */
/* -------------------------------------------------------------------------- */
async function carregarVagasRecomendadas() {
    const container = document.getElementById('vagas-recomendadas');

    try {
        const res = await fetch(`${API_BASE}/vagas?_limit=2`);
        if (!res.ok) throw new Error('Erro ao carregar vagas.');

        const vagas = await res.json();
        container.innerHTML = '';

        if (vagas.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">Nenhuma vaga nova no momento.</p>';
            return;
        }

        vagas.forEach(vaga => {
            const vagaEl = document.createElement('div');
            vagaEl.className = 'service-item';
            vagaEl.innerHTML = `
                <div class="service-info">
                    <h3>${vaga.titulo}</h3>
                    <span>${vaga.empresaNome || 'Confecção'} • <strong>${vaga.valor}</strong></span>
                </div>
                <a href="/pages/07-vagas.html" class="btn btn-outline-purple" style="padding: 6px 14px; font-size: 0.8rem;">
                    Ver Detalhes
                </a>
            `;
            container.appendChild(vagaEl);
        });

    } catch (error) {
        container.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">Erro ao carregar recomendações.</p>';
    }
}

/* -------------------------------------------------------------------------- */
/* 4. LOGOUT                                                                  */
/* -------------------------------------------------------------------------- */
function initLogout() {
    const btnLogout = document.getElementById('btn-logout');
    btnLogout.addEventListener('click', () => {
        sessionStorage.removeItem('usuarioLogado');
        alert('Sessão encerrada com sucesso!');
        window.location.href = '/pages/02-login.html';
    });
}