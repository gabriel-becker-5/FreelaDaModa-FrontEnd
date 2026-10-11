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

    /* ------------------------- mapeamento back -> tela ---------------------- */
    // O back devolve orcamento/usuarioId (entre outros campos); a tela usa
    // valor/empresaId e o campo status (nunca "ativa"). O nome da empresa não
    // vem na vaga (só via perfil público — ver buscarNomeEmpresa).
    function mapearVaga(v) {
        if (!v) return v;
        return {
            ...v,
            valor: v.orcamento,
            empresaId: v.usuarioId
        };
    }

    // especialidade/modalidade vêm do back como enum em texto, sem acento e
    // com "_" no lugar do espaço (ex.: "Peca_Piloto", "Sob_Demanda"). Os mapas
    // abaixo dão o rótulo legível certo; um valor não mapeado cai no fallback
    // de só troca "_" por espaço.
    const LABELS_ESPECIALIDADE = {
        Costura_Reta: 'Costura reta',
        Overloque: 'Overloque',
        Modelagem: 'Modelagem',
        Peca_Piloto: 'Peça piloto',
        Amostras: 'Amostras',
        Acabamento: 'Acabamento',
        Bordado: 'Bordado',
        Estamparia: 'Estamparia'
    };

    const LABELS_MODALIDADE = {
        Presencial: 'Presencial',
        Hibrida: 'Híbrida',
        Remota: 'Remota',
        Sob_Demanda: 'Sob demanda'
    };

    function rotularEnum(valor, mapa) {
        if (!valor) return '';
        return mapa[valor] || String(valor).replace(/_/g, ' ');
    }

    /* ------------------------- nome da empresa (perfil público) ------------ */
    const cacheNomesEmpresa = {};

    async function buscarNomeEmpresa(empresaId) {
        if (cacheNomesEmpresa[empresaId] !== undefined) return cacheNomesEmpresa[empresaId];
        try {
            const perfil = await api(`/Company/exibirPerfilPublicoEmpresa?userId=${encodeURIComponent(empresaId)}`, { semRedirect: true });
            cacheNomesEmpresa[empresaId] = (perfil && perfil.companyName) || 'Empresa';
        } catch (erro) {
            console.error(`Erro ao buscar nome da empresa ${empresaId}:`, erro);
            cacheNomesEmpresa[empresaId] = 'Empresa';
        }
        return cacheNomesEmpresa[empresaId];
    }

    /* ------------------------- refs ---------------------------------------- */
    const vagaId = new URLSearchParams(window.location.search).get('id');
    const loadingBar = document.getElementById('vagaLoading');
    const erroBar = document.getElementById('vagaErro');
    const conteudo = document.getElementById('vagaConteudo');
    const acoesVaga = document.getElementById('acoes-vaga');

    let vagaAtual = null;

    if (!vagaId) {
        loadingBar.setAttribute('hidden', '');
        erroBar.textContent = 'Nenhuma vaga informada. Volte para o mural de vagas e clique em uma oportunidade.';
        erroBar.removeAttribute('hidden');
        return;
    }

    /* ------------------------- carregar vaga ------------------------------- */
    async function carregarVaga() {
        try {
            // GET /vagas/{id} é anônimo; semRedirect evita redirecionar visitantes.
            const vagaBack = await api(`/vagas/${encodeURIComponent(vagaId)}`, { semRedirect: true });
            vagaAtual = mapearVaga(vagaBack);

            document.getElementById('vaga-titulo').textContent = vagaAtual.titulo || 'Vaga';

            const empresaEl = document.getElementById('vaga-empresa');
            empresaEl.innerHTML = '';
            if (vagaAtual.empresaId) {
                const linkEmpresa = document.createElement('a');
                linkEmpresa.href = `/pages/26-perfil-empresa-publico.html?id=${encodeURIComponent(vagaAtual.empresaId)}`;
                linkEmpresa.textContent = 'Empresa';
                empresaEl.appendChild(linkEmpresa);
                // Não bloqueia a renderização: atualiza o nome depois de resolvido.
                buscarNomeEmpresa(vagaAtual.empresaId).then(function (nome) {
                    linkEmpresa.textContent = nome;
                });
            } else {
                empresaEl.textContent = 'Empresa';
            }

            const local = [vagaAtual.cidade, vagaAtual.estado].filter(Boolean).join(' - ');
            document.getElementById('vaga-local').textContent = local || '—';

            const especialidadeModalidade = [
                rotularEnum(vagaAtual.especialidade, LABELS_ESPECIALIDADE),
                rotularEnum(vagaAtual.modalidade, LABELS_MODALIDADE)
            ].filter(Boolean).join(' | ');
            document.getElementById('vaga-especialidade-modalidade').textContent = especialidadeModalidade || '—';

            document.getElementById('vaga-valor').textContent = formatarMoeda(vagaAtual.valor);
            document.getElementById('vaga-prazo').textContent = formatarData(vagaAtual.prazoConclusao);
            document.getElementById('vaga-descricao').textContent = vagaAtual.descricao || 'Sem descrição informada.';
            document.getElementById('vaga-data-publicacao').textContent = formatarData(vagaAtual.dataPublicacao);

            const statusBadge = document.getElementById('vaga-status-badge');
            const status = vagaAtual.status || 'Aberta';
            statusBadge.textContent = status;
            statusBadge.className = `badge ${status === 'Aberta' ? 'badge-success' : status === 'Pausada' ? 'badge-warning' : 'badge-danger'}`;

            renderizarAcoes();

            loadingBar.setAttribute('hidden', '');
            conteudo.removeAttribute('hidden');
        } catch (erro) {
            console.error('Erro ao carregar vaga:', erro);
            loadingBar.setAttribute('hidden', '');
            if (erro.status === 404) {
                erroBar.innerHTML = 'Vaga não encontrada. <a href="/pages/07-vagas.html">Voltar ao mural de vagas</a>.';
            } else {
                erroBar.textContent = erro.message || 'Não foi possível carregar esta vaga. Tente novamente mais tarde.';
            }
            erroBar.removeAttribute('hidden');
        }
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

    // "Já candidatado": GET /User/candidaturas/minhas, comparando vagaId.
    // A dependência de /ordensServico foi removida (sem equivalente no contrato).
    async function verificarCandidaturaExistente() {
        const sessaoAtual = obterSessao();
        if (!sessaoAtual || sessaoAtual.tipo !== 'freelancers') return false;
        try {
            const lista = await api('/User/candidaturas/minhas');
            return (Array.isArray(lista) ? lista : []).some(function (c) {
                return String(c.vagaId) === String(vagaAtual.id);
            });
        } catch (erro) {
            console.error('Erro ao verificar candidaturas existentes:', erro);
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
            await api('/User/candidaturas', {
                method: 'POST',
                body: { vagaId: Number(vagaAtual.id), mensagem: 'Tenho interesse nesta vaga.' }
            });

            mostrarMensagem('Sua candidatura foi enviada com sucesso! A empresa entrará em contato se houver interesse.', 'success');
            botao.disabled = true;
            botao.innerHTML = '<i class="bi bi-check-lg"></i> Candidatura Enviada';
            botao.style.background = 'var(--success)';
            botao.style.borderColor = 'var(--success)';
        } catch (erro) {
            console.error('Erro ao enviar candidatura:', erro);
            if (erro.status === 409) {
                // Já candidatado, ou a vaga não está mais aberta: mensagem do back + botão travado.
                mostrarMensagem(erro.message || 'Você já se candidatou a esta vaga.', 'error');
                botao.disabled = true;
                botao.innerHTML = '<i class="bi bi-check-lg"></i> Você já se candidatou';
                botao.style.background = 'var(--success)';
                botao.style.borderColor = 'var(--success)';
            } else {
                mostrarMensagem('Não foi possível enviar sua candidatura. Tente novamente em instantes.', 'error');
                botao.disabled = false;
                botao.innerHTML = textoOriginal;
            }
        }
    }

    carregarVaga();
});
