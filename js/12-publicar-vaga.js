document.addEventListener('DOMContentLoaded', function () {
    const sessao = exigirTipo('empresas');
    if (!sessao) return;

    renderizarSidebar(document.querySelector('.sidebar'), 'empresas', '12-publicar-vaga');
    renderizarTopbar(document.getElementById('header-acoes'), sessao);
    renderizarBannerValidacao(document.querySelector('.main'), sessao);

    initMenuMobile();

    /* ------------------------- refs ---------------------------------------- */
    const form = document.getElementById('formPublicarVaga');
    const alertBar = document.getElementById('alert-publicar-vaga');
    const inputTitulo = document.getElementById('titulo');
    const selectEspecialidade = document.getElementById('especialidade');
    const selectModalidade = document.getElementById('modalidade');
    const inputCidade = document.getElementById('cidade');
    const selectEstado = document.getElementById('estado');
    const inputValor = document.getElementById('valor');
    const inputPrazo = document.getElementById('prazo');
    const inputDescricao = document.getElementById('descricao');
    const btnSubmit = document.getElementById('btnSubmit');

    const TETO_VALOR = 99999.99;
    const PRAZO_MAX_DIAS = 730;

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

    /* ------------------------- cidade/estado (perfil da empresa + IBGE) ---- */
    // Pré-seleciona a localidade comercial cadastrada no perfil da empresa
    // logada (GET /User/perfil/empresa -> city/state, mesmos nomes que
    // js/09-perfil-empresa.js já integrado usa). Publicar vaga não depende
    // mais de assinatura ativa.
    async function prepararLocalidade() {
        let cidade = '';
        let estado = '';
        try {
            const perfil = await api('/User/perfil/empresa', { semRedirect: true });
            cidade = (perfil && perfil.city) || '';
            estado = (perfil && perfil.state) || '';
        } catch (erro) {
            console.error('Erro ao carregar localidade da empresa:', erro);
        }

        await carregarUFs(selectEstado, estado);
        if (cidade) inputCidade.value = cidade;
        montarAutocompleteCidade(inputCidade, selectEstado);
    }

    prepararLocalidade();

    /* ------------------------- máscara de moeda ---------------------------- */
    aplicarMascaraMoeda(inputValor, TETO_VALOR);

    /* ------------------------- limites do prazo ----------------------------- */
    const limitesPrazo = limitesDataPrazo(PRAZO_MAX_DIAS);
    inputPrazo.min = limitesPrazo.min;
    inputPrazo.max = limitesPrazo.max;

    /* ------------------------- validação ----------------------------------- */
    function validarFormulario() {
        const erros = [];

        if (!inputTitulo.value.trim()) erros.push('Informe o título da vaga.');
        else if (inputTitulo.value.trim().length > 100) erros.push('O título deve ter no máximo 100 caracteres.');
        if (!selectEspecialidade.value) erros.push('Selecione a especialidade.');
        if (!selectModalidade.value) erros.push('Selecione a modalidade.');
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

    /* ------------------------- envio --------------------------------------- */
    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        limparMensagem();

        if (!validarFormulario()) return;

        const sessaoAtual = obterSessao();
        if (!sessaoAtual || sessaoAtual.tipo !== 'empresas') {
            mostrarMensagem('Sessão expirada. Faça login novamente com a conta da sua empresa.', 'error');
            return;
        }

        const novaVaga = {
            titulo: inputTitulo.value.trim(),
            descricao: inputDescricao.value.trim(),
            especialidade: selectEspecialidade.value,
            modalidade: selectModalidade.value,
            cidade: inputCidade.value.trim(),
            estado: selectEstado.value,
            orcamento: moedaParaNumero(inputValor.value),
            prazoConclusao: inputPrazo.value
        };

        btnSubmit.disabled = true;
        const textoOriginalBtn = btnSubmit.innerHTML;
        btnSubmit.innerHTML = '<span class="spinner"></span> Publicando...';

        try {
            await api('/vagas', { method: 'POST', body: novaVaga });

            mostrarMensagem('Vaga publicada com sucesso! Redirecionando...', 'success');

            setTimeout(function () {
                window.location.href = '/pages/15-minhas-vagas.html';
            }, 1200);
        } catch (erro) {
            console.error('Erro ao publicar vaga:', erro);
            mostrarMensagem(erro.message || 'Não foi possível publicar a vaga. Tente novamente em instantes.', 'error');
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = textoOriginalBtn;
        }
    });
});
