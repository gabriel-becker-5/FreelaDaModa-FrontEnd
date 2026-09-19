document.addEventListener('DOMContentLoaded', function () {
    'use strict';

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

    // ── 3. Formulário "Abrir chamado" ──
    const form = document.querySelector('form.card');
    const selectAssunto = document.getElementById('suporte-assunto');
    const textareaDescricao = document.getElementById('suporte-descricao');
    const alertaFeedback = form ? form.querySelector('.alert-success') : null;

    function mostrarFeedback(texto, tipo) {
        if (!alertaFeedback) return;
        alertaFeedback.textContent = texto;
        alertaFeedback.classList.toggle('alert-success', tipo === 'success');
        alertaFeedback.classList.toggle('alert-error', tipo === 'error');
        alertaFeedback.hidden = false;
    }

    // ── Anexo (upload de arquivo) ──
    const dropzone = document.getElementById('suporte-dropzone');
    const fileInput = document.getElementById('suporte-anexo-input');
    const filePreview = document.getElementById('suporte-anexo-preview');
    const fileNameEl = document.getElementById('suporte-anexo-nome');
    const btnRemoverAnexo = document.getElementById('btnRemoverAnexo');
    let anexoSelecionado = null;

    function limparAnexo() {
        anexoSelecionado = null;
        if (fileInput) fileInput.value = '';
        if (filePreview) filePreview.style.display = 'none';
        if (fileNameEl) fileNameEl.textContent = '';
    }

    function processarArquivo(file) {
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            mostrarFeedback('Somente arquivos de imagem são aceitos.', 'error');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            mostrarFeedback('Somente imagens até 10MB.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = function () {
            anexoSelecionado = {
                nome: file.name,
                tipo: file.type,
                tamanho: file.size,
                dados: reader.result
            };
            if (fileNameEl) fileNameEl.textContent = file.name;
            if (filePreview) filePreview.style.display = 'flex';
        };
        reader.readAsDataURL(file);
    }

    if (dropzone && fileInput) {
        dropzone.addEventListener('click', () => fileInput.click());

        dropzone.addEventListener('dragover', function (e) {
            e.preventDefault();
        });

        dropzone.addEventListener('drop', function (e) {
            e.preventDefault();
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                processarArquivo(e.dataTransfer.files[0]);
            }
        });

        fileInput.addEventListener('change', function () {
            if (this.files && this.files[0]) {
                processarArquivo(this.files[0]);
            }
        });
    }

    if (btnRemoverAnexo) {
        btnRemoverAnexo.addEventListener('click', function (e) {
            e.preventDefault();
            limparAnexo();
        });
    }

    const assuntoErro = document.getElementById('suporte-assunto-erro');

    if (form) {
        if (alertaFeedback) alertaFeedback.hidden = true;

        function validarFormulario() {
            let valido = true;

            if (selectAssunto) {
                const semAssunto = !selectAssunto.value || selectAssunto.value === 'Selecione';
                selectAssunto.classList.toggle('input-error', semAssunto);
                if (assuntoErro) assuntoErro.hidden = !semAssunto;
                if (semAssunto) valido = false;
            }

            if (textareaDescricao) {
                const descricaoCurta = textareaDescricao.value.trim().length < 10;
                textareaDescricao.classList.toggle('input-error', descricaoCurta);
                if (descricaoCurta) valido = false;
            }

            return valido;
        }

        // Assim que o usuário escolhe um assunto válido, tira o destaque e a mensagem de erro.
        if (selectAssunto) {
            selectAssunto.addEventListener('change', function () {
                const semAssunto = !selectAssunto.value || selectAssunto.value === 'Selecione';
                selectAssunto.classList.toggle('input-error', semAssunto);
                if (assuntoErro) assuntoErro.hidden = !semAssunto;
            });
        }

        form.addEventListener('submit', async function (e) {
            e.preventDefault();

            if (!validarFormulario()) return;

            const btnEnviar = form.querySelector('button[type="submit"]');
            const textoOriginal = btnEnviar.innerHTML;
            btnEnviar.disabled = true;
            btnEnviar.innerHTML = '<span class="spinner"></span> Enviando...';

            const sessao = JSON.parse(sessionStorage.getItem('usuarioLogado') || 'null');
            const hoje = new Date().toISOString().slice(0, 10);
            const descricao = textareaDescricao.value.trim();

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

            if (anexoSelecionado) {
                novoChamado.anexo = anexoSelecionado;
            }

            try {
                const res = await fetch(`${API_BASE}/chamados`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(novoChamado)
                });
                if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);

                mostrarFeedback('Chamado enviado com sucesso! Nossa equipe responde em até 24h.', 'success');
                form.reset();
                limparAnexo();
            } catch (erro) {
                console.error('Erro ao enviar chamado:', erro);
                mostrarFeedback('Não foi possível enviar o chamado. Verifique se o json-server está rodando.', 'error');
            } finally {
                btnEnviar.disabled = false;
                btnEnviar.innerHTML = textoOriginal;
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }
});
