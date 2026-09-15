document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    // 2. Controle de Habilidades
    const habilidadesBadges = document.querySelectorAll('#habilidadesGroup .badge-selectable');
    habilidadesBadges.forEach(badge => {
        badge.addEventListener('click', function () {
            this.classList.toggle('selected');
        });
    });

    // 3. Controle Numérico do Valor
    const btnDecrementar = document.getElementById('btnDecrementar');
    const btnIncrementar = document.getElementById('btnIncrementar');
    const inputValor = document.getElementById('valor');

    function extrairNumero(texto) {
        const limpo = texto.replace(/[^\d]/g, '');
        return limpo ? parseInt(limpo, 10) / 100 : 0;
    }

    function formatarMoeda(valor) {
        return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    if (btnDecrementar && btnIncrementar && inputValor) {
        btnDecrementar.addEventListener('click', function () {
            let valorAtual = extrairNumero(inputValor.value);
            if (valorAtual >= 100) {
                valorAtual -= 50;
                inputValor.value = formatarMoeda(valorAtual);
            }
        });

        btnIncrementar.addEventListener('click', function () {
            let valorAtual = extrairNumero(inputValor.value);
            valorAtual += 50;
            inputValor.value = formatarMoeda(valorAtual);
        });

        inputValor.addEventListener('blur', function () {
            let num = extrairNumero(this.value);
            this.value = formatarMoeda(num);
        });
    }

    // 4. Upload de novos anexos
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    const filePreview = document.getElementById('filePreview');
    const fileName = document.getElementById('fileName');

    if (dropzone && fileInput) {
        dropzone.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', function () {
            if (this.files && this.files[0]) {
                fileName.textContent = this.files[0].name;
                filePreview.style.display = 'flex';
            }
        });
    }

    // 5. Validação e Envio (Salvar Alterações)
    const form = document.getElementById('formEditarVaga');
    const feedbackAlert = document.getElementById('feedbackAlert');
    const btnSubmit = document.getElementById('btnSubmit');

    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();

            const titulo = document.getElementById('titulo');
            const descricao = document.getElementById('descricao');
            let isValid = true;

            // Limpar erros
            titulo.classList.remove('input-error');
            descricao.classList.remove('input-error');

            if (!titulo.value.trim()) {
                titulo.classList.add('input-error');
                isValid = false;
            }

            if (!descricao.value.trim() || descricao.value.length < 15) {
                descricao.classList.add('input-error');
                isValid = false;
            }

            if (!isValid) return;

            // UX de carregamento
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<span class="spinner"></span> Salvando...';

            // Simular chamada API
            setTimeout(() => {
                feedbackAlert.style.display = 'block';
                window.scrollTo({ top: 0, behavior: 'smooth' });

                // Redireciona de volta para a lista após sucesso
                setTimeout(() => {
                    window.location.href = '/pages/15-minhas-vagas.html';
                }, 1500);
            }, 800);
        });
    }
});