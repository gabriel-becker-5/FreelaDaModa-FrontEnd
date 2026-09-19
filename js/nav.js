// Script para centralizar layouts compartilhados entre páginas de áreas logadas
// Carregar 'nav.js' sempre após 'config.js' e 'ui.js'

// Constante com os menus de navegação conforme o tipo de usuário
const MENUS = {
    freelancers: [
        { pagina: '03-dashboard-freelancer', href: '/pages/03-dashboard-freelancer.html', rotulo: 'Dashboard', icone: 'bi-grid-1x2' },
        { pagina: '07-vagas', href: '/pages/07-vagas.html', rotulo: 'Vagas', icone: 'bi-briefcase' },
        { pagina: '20-minhas-candidaturas', href: '/pages/20-minhas-candidaturas.html', rotulo: 'Candidaturas/OS', icone: 'bi-clipboard-check' },
        { pagina: '08-perfil-freelancer', href: '/pages/08-perfil-freelancer.html', rotulo: 'Perfil', icone: 'bi-person' },
        { pagina: '11-chat', href: '/pages/11-chat.html', rotulo: 'Chat', icone: 'bi-chat-dots' },
        { pagina: '10-impulsionamento', href: '/pages/10-impulsionamento.html', rotulo: 'Impulsionamento', icone: 'bi-rocket-takeoff' },
        { pagina: '24-suporte', href: '/pages/24-suporte.html', rotulo: 'Suporte', icone: 'bi-headset' }
    ],
    empresas: [
        { pagina: '04-dashboard-empresa', href: '/pages/04-dashboard-empresa.html', rotulo: 'Dashboard', icone: 'bi-grid-1x2' },
        { pagina: '12-publicar-vaga', href: '/pages/12-publicar-vaga.html', rotulo: 'Publicar Vaga', icone: 'bi-plus-circle' },
        { pagina: '15-minhas-vagas', href: '/pages/15-minhas-vagas.html', rotulo: 'Minhas Vagas', icone: 'bi-briefcase' },
        { pagina: '27-mural-freelancers', href: '/pages/27-mural-freelancers.html', rotulo: 'Buscar Freelancers', icone: 'bi-search' },
        { pagina: '11-chat', href: '/pages/11-chat.html', rotulo: 'Chat', icone: 'bi-chat-dots' },
        { pagina: '16-ordens-servico', href: '/pages/16-ordens-servico.html', rotulo: 'Ordens de Serviço', icone: 'bi-clipboard-data' },
        { pagina: '09-perfil-empresa', href: '/pages/09-perfil-empresa.html', rotulo: 'Perfil', icone: 'bi-person' },
        { pagina: '21-assinatura', href: '/pages/21-assinatura.html', rotulo: 'Assinatura', icone: 'bi-credit-card' },
        { pagina: '24-suporte', href: '/pages/24-suporte.html', rotulo: 'Suporte', icone: 'bi-headset' }
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
    if (!sessao) {
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
        window.location.href = DASHBOARDS[tipo] || '/pages/01-homepage.html';
        return null;
    }
    return sessao;
}

// Função para renderizar o menu lateral (sidebar) com base no tipo de usuário e na página ativa
function renderizarSidebar(el, tipo, paginaAtiva) {
    const itens = MENUS[tipo] || [];
    const dashboard = DASHBOARDS[tipo] || '/pages/01-homepage.html';

    let html = `
        <a href="${dashboard}" class="brand">
            <img src="/assets/logo-icone-branco-2048.png" alt="Logo Freela" class="brand-logo" />
            <span class="brand-text">FREELA<span class="brand-sub">DA MODA</span></span>
        </a>
        <button class="theme-toggle" type="button" id="theme-toggle" aria-label="Alternar tema claro e escuro">
            <i class="bi bi-moon-stars" aria-hidden="true"></i>
        </button>`;

    itens.forEach(function (item) {
        const ativa = item.pagina === paginaAtiva;
        html += `<a href="${item.href}"${ativa ? ' class="active" aria-current="page"' : ''}><i class="bi ${item.icone}"></i> ${item.rotulo}</a>`;
    });

    el.innerHTML = html;
}

// Função com HTML puro que cria o sino de notificações no topo da página, com dropdown e contagem de notificações não lidas
function montarSinoNotificacoes(wrapperEl, sessao) {
    wrapperEl.innerHTML = `
        <button class="btn btn-outline" id="btn-notificacoes" aria-label="Notificações" aria-haspopup="true" aria-expanded="false">
            <i class="bi bi-bell"></i>
            <span class="notif-badge" id="notif-badge" hidden>0</span>
        </button>
        <div class="notif-dropdown" id="notif-dropdown" hidden>
            <div class="notif-dropdown-header">
                <strong>Notificações</strong>
                <button type="button" id="btn-marcar-todas-lidas" class="btn btn-ghost" style="font-size: 12px; padding: 2px 6px;">Marcar todas como lidas</button>
            </div>
            <div id="notif-lista"></div>
        </div>`;

    const botao = wrapperEl.querySelector('#btn-notificacoes');
    const dropdown = wrapperEl.querySelector('#notif-dropdown');
    const lista = wrapperEl.querySelector('#notif-lista');
    const badge = wrapperEl.querySelector('#notif-badge');
    const botaoLidas = wrapperEl.querySelector('#btn-marcar-todas-lidas');

    let notificacoes = [];

    async function carregar() {
        try {
            const res = await fetch(`${API_BASE}/notificacoes?usuarioId=${encodeURIComponent(sessao.id)}&usuarioTipo=${encodeURIComponent(sessao.tipo)}&_sort=criadoEm&_order=desc&_limit=10`);
            if (!res.ok) throw new Error('Falha ao carregar notificações');
            notificacoes = await res.json();
        } catch (erro) {
            console.error('Erro ao carregar notificações:', erro);
            notificacoes = [];
        }
        renderizar();
    }

    function renderizar() {
        const naoLidas = notificacoes.filter(function (n) { return !n.lida; }).length;
        badge.textContent = naoLidas;
        badge.hidden = naoLidas === 0;

        lista.innerHTML = '';
        if (!notificacoes.length) {
            const vazio = document.createElement('div');
            vazio.className = 'notif-item';
            vazio.textContent = 'Nenhuma notificação por enquanto.';
            lista.appendChild(vazio);
            return;
        }
        notificacoes.forEach(function (notificacao) {
            const item = document.createElement('div');
            item.className = 'notif-item' + (notificacao.lida ? '' : ' notif-nao-lida');

            const titulo = document.createElement('strong');
            titulo.textContent = notificacao.titulo;
            const mensagem = document.createElement('span');
            mensagem.textContent = notificacao.mensagem;

            item.appendChild(titulo);
            item.appendChild(mensagem);
            item.addEventListener('click', function () {
                marcarLida(notificacao);
                if (notificacao.link && String(notificacao.link).startsWith('/pages/')) {
                    window.location.href = notificacao.link;
                }
            });
            lista.appendChild(item);
        });
    }

    async function marcarLida(notificacao) {
        if (notificacao.lida) return;
        try {
            const res = await fetch(`${API_BASE}/notificacoes/${notificacao.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lida: true })
            });
            if (!res.ok) throw new Error('Falha ao marcar notificação');
            notificacao.lida = true;
            renderizar();
        } catch (erro) {
            console.error('Erro ao marcar notificação como lida:', erro);
        }
    }

    botao.addEventListener('click', function () {
        const abrir = dropdown.hidden;
        dropdown.hidden = !abrir;
        botao.setAttribute('aria-expanded', String(abrir));
    });

    botaoLidas.addEventListener('click', function () {
        notificacoes.filter(function (n) { return !n.lida; }).forEach(marcarLida);
    });

    document.addEventListener('click', function (evento) {
        if (!wrapperEl.contains(evento.target)) {
            dropdown.hidden = true;
            botao.setAttribute('aria-expanded', 'false');
        }
    });

    carregar();
}

// Função para renderizar a topbar com saudação ao usuário, o sino de notificações e o botão de logout
function renderizarTopbar(el, sessao) {
    const primeiroNome = (sessao.nome || '').split(' ')[0];
    el.innerHTML = `
        <span class="user-greeting">Olá, <strong>${escapeHtml(primeiroNome)}</strong></span>
        <div class="notif-bell-wrapper"></div>
        <button class="btn btn-outline" id="btn-logout"><i class="bi bi-box-arrow-right"></i> Sair</button>`;

    montarSinoNotificacoes(el.querySelector('.notif-bell-wrapper'), sessao);
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
    if (!sessao || sessao.validado === true) return;
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