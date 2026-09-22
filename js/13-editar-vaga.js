document.addEventListener('DOMContentLoaded', function () {
    const sessao = exigirTipo('empresas');
    if (!sessao) return;

    // A 13 não está no menu lateral; destaca "Minhas Vagas" como contexto.
    renderizarSidebar(document.querySelector('.sidebar'), 'empresas', '15-minhas-vagas');
    renderizarTopbar(document.getElementById('header-acoes'), sessao);
    renderizarBannerValidacao(document.querySelector('.main'), sessao);

    initMenuMobile();

    /* ------------------------- refs ---------------------------------------- */
    const vagaId = new URLSearchParams(window.location.search).get('id');
    const loadingBar = document.getElementById('vagaLoading');
    const erroBar = document.getElementById('vagaErro');
    const form = document.getElementById('formEditarVaga');
    const alertBar = document.getElementById('alert-editar-vaga');
    const btnSubmit = document.getElementById('btnSubmit');

    const inputTitulo = document.getElementById('titulo');
    const inputEspecialidade = document.getElementById('especialidade');
    const inputModalidade = document.getElementById('modalidade');
    const inputCidade = document.getElementById('cidade');
    const selectEstado = document.getElementById('estado');
    const inputValor = document.getElementById('valor');
    const inputPrazo = document.getElementById('prazo');
    const inputDescricao = document.getElementById('descricao');
    const inputReferencias = document.getElementById('refs-vaga');
    const referenciasPreview = document.getElementById('refs-vaga-preview');
    const badgeVagaId = document.getElementById('badgeVagaId');

    const LIMITE_FOTO_MB = 5;
    const MAX_REFERENCIAS = 10;
    const TETO_VALOR = 99999.99;
    const PRAZO_MAX_DIAS = 730;

    let referenciasCaminhos = [];
    let referenciasPreviewUrls = [];

    /* ------------------------- menu mobile -------------------------------- */
    function initMenuMobile() {
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

    /* ------------------------- mensagens ----------------------------------- */
    function mostrarMensagem(texto, tipo) {
        if (!alertBar) return;
        alertBar.className = `alert mb-md ${tipo === 'success' ? 'alert-success' : 'alert-error'}`;
        alertBar.innerHTML = `<i class="bi ${tipo === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'}"></i> ${escapeHtml(texto)}`;
        alertBar.removeAttribute('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function limparMensagem() {
        if (alertBar) alertBar.setAttribute('hidden', '');
    }

    if (!vagaId) {
        loadingBar.setAttribute('hidden', '');
        erroBar.textContent = 'Nenhuma vaga informada para edição. Volte para "Minhas Vagas" e clique em Editar novamente.';
        erroBar.removeAttribute('hidden');
        return;
    }

    /* ------------------------- máscara de moeda ---------------------------- */
    aplicarMascaraMoeda(inputValor, TETO_VALOR);

    /* ------------------------- limites do prazo ----------------------------- */
    const limitesPrazo = limitesDataPrazo(PRAZO_MAX_DIAS);
    inputPrazo.min = limitesPrazo.min;
    inputPrazo.max = limitesPrazo.max;

    /* ------------------------- uploads de referências ---------------------- */
    function criarImagemComFallback(container, src, alt) {
        const img = document.createElement('img');
        img.src = src;
        img.alt = alt;
        img.onerror = function () {
            const placeholder = document.createElement('div');
            placeholder.className = 'imagem-placeholder';
            placeholder.innerHTML = '<i class="bi bi-image"></i>';
            container.replaceChild(placeholder, img);
        };
        container.appendChild(img);
    }

    function renderizarReferencias() {
        referenciasPreview.innerHTML = '';
        if (!referenciasPreviewUrls.length) {
            referenciasPreview.innerHTML = '<span class="field-message">Nenhuma foto de referência adicionada.</span>';
            return;
        }
        referenciasPreviewUrls.forEach(function (url, indice) {
            const item = document.createElement('div');
            item.className = 'referencia-item';

            criarImagemComFallback(item, url, `Referência ${indice + 1}`);

            const botao = document.createElement('button');
            botao.type = 'button';
            botao.setAttribute('aria-label', 'Remover referência');
            botao.innerHTML = '<i class="bi bi-x"></i>';
            botao.addEventListener('click', function () {
                const urlRemovida = referenciasPreviewUrls.splice(indice, 1)[0];
                referenciasCaminhos.splice(indice, 1);
                if (urlRemovida && urlRemovida.startsWith('blob:')) URL.revokeObjectURL(urlRemovida);
                renderizarReferencias();
            });

            item.appendChild(botao);
            referenciasPreview.appendChild(item);
        });
    }

    inputReferencias.addEventListener('change', function () {
        const arquivos = Array.from(inputReferencias.files);
        let ignorados = 0;

        arquivos.forEach(function (arquivo) {
            if (referenciasCaminhos.length >= MAX_REFERENCIAS) {
                ignorados++;
                return;
            }
            if (!arquivo.type.startsWith('image/')) {
                ignorados++;
                return;
            }
            if (arquivo.size > LIMITE_FOTO_MB * 1024 * 1024) {
                ignorados++;
                return;
            }
            const indice = referenciasCaminhos.length + 1;
            referenciasCaminhos.push(`/uploads/vagas/${vagaId}/referencia-${Date.now()}-${indice}.jpg`);
            referenciasPreviewUrls.push(URL.createObjectURL(arquivo));
        });

        renderizarReferencias();

        if (ignorados > 0) {
            mostrarMensagem(`Algumas fotos não foram adicionadas (são permitidas até ${MAX_REFERENCIAS} imagens de até ${LIMITE_FOTO_MB}MB cada).`, 'error');
        }
        inputReferencias.value = '';
    });

    /* ------------------------- carregar vaga ------------------------------- */
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
            inputTitulo.value = vaga.titulo || '';
            inputEspecialidade.value = vaga.especialidade || '';
            inputModalidade.value = vaga.modalidade || '';
            inputValor.value = vaga.valor || '';
            inputPrazo.value = vaga.prazo || '';
            inputDescricao.value = vaga.descricao || '';

            await carregarUFs(selectEstado, vaga.estado || '');
            if (vaga.cidade) inputCidade.value = vaga.cidade;
            montarAutocompleteCidade(inputCidade, selectEstado);

            referenciasCaminhos = Array.isArray(vaga.referencias) ? vaga.referencias : [];
            referenciasPreviewUrls = referenciasCaminhos.slice();
            renderizarReferencias();

            loadingBar.setAttribute('hidden', '');
            form.removeAttribute('hidden');
        } catch (erro) {
            console.error('Erro ao carregar vaga:', erro);
            loadingBar.setAttribute('hidden', '');
            erroBar.removeAttribute('hidden');
        }
    }

    carregarVaga();

    /* ------------------------- validação ----------------------------------- */
    function validarFormulario() {
        const erros = [];

        if (!inputTitulo.value.trim()) erros.push('Informe o título da vaga.');
        if (!inputEspecialidade.value) erros.push('Selecione a especialidade.');
        if (!inputModalidade.value) erros.push('Selecione a modalidade.');
        if (!inputCidade.value.trim()) erros.push('Informe a cidade.');
        if (!selectEstado.value) erros.push('Selecione o estado (UF).');
        if (moedaParaNumero(inputValor.value) <= 0) erros.push('Informe um valor maior que zero.');
        if (!inputPrazo.value) {
            erros.push('Informe o prazo máximo de conclusão.');
        } else if (inputPrazo.value < limitesPrazo.min) {
            erros.push('O prazo não pode estar no passado.');
        } else if (inputPrazo.value > limitesPrazo.max) {
            erros.push('O prazo não pode ser superior a dois anos a partir de hoje.');
        }
        if (!inputDescricao.value.trim() || inputDescricao.value.trim().length < 15) {
            erros.push('A descrição deve ter no mínimo 15 caracteres.');
        }

        if (erros.length) {
            mostrarMensagem(erros.join('\n'), 'error');
            return false;
        }
        return true;
    }

    /* ------------------------- salvar (PATCH) ------------------------------ */
    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        limparMensagem();

        if (!validarFormulario()) return;

        const cidade = inputCidade.value.trim();
        // O status NÃO vai no PATCH: alterações de status ocorrem apenas
        // pelas ações da tela 15 (ex.: Encerrar).
        const vagaAtualizada = {
            titulo: inputTitulo.value.trim(),
            especialidade: inputEspecialidade.value,
            modalidade: inputModalidade.value,
            valor: formatarMoeda(moedaParaNumero(inputValor.value)),
            prazo: inputPrazo.value,
            cidade: cidade,
            estado: selectEstado.value,
            local: cidade,
            descricao: inputDescricao.value.trim(),
            referencias: referenciasCaminhos
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

            mostrarMensagem('Alterações salvas com sucesso! Redirecionando...', 'success');

            setTimeout(function () {
                window.location.href = '/pages/15-minhas-vagas.html';
            }, 1200);
        } catch (erro) {
            console.error('Erro ao salvar vaga:', erro);
            mostrarMensagem('Não foi possível salvar as alterações. Tente novamente em instantes.', 'error');
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i class="bi bi-save-fill"></i> Salvar Alterações';
        }
    });
});
