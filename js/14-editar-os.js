// Editar Ordem de Serviço (empresa) — padrão da 13-editar-vaga

document.addEventListener('DOMContentLoaded', function () {
    const sessao = exigirTipo('empresas');
    if (!sessao) return;

    // A 14 não está no menu lateral; destaca "Ordens de Serviço" como contexto.
    renderizarSidebar(document.querySelector('.sidebar'), 'empresas', '16-ordens-servico');
    renderizarTopbar(document.getElementById('header-acoes'), sessao);
    renderizarBannerValidacao(document.querySelector('.main'), sessao);

    initMenuMobile();

    /* ------------------------- refs ---------------------------------------- */
    const osId = new URLSearchParams(window.location.search).get('id');
    const loadingBar = document.getElementById('osLoading');
    const erroBar = document.getElementById('osErro');
    const form = document.getElementById('formEditarOS');
    const alertBar = document.getElementById('alert-editar-os');
    const btnSubmit = document.getElementById('btnSubmit');
    let token;

    const inputTitulo = document.getElementById('titulo');
    const inputCategoria = document.getElementById('categoria');
    const inputModalidade = document.getElementById('modalidade');
    const inputCidade = document.getElementById('cidade');
    const selectEstado = document.getElementById('estado');
    const inputValor = document.getElementById('valor');
    const inputPrazo = document.getElementById('prazo');
    const inputPrevisao = document.getElementById('previsao');
    const inputFreelancer = document.getElementById('freelancer');
    const inputEmpresa = document.getElementById('empresa');
    const inputDescricao = document.getElementById('descricao');
    const inputObservacoes = document.getElementById('observacoes');
    const inputAvaliacaoFreelancer = document.getElementById('avaliacaoFreelancer');
    const inputAvaliacaoConfeccao = document.getElementById('avaliacaoConfeccao');
    const inputBriefing = document.getElementById('briefingInput');
    const briefingPreview = document.getElementById('briefingPreview');
    const inputEntrega = document.getElementById('entregaInput');
    const entregaPreview = document.getElementById('entregaPreview');
    const badgeOSId = document.getElementById('badgeOSId');

    const LIMITE_FOTO_MB = 5;
    const TETO_VALOR = 999999.99;

    // Anexos gravados por CAMINHO no banco; preview em sessão via blob URL.
    const anexoBriefing = { caminho: '', previewUrl: '' };
    const anexoEntrega = { caminho: '', previewUrl: '' };

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

    if (!osId) {
        loadingBar.setAttribute('hidden', '');
        erroBar.textContent = 'Nenhuma ordem de serviço informada para edição. Volte para "Ordens de Serviço" e clique em Editar novamente.';
        erroBar.removeAttribute('hidden');
        return;
    }

    /* ------------------------- máscara de moeda ---------------------------- */
    aplicarMascaraMoeda(inputValor, TETO_VALOR);

    /* ------------------------- uploads de anexos --------------------------- */
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

    function renderizarAnexo(anexo, previewEl) {
        previewEl.innerHTML = '';
        if (!anexo.previewUrl) {
            previewEl.innerHTML = '<span class="field-message">Nenhum arquivo anexado.</span>';
            return;
        }

        const item = document.createElement('div');
        item.className = 'referencia-item';

        criarImagemComFallback(item, anexo.previewUrl, 'Anexo da ordem de serviço');

        const botao = document.createElement('button');
        botao.type = 'button';
        botao.setAttribute('aria-label', 'Remover anexo');
        botao.innerHTML = '<i class="bi bi-x"></i>';
        botao.addEventListener('click', function () {
            if (anexo.previewUrl && anexo.previewUrl.startsWith('blob:')) URL.revokeObjectURL(anexo.previewUrl);
            anexo.caminho = '';
            anexo.previewUrl = '';
            renderizarAnexo(anexo, previewEl);
        });

        item.appendChild(botao);
        previewEl.appendChild(item);
    }

    function configurarUpload(input, anexo, previewEl, rotulo) {
        input.addEventListener('change', function () {
            const arquivo = input.files && input.files[0];
            if (!arquivo) return;
            if (!arquivo.type.startsWith('image/')) {
                mostrarMensagem('O anexo deve ser uma imagem (PNG ou JPG).', 'error');
                input.value = '';
                return;
            }
            if (arquivo.size > LIMITE_FOTO_MB * 1024 * 1024) {
                mostrarMensagem(`O anexo deve ter no máximo ${LIMITE_FOTO_MB}MB.`, 'error');
                input.value = '';
                return;
            }

            if (anexo.previewUrl && anexo.previewUrl.startsWith('blob:')) URL.revokeObjectURL(anexo.previewUrl);
            anexo.caminho = `/uploads/os/${osId}/${rotulo}-${Date.now()}.jpg`;
            anexo.previewUrl = URL.createObjectURL(arquivo);
            renderizarAnexo(anexo, previewEl);
            input.value = '';
        });
    }

    configurarUpload(inputBriefing, anexoBriefing, briefingPreview, 'briefing');
    configurarUpload(inputEntrega, anexoEntrega, entregaPreview, 'entrega');

    /* ------------------------- carregar OS --------------------------------- */
    async function carregarOS() {
        try {
            const res = await fetch(`${API_BASE}/ordensServico/${osId}`);
            if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);

            const os = await res.json();

            if (String(os.empresaId) !== String(sessao.id)) {
                loadingBar.setAttribute('hidden', '');
                erroBar.textContent = 'Esta ordem de serviço não pertence à sua empresa.';
                erroBar.removeAttribute('hidden');
                return;
            }

            badgeOSId.textContent = `ID: OS-${os.id}`;
            inputTitulo.value = os.titulo || '';
            inputCategoria.value = os.categoria || '';
            if (os.categoria && !inputCategoria.value) {
                // Valor fora da lista: exibido como opção extra para não corromper o dado.
                const extra = document.createElement('option');
                extra.value = os.categoria;
                extra.textContent = os.categoria;
                inputCategoria.appendChild(extra);
                inputCategoria.value = os.categoria;
            }
            inputModalidade.value = os.modalidade || '';
            inputValor.value = os.valor ? formatarMoeda(moedaParaNumero(os.valor)) : '';
            inputPrazo.value = os.prazo || '';
            inputPrevisao.value = os.previsaoConclusao || '';
            inputFreelancer.value = os.freelancerNome || '';
            inputEmpresa.value = os.empresaNome || '';
            inputDescricao.value = os.descricao || '';
            inputObservacoes.value = os.observacoes || '';
            inputAvaliacaoFreelancer.value = os.avaliacaoFreelancer || 'Pendente';
            inputAvaliacaoConfeccao.value = os.avaliacaoConfeccao || 'Pendente';

            await carregarUFs(selectEstado, os.estado || '');
            if (os.cidade) inputCidade.value = os.cidade;
            montarAutocompleteCidade(inputCidade, selectEstado);

            anexoBriefing.caminho = typeof os.referenciaBriefing === 'string' ? os.referenciaBriefing : '';
            anexoBriefing.previewUrl = anexoBriefing.caminho;
            renderizarAnexo(anexoBriefing, briefingPreview);

            anexoEntrega.caminho = typeof os.referenciaEntrega === 'string' ? os.referenciaEntrega : '';
            anexoEntrega.previewUrl = anexoEntrega.caminho;
            renderizarAnexo(anexoEntrega, entregaPreview);

            loadingBar.setAttribute('hidden', '');
            form.removeAttribute('hidden');
        } catch (erro) {
            console.error('Erro ao carregar ordem de serviço:', erro);
            loadingBar.setAttribute('hidden', '');
            erroBar.removeAttribute('hidden');
        }
    }

    carregarOS();

    /* ------------------------- validação ----------------------------------- */
    function validarFormulario() {
        const erros = [];

        if (!inputTitulo.value.trim()) erros.push('Informe o título do serviço.');
        if (!inputCategoria.value) erros.push('Selecione a categoria.');
        if (!inputModalidade.value) erros.push('Selecione a modalidade.');
        if (!inputCidade.value.trim()) erros.push('Informe a cidade.');
        if (!selectEstado.value) erros.push('Selecione o estado (UF).');
        if (moedaParaNumero(inputValor.value) <= 0) erros.push('Informe um valor maior que zero.');
        if (!inputDescricao.value.trim()) erros.push('Informe a descrição do serviço.');

        if (erros.length) {
            mostrarMensagem(erros.join('<br>'), 'error');
            return false;
        }
        return true;
    }

    /* ------------------------- salvar (PATCH) ------------------------------ */
    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        limparMensagem();

        if (!validarFormulario()) return;

        const osAtualizada = {
            titulo: inputTitulo.value.trim(),
            categoria: inputCategoria.value,
            modalidade: inputModalidade.value,
            cidade: inputCidade.value.trim(),
            estado: selectEstado.value,
            valor: formatarMoeda(moedaParaNumero(inputValor.value)),
            prazo: inputPrazo.value,
            previsaoConclusao: inputPrevisao.value,
            descricao: inputDescricao.value.trim(),
            observacoes: inputObservacoes.value.trim(),
            referenciaBriefing: anexoBriefing.caminho,
            referenciaEntrega: anexoEntrega.caminho
        };

        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<span class="spinner"></span> Salvando...';

        try {
            const res = await fetch(`${API_BASE}/ordensServico/${osId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(osAtualizada)
            });

            if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);

            mostrarMensagem('Alterações salvas com sucesso! Redirecionando...', 'success');

            setTimeout(function () {
                window.location.href = '/pages/16-ordens-servico.html';
            }, 1200);
        } catch (erro) {
            console.error('Erro ao salvar ordem de serviço:', erro);
            mostrarMensagem('Não foi possível salvar as alterações. Tente novamente em instantes.', 'error');
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i class="bi bi-save-fill"></i> Salvar Alterações';
        }
    });
});
