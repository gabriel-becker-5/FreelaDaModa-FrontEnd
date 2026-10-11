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
    const badgeVagaId = document.getElementById('badgeVagaId');

    const TETO_VALOR = 99999.99;
    const PRAZO_MAX_DIAS = 730;

    // Cópia dos valores carregados no GET, usada para enviar no PATCH só os
    // campos que o usuário realmente alterou.
    let valoresCarregados = {};

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

    /* ------------------------- carregar vaga ------------------------------- */
    async function carregarVaga() {
        try {
            // GET /vagas/{id} é anônimo; semRedirect evita redirecionar por 401.
            const vagaBack = await api(`/vagas/${encodeURIComponent(vagaId)}`, { semRedirect: true });
            // mapVaga já existe em js/api.js (valor <- orcamento, empresaId <- usuarioId).
            const vaga = mapVaga(vagaBack);

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
            inputValor.value = vaga.valor != null ? formatarMoeda(vaga.valor) : '';
            // prazoConclusao vem como datetime ISO completo (ex.: "2026-12-31T00:00:00");
            // um <input type="date"> só aceita "yyyy-MM-dd".
            const prazo = vaga.prazoConclusao ? String(vaga.prazoConclusao).slice(0, 10) : '';
            inputPrazo.value = prazo;
            inputDescricao.value = vaga.descricao || '';

            await carregarUFs(selectEstado, vaga.estado || '');
            inputCidade.value = vaga.cidade || '';
            montarAutocompleteCidade(inputCidade, selectEstado);

            valoresCarregados = {
                titulo: inputTitulo.value,
                especialidade: vaga.especialidade || '',
                modalidade: vaga.modalidade || '',
                cidade: inputCidade.value,
                estado: vaga.estado || '',
                valor: vaga.valor != null ? Number(vaga.valor) : null,
                prazo: prazo,
                descricao: inputDescricao.value
            };

            loadingBar.setAttribute('hidden', '');
            form.removeAttribute('hidden');
        } catch (erro) {
            console.error('Erro ao carregar vaga:', erro);
            loadingBar.setAttribute('hidden', '');
            if (erro.status === 404) {
                erroBar.textContent = 'Vaga não encontrada.';
            } else {
                erroBar.textContent = erro.message || 'Não foi possível carregar esta vaga. Tente novamente mais tarde.';
            }
            erroBar.removeAttribute('hidden');
        }
    }

    carregarVaga();

    /* ------------------------- validação ----------------------------------- */
    function validarFormulario() {
        const erros = [];

        if (!inputTitulo.value.trim()) erros.push('Informe o título da vaga.');
        else if (inputTitulo.value.trim().length > 100) erros.push('O título deve ter no máximo 100 caracteres.');
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
        } else if (inputDescricao.value.trim().length > 500) {
            erros.push('A descrição deve ter no máximo 500 caracteres.');
        }

        if (erros.length) {
            mostrarMensagem(erros.join('\n'), 'error');
            return false;
        }
        return true;
    }

    /* ------------------------- montar PATCH (somente o que mudou) ---------- */
    function montarCorpoAtualizacao() {
        const corpo = {};

        const titulo = inputTitulo.value.trim();
        if (titulo !== valoresCarregados.titulo) corpo.titulo = titulo;

        if (inputEspecialidade.value !== valoresCarregados.especialidade) corpo.especialidade = inputEspecialidade.value;
        if (inputModalidade.value !== valoresCarregados.modalidade) corpo.modalidade = inputModalidade.value;

        const cidade = inputCidade.value.trim();
        if (cidade !== valoresCarregados.cidade) corpo.cidade = cidade;

        if (selectEstado.value !== valoresCarregados.estado) corpo.estado = selectEstado.value;

        const valor = moedaParaNumero(inputValor.value);
        if (valor !== valoresCarregados.valor) corpo.orcamento = valor;

        if (inputPrazo.value !== valoresCarregados.prazo) corpo.prazoConclusao = inputPrazo.value;

        const descricao = inputDescricao.value.trim();
        if (descricao !== valoresCarregados.descricao) corpo.descricao = descricao;

        return corpo;
    }

    /* ------------------------- salvar (PATCH) ------------------------------ */
    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        limparMensagem();

        if (!validarFormulario()) return;

        const corpo = montarCorpoAtualizacao();

        if (Object.keys(corpo).length === 0) {
            mostrarMensagem('Nenhuma alteração para salvar.', 'error');
            return;
        }

        btnSubmit.disabled = true;
        const textoOriginalBtn = btnSubmit.innerHTML;
        btnSubmit.innerHTML = '<span class="spinner"></span> Salvando...';

        try {
            await api(`/vagas/${encodeURIComponent(vagaId)}`, { method: 'PATCH', body: corpo });

            mostrarMensagem('Alterações salvas com sucesso! Redirecionando...', 'success');

            setTimeout(function () {
                window.location.href = '/pages/15-minhas-vagas.html';
            }, 1200);
        } catch (erro) {
            console.error('Erro ao salvar vaga:', erro);
            mostrarMensagem(erro.message || 'Não foi possível salvar as alterações. Tente novamente em instantes.', 'error');
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = textoOriginalBtn;
        }
    });
});
