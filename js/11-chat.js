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

    // ── 2. Proteção de rota + layout logado ──
    const sessao = exigirLogin();
    if (!sessao) return;

    renderizarSidebar(sidebar, sessao.tipo, '11-chat');
    renderizarTopbar(document.getElementById('header-acoes'), sessao);
    renderizarBannerValidacao(document.querySelector('.main'), sessao);

    const meuId = sessao.id;
    const listaConversas = document.getElementById('lista-conversas');
    const chatThread = document.getElementById('chat-thread');
    const emptyStateThread = document.getElementById('empty-state-thread');
    const areaEnvioMensagem = document.getElementById('area-envio-mensagem');
    const tituloThread = document.getElementById('titulo-thread');
    const inputMensagem = document.getElementById('mensagem');
    const btnEnviar = document.getElementById('btn-enviar-mensagem');

    let conversas = [];
    let conversaAtual = null;

    async function nomeDoContato(contatoId) {
        const ehEmpresa = sessao.tipo === 'freelancers';
        const caminho = ehEmpresa
            ? `/Company/exibirPerfilPublicoEmpresa?userId=${encodeURIComponent(contatoId)}`
            : `/Freelancer/exibirPerfilPublicoFreelancer?userId=${encodeURIComponent(contatoId)}`;
        try {
            const perfil = await api(caminho, { semRedirect: true });
            const nome = perfil && (ehEmpresa ? perfil.companyName : perfil.legalResponsibleFullName);
            return typeof nome === 'string' && nome.trim() ? nome.trim() : '—';
        } catch (erro) {
            return '—';
        }
    }

    function dataDaMensagem(msg) {
        const data = msg && msg.dataEnvio ? new Date(msg.dataEnvio).getTime() : 0;
        return Number.isFinite(data) ? data : 0;
    }

    function ordenarMensagens(mensagens) {
        mensagens.sort(function (a, b) {
            return dataDaMensagem(a) - dataDaMensagem(b) || (Number(a.id) || 0) - (Number(b.id) || 0);
        });
    }

    function novaConversa(contatoId) {
        return { contatoId: String(contatoId), nome: '—', mensagens: [], rascunho: '', enviando: false };
    }

    // ── 3. Mensagens agrupadas pelo contato ──
    async function carregarConversas() {
        try {
            const mensagens = await api('/Mensagem/listar');
            const porContato = new Map();
            (Array.isArray(mensagens) ? mensagens : []).forEach(function (msg) {
                const contatoId = String(String(msg.remetenteId) === String(meuId) ? msg.destinatarioId : msg.remetenteId);
                if (!porContato.has(contatoId)) porContato.set(contatoId, novaConversa(contatoId));
                porContato.get(contatoId).mensagens.push(msg);
            });

            const contatoDaUrl = new URLSearchParams(window.location.search).get('contatoId');
            const idDaUrl = Number(contatoDaUrl);
            const contatoValido = Number.isSafeInteger(idDaUrl) && idDaUrl > 0;
            const contatoId = contatoValido ? String(idDaUrl) : null;

            // Inclui o contato sem histórico antes de resolver os nomes e abrir a tela.
            if (contatoId && !porContato.has(contatoId)) porContato.set(contatoId, novaConversa(contatoId));
            conversas = Array.from(porContato.values());
            await Promise.all(conversas.map(async function (conversa) {
                ordenarMensagens(conversa.mensagens);
                conversa.nome = await nomeDoContato(conversa.contatoId);
            }));

            renderizarListaConversas();
            if (contatoId) abrirConversa(porContato.get(contatoId));
            else if (contatoDaUrl) mostrarMensagem('O contato informado é inválido.', 'error');
        } catch (erro) {
            console.error('Erro ao carregar conversas:', erro);
            if (listaConversas) {
                listaConversas.innerHTML = '<p class="text-muted" style="font-size: 13px;">Não foi possível carregar suas conversas. Recarregue a página para tentar novamente.</p>';
            }
        }
    }

    function renderizarListaConversas() {
        if (!listaConversas) return;
        listaConversas.innerHTML = '';

        if (conversas.length === 0) {
            listaConversas.innerHTML = '<p class="text-muted" style="font-size: 13px; margin-top: 8px;">Você ainda não tem nenhuma conversa. Elas aparecem aqui quando você troca mensagens com alguém.</p>';
            return;
        }

        const ordenadas = conversas.slice().sort(function (a, b) {
            return dataDaMensagem(b.mensagens[b.mensagens.length - 1]) - dataDaMensagem(a.mensagens[a.mensagens.length - 1]);
        });

        ordenadas.forEach(function (conversa) {
            const ultima = conversa.mensagens[conversa.mensagens.length - 1];
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn';
            btn.style.cssText = 'justify-content: flex-start; gap: 10px; width: 100%;';
            btn.dataset.contatoId = conversa.contatoId;
            if (conversaAtual === conversa) btn.classList.add('btn-primary');
            btn.innerHTML = `
                <span class="chat-avatar" style="width: 28px; height: 28px; font-size: 12px;">${escapeHtml(calcularIniciais(conversa.nome))}</span>
                <span style="text-align:left; overflow:hidden;">
                    <strong style="display:block; font-size:14px;">${escapeHtml(conversa.nome)}</strong>
                    <span class="text-muted" style="font-size:12px; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(ultima ? ultima.conteudo : 'Envie a primeira mensagem.')}</span>
                </span>
            `;
            btn.addEventListener('click', function () { abrirConversa(conversa); });
            listaConversas.appendChild(btn);
        });
    }

    function renderizarMensagens(conversa) {
        if (!chatThread) return;
        chatThread.innerHTML = '';

        conversa.mensagens.forEach(function (msg) {
            const dataMsg = msg.dataEnvio ? new Date(msg.dataEnvio) : null;
            const hora = msg.pendente ? 'agora' : dataMsg && !isNaN(dataMsg.getTime())
                ? dataMsg.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                : '';

            if (String(msg.remetenteId) === String(meuId)) {
                const bolha = document.createElement('div');
                bolha.className = 'message-row message-row-outgoing' + (msg.pendente ? ' animate-slide-up' : '');
                bolha.innerHTML = `${escapeHtml(msg.conteudo)}<span class="message-timestamp">${escapeHtml(hora)}</span>`;
                chatThread.appendChild(bolha);
            } else {
                const linha = document.createElement('div');
                linha.style.display = 'flex';
                linha.style.gap = '8px';
                linha.style.alignItems = 'flex-end';
                linha.innerHTML = `
                    <span class="chat-avatar">${escapeHtml(calcularIniciais(conversa.nome))}</span>
                    <div class="message-row">${escapeHtml(msg.conteudo)}<span class="message-timestamp">${escapeHtml(hora)}</span></div>
                `;
                chatThread.appendChild(linha);
            }
        });

        chatThread.scrollTop = chatThread.scrollHeight;
    }

    function atualizarAreaEnvio() {
        if (inputMensagem) {
            inputMensagem.value = conversaAtual ? conversaAtual.rascunho : '';
            inputMensagem.disabled = !conversaAtual || conversaAtual.enviando;
        }
        if (btnEnviar) btnEnviar.disabled = !conversaAtual || conversaAtual.enviando;
    }

    function abrirConversa(conversa) {
        if (conversaAtual && inputMensagem) conversaAtual.rascunho = inputMensagem.value;
        conversaAtual = conversa;

        if (listaConversas) {
            listaConversas.querySelectorAll('button').forEach(function (b) {
                b.classList.toggle('btn-primary', b.dataset.contatoId === conversa.contatoId);
            });
        }
        if (tituloThread) tituloThread.textContent = `Conversa com ${conversa.nome}`;
        if (emptyStateThread) emptyStateThread.hidden = true;
        if (areaEnvioMensagem) areaEnvioMensagem.hidden = false;
        atualizarAreaEnvio();
        renderizarMensagens(conversa);
    }

    // ── 4. Envio otimista, com estado e rascunho preservados por contato ──
    async function enviarMensagem() {
        if (!inputMensagem || !chatThread || !conversaAtual || conversaAtual.enviando) return;
        const texto = inputMensagem.value.trim();
        if (!texto) return;

        // A resposta pertence à conversa capturada, mesmo se o usuário selecionar outra.
        const conversa = conversaAtual;
        const destinatarioId = Number(conversa.contatoId);
        const pendente = {
            remetenteId: meuId,
            destinatarioId: destinatarioId,
            conteudo: texto,
            dataEnvio: new Date().toISOString(),
            pendente: true
        };

        conversa.enviando = true;
        conversa.rascunho = '';
        conversa.mensagens.push(pendente);
        ordenarMensagens(conversa.mensagens);
        atualizarAreaEnvio();
        renderizarMensagens(conversa);
        renderizarListaConversas();
        const mensagemStatus = document.getElementById('mensagemStatus');
        if (mensagemStatus) mensagemStatus.hidden = true;

        try {
            const criada = await api('/Mensagem/enviar', {
                method: 'POST',
                body: { destinatarioId: destinatarioId, conteudo: texto }
            });
            const indice = conversa.mensagens.indexOf(pendente);
            conversa.mensagens[indice] = {
                id: criada && criada.id,
                remetenteId: meuId,
                destinatarioId: destinatarioId,
                conteudo: criada && criada.conteudo || texto,
                dataEnvio: criada && criada.dataEnvio || pendente.dataEnvio
            };
            ordenarMensagens(conversa.mensagens);
        } catch (erro) {
            console.error('Erro ao enviar mensagem:', erro);
            conversa.mensagens.splice(conversa.mensagens.indexOf(pendente), 1);
            conversa.rascunho = texto;
            mostrarMensagem((erro && erro.message) || 'Não foi possível enviar a mensagem. Tente novamente em instantes.', 'error');
        } finally {
            conversa.enviando = false;
            renderizarListaConversas();
            if (conversaAtual === conversa) {
                atualizarAreaEnvio();
                renderizarMensagens(conversa);
            }
        }
    }

    if (btnEnviar) btnEnviar.addEventListener('click', enviarMensagem);
    if (inputMensagem) {
        inputMensagem.addEventListener('input', function () {
            if (conversaAtual) conversaAtual.rascunho = inputMensagem.value;
        });
        inputMensagem.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.isComposing) {
                e.preventDefault();
                enviarMensagem();
            }
        });
    }

    carregarConversas();
});
