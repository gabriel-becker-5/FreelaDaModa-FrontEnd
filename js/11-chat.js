document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    // ── 1. Menu Lateral no Celular (Hambúrguer) ──
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

    // ── 2. Proteção de rota + layout logado (nav.js por tipo) ──
    const sessao = exigirLogin();
    if (!sessao) return;

    renderizarSidebar(document.querySelector('.sidebar'), sessao.tipo, '11-chat');
    renderizarTopbar(document.getElementById('header-acoes'), sessao);
    renderizarBannerValidacao(document.querySelector('.main'), sessao);

    const meuId = sessao.id;
    const meuNome = sessao.nome;

    function mostrarMensagem(texto, tipo) {
        const el = document.getElementById('mensagemStatus');
        if (!el) return;
        el.className = `alert alert-${tipo}`;
        el.innerHTML = `<i class="bi ${tipo === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'}"></i> ${escapeHtml(texto)}`;
        el.hidden = false;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function renderizarIniciais(nome) {
        const partes = (nome || '').trim().split(' ');
        return partes.length > 1 ? (partes[0][0] + partes[1][0]).toUpperCase() : (nome || '??').substring(0, 2).toUpperCase();
    }

    // ── 3. Carregar as conversas em que EU sou participante (matches reais) ──
    // Filtra no cliente: participanteAId/participanteBId são dois campos possíveis
    // para "a outra parte", e o json-server deste projeto não faz filtro "OR"
    // entre dois campos via query string.
    const listaConversas = document.getElementById('lista-conversas');
    const chatThread = document.getElementById('chat-thread');
    const emptyStateThread = document.getElementById('empty-state-thread');
    const areaEnvioMensagem = document.getElementById('area-envio-mensagem');
    const tituloThread = document.getElementById('titulo-thread');

    let minhasConversas = [];
    let conversaAtual = null;
    let outraParteAtual = null;

    function outraParte(conversa) {
        if (String(conversa.participanteAId) === String(meuId)) {
            return { id: conversa.participanteBId, nome: conversa.participanteBNome, tipo: conversa.participanteBTipo };
        }
        return { id: conversa.participanteAId, nome: conversa.participanteANome, tipo: conversa.participanteATipo };
    }

    async function carregarConversas() {
        try {
            const res = await fetch(`${API_BASE}/conversas`);
            if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
            const todasConversas = await res.json();

            minhasConversas = todasConversas.filter(function (c) {
                return String(c.participanteAId) === String(meuId) || String(c.participanteBId) === String(meuId);
            });

            renderizarListaConversas();

            // Veio de um link direto (ex.: preview de mensagens no dashboard) —
            // abre essa conversa automaticamente.
            const conversaIdDaUrl = new URLSearchParams(window.location.search).get('conversaId');
            if (conversaIdDaUrl) {
                const conversaAlvo = minhasConversas.find(function (c) { return String(c.id) === String(conversaIdDaUrl); });
                if (conversaAlvo) abrirConversa(conversaAlvo);
            }
        } catch (erro) {
            console.error('Erro ao carregar conversas:', erro);
            if (listaConversas) listaConversas.innerHTML = '<p class="text-muted" style="font-size: 13px;">Não foi possível carregar suas conversas.</p>';
        }
    }

    function renderizarListaConversas() {
        if (!listaConversas) return;
        listaConversas.innerHTML = '';

        if (minhasConversas.length === 0) {
            listaConversas.innerHTML = '<p class="text-muted" style="font-size: 13px; margin-top: 8px;">Você ainda não tem nenhuma conversa. Elas aparecem aqui automaticamente depois que uma candidatura for aprovada (match).</p>';
            return;
        }

        // Mais recentes primeiro
        const ordenadas = minhasConversas.slice().sort(function (a, b) {
            return new Date(b.ultimaAtualizacao || 0) - new Date(a.ultimaAtualizacao || 0);
        });

        ordenadas.forEach(function (conversa) {
            const contato = outraParte(conversa);
            const btn = document.createElement('button');
            btn.className = 'btn';
            btn.style.cssText = 'justify-content: flex-start; gap: 10px; width: 100%;';
            btn.dataset.conversaId = conversa.id;
            btn.innerHTML = `
                <span class="chat-avatar" style="width: 28px; height: 28px; font-size: 12px;">${escapeHtml(renderizarIniciais(contato.nome))}</span>
                <span style="text-align:left; overflow:hidden;">
                    <strong style="display:block; font-size:14px;">${escapeHtml(contato.nome || 'Contato')}</strong>
                    <span class="text-muted" style="font-size:12px; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(conversa.ultimaMensagem || '')}</span>
                </span>
            `;
            btn.addEventListener('click', function () {
                abrirConversa(conversa);
            });
            listaConversas.appendChild(btn);
        });
    }

    function renderizarMensagens(mensagens) {
        if (!chatThread) return;
        chatThread.innerHTML = '';

        mensagens.forEach(function (msg) {
            const dataMsg = msg.timestamp ? new Date(msg.timestamp) : null;
            const hora = dataMsg && !isNaN(dataMsg)
                ? dataMsg.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                : '';

            if (String(msg.remetenteId) === String(meuId)) {
                const bolha = document.createElement('div');
                bolha.className = 'message-row message-row-outgoing';
                bolha.innerHTML = `${escapeHtml(msg.conteudo)}<span class="message-timestamp">${hora}</span>`;
                chatThread.appendChild(bolha);
            } else {
                const linha = document.createElement('div');
                linha.style.display = 'flex';
                linha.style.gap = '8px';
                linha.style.alignItems = 'flex-end';
                linha.innerHTML = `
                    <span class="chat-avatar">${escapeHtml(renderizarIniciais(msg.remetenteNome))}</span>
                    <div class="message-row">${escapeHtml(msg.conteudo)}<span class="message-timestamp">${hora}</span></div>
                `;
                chatThread.appendChild(linha);
            }
        });

        chatThread.scrollTop = chatThread.scrollHeight;
    }

    async function abrirConversa(conversa) {
        conversaAtual = conversa;
        outraParteAtual = outraParte(conversa);

        listaConversas.querySelectorAll('button').forEach(function (b) {
            b.classList.toggle('btn-primary', b.dataset.conversaId === String(conversa.id));
        });

        if (tituloThread) tituloThread.textContent = `Conversa com ${outraParteAtual.nome || 'contato'}`;
        if (emptyStateThread) emptyStateThread.hidden = true;
        if (areaEnvioMensagem) areaEnvioMensagem.hidden = false;

        try {
            const res = await fetch(`${API_BASE}/mensagens?conversaId=${conversa.id}`);
            if (!res.ok) throw new Error('Falha ao carregar mensagens.');
            const mensagens = await res.json();
            renderizarMensagens(mensagens);

            // Marca como lidas as mensagens recebidas por mim nesta conversa.
            mensagens
                .filter(function (m) { return String(m.destinatarioId) === String(meuId) && m.lida === false; })
                .forEach(function (m) {
                    fetch(`${API_BASE}/mensagens/${m.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ lida: true })
                    }).catch(function (erro) { console.error('Erro ao marcar mensagem como lida:', erro); });
                });
        } catch (erro) {
            console.error('Erro ao carregar conversa:', erro);
            chatThread.innerHTML = '<p class="text-muted">Não foi possível carregar as mensagens.</p>';
        }
    }

    carregarConversas();

    // ── 4. Enviar Mensagem ──
    const inputMensagem = document.getElementById('mensagem');
    const btnEnviar = document.getElementById('btn-enviar-mensagem');

    async function enviarMensagem() {
        if (!inputMensagem || !chatThread || !conversaAtual || !outraParteAtual) return;
        const texto = inputMensagem.value.trim();
        if (!texto) return;

        const novaMensagem = {
            conversaId: conversaAtual.id,
            remetenteId: meuId,
            remetenteNome: meuNome,
            destinatarioId: outraParteAtual.id,
            destinatarioNome: outraParteAtual.nome,
            conteudo: texto,
            timestamp: new Date().toISOString(),
            lida: false
        };

        inputMensagem.value = '';

        const bolha = document.createElement('div');
        bolha.className = 'message-row message-row-outgoing animate-slide-up';
        bolha.innerHTML = `${escapeHtml(texto)}<span class="message-timestamp">agora</span>`;
        chatThread.appendChild(bolha);
        chatThread.scrollTop = chatThread.scrollHeight;

        try {
            const resPost = await fetch(`${API_BASE}/mensagens`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(novaMensagem)
            });
            if (!resPost.ok) throw new Error(`Erro HTTP: ${resPost.status}`);

            // Mantém a conversa com o preview da última mensagem atualizado.
            // Falha aqui é cosmética: a mensagem já foi gravada, então a bolha
            // permanece e apenas registramos o erro.
            try {
                const resPreview = await fetch(`${API_BASE}/conversas/${conversaAtual.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ultimaMensagem: texto, ultimaAtualizacao: novaMensagem.timestamp })
                });
                if (!resPreview.ok) console.error(`Falha ao atualizar preview da conversa (HTTP ${resPreview.status}).`);
            } catch (erroPreview) {
                console.error('Erro ao atualizar preview da conversa:', erroPreview);
            }

            conversaAtual.ultimaMensagem = texto;
            conversaAtual.ultimaAtualizacao = novaMensagem.timestamp;
        } catch (erro) {
            console.error('Erro ao enviar mensagem:', erro);
            // Reverte a bolha otimista e devolve o texto pro campo.
            if (bolha && bolha.parentNode) bolha.remove();
            inputMensagem.value = texto;
            mostrarMensagem('Não foi possível enviar a mensagem. Tente novamente em instantes.', 'error');
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
