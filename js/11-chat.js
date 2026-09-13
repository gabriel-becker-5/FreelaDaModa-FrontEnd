document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    const API_BASE = 'http://localhost:3000';

    // ── 1. Alternador de Tema Claro / Escuro ──
    const themeToggle = document.querySelector('.theme-toggle');
    const htmlElement = document.documentElement;

    if (themeToggle) {
        themeToggle.addEventListener('click', function () {
            const atual = htmlElement.getAttribute('data-theme');
            htmlElement.setAttribute('data-theme', atual === 'dark' ? 'light' : 'dark');
        });
    }

    // ── 2. Menu Lateral no Celular (Hambúrguer) ──
    const sidebarToggleBtn = document.querySelector('.sidebar-toggle-btn');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.querySelector('.sidebar-overlay');

    if (sidebarToggleBtn && sidebar && sidebarOverlay) {
        sidebarToggleBtn.addEventListener('click', function () {
            const abrindo = !sidebar.classList.contains('open');
            sidebar.classList.toggle('open', abrindo);
            sidebarOverlay.classList.toggle('open', abrindo);
            sidebarToggleBtn.setAttribute('aria-expanded', String(abrindo));
        });
        sidebarOverlay.addEventListener('click', function () {
            sidebar.classList.remove('open');
            sidebarOverlay.classList.remove('open');
            sidebarToggleBtn.setAttribute('aria-expanded', 'false');
        });
    }

    // ── 3. Conversas ──
    const sessao = JSON.parse(sessionStorage.getItem('usuarioLogado') || 'null');
    const meuId = sessao ? sessao.id : '-DU9G2RSk6s';
    const meuNome = sessao ? sessao.nome : 'Karina Vicente';

    // índice do botão -> conversaId em "mensagens"
    const conversaPorIndice = ['conv-1', 'conv-2', 'conv-3'];

    const botoesContato = document.querySelectorAll('.chat-list .btn');
    const chatThread = document.querySelector('.chat-thread');
    const emptyState = document.querySelector('.empty-state');
    const painelThread = chatThread ? chatThread.closest('.card') : null;
    const tituloThread = painelThread ? painelThread.querySelector('strong') : null;

    let conversaAtual = null;

    function renderizarIniciais(nome) {
        const partes = (nome || '').trim().split(' ');
        return partes.length > 1 ? (partes[0][0] + partes[1][0]).toUpperCase() : (nome || '??').substring(0, 2).toUpperCase();
    }

    function renderizarMensagens(mensagens) {
        if (!chatThread) return;
        chatThread.innerHTML = '';

        mensagens.forEach(function (msg) {
            const hora = msg.timestamp
                ? new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                : '';

            if (String(msg.remetenteId) === String(meuId)) {
                const bolha = document.createElement('div');
                bolha.className = 'message-row message-row-outgoing';
                bolha.innerHTML = `${msg.conteudo}<span class="message-timestamp">${hora}</span>`;
                chatThread.appendChild(bolha);
            } else {
                const linha = document.createElement('div');
                linha.style.display = 'flex';
                linha.style.gap = '8px';
                linha.style.alignItems = 'flex-end';
                linha.innerHTML = `
                    <span class="chat-avatar">${renderizarIniciais(msg.remetenteNome)}</span>
                    <div class="message-row">${msg.conteudo}<span class="message-timestamp">${hora}</span></div>
                `;
                chatThread.appendChild(linha);
            }
        });

        chatThread.scrollTop = chatThread.scrollHeight;
    }

    async function abrirConversa(indice, nomeContato) {
        conversaAtual = conversaPorIndice[indice];
        if (!conversaAtual || !chatThread) return;

        if (emptyState) emptyState.style.display = 'none';
        if (tituloThread) tituloThread.textContent = `Conversa com ${nomeContato}`;

        botoesContato.forEach(function (b) { b.classList.remove('btn-primary'); });
        botoesContato[indice].classList.add('btn-primary');

        try {
            const res = await fetch(`${API_BASE}/mensagens?conversaId=${conversaAtual}`);
            if (!res.ok) throw new Error('Falha ao carregar mensagens.');
            const mensagens = await res.json();
            renderizarMensagens(mensagens);
        } catch (erro) {
            console.error('Erro ao carregar conversa:', erro);
            chatThread.innerHTML = '<p class="text-muted">Não foi possível carregar as mensagens.</p>';
        }
    }

    botoesContato.forEach(function (btn, indice) {
        const nomeSpan = btn.querySelector('span:last-child');
        const nomeContato = nomeSpan ? nomeSpan.textContent.trim() : `Contato ${indice + 1}`;
        btn.addEventListener('click', function () {
            abrirConversa(indice, nomeContato);
        });
    });

    // ── 4. Enviar Mensagem ──
    const inputMensagem = document.getElementById('mensagem');
    const botoesAcao = document.querySelectorAll('.cluster.mt-md .btn');
    const btnEnviar = Array.from(botoesAcao).find(function (b) { return b.textContent.includes('Enviar'); });

    async function enviarMensagem() {
        if (!inputMensagem || !chatThread || !conversaAtual) return;
        const texto = inputMensagem.value.trim();
        if (!texto) return;

        const contatoAtivo = Array.from(botoesContato).find(function (b) { return b.classList.contains('btn-primary'); });
        const nomeContato = contatoAtivo ? contatoAtivo.querySelector('span:last-child').textContent.trim() : 'Contato';
        const idContato = 'outro-' + (conversaPorIndice.indexOf(conversaAtual) + 1);

        const novaMensagem = {
            conversaId: conversaAtual,
            remetenteId: meuId,
            remetenteNome: meuNome,
            destinatarioId: conversaAtual === 'conv-1' ? '0UEUrH8HgJE' : idContato,
            destinatarioNome: nomeContato,
            conteudo: texto,
            timestamp: new Date().toISOString()
        };

        inputMensagem.value = '';

        const bolha = document.createElement('div');
        bolha.className = 'message-row message-row-outgoing animate-slide-up';
        bolha.innerHTML = `${texto}<span class="message-timestamp">agora</span>`;
        chatThread.appendChild(bolha);
        chatThread.scrollTop = chatThread.scrollHeight;

        try {
            await fetch(`${API_BASE}/mensagens`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(novaMensagem)
            });
        } catch (erro) {
            console.error('Erro ao enviar mensagem:', erro);
        }
    }

    if (btnEnviar) btnEnviar.addEventListener('click', enviarMensagem);
    if (inputMensagem) {
        inputMensagem.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                enviarMensagem();
            }
        });
    }
});
