document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    // ── 1. Proteção de rota (só empresa logada) ──
    const sessao = JSON.parse(sessionStorage.getItem('usuarioLogado') || 'null');
    if (!sessao || sessao.tipo !== 'empresas') {
        window.location.href = '/pages/02-login.html';
        return;
    }

    // ── 2. Identifica a vaga a ser editada pela URL (?id=) ──
    const vagaId = new URLSearchParams(window.location.search).get('id');

    const loadingBar = document.getElementById('vagaLoading');
    const erroBar = document.getElementById('vagaErro');
    const form = document.getElementById('formEditarVaga');
    const feedbackAlert = document.getElementById('feedbackAlert');
    const btnSubmit = document.getElementById('btnSubmit');

    const inputStatus = document.getElementById('statusVaga');
    const inputTitulo = document.getElementById('titulo');
    const inputEspecialidade = document.getElementById('especialidade');
    const inputValor = document.getElementById('valor');
    const inputPrazo = document.getElementById('prazo');
    const inputLocal = document.getElementById('local');
    const inputDescricao = document.getElementById('descricao');
    const badgeVagaId = document.getElementById('badgeVagaId');

    if (!vagaId) {
        loadingBar.setAttribute('hidden', '');
        erroBar.textContent = 'Nenhuma vaga informada para edição. Volte para "Minhas Vagas" e clique em Editar novamente.';
        erroBar.removeAttribute('hidden');
        return;
    }

    // ── 3. Carrega a vaga real via API e preenche o formulário ──
    async function carregarVaga() {
        try {
            const res = await fetch(`${API_BASE}/vagas/${vagaId}`);
            if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);

            const vaga = await res.json();

            if (String(vaga.empresaId) !== String(sessao.id)) {
                loadingBar.setAttribute('hidden', '');
                erroBar.textContent = 'Esta vaga não pertence à sua empresa.';
                erroBar.removeAttribute('hidden');
                return;
            }

            badgeVagaId.textContent = `ID: VG-${vaga.id}`;
            inputStatus.value = vaga.status || 'Aberta';
            inputTitulo.value = vaga.titulo || '';
            inputEspecialidade.value = vaga.especialidade || '';
            inputValor.value = vaga.valor || '';
            inputPrazo.value = vaga.prazo || '';
            inputLocal.value = vaga.local || '';
            inputDescricao.value = vaga.descricao || '';

            loadingBar.setAttribute('hidden', '');
            form.removeAttribute('hidden');
        } catch (erro) {
            console.error('Erro ao carregar vaga:', erro);
            loadingBar.setAttribute('hidden', '');
            erroBar.removeAttribute('hidden');
        }
    }

    carregarVaga();

    // ── 4. Máscara de moeda no campo Valor ──
    function extrairNumero(texto) {
        const limpo = (texto || '').replace(/\D/g, '');
        return limpo ? parseInt(limpo, 10) / 100 : 0;
    }

    function formatarMoeda(valor) {
        return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    if (inputValor) {
        inputValor.addEventListener('input', function () {
            const digitos = this.value.replace(/\D/g, '');
            const num = digitos ? parseInt(digitos, 10) / 100 : 0;
            this.value = digitos ? formatarMoeda(num) : '';
        });

        inputValor.addEventListener('blur', function () {
            this.value = formatarMoeda(extrairNumero(this.value));
        });
    }

    // ── 5. Validação e envio (PATCH real na API) ──
    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        let isValid = true;
        [inputTitulo, inputEspecialidade, inputValor, inputPrazo, inputLocal, inputDescricao]
            .forEach(el => el.classList.remove('input-error'));

        if (!inputTitulo.value.trim()) {
            inputTitulo.classList.add('input-error');
            isValid = false;
        }

        if (!inputEspecialidade.value) {
            inputEspecialidade.classList.add('input-error');
            isValid = false;
        }

        const valorNumerico = extrairNumero(inputValor.value);
        if (!valorNumerico || valorNumerico <= 0) {
            inputValor.classList.add('input-error');
            isValid = false;
        }

        if (!inputPrazo.value) {
            inputPrazo.classList.add('input-error');
            isValid = false;
        }

        if (!inputLocal.value.trim()) {
            inputLocal.classList.add('input-error');
            isValid = false;
        }

        if (!inputDescricao.value.trim() || inputDescricao.value.trim().length < 15) {
            inputDescricao.classList.add('input-error');
            isValid = false;
        }

        if (!isValid) return;

        const vagaAtualizada = {
            status: inputStatus.value,
            titulo: inputTitulo.value.trim(),
            especialidade: inputEspecialidade.value,
            valor: formatarMoeda(valorNumerico),
            prazo: inputPrazo.value.trim(),
            local: inputLocal.value.trim(),
            descricao: inputDescricao.value.trim()
        };

        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<span class="spinner"></span> Salvando...';

        try {
            const res = await fetch(`${API_BASE}/vagas/${vagaId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(vagaAtualizada)
            });

            if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);

            feedbackAlert.style.display = 'block';
            window.scrollTo({ top: 0, behavior: 'smooth' });

            setTimeout(() => {
                window.location.href = '/pages/15-minhas-vagas.html';
            }, 1200);
        } catch (erro) {
            console.error('Erro ao salvar vaga:', erro);
            erroBar.textContent = 'Não foi possível salvar as alterações. Verifique se o json-server está rodando e tente novamente.';
            erroBar.classList.add('alert-error');
            erroBar.removeAttribute('hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i class="bi bi-save-fill"></i> Salvar Alterações';
        }
    });
});
