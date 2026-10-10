// Detalhe da Ordem de Serviço (empresa ou freelancer)
//
// Integração com o back (Fase 2.3):
//   GET  /OrdemServico/detalhe/{id}      -> detalhe da OS (só quem participa dela)
//   POST /OrdemServico/{id}/concluir     -> só a empresa dona da OS
//   POST /OrdemServico/{id}/cancelar     -> empresa dona ou freelancer da OS
//
// ATENÇÃO: "apiFetch" é o NOME PROVISÓRIO do helper da Fase 0 (api.js).
// Quando o api.js entrar na main, troque apenas esse nome (e o formato da URL,
// se o helper receber só o caminho em vez da URL completa). O helper deve:
//   - injetar o Bearer token;
//   - devolver os dados da resposta;
//   - lançar um Error com a mensagem do back (e, se possível, erro.status).

document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    const API_URL_OS = `${API_BASE}/OrdemServico`;

    // Textos exatos de status aceitos pelo back.
    const STATUS_EM_ANDAMENTO = 'Em andamento';
    const STATUS_CONCLUIDA = 'Concluída';

    // ── Sessão: empresa OU freelancer logado pode ver a OS (o back garante que cada um só vê a sua) ──
    const sessao = exigirLogin();
    if (!sessao) return;

    renderizarSidebar(document.querySelector('.sidebar'), sessao.tipo, sessao.tipo === 'empresas' ? '16-ordens-servico' : '29-minhas-os');
    renderizarTopbar(document.querySelector('#header-acoes'), sessao);
    renderizarBannerValidacao(document.querySelector('.main'), sessao);

    // ── Menu Lateral no Celular (Hambúrguer) ──
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

    // ── Parâmetro da URL ──
    const params = new URLSearchParams(window.location.search);
    const idOS = params.get('id');

    if (!idOS) {
        window.location.href = sessao.tipo === 'empresas' ? '/pages/16-ordens-servico.html' : '/pages/29-minhas-os.html';
        return;
    }

    // ── Botões de ação ──
    const btnFinalizar = document.getElementById('btn-finalizar-os');

    // O botão Cancelar pode não existir no HTML ainda: se não existir, é criado ao lado do Finalizar.
    let btnCancelar = document.getElementById('btn-cancelar-os');
    if (!btnCancelar && btnFinalizar) {
        btnCancelar = document.createElement('button');
        btnCancelar.type = 'button';
        btnCancelar.id = 'btn-cancelar-os';
        btnCancelar.className = 'btn btn-danger';
        btnCancelar.innerHTML = '<i class="bi bi-x-circle"></i> Cancelar OS';
        btnCancelar.hidden = true;
        btnFinalizar.insertAdjacentElement('afterend', btnCancelar);
    }

    function mostrarMensagem(texto, tipo) {
        const el = document.getElementById('mensagemStatus');
        if (!el) return;
        el.className = `alert mb-md alert-${tipo}`;
        el.innerHTML = `<i class="bi ${tipo === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'}"></i> ${escapeHtml(texto)}`;
        el.hidden = false;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function classeBadgeStatus(status) {
        if (status === STATUS_CONCLUIDA) return 'badge-success';
        if (status === 'Cancelada') return 'badge-danger';
        return 'badge-warning';
    }

    // O valor pode chegar como número (back) ou como texto "R$ 2.500,00" (mock).
    function formatarValor(valor) {
        if (valor === null || valor === undefined || valor === '') return '—';
        if (typeof valor === 'number') {
            return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }
        return valor;
    }

    // Renderiza o anexo de uma OS. Anexos são gravados por CAMINHO (/uploads/...);
    // exibe apenas a imagem (sem o nome do arquivo), com ícone quando indisponível.
    function renderizarAnexo(elementoId, valor) {
        const el = document.getElementById(elementoId);
        if (!el) return;

        el.innerHTML = '';

        if (!valor) {
            el.textContent = 'Nenhum arquivo anexado.';
            return;
        }

        if (typeof valor === 'string' && (valor.startsWith('/uploads/') || valor.startsWith('blob:'))) {
            const img = document.createElement('img');
            img.src = valor;
            img.alt = 'Imagem de referência';
            img.className = 'anexo-os-imagem';
            img.onerror = function () {
                const icone = document.createElement('i');
                icone.className = 'bi bi-file-earmark-image';
                icone.style.cssText = 'font-size: 24px; display: block; margin: 0 auto;';
                img.replaceWith(icone);
            };
            el.appendChild(img);
            return;
        }

        // Formato não suportado: exibe como texto simples (sem injetar HTML).
        el.textContent = typeof valor === 'object' && valor.nome ? valor.nome : String(valor);
    }

    let osAtual = null;
    let acaoEmAndamento = false;

    function renderizarOS(os) {
        osAtual = os;

        document.getElementById('os-titulo').textContent = os.titulo;
        document.getElementById('os-id-display').textContent = `OS-${os.id}`;
        document.getElementById('os-categoria-display').textContent = os.categoria || '—';
        document.getElementById('os-modalidade-display').textContent = os.modalidade || '—';
        document.getElementById('os-empresa-display').textContent = '';
        if (os.empresaId) {
            const linkEmpresa = document.createElement('a');
            linkEmpresa.href = `/pages/26-perfil-empresa-publico.html?id=${encodeURIComponent(os.empresaId)}`;
            linkEmpresa.textContent = os.empresaNome || '—';
            document.getElementById('os-empresa-display').appendChild(linkEmpresa);
        } else {
            document.getElementById('os-empresa-display').textContent = os.empresaNome || '—';
        }
        document.getElementById('os-local-display').textContent = [os.cidade, os.estado].filter(Boolean).join(' - ') || '—';
        document.getElementById('os-data-display').textContent = formatarDataHora(os.dataPublicacao);
        document.getElementById('os-valor-display').textContent = formatarValor(os.valor);
        document.getElementById('os-descricao-display').textContent = os.descricao || '—';

        const habilidadesEl = document.getElementById('os-habilidades-display');
        habilidadesEl.innerHTML = (Array.isArray(os.habilidades) && os.habilidades.length)
            ? os.habilidades.map(function (h) { return `<span class="badge">${escapeHtml(h)}</span>`; }).join('')
            : '<span class="text-muted">Nenhuma habilidade cadastrada.</span>';

        const badgeStatus = document.getElementById('os-status-badge');
        badgeStatus.className = `badge ${classeBadgeStatus(os.status)}`;
        badgeStatus.textContent = os.status;

        document.getElementById('os-freelancer-display').textContent = '';
        if (os.freelancerId) {
            const linkFreelancer = document.createElement('a');
            linkFreelancer.href = `/pages/25-perfil-freelancer-publico.html?id=${encodeURIComponent(os.freelancerId)}`;
            linkFreelancer.textContent = os.freelancerNome || '—';
            document.getElementById('os-freelancer-display').appendChild(linkFreelancer);
        } else {
            document.getElementById('os-freelancer-display').textContent = os.freelancerNome || '—';
        }
        document.getElementById('os-prazo-display').textContent = formatarData(os.prazo);
        document.getElementById('os-previsao-display').textContent = formatarData(os.previsaoConclusao);
        document.getElementById('os-avaliacao-freela-display').textContent = os.avaliacaoFreelancer || 'Pendente';
        document.getElementById('os-avaliacao-conf-display').textContent = os.avaliacaoConfeccao || 'Pendente';
        document.getElementById('os-observacoes-display').textContent = os.observacoes || '—';
        renderizarAnexo('os-briefing-display', os.referenciaBriefing);
        renderizarAnexo('os-entrega-display', os.referenciaEntrega);

        const timeline = document.getElementById('os-timeline');
        timeline.innerHTML = (Array.isArray(os.historico) && os.historico.length)
            ? os.historico.map(function (item) {
                return `<div class="timeline-item">${formatarData(item.data)} - ${escapeHtml(item.evento)}</div>`;
            }).join('')
            : '<div class="timeline-item">Nenhum evento registrado.</div>';

        // Ações conforme o papel de quem está logado.
        // A autorização de verdade é do back (detalhe, concluir e cancelar só valem para
        // quem participa da OS); aqui o papel só decide quais botões aparecem.
        const ehEmpresa = sessao.tipo === 'empresas';
        const ehFreelancer = sessao.tipo === 'freelancers';
        const emAndamento = os.status === STATUS_EM_ANDAMENTO;

        const linkEditar = document.getElementById('os-link-editar');
        const linkAvaliar = document.getElementById('os-link-avaliar');

        if (linkEditar) {
            linkEditar.hidden = !ehEmpresa;
            linkEditar.href = `/pages/14-editar-os.html?id=${os.id}`;
        }

        // Concluir: só empresa. Cancelar: empresa ou freelancer.
        // Os dois somem quando a OS não está Em andamento (Concluída e Cancelada são finais).
        if (btnFinalizar) btnFinalizar.hidden = !(ehEmpresa && emAndamento);
        if (btnCancelar) btnCancelar.hidden = !((ehEmpresa || ehFreelancer) && emAndamento);

        if (linkAvaliar) {
            const podeAvaliar = ehFreelancer && os.status === STATUS_CONCLUIDA && os.avaliacaoFreelancer !== 'Avaliado';
            linkAvaliar.hidden = !podeAvaliar;
            linkAvaliar.href = `/pages/23-avaliacao-os.html?id=${os.id}`;
        }

        // O registro visual da entrega ainda não tem endpoint no back (fica para a fase seguinte).
        const uploadEntrega = document.getElementById('os-entrega-upload');
        if (uploadEntrega) uploadEntrega.hidden = true;
    }

    // Carrega (ou recarrega) a OS. Devolve a mensagem de erro, ou '' se deu certo.
    async function carregarOS() {
        try {
            const dados = await apiFetch(`${API_URL_OS}/detalhe/${encodeURIComponent(idOS)}`);
            const os = (dados && dados.id === undefined && dados.dados) ? dados.dados : dados;

            if (!os || os.id === undefined) {
                throw new Error('Ordem de Serviço não encontrada.');
            }

            renderizarOS(os);
            return '';
        } catch (erro) {
            console.error('Erro ao carregar Ordem de Serviço:', erro);
            const mensagem = (erro && erro.message) || 'Não foi possível carregar a Ordem de Serviço. Tente novamente.';
            mostrarMensagem(mensagem, 'error');
            return mensagem;
        }
    }

    carregarOS();

    // ── Concluir ou cancelar a OS ──
    // Depois de qualquer resposta (sucesso ou erro, inclusive 409) a OS é recarregada
    // para mostrar o estado real.
    async function executarAcaoOS(acao, botao, textoCarregando, mensagemSucesso) {
        if (!osAtual || acaoEmAndamento) return;

        acaoEmAndamento = true;
        const textoOriginal = botao.innerHTML;
        if (btnFinalizar) btnFinalizar.disabled = true;
        if (btnCancelar) btnCancelar.disabled = true;
        botao.innerHTML = `<span class="spinner"></span> ${textoCarregando}`;

        let mensagemErro = '';

        try {
            // POST sem corpo; o back valida quem pode e se a OS ainda está Em andamento.
            await apiFetch(`${API_URL_OS}/${encodeURIComponent(osAtual.id)}/${acao}`, { method: 'POST' });
        } catch (erro) {
            console.error(`Erro ao ${acao} Ordem de Serviço:`, erro);
            mensagemErro = (erro && erro.message) || 'Não foi possível atualizar a OS. Tente novamente.';
        }

        await carregarOS();

        botao.innerHTML = textoOriginal;
        if (btnFinalizar) btnFinalizar.disabled = false;
        if (btnCancelar) btnCancelar.disabled = false;
        acaoEmAndamento = false;

        if (mensagemErro) {
            mostrarMensagem(mensagemErro, 'error');
        } else {
            mostrarMensagem(mensagemSucesso, 'success');
        }
    }

    // ── Finalizar Ordem de Serviço (empresa) ──
    if (btnFinalizar) {
        btnFinalizar.addEventListener('click', async function () {
            if (!osAtual) return;

            const confirmou = await modalConfirmar({
                titulo: 'Encerrar Ordem de Serviço',
                mensagem: 'Ao executar esta ação, será realizada a finalização da Ordem de Serviço, você confirma?',
                textoConfirmar: 'Encerrar',
                textoCancelar: 'Cancelar'
            });
            if (!confirmou) return;

            executarAcaoOS('concluir', btnFinalizar, 'Finalizando...', 'Ordem de serviço finalizada com sucesso.');
        });
    }

    // ── Cancelar Ordem de Serviço (empresa ou freelancer) ──
    if (btnCancelar) {
        btnCancelar.addEventListener('click', async function () {
            if (!osAtual) return;

            const confirmou = await modalConfirmar({
                titulo: 'Cancelar Ordem de Serviço',
                mensagem: 'Deseja cancelar esta Ordem de Serviço? Essa ação não poderá ser desfeita.',
                textoConfirmar: 'Cancelar OS',
                textoCancelar: 'Voltar',
                perigoso: true
            });
            if (!confirmou) return;

            executarAcaoOS('cancelar', btnCancelar, 'Cancelando...', 'Ordem de serviço cancelada.');
        });
    }
});