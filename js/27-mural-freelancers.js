// Mural de Freelancers para empresas.
const PAGE_SIZE = 10;
let todosFreelancers = [];
let paginaAtual = 0, totalPaginas = 0, totalFreelancers = 0;
let quantidadeFiltrada = 0, paginaErro = 1;
let carregando = false, acessoPermitido = false;

const listaFreelancersEl = document.getElementById('lista-freelancers');
const inputBusca = document.getElementById('filtro-busca');
const selectEspecialidade = document.getElementById('filtro-especialidade');
const selectEstado = document.getElementById('filtro-estado');
const inputCidade = document.getElementById('filtro-cidade');
const btnLimpar = document.getElementById('btn-limpar-filtros');

const paginacaoEl = document.getElementById('paginacao-freelancers');
const resumoPaginas = document.getElementById('resumoPaginas');
const btnAnterior = document.getElementById('btnPaginaAnterior');
const btnProxima = document.getElementById('btnPaginaProxima');
const btnRetry = document.getElementById('btn-tentar-novamente');
const mensagemStatus = document.getElementById('mensagemStatus');

function configurarNav() {
    const sessao = exigirLogin();
    if (!sessao) return false;
    renderizarSidebar(document.querySelector('.sidebar'), sessao.tipo, '27-mural-freelancers');
    renderizarTopbar(document.getElementById('header-acoes'), sessao);
    renderizarBannerValidacao(document.querySelector('.main'), sessao);
    configurarMenuMobile();
    acessoPermitido = sessao.tipo === 'empresas';
    if (!acessoPermitido) {
        mostrarMensagem('O mural está disponível para empresas. Entre com uma conta de empresa.', 'error');
        atualizarControles();
    }
    return acessoPermitido;
}

function resolverFoto(valor) {
    if (typeof valor !== 'string' || !valor.trim()) return '';
    try {
        const url = new URL(valor, new URL(API_BASE).origin);
        return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
    } catch (erro) {
        return '';
    }
}

function mapFreelancer(item) {
    if (!item || !Number.isSafeInteger(item.userId) || item.userId <= 0) {
        throw new Error('Resposta inválida ao carregar freelancers.');
    }
    return {
        id: item.userId,
        nome: String(item.legalResponsibleFullName || ''),
        especialidades: Array.isArray(item.specialtyNames)
            ? item.specialtyNames.filter(function (esp) { return typeof esp === 'string'; })
            : [],
        cidadeResidencial: String(item.city || ''),
        estadoResidencial: String(item.state || ''),
        foto: resolverFoto(item.profileImageUrl)
    };
}

function atualizarControles() {
    document.querySelector('.filter-bar').hidden = !acessoPermitido || (!carregando && paginaAtual === 0);
    [inputBusca, selectEspecialidade, selectEstado, inputCidade, btnLimpar].forEach(function (el) {
        if (el) el.disabled = carregando || !acessoPermitido || paginaAtual === 0;
    });
    listaFreelancersEl.setAttribute('aria-busy', String(carregando));
    paginacaoEl.hidden = !acessoPermitido || paginaAtual === 0;
    btnAnterior.disabled = carregando || paginaAtual <= 1;
    btnProxima.disabled = carregando || paginaAtual === 0 || paginaAtual >= Math.min(totalPaginas, 1000);
    btnRetry.disabled = carregando;
    resumoPaginas.textContent = carregando
        ? 'Carregando página ' + paginaErro + '...'
        : totalFreelancers === 0
            ? 'Nenhum freelancer cadastrado'
            : 'Página ' + paginaAtual + ' de ' + totalPaginas +
              ' — ' + quantidadeFiltrada + ' de ' + todosFreelancers.length +
              ' nesta página; ' + totalFreelancers + ' cadastrados';
}

async function carregarFreelancers(pagina = 1) {
    if (carregando || !acessoPermitido || !Number.isSafeInteger(pagina) || pagina < 1 || pagina > 1000) return;
    paginaErro = pagina;
    carregando = true;
    mensagemStatus.hidden = true;
    btnRetry.hidden = true;
    listaFreelancersEl.innerHTML = '<div class="empty-state"><i class="bi bi-hourglass-split"></i><p>Carregando freelancers...</p></div>';
    atualizarControles();

    try {
        const resultado = await api('/Freelancer/listarFreelancers?page=' + pagina + '&pageSize=' + PAGE_SIZE);
        const valido = resultado && Array.isArray(resultado.items) &&
            ['page', 'pageSize', 'totalCount', 'totalPages'].every(function (campo) {
                return Number.isSafeInteger(resultado[campo]);
            }) &&
            resultado.page === pagina && resultado.page >= 1 &&
            resultado.pageSize === PAGE_SIZE && resultado.totalCount >= 0 &&
            resultado.totalPages === Math.ceil(resultado.totalCount / resultado.pageSize) &&
            resultado.items.length <= PAGE_SIZE && resultado.items.length <= resultado.totalCount;
        if (!valido) throw new Error('Resposta inválida ao carregar freelancers.');

        // O total pode diminuir entre duas consultas de página.
        const ultimaPagina = Math.max(1, resultado.totalPages);
        if (resultado.page > ultimaPagina) {
            carregando = false;
            return await carregarFreelancers(ultimaPagina);
        }

        const freelancers = resultado.items.map(mapFreelancer);
        todosFreelancers = freelancers;
        paginaAtual = resultado.page;
        totalPaginas = resultado.totalPages;
        totalFreelancers = resultado.totalCount;
        popularFiltroEspecialidades(todosFreelancers);
        carregando = false;
        aplicarFiltros();
    } catch (erro) {
        carregando = false;
        if (erro.status === 401 || erro.status === 403) {
            acessoPermitido = false;
            todosFreelancers = [];
            paginaAtual = 0;
            listaFreelancersEl.innerHTML = '';
            if (erro.status === 403) {
                mostrarMensagem('Sua conta não tem permissão para consultar freelancers.', 'error');
            }
            return;
        }

        if (paginaAtual > 0) aplicarFiltros();
        else listaFreelancersEl.innerHTML = '';
        const retorno = paginaAtual > 0
            ? ' A página ' + paginaAtual + ' continua exibida.'
            : '';
        mostrarMensagem('Não foi possível carregar a página ' + pagina + '. ' + erro.message + retorno, 'error');
        btnRetry.hidden = false;
    } finally {
        carregando = false;
        atualizarControles();
    }
}

function popularFiltroEspecialidades(freelancers) {
    if (!selectEspecialidade) return;
    const selecionada = selectEspecialidade.value;
    selectEspecialidade.innerHTML = '<option value="">Todas as especialidades</option>';
    const especialidades = [...new Set(
        [selecionada, ...freelancers.flatMap(function (f) { return f.especialidades; })].filter(Boolean)
    )].sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); });
    especialidades.forEach(function (esp) {
        const option = document.createElement('option');
        option.value = esp;
        option.textContent = esp;
        selectEspecialidade.appendChild(option);
    });
    selectEspecialidade.value = selecionada;
}

function configurarFiltrosLocalidade() {
    carregarUFs(selectEstado).then(function () {
        selectEstado.options[0].textContent = 'Todos os estados';
    });
    const wrapper = inputCidade.closest('.autocomplete-wrapper');
    const dropdown = document.createElement('div');
    dropdown.className = 'autocomplete-dropdown';
    dropdown.style.display = 'none';
    wrapper.appendChild(dropdown);
    let municipios = [], requisicaoUf = 0, sugestoesAtivas = false;
    function fechar() {
        dropdown.style.display = 'none';
        dropdown.innerHTML = '';
    }
    function mostrar() {
        fechar();
        const termo = removerAcentos(inputCidade.value.trim()).toLowerCase();
        if (!sugestoesAtivas || !selectEstado.value || termo.length < 2) return;
        if (municipios === null) {
            const aviso = document.createElement('div');
            aviso.className = 'autocomplete-item disabled';
            aviso.textContent = 'Lista de cidades indisponível — digite manualmente';
            dropdown.appendChild(aviso);
        } else {
            municipios.filter(function (cidade) {
                return removerAcentos(cidade).toLowerCase().startsWith(termo);
            }).slice(0, 10).forEach(function (cidade) {
                const item = document.createElement('div');
                item.className = 'autocomplete-item';
                item.textContent = cidade;
                item.addEventListener('click', function () {
                    inputCidade.value = cidade;
                    inputCidade.dispatchEvent(new Event('input', { bubbles: true }));
                    sugestoesAtivas = false;
                    fechar();
                });
                dropdown.appendChild(item);
            });
        }
        if (dropdown.children.length) dropdown.style.display = 'block';
    }
    async function atualizarMunicipios() {
        const minhaRequisicao = ++requisicaoUf;
        const uf = selectEstado.value;
        municipios = [];
        sugestoesAtivas = false;
        inputCidade.value = '';
        fechar();
        if (!uf) return;
        const resposta = await obterMunicipios(uf);
        if (minhaRequisicao !== requisicaoUf || selectEstado.value !== uf) return;
        municipios = Array.isArray(resposta)
            ? resposta.filter(function (cidade) { return typeof cidade === 'string'; })
            : null;
        mostrar();
    }
    ['input', 'focus'].forEach(function (evento) {
        inputCidade.addEventListener(evento, function () {
            sugestoesAtivas = true;
            mostrar();
        });
    });
    selectEstado.addEventListener('change', atualizarMunicipios);
    document.addEventListener('click', function (evento) {
        if (!wrapper.contains(evento.target)) {
            sugestoesAtivas = false;
            fechar();
        }
    });
}
document.addEventListener('DOMContentLoaded', function () {
    if (!configurarNav()) return;
    inputBusca.value = new URLSearchParams(window.location.search).get('busca') || '';
    configurarFiltrosLocalidade();
    configurarEventosFiltros();
    btnAnterior.addEventListener('click', function () { carregarFreelancers(paginaAtual - 1); });
    btnProxima.addEventListener('click', function () { carregarFreelancers(paginaAtual + 1); });
    btnRetry.addEventListener('click', function () { carregarFreelancers(paginaErro); });
    carregarFreelancers(1);
});

function aplicarFiltros() {
    if (carregando || !acessoPermitido || paginaAtual === 0) return;
    const termo = removerAcentos(inputBusca.value.trim().toLowerCase());
    const esp = selectEspecialidade.value;
    const uf = selectEstado.value;
    const cidade = removerAcentos(inputCidade.value.trim().toLowerCase());
    const filtrados = todosFreelancers.filter(function (freela) {
        const bateTermo = !termo || removerAcentos(freela.nome.toLowerCase()).includes(termo) ||
            freela.especialidades.some(function (e) {
                return removerAcentos(e.toLowerCase()).includes(termo);
            });
        const bateEsp = !esp || freela.especialidades.includes(esp);
        const bateUf = !uf || freela.estadoResidencial.toUpperCase() === uf.toUpperCase();
        const bateCidade = !cidade || removerAcentos(freela.cidadeResidencial.toLowerCase()).includes(cidade);
        return bateTermo && bateEsp && bateUf && bateCidade;
    });
    quantidadeFiltrada = filtrados.length;
    renderizarFreelancers(filtrados);
    atualizarControles();
}

function configurarEventosFiltros() {
    inputBusca.addEventListener('input', aplicarFiltros);
    selectEspecialidade.addEventListener('change', aplicarFiltros);
    selectEstado.addEventListener('change', aplicarFiltros);
    inputCidade.addEventListener('input', aplicarFiltros);
    btnLimpar.addEventListener('click', function () {
        inputBusca.value = '';
        selectEspecialidade.value = '';
        inputCidade.value = '';
        selectEstado.value = '';
        selectEstado.dispatchEvent(new Event('change', { bubbles: true }));
    });
}

function renderizarFreelancers(freelancers) {
    listaFreelancersEl.innerHTML = '';
    if (!freelancers.length) {
        listaFreelancersEl.innerHTML =
            '<div class="empty-state"><i class="bi bi-inbox"></i>' +
            '<h3>Nenhum freelancer encontrado nesta página</h3>' +
            '<p>Ajuste os filtros ou consulte outra página.</p></div>';
        return;
    }
    freelancers.forEach(function (freela) {
        const card = document.createElement('article');
        card.className = 'freelancer-card';
        const iniciais = calcularIniciais(freela.nome);
        const cidadeEstado = [freela.cidadeResidencial, freela.estadoResidencial].filter(Boolean).join(' - ');
        const especialidade = freela.especialidades[0] || 'Freelancer';
        card.innerHTML =
            '<div class="profile-avatar-lg"></div>' +
            '<h3>' + escapeHtml(freela.nome) + '</h3>' +
            '<span class="badge freelancer-especialidade">' + escapeHtml(especialidade) + '</span>' +
            (cidadeEstado ? '<p class="freelancer-local"><i class="bi bi-geo-alt"></i> ' + escapeHtml(cidadeEstado) + '</p>' : '') +
            '<a href="/pages/25-perfil-freelancer-publico.html?id=' + encodeURIComponent(freela.id) +
            '" class="btn btn-outline-primary w-full">Ver perfil</a>';
        const avatar = card.querySelector('.profile-avatar-lg');
        if (freela.foto) {
            const img = document.createElement('img');
            img.src = freela.foto;
            img.alt = 'Foto de ' + freela.nome;
            img.onerror = function () { avatar.textContent = iniciais; };
            avatar.appendChild(img);
        } else {
            avatar.textContent = iniciais;
        }
        listaFreelancersEl.appendChild(card);
    });
}
