document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    // ── 2. Controle de Habilidades (Badges Selecionáveis) ──
    const habilidadesBadges = document.querySelectorAll('#habilidadesGroup .badge-selectable');
    habilidadesBadges.forEach(badge => {
        badge.addEventListener('click', function () {
            this.classList.toggle('selected');
        });
    });

    // ── 3. Incremento / Decremento do Valor ──
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

    // ── 4. Simulação de Upload de Arquivo (Dropzone) ──
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

    // ── 5. Autocomplete de Cidades (NOVO) ──
    const inputCidade = document.getElementById('cidade');

    const cidadesMock = [
        'São Paulo - SP',
        'Santo André - SP',
        'São Bernardo do Campo - SP',
        'Sorocaba - SP',
        'Santos - SP',
        'Blumenau - SC',
        'Brusque - SC',
        'Pomerode - SC',
        'Rio de Janeiro - RJ',
        'Aracaju - SE'
    ];

    if (inputCidade) {
        const wrapper = inputCidade.closest('.autocomplete-wrapper');
        const dropdown = document.createElement('div');
        dropdown.className = 'autocomplete-dropdown';
        dropdown.style.display = 'none';

        wrapper.appendChild(dropdown);

        inputCidade.addEventListener('input', function () {
            const valorDigitado = this.value.toLowerCase();
            dropdown.innerHTML = '';

            if (!valorDigitado) {
                dropdown.style.display = 'none';
                return;
            }

            const filtradas = cidadesMock.filter(cidade =>
                cidade.toLowerCase().includes(valorDigitado)
            );

            if (filtradas.length > 0) {
                filtradas.forEach(cidade => {
                    const item = document.createElement('div');
                    item.className = 'autocomplete-item';
                    item.textContent = cidade;

                    item.addEventListener('click', function () {
                        inputCidade.value = cidade;
                        dropdown.style.display = 'none';
                    });

                    dropdown.appendChild(item);
                });
                dropdown.style.display = 'block';
            } else {
                dropdown.style.display = 'none';
            }
        });

        document.addEventListener('click', function (e) {
            if (!wrapper.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });
    }

    // ── 6. Validação e Envio do Formulário ──
    const form = document.getElementById('formPublicarVaga');
    const feedbackAlert = document.getElementById('feedbackAlert');
    const btnSubmit = document.getElementById('btnSubmit');

    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();

            const titulo = document.getElementById('titulo');
            const categoria = document.getElementById('categoria');
            const cidade = document.getElementById('cidade');
            const prazo = document.getElementById('prazo');
            const descricao = document.getElementById('descricao');

            let isValid = true;

            [titulo, categoria, cidade, prazo, descricao].forEach(el => el.classList.remove('input-error'));

            if (!titulo.value.trim()) {
                titulo.classList.add('input-error');
                isValid = false;
            }

            if (!categoria.value) {
                categoria.classList.add('input-error');
                isValid = false;
            }

            if (!cidade.value.trim()) {
                cidade.classList.add('input-error');
                isValid = false;
            }

            if (!prazo.value) {
                prazo.classList.add('input-error');
                isValid = false;
            }

            if (!descricao.value.trim() || descricao.value.length < 15) {
                descricao.classList.add('input-error');
                const descError = document.getElementById('descricaoError');
                if (descError) descError.textContent = 'A descrição deve ter no mínimo 15 caracteres.';
                isValid = false;
            }

            if (!isValid) return;

            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<span class="spinner"></span> Publicando...';

            setTimeout(() => {
                feedbackAlert.style.display = 'block';
                window.scrollTo({ top: 0, behavior: 'smooth' });

                setTimeout(() => {
                    window.location.href = '/pages/15-minhas-vagas.html';
                }, 1500);
            }, 1000);
        });
    }
});