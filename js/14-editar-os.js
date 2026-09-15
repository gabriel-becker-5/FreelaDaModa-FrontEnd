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

    // ── 5. Carregar a Ordem de Serviço para edição ──
    const params = new URLSearchParams(window.location.search);
    const idOS = params.get('id');
    let osAtual = null;

    if (!idOS) {
        alert('Ordem de serviço não especificada.');
        window.location.href = '/pages/16-ordens-servico.html';
        return;
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
        document.getElementById('os-status').value = os.status || 'Em andamento';
        document.getElementById('os-avaliacao-freela').value = os.avaliacaoFreelancer || 'Pendente';
        document.getElementById('os-avaliacao-conf').value = os.avaliacaoConfeccao || 'Pendente';
        document.getElementById('os-observacoes').value = os.observacoes || '';
    }

    async function carregarOS() {
        try {
            const res = await fetch(`${API_BASE}/ordensServico/${idOS}`);
            if (!res.ok) throw new Error(`OS não encontrada (HTTP ${res.status}).`);
            preencherFormulario(await res.json());
        } catch (erro) {
            console.error('Erro ao carregar OS para edição:', erro);
        }
    }

    carregarOS();

    // ── 6. Validação e Envio do Formulário (grava via PATCH) ──
    const form = document.querySelector('form.card');
    const alertaSucesso = form ? form.querySelector('.alert-success') : null;

    if (form) {
        if (alertaSucesso) alertaSucesso.hidden = true;

        form.addEventListener('submit', async function (e) {
            e.preventDefault();

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

                if (alertaSucesso) {
                    alertaSucesso.textContent = 'Ordem de serviço atualizada com sucesso!';
                    alertaSucesso.hidden = false;
                }
                window.scrollTo({ top: 0, behavior: 'smooth' });

                setTimeout(function () {
                    window.location.href = '/pages/16-ordens-servico.html';
                }, 1200);
            } catch (erro) {
                console.error('Erro ao salvar Ordem de Serviço:', erro);
                btnSalvar.disabled = false;
                btnSalvar.innerHTML = textoOriginal;
                alert('Não foi possível salvar as alterações. Verifique se o json-server está rodando.');
            }
        });
    }
});
