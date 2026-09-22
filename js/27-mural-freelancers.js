// Mural de Freelancers (para empresas))

const API_URL = `${API_BASE}/freelancers`;
let todosFreelancers = [];

// freelancerId -> nome do plano de impulsionamento ativo (ex.: "Pro", "Premium")
let impulsoPorFreelancer = {};

// Quanto maior, mais destaque no mural — é o que as empresas pagam pra ter
// quando assinam Impulsionamento (ver pages/10-impulsionamento.html).
// Premium é o topo da escala (21-assinatura), então vale mais que o Pro.
const PRIORIDADE_IMPULSO = { 'Premium': 2, 'Pro': 1 };

function prioridadeDoFreelancer(freela) {
    return PRIORIDADE_IMPULSO[impulsoPorFreelancer[freela.id]] || 0;
}

const listaFreelancersEl = document.getElementById('lista-freelancers');
const inputBusca = document.getElementById('filtro-busca');
const selectEspecialidade = document.getElementById('filtro-especialidade');
const selectEstado = document.getElementById('filtro-estado');
const inputCidade = document.getElementById('filtro-cidade');
const btnLimpar = document.getElementById('btn-limpar-filtros');

document.addEventListener('DOMContentLoaded', () => {
    configurarNav();
    configurarFiltrosLocalidade();
    carregarFreelancers();
    configurarEventosFiltros();
});

/* -------------------------------------------------------------------------- */
/* 1. NAVEGAÇÃO POR SESSÃO (padrão da 07)                                     */
/* -------------------------------------------------------------------------- */

function configurarNav() {
    const sessao = obterSessao();

    if (sessao) {
        // Empresa e freelancer podem navegar no mural; cada um com o próprio
        // menu (o item "Buscar Freelancers" só existe no menu da empresa).
        renderizarSidebar(document.querySelector('.sidebar'), sessao.tipo, '27-mural-freelancers');
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
}

/* -------------------------------------------------------------------------- */
/* 2. FILTROS DE LOCALIDADE (estado IBGE + cidade com autocomplete)           */
/* -------------------------------------------------------------------------- */

function configurarFiltrosLocalidade() {
    if (selectEstado) carregarUFs(selectEstado);
    if (selectEstado && inputCidade) montarAutocompleteCidade(inputCidade, selectEstado);
}

/* -------------------------------------------------------------------------- */
/* 3. CARREGAR FREELANCERS DA API (GET)                                       */
/* -------------------------------------------------------------------------- */

async function carregarFreelancers() {
    listaFreelancersEl.innerHTML = '<div class="empty-state"><i class="bi bi-hourglass-split"></i><p>Carregando freelancers...</p></div>';

    try {
        const [response, respostaImpulsionamentos] = await Promise.all([
            fetch(API_URL),
            fetch(`${API_BASE}/impulsionamentos`)
        ]);
        if (!response.ok) throw new Error('Erro ao buscar freelancers.');

        todosFreelancers = await response.json();

        impulsoPorFreelancer = {};
        if (respostaImpulsionamentos.ok) {
            const impulsionamentos = await respostaImpulsionamentos.json();
            impulsionamentos
                .filter(function (imp) { return imp.status === 'ativo'; })
                .forEach(function (imp) { impulsoPorFreelancer[imp.freelancerId] = imp.plano; });
        }

        popularFiltroEspecialidades(todosFreelancers);

        // vindo da lupa da Home via ?busca=
        const termoDaUrl = new URLSearchParams(window.location.search).get('busca');
        if (termoDaUrl && inputBusca) inputBusca.value = termoDaUrl;

        aplicarFiltros();
    } catch (error) {
        console.error(error);
        listaFreelancersEl.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-exclamation-triangle"></i>
                <p>Não foi possível carregar os freelancers. Tente novamente em instantes.</p>
            </div>
        `;
    }
}

function popularFiltroEspecialidades(freelancers) {
    const select = selectEspecialidade;
    if (!select) return;

    const especialidades = [...new Set(
        freelancers.flatMap(f => (f.especialidades && f.especialidades.length) ? f.especialidades : [f.especialidade]).filter(Boolean)
    )].sort((a, b) => a.localeCompare(b, 'pt-BR'));

    especialidades.forEach(esp => {
        const option = document.createElement('option');
        option.value = esp;
        option.textContent = esp;
        select.appendChild(option);
    });
}

/* -------------------------------------------------------------------------- */
/* 4. FILTROS E RENDERIZAÇÃO                                                  */
/* -------------------------------------------------------------------------- */

function aplicarFiltros() {
    const termo = removerAcentos((inputBusca ? inputBusca.value : '').trim().toLowerCase());
    const esp = selectEspecialidade ? selectEspecialidade.value : '';
    const uf = selectEstado ? selectEstado.value : '';
    const cidade = removerAcentos((inputCidade ? inputCidade.value : '').trim().toLowerCase());

    const filtrados = todosFreelancers.filter(freela => {
        const nomeNormalizado = removerAcentos(String(freela.nome || '').toLowerCase());
        const especialidadesFreela = (freela.especialidades && freela.especialidades.length)
            ? freela.especialidades
            : [freela.especialidade];

        const bateTermo =
            !termo ||
            nomeNormalizado.includes(termo) ||
            removerAcentos(String(freela.especialidade || '').toLowerCase()).includes(termo) ||
            especialidadesFreela.some(e => removerAcentos(String(e || '').toLowerCase()).includes(termo));

        const bateEsp = !esp || especialidadesFreela.includes(esp);
        const bateUf = !uf || String(freela.estadoResidencial || '').toUpperCase() === uf.toUpperCase();
        const bateCidade = !cidade || removerAcentos(String(freela.cidadeResidencial || '').toLowerCase()).includes(cidade);

        return bateTermo && bateEsp && bateUf && bateCidade;
    });

    renderizarFreelancers(filtrados);
}

function configurarEventosFiltros() {
    if (inputBusca) inputBusca.addEventListener('input', aplicarFiltros);
    if (selectEspecialidade) selectEspecialidade.addEventListener('change', aplicarFiltros);
    if (selectEstado) selectEstado.addEventListener('change', aplicarFiltros);
    if (inputCidade) inputCidade.addEventListener('input', aplicarFiltros);

    if (btnLimpar) {
        btnLimpar.addEventListener('click', function () {
            if (inputBusca) inputBusca.value = '';
            if (selectEspecialidade) selectEspecialidade.value = '';
            if (selectEstado) selectEstado.value = '';
            if (inputCidade) inputCidade.value = '';
            aplicarFiltros();
        });
    }
}

function renderizarFreelancers(freelancers) {
    listaFreelancersEl.innerHTML = '';

    if (freelancers.length === 0) {
        listaFreelancersEl.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-inbox"></i>
                <h3>Nenhum freelancer encontrado</h3>
                <p>Tente ajustar os filtros ou pesquisar por outro termo.</p>
            </div>
        `;
        return;
    }

    // Quem impulsionou o perfil (Pro/Premium) aparece primeiro — é o que a
    // empresa está pagando por em pages/10-impulsionamento.html. Ordenação
    // estável: dentro do mesmo nível de destaque, mantém a ordem original.
    const freelancersOrdenados = freelancers
        .map(function (freela, indice) { return { freela: freela, indice: indice }; })
        .sort(function (a, b) {
            const diferenca = prioridadeDoFreelancer(b.freela) - prioridadeDoFreelancer(a.freela);
            return diferenca !== 0 ? diferenca : a.indice - b.indice;
        })
        .map(function (item) { return item.freela; });

    freelancersOrdenados.forEach(freela => {
        const card = document.createElement('article');
        const plano = impulsoPorFreelancer[freela.id];
        card.className = 'freelancer-card' + (plano ? ' freelancer-card-destaque' : '');

        const iniciais = calcularIniciais(freela.nome);
        const cidadeEstado = [
            freela.cidadeResidencial,
            freela.estadoResidencial
        ].filter(Boolean).join(' - ');
        const especialidadeCard = freela.especialidade || (freela.especialidades && freela.especialidades[0]) || 'Freelancer';
        // Avatar: foto quando existe (fallback para as iniciais caso o arquivo
        // não carregue) — só caminhos /uploads/... são gravados no banco.
        const foto = String(freela.foto || '').replace(/['\\]/g, '');

        card.innerHTML = `
            ${plano ? `<span class="badge badge-primary-bg freelancer-badge-destaque"><i class="bi bi-star-fill"></i> Destaque ${escapeHtml(plano)}</span>` : ''}
            <div class="profile-avatar-lg"></div>
            <h3>${escapeHtml(freela.nome)}</h3>
            <span class="badge freelancer-especialidade">${escapeHtml(especialidadeCard)}</span>
            ${cidadeEstado ? `<p class="freelancer-local"><i class="bi bi-geo-alt"></i> ${escapeHtml(cidadeEstado)}</p>` : ''}
            <p class="freelancer-rating">
                <i class="bi bi-star-fill"></i> ${Number(freela.mediaAvaliacoes || 0).toFixed(1)}
                <span>(${freela.totalAvaliacoes || 0} avaliações)</span>
            </p>
            <a href="/pages/25-perfil-freelancer-publico.html?id=${encodeURIComponent(freela.id)}" class="btn btn-outline-primary w-full">Ver perfil</a>
        `;

        const avatarEl = card.querySelector('.profile-avatar-lg');
        if (foto) {
            const img = document.createElement('img');
            img.src = foto;
            img.alt = `Foto de ${freela.nome}`;
            img.onerror = function () {
                avatarEl.textContent = iniciais;
            };
            avatarEl.appendChild(img);
        } else {
            avatarEl.textContent = iniciais;
        }

        listaFreelancersEl.appendChild(card);
    });
}
