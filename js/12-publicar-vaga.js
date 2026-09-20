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
    const inputReferencias = document.getElementById('refs-vaga');
    const referenciasPreview = document.getElementById('refs-vaga-preview');
    const btnSubmit = document.getElementById('btnSubmit');

    const LIMITE_FOTO_MB = 5;
    const MAX_REFERENCIAS = 10;
    const TETO_VALOR = 99999.99;
    const PRAZO_MAX_DIAS = 730;

    // Referências ficam em preview na sessão; os caminhos são montados após a
    // vaga ser criada (o id vem do POST) e gravados via PATCH.
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
        alertBar.innerHTML = `<i class="bi ${tipo === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'}"></i> ${texto}`;
        alertBar.removeAttribute('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function limparMensagem() {
        if (alertBar) alertBar.setAttribute('hidden', '');
    }

    /* ------------------------- assinatura ---------------------------------- */
    // Publicar vaga é um recurso pago: exige assinatura com status "ativo".
    async function empresaTemAssinaturaAtiva(empresaId) {
        try {
            const res = await fetch(`${API_BASE}/assinaturas?empresaId=${encodeURIComponent(empresaId)}`);
            if (!res.ok) return false;
            const assinaturas = await res.json();
            return assinaturas.some(function (a) { return a.status === 'ativo'; });
        } catch (erro) {
            console.error('Erro ao verificar assinatura:', erro);
            return false;
        }
    }

    /* ------------------------- cidade/estado (IBGE) ------------------------ */
    // Pré-seleciona a localidade cadastrada da empresa logada.
    async function prepararLocalidade() {
        try {
            const res = await fetch(`${API_BASE}/empresas/${sessao.id}`);
            if (!res.ok) throw new Error('Erro ao carregar empresa.');
            const empresa = await res.json();

            await carregarUFs(selectEstado, empresa.estadoComercial || '');
            if (empresa.cidadeComercial) inputCidade.value = empresa.cidadeComercial;
            montarAutocompleteCidade(inputCidade, selectEstado);
        } catch (erro) {
            console.error('Erro ao preparar localidade:', erro);
            await carregarUFs(selectEstado, '');
            montarAutocompleteCidade(inputCidade, selectEstado);
        }
    }

    prepararLocalidade();

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
                if (urlRemovida && urlRemovida.startsWith('blob:')) URL.revokeObjectURL(urlRemovida);
                renderizarReferencias();
            });

            item.appendChild(botao);
            referenciasPreview.appendChild(item);
        });
    }

    renderizarReferencias();

    inputReferencias.addEventListener('change', function () {
        const arquivos = Array.from(inputReferencias.files);
        let ignorados = 0;

        arquivos.forEach(function (arquivo) {
            if (referenciasPreviewUrls.length >= MAX_REFERENCIAS) {
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
            referenciasPreviewUrls.push(URL.createObjectURL(arquivo));
        });

        renderizarReferencias();

        if (ignorados > 0) {
            mostrarMensagem(`Algumas fotos não foram adicionadas (são permitidas até ${MAX_REFERENCIAS} imagens de até ${LIMITE_FOTO_MB}MB cada).`, 'error');
        }
        inputReferencias.value = '';
    });

    /* ------------------------- validação ----------------------------------- */
    function validarFormulario() {
        const erros = [];

        if (!inputTitulo.value.trim()) erros.push('Informe o título da vaga.');
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
        }

        if (erros.length) {
            mostrarMensagem(erros.join('<br>'), 'error');
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

        btnSubmit.disabled = true;
        const textoOriginalBtn = btnSubmit.innerHTML;
        btnSubmit.innerHTML = '<span class="spinner"></span> Verificando assinatura...';

        const assinaturaAtiva = await empresaTemAssinaturaAtiva(sessaoAtual.id);
        if (!assinaturaAtiva) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = textoOriginalBtn;
            mostrarMensagem('Sua empresa não tem uma assinatura ativa. Contrate um plano na página de Assinatura para publicar vagas.', 'error');
            return;
        }

        const cidade = inputCidade.value.trim();
        const novaVaga = {
            empresaId: sessaoAtual.id,
            empresaNome: sessaoAtual.nome,
            titulo: inputTitulo.value.trim(),
            especialidade: selectEspecialidade.value,
            valor: formatarMoeda(moedaParaNumero(inputValor.value)),
            prazo: inputPrazo.value,
            modalidade: selectModalidade.value,
            cidade: cidade,
            estado: selectEstado.value,
            local: cidade,
            descricao: inputDescricao.value.trim(),
            dataPublicacao: new Date().toISOString(),
            status: 'Aberta'
        };

        btnSubmit.innerHTML = '<span class="spinner"></span> Publicando...';

        try {
            const res = await fetch(`${API_BASE}/vagas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(novaVaga)
            });
            if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);

            const vagaCriada = await res.json();

            if (referenciasPreviewUrls.length) {
                const caminhos = referenciasPreviewUrls.map(function (_, indice) {
                    return `/uploads/vagas/${vagaCriada.id}/referencia-${indice + 1}.jpg`;
                });
                await fetch(`${API_BASE}/vagas/${vagaCriada.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ referencias: caminhos })
                });
            }

            mostrarMensagem('Vaga publicada com sucesso! Redirecionando...', 'success');

            setTimeout(function () {
                window.location.href = '/pages/15-minhas-vagas.html';
            }, 1500);
        } catch (erro) {
            console.error('Erro ao publicar vaga:', erro);
            mostrarMensagem('Não foi possível publicar a vaga. Tente novamente em instantes.', 'error');
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = textoOriginalBtn;
        }
    });
});
