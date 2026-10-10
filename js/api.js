function getSessao() {
    try {
        return JSON.parse(sessionStorage.getItem('usuarioLogado'));
    } catch (e) {
        return null;
    }
}

function getToken() {
    const sessao = getSessao();
    return sessao ? sessao.token : null;
}

function sairParaLogin() {
    sessionStorage.removeItem('usuarioLogado');
    if (!window.location.pathname.includes('02-login')) {
        window.location.href = '/pages/02-login.html';
    }
}

function extrairMensagemErro(corpo, texto, status) {
    if (corpo && typeof corpo === 'object') {
        if (corpo.mensagem) return corpo.mensagem;
        if (corpo.message) return corpo.message;
        if (corpo.errors) {
            const lista = Object.values(corpo.errors).flat();
            if (lista.length) return lista.join(' ');
        }
        if (corpo.title) return corpo.title;
    }
    if (texto && !corpo) return texto;
    return `Erro ${status}. Tente novamente.`;
}

async function api(caminho, opcoes = {}) {
    const { method = 'GET', body, semRedirect = false } = opcoes;

    const headers = {};
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let corpoEnvio;
    if (body instanceof FormData) {
        corpoEnvio = body;
    } else if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
        corpoEnvio = JSON.stringify(body);
    }

    let resposta;
    try {
        resposta = await fetch(`${API_BASE}${caminho}`, { method, headers, body: corpoEnvio });
    } catch (e) {
        const erro = new Error('Não foi possível conectar ao servidor.');
        erro.status = 0;
        throw erro;
    }

    // lê como texto para não quebrar quando a resposta vem sem corpo
    const texto = await resposta.text();
    let json = null;
    if (texto) {
        try { json = JSON.parse(texto); } catch (e) { json = null; }
    }

    if (!resposta.ok) {
        if (resposta.status === 401 && !semRedirect) {
            sairParaLogin();
        }
        const erro = new Error(extrairMensagemErro(json, texto, resposta.status));
        erro.status = resposta.status;
        throw erro;
    }

    if (json && json.dados !== undefined && json.dados !== null) return json.dados;
    return json;
}