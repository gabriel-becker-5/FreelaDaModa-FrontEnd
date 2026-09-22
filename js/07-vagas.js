const API_URL = `${API_BASE}/vagas`;
let todasVagas = [];

document.addEventListener('DOMContentLoaded', () => {
    const sessao = obterSessao();

    // Isolamento de áreas: empresa logada não acessa o mural de vagas.
    if (sessao && sessao.tipo === 'empresas') {
        window.location.href = '/pages/04-dashboard-empresa.html';
        return;
    }

    if (sessao) {
        renderizarSidebar(document.querySelector('.sidebar'), 'freelancers', '07-vagas');
        renderizarTopbar(document.getElementById('header-acoes'), sessao);
        renderizarBannerValidacao(document.querySelector('.main'), sessao);
        configurarMenuMobile();
    } else {
        // Página pública: sem menu lateral, apenas o botão Entrar no topo.
        document.querySelector('.sidebar').setAttribute('hidden', '');
        document.querySelector('.sidebar-toggle-btn').setAttribute('hidden', '');
        document.querySelector('.sidebar-overlay').setAttribute('hidden', '');
        renderizarHeaderPublico(document.getElementById('header-acoes'));
    }

    carregarVagas();
    initFiltros();
});

/* -------------------------------------------------------------------------- */
/* 1. MENU MOBILE (HAMBÚRGUER)                                                */
/* -------------------------------------------------------------------------- */
function configurarMenuMobile() {
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

/* -------------------------------------------------------------------------- */
/* 2. CARREGAR VAGAS DA API (GET)                                             */
/* -------------------------------------------------------------------------- */
async function carregarVagas() {
    const container = document.getElementById('lista-vagas');
    container.innerHTML = '<div class="empty-state"><i class="bi bi-hourglass-split"></i><p>Carregando vagas disponíveis...</p></div>';

    try {
        // Só mostra vagas realmente abertas — pausadas/encerradas não devem
        // aparecer no mural nem poder receber novas candidaturas.
        const response = await fetch(`${API_URL}?status=Aberta`);
        if (!response.ok) throw new Error('Erro ao buscar vagas.');

        todasVagas = await response.json();

        // vindo da lupa da Home via ?busca=
        const termoDaUrl = new URLSearchParams(window.location.search).get('busca');
        if (termoDaUrl) {
            const inputBusca = document.getElementById('filtro-busca');
            if (inputBusca) inputBusca.value = termoDaUrl;
            aplicarFiltros();
        } else {
            renderizarVagas(ordenarVagas(todasVagas));
        }
    } catch (error) {
        console.error('Erro ao carregar vagas:', error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-exclamation-triangle"></i>
                <p>Não foi possível carregar as vagas. Tente novamente em instantes.</p>
            </div>
        `;
    }
}

/* -------------------------------------------------------------------------- */
/* 3. RENDERIZAR CARDS NO HTML                                                */
/* -------------------------------------------------------------------------- */
function renderizarVagas(vagas) {
    const container = document.getElementById('lista-vagas');
    container.innerHTML = '';

    if (vagas.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-inbox"></i>
                <h3>Nenhuma vaga encontrada</h3>
                <p>Tente ajustar os filtros ou pesquisar por outro termo.</p>
            </div>
        `;
        return;
    }

    vagas.forEach(vaga => {
        const card = document.createElement('article');
        card.className = 'job-card';
        card.style.cursor = 'pointer';
        card.addEventListener('click', (e) => {
            // Não navega se o clique foi no botão de candidatura ou no link da empresa
            if (e.target.closest('.btn-candidatar') || e.target.closest('.company-name')) return;
            window.location.href = `/pages/18-vaga-detalhe.html?id=${encodeURIComponent(vaga.id)}`;
        });

        const empresaNomeSeguro = escapeHtml(vaga.empresaNome || 'Confecção Parceira');

        card.innerHTML = `
            <div>
                <div class="job-card-header">
                    <div>
                        <h2 class="job-title">${escapeHtml(vaga.titulo)}</h2>
                        ${vaga.empresaId
                            ? `<a class="company-name" href="/pages/26-perfil-empresa-publico.html?id=${encodeURIComponent(vaga.empresaId)}"><i class="bi bi-building"></i> ${empresaNomeSeguro}</a>`
                            : `<span class="company-name"><i class="bi bi-building"></i> ${empresaNomeSeguro}</span>`}
                    </div>
                    <span class="job-badge">${escapeHtml(vaga.especialidade)}</span>
                </div>

                <p class="job-desc">${escapeHtml(vaga.descricao)}</p>
            </div>

            <div class="job-meta">
                <div class="meta-tags">
                    <div class="meta-item">
                        <i class="bi bi-cash-stack"></i> <strong>${escapeHtml(vaga.valor)}</strong>
                    </div>
                    <div class="meta-item">
                        <i class="bi bi-clock"></i> Prazo: <strong>${escapeHtml(vaga.prazo)}</strong>
                    </div>
                    <div class="meta-item">
                        <i class="bi bi-geo-alt"></i> <span>${escapeHtml(vaga.local)}</span>
                    </div>
                </div>

                <button class="btn btn-purple btn-candidatar" data-id="${escapeHtml(vaga.id)}">
                    Candidatar-se <i class="bi bi-send"></i>
                </button>
            </div>
        `;

        container.appendChild(card);
    });

    initBotoesCandidatura();
}

/* -------------------------------------------------------------------------- */
/* 4. FILTROS DE BUSCA, ESPECIALIDADE E LOCALIDADE                            */
/* -------------------------------------------------------------------------- */
let selectEstado = null;
let inputCidade = null;
let selectOrdenar = null;

function ordenarVagas(vagas) {
    const ordenacao = selectOrdenar ? selectOrdenar.value : 'recentes';
    const copia = vagas.slice();

    if (ordenacao === 'valor') {
        copia.sort(function (a, b) { return moedaParaNumero(b.valor) - moedaParaNumero(a.valor); });
        return copia;
    }

    if (ordenacao === 'prazo') {
        copia.sort(function (a, b) {
            const da = a.prazo ? new Date(a.prazo).getTime() : NaN;
            const db_ = b.prazo ? new Date(b.prazo).getTime() : NaN;
            const va = isNaN(da) ? Infinity : da;
            const vb = isNaN(db_) ? Infinity : db_;
            return va - vb;
        });
        return copia;
    }

    // "Mais recentes": por data de publicação (fallback: ordem da API).
    copia.sort(function (a, b) {
        const da = a.dataPublicacao ? new Date(a.dataPublicacao).getTime() : 0;
        const db_ = b.dataPublicacao ? new Date(b.dataPublicacao).getTime() : 0;
        return db_ - da;
    });
    return copia;
}

function initFiltros() {
    const inputBusca = document.getElementById('filtro-busca');
    const selectEspecialidade = document.getElementById('filtro-especialidade');
    const btnLimpar = document.getElementById('btn-limpar-filtros');
    selectEstado = document.getElementById('filtro-estado');
    inputCidade = document.getElementById('filtro-cidade');
    selectOrdenar = document.getElementById('filtro-ordenar');

    if (selectEstado) carregarUFs(selectEstado);
    if (selectEstado && inputCidade) montarAutocompleteCidade(inputCidade, selectEstado);

    inputBusca.addEventListener('input', aplicarFiltros);
    selectEspecialidade.addEventListener('change', aplicarFiltros);
    if (selectOrdenar) selectOrdenar.addEventListener('change', aplicarFiltros);
    if (selectEstado) selectEstado.addEventListener('change', aplicarFiltros);
    if (inputCidade) inputCidade.addEventListener('input', aplicarFiltros);

    btnLimpar.addEventListener('click', () => {
        inputBusca.value = '';
        selectEspecialidade.value = '';
        if (selectOrdenar) selectOrdenar.value = 'recentes';
        if (selectEstado) selectEstado.value = '';
        if (inputCidade) inputCidade.value = '';
        aplicarFiltros();
    });
}

function aplicarFiltros() {
    const inputBusca = document.getElementById('filtro-busca');
    const selectEspecialidade = document.getElementById('filtro-especialidade');

    const termo = inputBusca.value.toLowerCase().trim();
    const esp = selectEspecialidade.value;
    const uf = selectEstado ? selectEstado.value : '';
    const cidade = inputCidade ? removerAcentos(inputCidade.value.trim().toLowerCase()) : '';

    const filtradas = todasVagas.filter(vaga => {
        const bateTermo =
            !termo ||
            (vaga.titulo || '').toLowerCase().includes(termo) ||
            (vaga.descricao || '').toLowerCase().includes(termo) ||
            (vaga.especialidade || '').toLowerCase().includes(termo) ||
            ((vaga.empresaNome || '') && vaga.empresaNome.toLowerCase().includes(termo));

        const bateEsp = esp === '' || vaga.especialidade === esp;

        const bateUf = !uf || String(vaga.estado || '').toUpperCase() === uf.toUpperCase();
        const bateCidade = !cidade || removerAcentos(String(vaga.cidade || '')).toLowerCase().includes(cidade);

        return bateTermo && bateEsp && bateUf && bateCidade;
    });

    renderizarVagas(ordenarVagas(filtradas));
}

/* -------------------------------------------------------------------------- */
/* 5. AÇÃO DE CANDIDATURA                                                     */
/* -------------------------------------------------------------------------- */
function initBotoesCandidatura() {
    const botoes = document.querySelectorAll('.btn-candidatar');

    botoes.forEach(btn => {
        btn.addEventListener('click', async () => {
            const sessao = obterSessao();

            if (!sessao) {
                const proxima = encodeURIComponent(window.location.pathname + window.location.search);
                window.location.href = `/pages/02-login.html?next=${proxima}`;
                return;
            }

            if (sessao.tipo !== 'freelancers') {
                mostrarMensagem('Apenas perfis de Freelancer podem se candidatar às vagas.', 'error');
                return;
            }

            const vagaId = btn.getAttribute('data-id');
            const vaga = todasVagas.find(v => String(v.id) === String(vagaId));
            if (!vaga) return;

            if (vaga.status !== 'Aberta') {
                mostrarMensagem('Esta vaga não está mais aberta para candidaturas.', 'error');
                return;
            }

            btn.disabled = true;
            const textoOriginal = btn.innerHTML;
            btn.innerHTML = '<span class="spinner"></span> Enviando...';

            try {
                // Evita candidatura duplicada para a mesma vaga.
                const resExistente = await fetch(`${API_BASE}/candidaturas?freelancerId=${sessao.id}`);
                const candidaturasDoFreelancer = resExistente.ok ? await resExistente.json() : [];
                const existentes = candidaturasDoFreelancer.filter(c => String(c.vagaId) === String(vaga.id) && c.status !== 'Cancelada');

                if (existentes.length > 0) {
                    mostrarMensagem('Você já se candidatou a esta vaga.', 'error');
                    btn.disabled = false;
                    btn.innerHTML = textoOriginal;
                    return;
                }

                const novaCandidatura = {
                    vagaId: vaga.id,
                    empresaId: vaga.empresaId,
                    empresaNome: vaga.empresaNome || 'Confecção',
                    nomeEmpresa: vaga.empresaNome || 'Confecção',
                    titulo: vaga.titulo,
                    cidade: vaga.cidade || '',
                    estado: vaga.estado || '',
                    valor: vaga.valor || '',
                    prazo: vaga.prazo || '',
                    dataCandidatura: new Date().toISOString(),
                    freelancerId: sessao.id,
                    freelancerNome: sessao.nome,
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
                    usuarioId: vaga.empresaId,
                    usuarioTipo: 'empresas',
                    tipo: 'candidatura',
                    titulo: 'Nova candidatura recebida',
                    mensagem: `${sessao.nome} se candidatou à vaga "${vaga.titulo}".`,
                    link: `/pages/17-candidatos-vaga.html?id=${encodeURIComponent(vaga.id)}`
                });

                btn.classList.replace('btn-purple', 'btn-light-purple');
                btn.innerHTML = 'Candidatura Enviada! <i class="bi bi-check2"></i>';
                btn.style.backgroundColor = '#e6f4ea';
                btn.style.color = '#137333';

                mostrarMensagem(`Parabéns, ${sessao.nome.split(' ')[0]}! Sua proposta para "${vaga.titulo}" foi enviada para a confecção.`, 'success');
            } catch (error) {
                console.error('Erro ao enviar candidatura:', error);
                mostrarMensagem('Não foi possível enviar sua candidatura. Tente novamente.', 'error');
                btn.disabled = false;
                btn.innerHTML = textoOriginal;
            }
        });
    });
}
