document.addEventListener('DOMContentLoaded', function () {
    const sessao = obterSessao();

    /* ------------------------- navegação dinâmica -------------------------- */
    if (!sessao) {
        // Página pública para visitantes: header simples, sem sidebar.
        renderizarHeaderPublico(document.getElementById('header-acoes'));
        document.querySelector('.sidebar').setAttribute('hidden', '');
        document.querySelector('.sidebar-toggle-btn').setAttribute('hidden', '');
        document.querySelector('.sidebar-overlay').setAttribute('hidden', '');
    } else if (sessao.tipo === 'freelancers') {
        renderizarSidebar(document.querySelector('.sidebar'), 'freelancers', '07-vagas');
        renderizarTopbar(document.getElementById('header-acoes'), sessao);
        renderizarBannerValidacao(document.querySelector('.main'), sessao);
        initMenuMobile();
    } else {
        renderizarSidebar(document.querySelector('.sidebar'), 'empresas', '18-vaga-detalhe');
        renderizarTopbar(document.getElementById('header-acoes'), sessao);
        renderizarBannerValidacao(document.querySelector('.main'), sessao);
        initMenuMobile();
    }

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
    const mensagemStatus = document.getElementById('mensagemStatus');

    function limparMensagem() {
        if (mensagemStatus) mensagemStatus.setAttribute('hidden', '');
    }

    /* ------------------------- refs ---------------------------------------- */
    const vagaId = new URLSearchParams(window.location.search).get('id');
    const loadingBar = document.getElementById('vagaLoading');
    const erroBar = document.getElementById('vagaErro');
    const conteudo = document.getElementById('vagaConteudo');
    const acoesVaga = document.getElementById('acoes-vaga');
    const listaReferencias = document.getElementById('lista-referencias-vaga');

    let vagaAtual = null;

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

    if (!vagaId) {
        loadingBar.setAttribute('hidden', '');
        erroBar.textContent = 'Nenhuma vaga informada. Volte para o mural de vagas e clique em uma oportunidade.';
        erroBar.removeAttribute('hidden');
        return;
    }

    /* ------------------------- carregar vaga ------------------------------- */
    async function carregarVaga() {
        try {
            const res = await fetch(`${API_BASE}/vagas/${vagaId}`);
            if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);

            vagaAtual = await res.json();

            document.getElementById('vaga-titulo').textContent = vagaAtual.titulo || 'Vaga';
            const empresaEl = document.getElementById('vaga-empresa');
            empresaEl.textContent = '';
            if (vagaAtual.empresaId) {
                const linkEmpresa = document.createElement('a');
                linkEmpresa.href = `/pages/26-perfil-empresa-publico.html?id=${encodeURIComponent(vagaAtual.empresaId)}`;
                linkEmpresa.textContent = vagaAtual.empresaNome || 'Confecção Parceira';
                empresaEl.appendChild(linkEmpresa);
            } else {
                empresaEl.textContent = vagaAtual.empresaNome || 'Confecção Parceira';
            }
            document.getElementById('vaga-local').textContent =
                [vagaAtual.cidade, vagaAtual.estado].filter(Boolean).join(' - ') || vagaAtual.local || 'Não informado';
            document.getElementById('vaga-especialidade-modalidade').textContent =
                [vagaAtual.especialidade, vagaAtual.modalidade].filter(Boolean).join(' | ') || '—';
            document.getElementById('vaga-valor').textContent = vagaAtual.valor || '—';
            document.getElementById('vaga-prazo').textContent = formatarData(vagaAtual.prazo);
            document.getElementById('vaga-descricao').textContent = vagaAtual.descricao || 'Sem descrição informada.';

            const statusBadge = document.getElementById('vaga-status-badge');
            const status = vagaAtual.status || 'Aberta';
            statusBadge.textContent = status;
            statusBadge.className = `badge ${status === 'Aberta' ? 'badge-success' : status === 'Pausada' ? 'badge-warning' : 'badge-danger'}`;

            renderizarReferencias(vagaAtual.referencias);
            renderizarAcoes();

            loadingBar.setAttribute('hidden', '');
            conteudo.removeAttribute('hidden');
        } catch (erro) {
            console.error('Erro ao carregar vaga:', erro);
            loadingBar.setAttribute('hidden', '');
            erroBar.removeAttribute('hidden');
        }
    }

    function renderizarReferencias(referencias) {
        listaReferencias.innerHTML = '';
        const lista = Array.isArray(referencias) ? referencias : [];

        if (!lista.length) {
            listaReferencias.innerHTML = '<span class="field-message">Nenhuma referência enviada pela empresa.</span>';
            return;
        }

        lista.forEach(function (caminho, indice) {
            const item = document.createElement('div');
            item.className = 'referencia-item';
            criarImagemComFallback(item, caminho, `Referência ${indice + 1}`);
            listaReferencias.appendChild(item);
        });
    }

    /* ------------------------- ações dinâmicas ----------------------------- */
    function renderizarAcoes() {
        acoesVaga.innerHTML = '';

        const sessaoAtual = obterSessao();
        const ehDona = sessaoAtual && sessaoAtual.tipo === 'empresas' &&
            String(sessaoAtual.id) === String(vagaAtual.empresaId);

        if (ehDona) {
            const linkEditar = document.createElement('a');
            linkEditar.href = `/pages/13-editar-vaga.html?id=${encodeURIComponent(vagaAtual.id)}`;
            linkEditar.className = 'btn btn-outline-purple';
            linkEditar.innerHTML = '<i class="bi bi-pencil"></i> Editar';
            acoesVaga.appendChild(linkEditar);

            return;
        }

        const botaoCandidatar = document.createElement('button');
        botaoCandidatar.id = 'btnCandidatar';
        botaoCandidatar.className = 'btn btn-primary btn-lg';
        botaoCandidatar.style.cssText = 'width: 100%; max-width: 350px;';
        acoesVaga.appendChild(botaoCandidatar);

        if (vagaAtual.status !== 'Aberta') {
            botaoCandidatar.disabled = true;
            botaoCandidatar.textContent = 'Esta vaga não está mais aberta para candidaturas';
            return;
        }

        if (!sessaoAtual) {
            botaoCandidatar.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Entrar para se candidatar';
            botaoCandidatar.addEventListener('click', function () {
                const proxima = encodeURIComponent(window.location.pathname + window.location.search);
                window.location.href = `/pages/02-login.html?next=${proxima}`;
            });
            return;
        }

        if (sessaoAtual.tipo !== 'freelancers') {
            botaoCandidatar.disabled = true;
            botaoCandidatar.textContent = 'Apenas freelancers podem se candidatar';
            return;
        }

        botaoCandidatar.innerHTML = '<i class="bi bi-send-check-fill"></i> Candidatar-se a esta vaga';

        verificarCandidaturaExistente().then(function (jaCandidatado) {
            if (jaCandidatado) {
                botaoCandidatar.disabled = true;
                botaoCandidatar.innerHTML = '<i class="bi bi-check-lg"></i> Você já se candidatou';
                botaoCandidatar.style.background = 'var(--success)';
                botaoCandidatar.style.borderColor = 'var(--success)';
                return;
            }
            botaoCandidatar.addEventListener('click', function () {
                candidatarSe(botaoCandidatar);
            });
        });
    }

    async function verificarCandidaturaExistente() {
        const sessaoAtual = obterSessao();
        if (!sessaoAtual) return false;
        try {
            const res = await fetch(`${API_BASE}/candidaturas?freelancerId=${encodeURIComponent(sessaoAtual.id)}`);
            const candidaturas = res.ok ? await res.json() : [];
            return candidaturas.some(function (c) {
                return String(c.vagaId) === String(vagaAtual.id) && c.status !== 'Cancelada';
            });
        } catch (erro) {
            console.error('Erro ao verificar candidatura existente:', erro);
            return false;
        }
    }

    /* ------------------------- candidatar-se ------------------------------- */
    async function candidatarSe(botao) {
        if (botao.disabled) return;

        const sessaoAtual = obterSessao();
        if (!sessaoAtual || sessaoAtual.tipo !== 'freelancers' || !vagaAtual) return;

        limparMensagem();
        botao.disabled = true;
        const textoOriginal = botao.innerHTML;
        botao.innerHTML = '<span class="spinner"></span> Enviando candidatura...';

        try {
            // Evita candidatura duplicada também no momento do envio.
            const jaCandidatado = await verificarCandidaturaExistente();
            if (jaCandidatado) {
                mostrarMensagem('Você já se candidatou a esta vaga.', 'error');
                botao.disabled = true;
                botao.innerHTML = '<i class="bi bi-check-lg"></i> Você já se candidatou';
                return;
            }

            const novaCandidatura = {
                vagaId: vagaAtual.id,
                empresaId: vagaAtual.empresaId,
                empresaNome: vagaAtual.empresaNome || 'Confecção',
                nomeEmpresa: vagaAtual.empresaNome || 'Confecção',
                titulo: vagaAtual.titulo,
                cidade: vagaAtual.cidade || '',
                estado: vagaAtual.estado || '',
                valor: vagaAtual.valor || '',
                prazo: vagaAtual.prazo || '',
                dataCandidatura: new Date().toISOString(),
                freelancerId: sessaoAtual.id,
                freelancerNome: sessaoAtual.nome,
                status: 'Em análise',
                tipo: 'Vaga',
                link: '18-vaga-detalhe.html'
            };

            const res = await fetch(`${API_BASE}/candidaturas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(novaCandidatura)
            });
            if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);

            // Avisa a empresa dona da vaga sobre a nova candidatura.
            criarNotificacao({
                usuarioId: vagaAtual.empresaId,
                usuarioTipo: 'empresas',
                tipo: 'candidatura',
                titulo: 'Nova candidatura recebida',
                mensagem: `${sessaoAtual.nome} se candidatou à vaga "${vagaAtual.titulo}".`,
                link: `/pages/17-candidatos-vaga.html?id=${encodeURIComponent(vagaAtual.id)}`
            });

            mostrarMensagem('Sua candidatura foi enviada com sucesso! A empresa entrará em contato se houver interesse.', 'success');
            botao.disabled = true;
            botao.innerHTML = '<i class="bi bi-check-lg"></i> Candidatura Enviada';
            botao.style.background = 'var(--success)';
            botao.style.borderColor = 'var(--success)';
        } catch (erro) {
            console.error('Erro ao enviar candidatura:', erro);
            mostrarMensagem('Não foi possível enviar sua candidatura. Tente novamente em instantes.', 'error');
            botao.disabled = false;
            botao.innerHTML = textoOriginal;
        }
    }

    carregarVaga();
});
