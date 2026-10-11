let todasVagas = [];

// vagaIds (string) em que o freelancer logado já se candidatou (vazio para
// visitantes/empresas). Preenchido em carregarVagas() via GET /User/candidaturas/minhas.
let vagaIdsCandidatadas = new Set();

// Nome das empresas donas das vagas, obtido via GET /Company/exibirPerfilPublicoEmpresa.
// Cache em memória por empresaId (string) -> nome, ou 'Empresa' se não foi possível obter.
const cacheNomesEmpresa = {};

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
/* 2. MAPEAMENTO back -> tela                                                 */
/* -------------------------------------------------------------------------- */
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

// especialidade/modalidade vêm do back como enum em texto, sem acento e com
// "_" no lugar do espaço (ex.: "Peca_Piloto", "Sob_Demanda"). Os mapas abaixo
// dão o rótulo legível certo (inclusive os acentos que o enum não tem); se um
// valor novo não mapeado aparecer, cai no fallback de só troca "_" por espaço.
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

/* -------------------------------------------------------------------------- */
/* 3. NOME DA EMPRESA (perfil público, com cache em memória)                  */
/* -------------------------------------------------------------------------- */
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

// Busca os nomes em paralelo, só das empresas ainda não resolvidas, e depois
// atualiza o texto já renderizado nos cards (não bloqueia a renderização).
async function carregarNomesEmpresas(vagas) {
    const idsUnicos = Array.from(new Set(vagas.map(v => v.empresaId).filter(Boolean).map(String)));
    const idsFaltando = idsUnicos.filter(id => cacheNomesEmpresa[id] === undefined);
    if (!idsFaltando.length) return;

    await Promise.allSettled(idsFaltando.map(buscarNomeEmpresa));

    document.querySelectorAll('.job-card[data-empresa-id]').forEach(function (card) {
        const id = card.dataset.empresaId;
        const nome = cacheNomesEmpresa[id];
        if (!nome) return;
        const elNome = card.querySelector('.company-name-texto');
        if (elNome) elNome.textContent = nome;
    });
}

/* -------------------------------------------------------------------------- */
/* 4. MINHAS CANDIDATURAS (marca "Candidatura enviada" ao carregar)          */
/* -------------------------------------------------------------------------- */
async function carregarVagaIdsCandidatadas() {
    const sessao = obterSessao();
    if (!sessao || sessao.tipo !== 'freelancers') return new Set();

    try {
        const lista = await api('/User/candidaturas/minhas');
        return new Set((Array.isArray(lista) ? lista : []).map(c => String(c.vagaId)));
    } catch (erro) {
        console.error('Erro ao carregar minhas candidaturas:', erro);
        return new Set();
    }
}

/* -------------------------------------------------------------------------- */
/* 5. CARREGAR VAGAS DA API (GET)                                            */
/* -------------------------------------------------------------------------- */
async function carregarVagas() {
    const container = document.getElementById('lista-vagas');
    container.innerHTML = '<div class="empty-state"><i class="bi bi-hourglass-split"></i><p>Carregando vagas disponíveis...</p></div>';

    try {
        // Só mostra vagas realmente abertas — pausadas/encerradas não devem
        // aparecer no mural nem poder receber novas candidaturas. GET /vagas
        // é anônimo, mas usamos semRedirect para nunca redirecionar visitantes.
        const [vagasBack, idsCandidatados] = await Promise.all([
            api('/vagas?status=Aberta', { semRedirect: true }),
            carregarVagaIdsCandidatadas()
        ]);

        todasVagas = (Array.isArray(vagasBack) ? vagasBack : []).map(mapearVaga);
        vagaIdsCandidatadas = idsCandidatados;

        // vindo da lupa da Home via ?busca=
        const termoDaUrl = new URLSearchParams(window.location.search).get('busca');
        if (termoDaUrl) {
            const inputBusca = document.getElementById('filtro-busca');
            if (inputBusca) inputBusca.value = termoDaUrl;
            aplicarFiltros();
        } else {
            renderizarVagas(ordenarVagas(todasVagas));
        }

        // Não bloqueia a renderização: atualiza os nomes das empresas depois.
        carregarNomesEmpresas(todasVagas);
    } catch (error) {
        console.error('Erro ao carregar vagas:', error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-exclamation-triangle"></i>
                <p>${escapeHtml(error.message || 'Não foi possível carregar as vagas. Tente novamente em instantes.')}</p>
            </div>
        `;
    }
}

/* -------------------------------------------------------------------------- */
/* 6. RENDERIZAR CARDS NO HTML                                                */
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
        card.dataset.empresaId = vaga.empresaId || '';
        card.addEventListener('click', (e) => {
            // Não navega se o clique foi no botão de candidatura ou no link da empresa
            if (e.target.closest('.btn-candidatar') || e.target.closest('.company-name')) return;
            window.location.href = `/pages/18-vaga-detalhe.html?id=${encodeURIComponent(vaga.id)}`;
        });

        const nomeEmpresaAtual = vaga.empresaId ? (cacheNomesEmpresa[String(vaga.empresaId)] || 'Empresa') : 'Empresa';
        const jaCandidatado = vagaIdsCandidatadas.has(String(vaga.id));

        const especialidadeLabel = rotularEnum(vaga.especialidade, LABELS_ESPECIALIDADE);
        const modalidadeLabel = rotularEnum(vaga.modalidade, LABELS_MODALIDADE);
        const local = [vaga.cidade, vaga.estado].filter(Boolean).join(' - ') || '—';

        card.innerHTML = `
            <div>
                <div class="job-card-header">
                    <div>
                        <h2 class="job-title">${escapeHtml(vaga.titulo)}</h2>
                        ${vaga.empresaId
                            ? `<a class="company-name" href="/pages/26-perfil-empresa-publico.html?id=${encodeURIComponent(vaga.empresaId)}"><i class="bi bi-building"></i> <span class="company-name-texto">${escapeHtml(nomeEmpresaAtual)}</span></a>`
                            : `<span class="company-name"><i class="bi bi-building"></i> <span class="company-name-texto">${escapeHtml(nomeEmpresaAtual)}</span></span>`}
                    </div>
                    <span class="job-badge">${escapeHtml(especialidadeLabel)}</span>
                </div>

                <p class="job-desc">${escapeHtml(vaga.descricao)}</p>
            </div>

            <div class="job-meta">
                <div class="meta-tags">
                    <div class="meta-item">
                        <i class="bi bi-cash-stack"></i> <strong>${escapeHtml(formatarMoeda(vaga.valor))}</strong>
                    </div>
                    <div class="meta-item">
                        <i class="bi bi-clock"></i> Prazo: <strong>${escapeHtml(formatarData(vaga.prazoConclusao))}</strong>
                    </div>
                    <div class="meta-item">
                        <i class="bi bi-geo-alt"></i> <span>${escapeHtml(local)}</span>
                    </div>
                    <div class="meta-item">
                        <i class="bi bi-laptop"></i> <span>${escapeHtml(modalidadeLabel)}</span>
                    </div>
                </div>

                <button class="btn ${jaCandidatado ? 'btn-light-purple' : 'btn-purple'} btn-candidatar" data-id="${escapeHtml(vaga.id)}" ${jaCandidatado ? 'disabled' : ''}>
                    ${jaCandidatado ? 'Candidatura enviada <i class="bi bi-check2"></i>' : 'Candidatar-se <i class="bi bi-send"></i>'}
                </button>
            </div>
        `;

        container.appendChild(card);
    });

    initBotoesCandidatura();
}

/* -------------------------------------------------------------------------- */
/* 7. FILTROS DE BUSCA, ESPECIALIDADE E LOCALIDADE                            */
/* -------------------------------------------------------------------------- */
let selectEstado = null;
let inputCidade = null;
let selectOrdenar = null;

function ordenarVagas(vagas) {
    const ordenacao = selectOrdenar ? selectOrdenar.value : 'recentes';
    const copia = vagas.slice();

    if (ordenacao === 'valor') {
        // valor já é número (orcamento do back) — compara direto, sem moedaParaNumero.
        copia.sort(function (a, b) { return (b.valor || 0) - (a.valor || 0); });
        return copia;
    }

    if (ordenacao === 'prazo') {
        copia.sort(function (a, b) {
            const da = a.prazoConclusao ? new Date(a.prazoConclusao).getTime() : NaN;
            const db_ = b.prazoConclusao ? new Date(b.prazoConclusao).getTime() : NaN;
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
            rotularEnum(vaga.especialidade, LABELS_ESPECIALIDADE).toLowerCase().includes(termo);

        // Filtro de especialidade compara o valor bruto do enum (igual ao
        // "value" das <option>), não o rótulo traduzido.
        const bateEsp = esp === '' || vaga.especialidade === esp;

        const bateUf = !uf || String(vaga.estado || '').toUpperCase() === uf.toUpperCase();
        const bateCidade = !cidade || removerAcentos(String(vaga.cidade || '')).toLowerCase().includes(cidade);

        return bateTermo && bateEsp && bateUf && bateCidade;
    });

    renderizarVagas(ordenarVagas(filtradas));
}

/* -------------------------------------------------------------------------- */
/* 8. AÇÃO DE CANDIDATURA                                                     */
/* -------------------------------------------------------------------------- */
function initBotoesCandidatura() {
    const botoes = document.querySelectorAll('.btn-candidatar');

    botoes.forEach(btn => {
        btn.addEventListener('click', async () => {
            if (btn.disabled) return;

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
                await api('/User/candidaturas', {
                    method: 'POST',
                    body: { vagaId: Number(vaga.id), mensagem: 'Tenho interesse nesta vaga.' }
                });

                vagaIdsCandidatadas.add(String(vaga.id));
                btn.classList.replace('btn-purple', 'btn-light-purple');
                btn.innerHTML = 'Candidatura enviada <i class="bi bi-check2"></i>';

                mostrarMensagem(`Parabéns, ${(sessao.nome || '').split(' ')[0]}! Sua proposta para "${vaga.titulo}" foi enviada para a confecção.`, 'success');
            } catch (erro) {
                console.error('Erro ao enviar candidatura:', erro);
                if (erro.status === 409) {
                    // Já candidatado, ou a vaga não está mais aberta: mensagem do back + botão travado.
                    vagaIdsCandidatadas.add(String(vaga.id));
                    btn.classList.replace('btn-purple', 'btn-light-purple');
                    btn.innerHTML = 'Candidatura enviada <i class="bi bi-check2"></i>';
                    mostrarMensagem(erro.message || 'Você já se candidatou a esta vaga.', 'error');
                } else {
                    mostrarMensagem('Não foi possível enviar sua candidatura. Tente novamente.', 'error');
                    btn.disabled = false;
                    btn.innerHTML = textoOriginal;
                }
            }
        });
    });
}
