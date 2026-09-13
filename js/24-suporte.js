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

    // ── 3. Formulário "Abrir chamado" ──
    const form = document.querySelector('form.card');
    const selectAssunto = document.getElementById('suporte-assunto');
    const textareaDescricao = document.getElementById('suporte-descricao');
    const alertaSucesso = form ? form.querySelector('.alert-success') : null;

    if (form) {
        // o HTML vem com "Assunto" marcado como erro só pro mockup visual
        if (selectAssunto) selectAssunto.classList.remove('input-error');
        if (alertaSucesso) alertaSucesso.hidden = true;

        function validarFormulario() {
            let valido = true;

            if (selectAssunto) {
                const semAssunto = !selectAssunto.value || selectAssunto.value === 'Selecione';
                selectAssunto.classList.toggle('input-error', semAssunto);
                if (semAssunto) valido = false;
            }

            if (textareaDescricao) {
                const descricaoCurta = textareaDescricao.value.trim().length < 10;
                textareaDescricao.classList.toggle('input-error', descricaoCurta);
                if (descricaoCurta) valido = false;
            }

            return valido;
        }

        // Assim que o usuário escolhe um assunto, tira o destaque vermelho.
        if (selectAssunto) {
            selectAssunto.addEventListener('change', function () {
                selectAssunto.classList.remove('input-error');
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

            try {
                await fetch(`${API_BASE}/chamados`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(novoChamado)
                });

                if (alertaSucesso) {
                    alertaSucesso.textContent = 'Chamado enviado com sucesso! Nossa equipe responde em até 24h.';
                    alertaSucesso.hidden = false;
                }
                form.reset();
            } catch (erro) {
                console.error('Erro ao enviar chamado:', erro);
                alert('Não foi possível enviar o chamado. Verifique se o json-server está rodando.');
            } finally {
                btnEnviar.disabled = false;
                btnEnviar.innerHTML = textoOriginal;
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }
});
