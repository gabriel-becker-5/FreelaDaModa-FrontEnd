document.addEventListener('DOMContentLoaded', function () {
    'use strict';

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

    // ── 3. Contador de Valor (Botões +/-) ──
    const inputValor = document.getElementById('os-valor');
    const botoesNumero = document.querySelectorAll('.input-number-btn');

    botoesNumero.forEach(function (btn) {
        const aumentando = btn.textContent.trim() === '+';
        btn.addEventListener('click', function () {
            if (!inputValor) return;
            const passo = Number(inputValor.step) || 100;
            const atual = Number(inputValor.value) || 0;
            const novoValor = aumentando ? atual + passo : Math.max(0, atual - passo);
            inputValor.value = novoValor;
        });
    });

    // ── 4. Autocomplete de Cidade ──
    const inputCidade = document.getElementById('os-cidade');
    const dropdownCidade = document.querySelector('.autocomplete-dropdown');

    if (inputCidade && dropdownCidade) {
        inputCidade.addEventListener('focus', function () {
            dropdownCidade.style.display = 'block';
        });

        dropdownCidade.querySelectorAll('.autocomplete-item').forEach(function (item) {
            item.addEventListener('click', function () {
                inputCidade.value = item.textContent.trim();
                dropdownCidade.style.display = 'none';
            });
        });

        document.addEventListener('click', function (e) {
            const dentroDoCampo = inputCidade.contains(e.target) || dropdownCidade.contains(e.target);
            if (!dentroDoCampo) dropdownCidade.style.display = 'none';
        });
    }

    // ── Proteção de rota (só empresa logada) ──
    const sessao = JSON.parse(sessionStorage.getItem('usuarioLogado') || 'null');
    if (!sessao || sessao.tipo !== 'empresas') {
        window.location.href = '/pages/02-login.html';
        return;
    }

    // ── 5. Carregar a Ordem de Serviço para edição ──
    const params = new URLSearchParams(window.location.search);
    const idOS = params.get('id');
    let osAtual = null;
    let acessoNegado = false;

    if (!idOS) {
        window.location.href = '/pages/16-ordens-servico.html';
        return;
    }

    // ── Preview de anexo (referências visuais) ──
    function descreverAnexo(valor) {
        if (!valor) return 'Nenhum arquivo anexado.';
        if (typeof valor === 'object' && valor.nome) {
            const tamanho = typeof valor.tamanho === 'number'
                ? ` (${(valor.tamanho / 1024 / 1024).toFixed(1)} MB)`
                : '';
            return `${valor.nome}${tamanho}`;
        }
        return String(valor);
    }

    function atualizarPreviewAnexo(spanId, valor) {
        const span = document.getElementById(spanId);
        if (span) span.textContent = descreverAnexo(valor);
    }

    function preencherFormulario(os) {
        osAtual = os;
        document.getElementById('os-id').value = `OS-${os.id}`;
        document.getElementById('os-titulo').value = os.titulo || '';
        document.getElementById('os-categoria').value = os.categoria || 'Costura';
        document.getElementById('os-modalidade').value = os.modalidade || 'Presencial';
        document.getElementById('os-empresa').value = os.empresaNome || '';
        document.getElementById('os-cidade').value = os.cidade || '';
        document.getElementById('os-estado').value = os.estado || '';
        document.getElementById('os-valor').value = os.valor || 0;
        document.getElementById('os-prazo').value = os.prazo || '';
        document.getElementById('os-previsao').value = os.previsaoConclusao || '';
        document.getElementById('os-freelancer').value = os.freelancerNome || '';
        document.getElementById('os-descricao').value = os.descricao || '';
        document.getElementById('os-requisitos').value = os.requisitos || '';
        const selectStatus = document.getElementById('os-status');
        const statusMensagem = document.getElementById('os-status-mensagem');
        selectStatus.value = os.status || 'Em andamento';
        // Uma OS já concluída ou cancelada é um estado final — não faz sentido
        // reabri-la ou pular de um estado final direto para outro por aqui.
        const estadoFinal = os.status === 'Concluída' || os.status === 'Cancelada';
        selectStatus.disabled = estadoFinal;
        if (statusMensagem) {
            statusMensagem.textContent = estadoFinal
                ? 'Esta OS já está em um estado final e não pode ser reaberta.'
                : '';
        }
        document.getElementById('os-avaliacao-freela').value = os.avaliacaoFreelancer || 'Pendente';
        document.getElementById('os-avaliacao-conf').value = os.avaliacaoConfeccao || 'Pendente';
        document.getElementById('os-observacoes').value = os.observacoes || '';
        atualizarPreviewAnexo('briefing-file-name', os.referenciaBriefing);
        atualizarPreviewAnexo('entrega-file-name', os.referenciaEntrega);
    }

    async function carregarOS() {
        try {
            const res = await fetch(`${API_BASE}/ordensServico/${idOS}`);
            if (!res.ok) throw new Error(`OS não encontrada (HTTP ${res.status}).`);
            const os = await res.json();

            if (String(os.empresaId) !== String(sessao.id)) {
                acessoNegado = true;
                alertaSucessoExibir('Esta Ordem de Serviço não pertence à sua empresa.', 'error');
                const formEl = document.querySelector('form.card');
                if (formEl) {
                    formEl.querySelectorAll('input, select, textarea, button').forEach(function (el) { el.disabled = true; });
                }
                return;
            }

            preencherFormulario(os);
        } catch (erro) {
            console.error('Erro ao carregar OS para edição:', erro);
        }
    }

    carregarOS();

    // ── 5b. Upload de Referências Visuais (briefing e entrega) ──
    let briefingSelecionado = null;
    let entregaSelecionado = null;
    const TAMANHO_MAXIMO = 10 * 1024 * 1024; // 10MB

    function configurarUpload(dropzoneId, inputId, previewSpanId, aoSelecionar) {
        const dropzone = document.getElementById(dropzoneId);
        const input = document.getElementById(inputId);
        if (!dropzone || !input) return;

        dropzone.addEventListener('click', function () {
            input.click();
        });

        dropzone.addEventListener('dragover', function (e) {
            e.preventDefault();
        });

        dropzone.addEventListener('drop', function (e) {
            e.preventDefault();
            const arquivo = e.dataTransfer && e.dataTransfer.files ? e.dataTransfer.files[0] : null;
            if (arquivo) processarArquivo(arquivo, previewSpanId, aoSelecionar);
        });

        input.addEventListener('change', function () {
            const arquivo = this.files && this.files[0] ? this.files[0] : null;
            if (arquivo) processarArquivo(arquivo, previewSpanId, aoSelecionar);
        });
    }

    function processarArquivo(file, previewSpanId, aoSelecionar) {
        if (!file.type || !file.type.startsWith('image/')) {
            alertaSucessoExibir('Selecione apenas arquivos de imagem.', 'error');
            return;
        }
        if (file.size > TAMANHO_MAXIMO) {
            alertaSucessoExibir('O arquivo excede o limite de 10MB.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = function () {
            const selecionado = {
                nome: file.name,
                tipo: file.type,
                tamanho: file.size,
                dados: reader.result
            };
            aoSelecionar(selecionado);
            atualizarPreviewAnexo(previewSpanId, selecionado);
        };
        reader.readAsDataURL(file);
    }

    configurarUpload('briefing-dropzone', 'briefing-file-input', 'briefing-file-name', function (selecionado) {
        briefingSelecionado = selecionado;
    });
    configurarUpload('entrega-dropzone', 'entrega-file-input', 'entrega-file-name', function (selecionado) {
        entregaSelecionado = selecionado;
    });

    // ── 6. Validação e Envio do Formulário (grava via PATCH) ──
    const form = document.querySelector('form.card');
    const alertaSucesso = form ? form.querySelector('.alert-success') : null;

    function alertaSucessoExibir(texto, tipo) {
        if (!alertaSucesso) return;
        alertaSucesso.classList.toggle('alert-success', tipo !== 'error');
        alertaSucesso.classList.toggle('alert-error', tipo === 'error');
        alertaSucesso.textContent = texto;
        alertaSucesso.hidden = false;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (form) {
        if (alertaSucesso) alertaSucesso.hidden = true;

        form.addEventListener('submit', async function (e) {
            e.preventDefault();
            if (acessoNegado) return;

            const titulo = document.getElementById('os-titulo');
            const descricao = document.getElementById('os-descricao');
            const requisitos = document.getElementById('os-requisitos');

            let valido = true;
            [titulo, descricao, requisitos].forEach(function (campo) {
                if (!campo) return;
                const vazio = !campo.value.trim();
                campo.classList.toggle('input-error', vazio);
                if (vazio) valido = false;
            });

            if (!valido) return;

            const btnSalvar = form.querySelector('button[type="submit"]');
            const textoOriginal = btnSalvar.innerHTML;
            btnSalvar.disabled = true;
            btnSalvar.innerHTML = '<span class="spinner"></span> Salvando...';

            const alteracoes = {
                titulo: titulo.value.trim(),
                categoria: document.getElementById('os-categoria').value,
                modalidade: document.getElementById('os-modalidade').value,
                cidade: document.getElementById('os-cidade').value.trim(),
                estado: document.getElementById('os-estado').value.trim(),
                valor: document.getElementById('os-valor').value,
                prazo: document.getElementById('os-prazo').value,
                previsaoConclusao: document.getElementById('os-previsao').value,
                descricao: descricao.value.trim(),
                requisitos: requisitos.value.trim(),
                status: document.getElementById('os-status').value,
                observacoes: document.getElementById('os-observacoes').value.trim()
            };

            if (briefingSelecionado) alteracoes.referenciaBriefing = briefingSelecionado;
            if (entregaSelecionado) alteracoes.referenciaEntrega = entregaSelecionado;

            try {
                const idParaSalvar = osAtual ? osAtual.id : idOS;
                if (idParaSalvar) {
                    const res = await fetch(`${API_BASE}/ordensServico/${idParaSalvar}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(alteracoes)
                    });
                    if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
                }

                alertaSucessoExibir('Ordem de serviço atualizada com sucesso!', 'success');

                setTimeout(function () {
                    window.location.href = '/pages/16-ordens-servico.html';
                }, 1200);
            } catch (erro) {
                console.error('Erro ao salvar Ordem de Serviço:', erro);
                btnSalvar.disabled = false;
                btnSalvar.innerHTML = textoOriginal;
                alertaSucessoExibir('Não foi possível salvar as alterações. Verifique se o json-server está rodando.', 'error');
            }
        });
    }

    // ── 7. Excluir Ordem de Serviço (modal de confirmação) ──
    const modalExcluir = document.getElementById('modalExcluir');
    const btnExcluirOS = document.getElementById('btnExcluirOS');
    const btnCancelarExclusao = document.getElementById('btnCancelarExclusao');
    const btnConfirmarExclusao = document.getElementById('btnConfirmarExclusao');

    if (btnExcluirOS && modalExcluir) {
        btnExcluirOS.addEventListener('click', function () {
            if (acessoNegado) return;
            modalExcluir.style.display = 'flex';
        });
    }

    if (btnCancelarExclusao && modalExcluir) {
        btnCancelarExclusao.addEventListener('click', function () {
            modalExcluir.style.display = 'none';
        });
    }

    if (btnConfirmarExclusao) {
        btnConfirmarExclusao.addEventListener('click', async function () {
            const idParaExcluir = osAtual ? osAtual.id : idOS;
            if (!idParaExcluir) return;
            try {
                const res = await fetch(`${API_BASE}/ordensServico/${idParaExcluir}`, { method: 'DELETE' });
                if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
                window.location.href = '/pages/16-ordens-servico.html';
            } catch (erro) {
                console.error('Erro ao excluir Ordem de Serviço:', erro);
                if (modalExcluir) modalExcluir.style.display = 'none';
                alertaSucessoExibir('Não foi possível excluir a ordem de serviço. Verifique se o json-server está rodando.', 'error');
            }
        });
    }
});
