// Script para centralizar layouts compartilhados entre páginas de áreas logadas
// Carregar 'nav.js' sempre após 'config.js' e 'ui.js'

// Constante com os menus de navegação conforme o tipo de usuário
const MENUS = {
    freelancers: [
        { pagina: '03-dashboard-freelancer', href: '/pages/03-dashboard-freelancer.html', rotulo: 'Dashboard', icone: 'bi-grid-1x2' },
        { pagina: '07-vagas', href: '/pages/07-vagas.html', rotulo: 'Mural de Vagas', icone: 'bi-briefcase' },
        { pagina: '20-minhas-candidaturas', href: '/pages/20-minhas-candidaturas.html', rotulo: 'Minhas Candidaturas', icone: 'bi-clipboard-check' },
        { pagina: '29-minhas-os', href: '/pages/29-minhas-os.html', rotulo: 'Minhas OSs', icone: 'bi-clipboard-data' },
        { pagina: '08-perfil-freelancer', href: '/pages/08-perfil-freelancer.html', rotulo: 'Perfil', icone: 'bi-person' },
        { pagina: '11-chat', href: '/pages/11-chat.html', rotulo: 'Chat', icone: 'bi-chat-dots' }
    ],
    empresas: [
        { pagina: '04-dashboard-empresa', href: '/pages/04-dashboard-empresa.html', rotulo: 'Dashboard', icone: 'bi-grid-1x2' },
        { pagina: '15-minhas-vagas', href: '/pages/15-minhas-vagas.html', rotulo: 'Minhas Vagas', icone: 'bi-briefcase' },
        { pagina: '16-ordens-servico', href: '/pages/16-ordens-servico.html', rotulo: 'Ordens de Serviço', icone: 'bi-clipboard-data' },
        { pagina: '12-publicar-vaga', href: '/pages/12-publicar-vaga.html', rotulo: 'Publicar Vaga', icone: 'bi-plus-circle' },
        { pagina: '27-mural-freelancers', href: '/pages/27-mural-freelancers.html', rotulo: 'Buscar Freelancers', icone: 'bi-search' },
        { pagina: '11-chat', href: '/pages/11-chat.html', rotulo: 'Chat', icone: 'bi-chat-dots' },
        { pagina: '09-perfil-empresa', href: '/pages/09-perfil-empresa.html', rotulo: 'Perfil', icone: 'bi-person' }
    ]
};

const DASHBOARDS = {
    freelancers: '/pages/03-dashboard-freelancer.html',
    empresas: '/pages/04-dashboard-empresa.html'
};

// Funções de gerenciamento de sessão do usuário logado (armazenada no sessionStorage)
function obterSessao() {
    try {
        const bruto = sessionStorage.getItem('usuarioLogado');
        return bruto ? JSON.parse(bruto) : null;
    } catch (erro) {
        console.error('Sessão inválida:', erro);
        sessionStorage.removeItem('usuarioLogado');
        return null;
    }
}

function salvarSessao(sessao) {
    sessionStorage.setItem('usuarioLogado', JSON.stringify(sessao));
}

function sairSessao() {
    sessionStorage.removeItem('usuarioLogado');
    window.location.href = '/pages/02-login.html';
}

function exigirLogin() {
    const sessao = obterSessao();
    if (!sessao || !sessao.token) {
        const paginaAtual = window.location.pathname + window.location.search;
        window.location.href = `/pages/02-login.html?next=${encodeURIComponent(paginaAtual)}`;
        return null;
    }
    return sessao;
}

function exigirTipo(tipo) {
    const sessao = exigirLogin();
    if (!sessao) return null;
    if (sessao.tipo !== tipo) {
        window.location.href = DASHBOARDS[sessao.tipo] || '/pages/01-homepage.html';
        return null;
    }
    return sessao;
}

// Páginas fora do escopo do MVP: fontes preservadas no repositório, mas a
// experiência é negada — as telas chamam aplicarGuardPaginasNegadas() como
// primeira instrução de inicialização, antes de qualquer fetch ou layout.
const PAGINAS_NEGADAS = [
    '10-impulsionamento.html',
    '14-editar-os.html',
    '21-assinatura.html',
    '22-admin.html',
    '24-suporte.html'
];

function destinoPaginaNegada() {
    const sessao = obterSessao();
    if (sessao && sessao.tipo === 'freelancers') return DASHBOARDS.freelancers;
    if (sessao && sessao.tipo === 'empresas') return DASHBOARDS.empresas;
    return '/pages/01-homepage.html';
}

function paginaNegadaAtual() {
    const caminho = window.location.pathname.toLowerCase();
    return PAGINAS_NEGADAS.some(function (nome) {
        return caminho.endsWith('/pages/' + nome);
    });
}

function aplicarGuardPaginasNegadas() {
    if (!paginaNegadaAtual()) return false;
    window.location.replace(destinoPaginaNegada());
    return true;
}

// Menu mobile (hambúrguer) único — substitui os blocos locais duplicados.
// Prende os listeners de abrir/fechar em .sidebar-toggle-btn e .sidebar-overlay.
function configurarMenuMobile() {
    const botao = document.querySelector('.sidebar-toggle-btn');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    if (!botao || !sidebar || !overlay) return;

    function abrir() {
        sidebar.classList.add('open');
        overlay.classList.add('open');
        botao.classList.add('open');
        botao.setAttribute('aria-expanded', 'true');
    }
    function fechar() {
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
        botao.classList.remove('open');
        botao.setAttribute('aria-expanded', 'false');
    }

    botao.addEventListener('click', function () {
        sidebar.classList.contains('open') ? fechar() : abrir();
    });
    overlay.addEventListener('click', fechar);
}

// Função para renderizar o menu lateral (sidebar) com base no tipo de usuário e na página ativa
function renderizarSidebar(el, tipo, paginaAtiva) {
    const itens = MENUS[tipo] || [];
    const dashboard = DASHBOARDS[tipo] || '/pages/01-homepage.html';

    // Ícone conforme o tema já restaurado pelo theme.js (no <head>) — evita
    // ficar "lua" fixa em páginas que renderizam a sidebar dentro do
    // DOMContentLoaded, depois do sync do theme.js.
    const temaAtual = document.documentElement.getAttribute('data-theme');
    const iconeTema = temaAtual === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-stars';

    let html = `
        <a href="${dashboard}" class="brand">
            <img src="/assets/logo-icone-branco-2048.png" alt="Logo Freela" class="brand-logo" />
            <span class="brand-text">FREELA<span class="brand-sub">DA MODA</span></span>
        </a>
        <button class="theme-toggle" type="button" id="theme-toggle" aria-label="Alternar tema claro e escuro">
            <i class="${iconeTema}" aria-hidden="true"></i>
        </button>`;

    itens.forEach(function (item) {
        const ativa = item.pagina === paginaAtiva;
        html += `<a href="${item.href}"${ativa ? ' class="active" aria-current="page"' : ''}><i class="bi ${item.icone}"></i> ${item.rotulo}</a>`;
    });

    el.innerHTML = html;
}

// Topbar compartilhada; notificações ficam fora do MVP.
function renderizarTopbar(el, sessao) {
    const primeiroNome = (sessao.nome || '').split(' ')[0];
    el.innerHTML = `
        <span class="user-greeting">Olá, <strong>${escapeHtml(primeiroNome)}</strong></span>
        <button class="btn btn-outline" id="btn-logout"><i class="bi bi-box-arrow-right"></i> Sair</button>`;

    el.querySelector('#btn-logout').addEventListener('click', sairSessao);
}

// Função para renderizar o botão de login na topbar quando o usuário não está logado
function renderizarHeaderPublico(el) {
    const sessao = obterSessao();
    if (sessao) {
        renderizarTopbar(el, sessao);
        return;
    }
    const proxima = encodeURIComponent(window.location.pathname + window.location.search);
    el.innerHTML = `<a href="/pages/02-login.html?next=${proxima}" class="btn btn-outline-purple" id="btn-auth">Entrar</a>`;
}

function renderizarBannerValidacao(el, sessao) {
    return; // verificação fora do MVP: não mostra o banner
    const primeiroNome = (sessao.nome || '').split(' ')[0];

    const banner = document.createElement('div');
    banner.className = 'banner-validacao';
    banner.setAttribute('role', 'alert');

    const icone = document.createElement('i');
    icone.className = 'bi bi-hourglass-split';
    banner.appendChild(icone);

    const texto = document.createElement('span');
    texto.innerHTML = `Olá, <strong>${escapeHtml(primeiroNome)}</strong>! Sua conta ainda não foi validada. Envie seus documentos pelo <a href="/pages/24-suporte.html">Suporte</a> para liberar todas as funcionalidades.`;
    banner.appendChild(texto);

    el.prepend(banner);
}
