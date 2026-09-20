// Suporte — público (header simples) ou logado (layout por tipo via nav.js)

document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    /* ------------------------- nav por sessão ------------------------------ */

    const sessao = obterSessao();

    if (sessao) {
        renderizarSidebar(document.querySelector('.sidebar'), sessao.tipo, '24-suporte');
        renderizarTopbar(document.getElementById('header-acoes'), sessao);
        renderizarBannerValidacao(document.querySelector('.main'), sessao);
        configurarMenuMobile();
    } else {
        // Página pública: sem menu lateral; header simples com logo + Entrar.
        document.querySelector('.sidebar').setAttribute('hidden', '');
        document.querySelector('.sidebar-toggle-btn').setAttribute('hidden', '');
        document.querySelector('.sidebar-overlay').setAttribute('hidden', '');

        const headerAcoes = document.getElementById('header-acoes');
        renderizarHeaderPublico(headerAcoes);

        const logo = document.createElement('a');
        logo.href = '/pages/01-homepage.html';
        logo.setAttribute('aria-label', 'Página inicial Freela da Moda');
        logo.innerHTML = '<img src="/assets/logo-icone-roxo-128.png" alt="Freela da Moda" style="height: 28px; display: block;">';
        headerAcoes.insertBefore(logo, headerAcoes.firstChild);
    }

    function configurarMenuMobile() {
        const sidebarToggleBtn = document.querySelector('.sidebar-toggle-btn');
        const sidebar = document.querySelector('.sidebar');
        const sidebarOverlay = document.querySelector('.sidebar-overlay');
        if (!sidebarToggleBtn || !sidebar || !sidebarOverlay) return;

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

    /* ------------------------- formulário do chamado ----------------------- */

    const form = document.querySelector('form.card');
    const selectAssunto = document.getElementById('suporte-assunto');
    const textareaDescricao = document.getElementById('suporte-descricao');
    const alertaFeedback = form ? form.querySelector('.alert-success') : null;
    let token;

    const MAX_ANEXOS = 5;
    const LIMITE_ANEXO_MB = 5;

    function mostrarFeedback(texto, tipo) {
        if (!alertaFeedback) return;
        alertaFeedback.textContent = texto;
        alertaFeedback.classList.toggle('alert-success', tipo === 'success');
        alertaFeedback.classList.toggle('alert-error', tipo === 'error');
        alertaFeedback.hidden = false;
    }

    /* ------------------------- anexos (até 5, imagem/PDF, 5MB) ------------- */

    const dropzone = document.getElementById('suporte-dropzone');
    const fileInput = document.getElementById('suporte-anexo-input');
    const previewContainer = document.getElementById('suporte-anexos-preview');
    const anexosSelecionados = [];

    function renderizarAnexos() {
        if (!previewContainer) return;
        previewContainer.innerHTML = '';

        anexosSelecionados.forEach(function (anexo, indice) {
            const linha = document.createElement('div');
            linha.className = 'upload-file-preview';
            linha.style.display = 'flex';

            const icone = document.createElement('i');
            icone.className = anexo.arquivo.type === 'application/pdf'
                ? 'bi bi-file-earmark-pdf'
                : 'bi bi-file-earmark-image';
            linha.appendChild(icone);

            const nome = document.createElement('span');
            nome.textContent = anexo.arquivo.name;
            linha.appendChild(nome);

            const botao = document.createElement('button');
            botao.type = 'button';
            botao.className = 'btn btn-ghost';
            botao.style.cssText = 'padding: 4px 8px;';
            botao.setAttribute('aria-label', 'Remover anexo');
            botao.innerHTML = '<i class="bi bi-x-lg"></i>';
            botao.addEventListener('click', function () {
                anexosSelecionados.splice(indice, 1);
                renderizarAnexos();
            });
            linha.appendChild(botao);

            previewContainer.appendChild(linha);
        });
    }

    function limparAnexos() {
        anexosSelecionados.length = 0;
        if (fileInput) fileInput.value = '';
        renderizarAnexos();
    }

    function processarArquivos(lista) {
        Array.from(lista || []).forEach(function (file) {
            if (anexosSelecionados.length >= MAX_ANEXOS) return;

            const ehImagem = file.type && file.type.startsWith('image/');
            const ehPdf = file.type === 'application/pdf';
            if (!ehImagem && !ehPdf) {
                mostrarFeedback('Somente arquivos de imagem ou PDF são aceitos.', 'error');
                return;
            }

            if (file.size > LIMITE_ANEXO_MB * 1024 * 1024) {
                mostrarFeedback(`Cada anexo deve ter no máximo ${LIMITE_ANEXO_MB}MB.`, 'error');
                return;
            }

            anexosSelecionados.push({ arquivo: file });
        });

        if (anexosSelecionados.length >= MAX_ANEXOS) {
            mostrarFeedback(`Limite de ${MAX_ANEXOS} anexos por chamado.`, 'error');
        }

        if (fileInput) fileInput.value = '';
        renderizarAnexos();
    }

    if (dropzone && fileInput) {
        dropzone.addEventListener('click', function () { fileInput.click(); });

        dropzone.addEventListener('dragover', function (e) {
            e.preventDefault();
        });

        dropzone.addEventListener('drop', function (e) {
            e.preventDefault();
            if (e.dataTransfer && e.dataTransfer.files) {
                processarArquivos(e.dataTransfer.files);
            }
        });

        fileInput.addEventListener('change', function () {
            if (this.files && this.files.length) {
                processarArquivos(this.files);
            }
        });
    }

    /* ------------------------- validação e envio --------------------------- */

    const assuntoErro = document.getElementById('suporte-assunto-erro');

    function validarAssunto() {
        const semAssunto = !selectAssunto.value || selectAssunto.value === 'Selecione';
        if (selectAssunto) selectAssunto.classList.toggle('input-error', semAssunto);
        if (assuntoErro) assuntoErro.hidden = !semAssunto;
        return !semAssunto;
    }

    if (selectAssunto) {
        selectAssunto.addEventListener('change', validarAssunto);
    }

    if (form) {
        if (alertaFeedback) alertaFeedback.hidden = true;

        form.addEventListener('submit', async function (e) {
            e.preventDefault();

            let valido = validarAssunto();

            const descricao = textareaDescricao ? textareaDescricao.value.trim() : '';
            if (textareaDescricao) textareaDescricao.classList.toggle('input-error', descricao.length < 10);
            if (descricao.length < 10) {
                valido = false;
                mostrarFeedback('Descreva o problema com pelo menos 10 caracteres.', 'error');
            }
            if (!valido) return;

            const btnEnviar = form.querySelector('button[type="submit"]');
            const textoOriginal = btnEnviar.innerHTML;
            btnEnviar.disabled = true;
            btnEnviar.innerHTML = '<span class="spinner"></span> Enviando...';

            const hoje = new Date().toISOString().slice(0, 10);

            const novoChamado = {
                assunto: selectAssunto.value,
                descricao: descricao,
                status: 'Aberto',
                autorId: sessao ? sessao.id : null,
                autorNome: sessao ? sessao.nome : 'Visitante',
                criadoEm: hoje,
                mensagens: [
                    { autor: sessao ? sessao.nome : 'Visitante', texto: descricao, data: hoje }
                ]
            };

            try {
                const res = await fetch(`${API_BASE}/chamados`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(novoChamado)
                });
                if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);

                const chamadoCriado = await res.json();

                // Anexos são gravados por CAMINHO (nunca base64): o POST cria o
                // chamado e um PATCH grava a lista com o id retornado.
                if (anexosSelecionados.length) {
                    const caminhos = anexosSelecionados.map(function (anexo, indice) {
                        const partes = anexo.arquivo.name.split('.');
                        const extensao = (partes.length > 1 ? partes.pop() : 'jpg')
                            .toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
                        return `/uploads/chamados/${chamadoCriado.id}/anexo-${Date.now()}-${indice + 1}.${extensao}`;
                    });

                    const resAnexos = await fetch(`${API_BASE}/chamados/${chamadoCriado.id}`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ anexos: caminhos })
                    });
                    if (!resAnexos.ok) throw new Error(`Erro HTTP: ${resAnexos.status}`);
                }

                mostrarFeedback('Chamado enviado com sucesso! Nossa equipe responde em até 24h.', 'success');
                form.reset();
                limparAnexos();
            } catch (erro) {
                console.error('Erro ao enviar chamado:', erro);
                mostrarFeedback('Não foi possível enviar o chamado. Tente novamente em instantes.', 'error');
            } finally {
                btnEnviar.disabled = false;
                btnEnviar.innerHTML = textoOriginal;
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }
});
