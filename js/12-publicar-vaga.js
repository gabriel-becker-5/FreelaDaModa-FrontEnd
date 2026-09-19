// Confere se a empresa tem uma assinatura com status "ativo" — publicar vaga é
// um recurso pago, então isso não pode continuar funcionando pra quem nunca
// contratou nenhum plano (ver tela de Assinatura).
async function empresaTemAssinaturaAtiva(empresaId) {
    try {
        const res = await fetch(`${API_BASE}/assinaturas?empresaId=${empresaId}`);
        if (!res.ok) return false;
        const assinaturas = await res.json();
        return assinaturas.some(function (a) { return a.status === 'ativo'; });
    } catch (erro) {
        console.error('Erro ao verificar assinatura:', erro);
        return false;
    }
}

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

        // Live-masking: nunca deixa letras aparecerem, só dígitos viram moeda.
        inputValor.addEventListener('input', function () {
            const digitos = this.value.replace(/\D/g, '');
            const num = digitos ? parseInt(digitos, 10) / 100 : 0;
            this.value = digitos ? formatarMoeda(num) : '';
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

    function mostrarErroFeedback(texto) {
        if (!feedbackAlert) return;
        feedbackAlert.classList.remove('alert-success');
        feedbackAlert.classList.add('alert-error');
        feedbackAlert.innerHTML = `<i class="bi bi-exclamation-circle-fill"></i> ${texto}`;
        feedbackAlert.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (form) {
        form.addEventListener('submit', async function (e) {
            e.preventDefault();

            const titulo = document.getElementById('titulo');
            const categoria = document.getElementById('categoria');
            const modalidade = document.getElementById('modalidade');
            const cidade = document.getElementById('cidade');
            const estado = document.getElementById('estado');
            const valor = document.getElementById('valor');
            const prazo = document.getElementById('prazo');
            const descricao = document.getElementById('descricao');

            let isValid = true;

            [titulo, categoria, modalidade, cidade, estado, valor, prazo, descricao].forEach(el => el.classList.remove('input-error'));

            if (!titulo.value.trim()) {
                titulo.classList.add('input-error');
                isValid = false;
            }

            if (!categoria.value) {
                categoria.classList.add('input-error');
                isValid = false;
            }

            if (!modalidade.value) {
                modalidade.classList.add('input-error');
                isValid = false;
            }

            if (!cidade.value.trim()) {
                cidade.classList.add('input-error');
                isValid = false;
            }

            if (!estado.value) {
                estado.classList.add('input-error');
                isValid = false;
            }

            const valorNumerico = extrairNumero(valor.value);
            if (!valorNumerico || valorNumerico <= 0) {
                valor.classList.add('input-error');
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

            const sessao = JSON.parse(sessionStorage.getItem('usuarioLogado') || 'null');
            if (!sessao) {
                mostrarErroFeedback('Sessão expirada. Faça login novamente com a conta da sua empresa.');
                return;
            }

            btnSubmit.disabled = true;
            const textoOriginalBtn = btnSubmit.innerHTML;
            btnSubmit.innerHTML = '<span class="spinner"></span> Verificando assinatura...';

            const assinaturaAtiva = await empresaTemAssinaturaAtiva(sessao.id);
            if (!assinaturaAtiva) {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = textoOriginalBtn;
                mostrarErroFeedback('Sua empresa não tem uma assinatura ativa. Contrate um plano na página de Assinatura para publicar vagas.');
                return;
            }

            const novaVaga = {
                empresaId: sessao.id,
                empresaNome: sessao.nome,
                titulo: titulo.value.trim(),
                especialidade: categoria.value,
                valor: formatarMoeda(valorNumerico),
                prazo: prazo.value,
                local: `${cidade.value.trim()}, ${estado.value}`,
                modalidade: modalidade.value,
                descricao: descricao.value.trim(),
                status: 'Aberta'
            };

            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<span class="spinner"></span> Publicando...';

            try {
                const res = await fetch(`${API_BASE}/vagas`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(novaVaga)
                });

                if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);

                feedbackAlert.classList.remove('alert-error');
                feedbackAlert.classList.add('alert-success');
                feedbackAlert.innerHTML = '<i class="bi bi-check-circle-fill"></i> Vaga publicada com sucesso! Redirecionando...';
                feedbackAlert.style.display = 'block';
                window.scrollTo({ top: 0, behavior: 'smooth' });

                setTimeout(() => {
                    window.location.href = '/pages/15-minhas-vagas.html';
                }, 1500);
            } catch (erro) {
                console.error('Erro ao publicar vaga:', erro);
                mostrarErroFeedback('Não foi possível publicar a vaga. Verifique se o json-server está rodando e tente novamente.');
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = '<i class="bi bi-send-fill"></i> Publicar Vaga';
            }
        });
    }
});