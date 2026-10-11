/* -------------------------------------------------------------------------- */
/* FAQ — expandir/recolher pergunta ao clicar                                 */
/* -------------------------------------------------------------------------- */
document.querySelectorAll('.faq-item').forEach((item) => {
    const pergunta = item.querySelector('.faq-question');
    if (!pergunta) return;

    pergunta.addEventListener('click', () => {
        const jaAberto = item.classList.contains('active');

        // Fecha as outras perguntas abertas (comportamento de acordeão).
        document.querySelectorAll('.faq-item.active').forEach((outro) => {
            if (outro !== item) {
                outro.classList.remove('active');
                const outraPergunta = outro.querySelector('.faq-question');
                if (outraPergunta) outraPergunta.setAttribute('aria-expanded', 'false');
            }
        });

        item.classList.toggle('active', !jaAberto);
        pergunta.setAttribute('aria-expanded', String(!jaAberto));
    });
});

/* -------------------------------------------------------------------------- */
/* BUSCA (LUPA) — Empresa procurando Freelancer / Freelancer procurando Vaga  */
/* -------------------------------------------------------------------------- */
(function initBuscaHomepage() {
    function escapeHtml(str) {
        return String(str ?? '').replace(/[&<>"']/g, function (ch) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
        });
    }

    const seletor = document.getElementById('searchRoleSelector');
    const opcoes = seletor ? seletor.querySelectorAll('.role-option') : [];
    const form = document.getElementById('searchForm');
    const input = document.getElementById('searchInput');
    const linkVerTodos = document.getElementById('searchVerTodos');
    const aviso = document.getElementById('searchAviso');

    if (!seletor || !form || !input || !linkVerTodos) return;

    let modoAtual = 'freelancers'; // 'freelancers' (empresa buscando) ou 'vagas' (freelancer buscando)
    let cacheFreelancers = null;
    let cacheVagas = null;
    let buscaAtual = 0;
    let debounce;

    const PLACEHOLDERS = {
        freelancers: 'Busque por nome ou especialidade (ex: Modelagem, Bordado...)',
        vagas: 'Busque por título, especialidade ou palavra-chave...'
    };
    const LINKS_VER_TODOS = {
        freelancers: { href: '/pages/27-mural-freelancers.html', texto: 'Ver todos os freelancers' },
        vagas: { href: '/pages/07-vagas.html', texto: 'Ver todas as vagas' }
    };

    function atualizarModo(modo) {
        cancelarBusca();
        modoAtual = modo;
        opcoes.forEach(function (op) { op.classList.toggle('active', op.dataset.modo === modo); });
        input.placeholder = PLACEHOLDERS[modo];
        const destino = LINKS_VER_TODOS[modo];
        linkVerTodos.href = destino.href;
        linkVerTodos.innerHTML = `${destino.texto} <i class="bi bi-arrow-right"></i>`;
        input.value = '';
        mostrarAvisoModo();
    }

    opcoes.forEach(function (op) {
        op.addEventListener('click', function () { atualizarModo(op.dataset.modo); });
    });

    // ── Autocomplete ──
    const wrapper = input.closest('.autocomplete-wrapper');
    if (!wrapper) return;

    const dropdown = document.createElement('div');
    dropdown.className = 'autocomplete-dropdown';
    dropdown.style.display = 'none';
    wrapper.appendChild(dropdown);

    function fecharDropdown() {
        dropdown.style.display = 'none';
        dropdown.innerHTML = '';
    }

    function cancelarBusca() {
        buscaAtual++;
        clearTimeout(debounce);
        fecharDropdown();
    }

    function mostrarAviso(texto) {
        if (!aviso) return;
        aviso.textContent = texto;
        aviso.hidden = !texto;
    }

    function sessaoValida() {
        const sessao = getSessao();
        if (!sessao || typeof sessao.token !== 'string' || !sessao.token.trim() ||
            !Number.isSafeInteger(sessao.id) || sessao.id <= 0 ||
            !['empresas', 'freelancers'].includes(sessao.tipo)) return null;
        return sessao;
    }

    function mostrarAvisoModo() {
        if (modoAtual !== 'freelancers') {
            mostrarAviso('');
            return;
        }
        const sessao = sessaoValida();
        if (!sessao) {
            mostrarAviso('Entre como empresa para buscar freelancers. ');
            if (aviso) {
                const link = document.createElement('a');
                link.href = `/pages/02-login.html?next=${encodeURIComponent(LINKS_VER_TODOS.freelancers.href)}`;
                link.textContent = 'Entrar';
                aviso.appendChild(link);
            }
            return;
        }
        mostrarAviso(sessao.tipo === 'empresas'
            ? 'As sugestões consultam até 10 freelancers da primeira página. Use o mural para ampliar a busca.'
            : 'A busca de freelancers é exclusiva para empresas.');
    }

    function buscarFreelancers() {
        if (!cacheFreelancers) {
            cacheFreelancers = api('/Freelancer/listarFreelancers?page=1&pageSize=10')
                .then(function (dados) {
                    if (!dados || !Array.isArray(dados.items)) {
                        throw new Error('Não foi possível carregar os freelancers. Tente novamente.');
                    }
                    return dados.items;
                })
                .catch(function (erro) {
                    cacheFreelancers = null;
                    throw erro;
                });
        }
        return cacheFreelancers;
    }

    function buscarVagas() {
        if (!cacheVagas) {
            cacheVagas = api('/vagas?status=Aberta')
                .then(function (dados) {
                    if (!Array.isArray(dados)) {
                        throw new Error('Não foi possível carregar as vagas. Tente novamente.');
                    }
                    return dados.filter(function (vaga) { return vaga.status === 'Aberta'; });
                })
                .catch(function (erro) {
                    cacheVagas = null;
                    throw erro;
                });
        }
        return cacheVagas;
    }

    function normalizar(texto) {
        return String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/_/g, ' ').toLowerCase();
    }

    function bateTermo(texto, termo) {
        return normalizar(texto).includes(termo);
    }

    async function montarSugestoes(termo, modo) {
        if (modo === 'freelancers') {
            const freelancers = await buscarFreelancers();
            return freelancers
                .filter(function (f) {
                    const espec = Array.isArray(f.specialtyNames) ? f.specialtyNames.join(' ') : '';
                    return bateTermo(f.legalResponsibleFullName, termo) || bateTermo(espec, termo);
                })
                .slice(0, 6)
                .map(function (f) {
                    const subtitulo = Array.isArray(f.specialtyNames) && f.specialtyNames.length
                        ? f.specialtyNames.join(', ').replace(/_/g, ' ')
                        : 'Freelancer';
                    return { titulo: f.legalResponsibleFullName, subtitulo: subtitulo, valor: f.legalResponsibleFullName };
                });
        }
        const vagas = await buscarVagas();
        return vagas
            .filter(function (v) {
                return bateTermo(v.titulo, termo) || bateTermo(v.especialidade, termo) || bateTermo(v.descricao, termo);
            })
            .slice(0, 6)
            .map(function (v) {
                return { titulo: v.titulo || '—', subtitulo: String(v.especialidade || 'Vaga').replace(/_/g, ' '), valor: v.titulo || '' };
            });
    }

    input.addEventListener('input', function () {
        cancelarBusca();
        mostrarAvisoModo();
        const termo = normalizar(input.value.trim());
        const modo = modoAtual;
        const minhaBusca = buscaAtual;
        if (!termo) return;

        if (modo === 'freelancers') {
            const sessao = sessaoValida();
            if (!sessao || sessao.tipo !== 'empresas') {
                return;
            }
        }

        debounce = setTimeout(async function () {
            if (minhaBusca !== buscaAtual) return;
            try {
                const sugestoes = await montarSugestoes(termo, modo);
                if (minhaBusca !== buscaAtual || modo !== modoAtual) return;

                dropdown.innerHTML = '';
                if (!sugestoes.length) {
                    fecharDropdown();
                    mostrarAviso(modo === 'freelancers'
                        ? 'Nenhum freelancer encontrado na primeira página. Consulte o mural para buscar em outras páginas.'
                        : 'Nenhuma vaga encontrada para esta busca.');
                    return;
                }

                sugestoes.forEach(function (s) {
                    const item = document.createElement('div');
                    item.className = 'autocomplete-item';
                    item.innerHTML = `<strong>${escapeHtml(s.titulo)}</strong> <span class="text-muted" style="font-size:12px;">— ${escapeHtml(s.subtitulo)}</span>`;
                    item.addEventListener('click', function () {
                        input.value = s.valor || '';
                        cancelarBusca();
                        mostrarAvisoModo();
                    });
                    dropdown.appendChild(item);
                });

                dropdown.style.display = 'block';
            } catch (erro) {
                if (minhaBusca !== buscaAtual || modo !== modoAtual || erro.status === 401) return;
                fecharDropdown();
                mostrarAviso(erro.status === 403
                    ? 'Sua conta não tem permissão para consultar freelancers.'
                    : erro.message || 'Não foi possível carregar a busca. Tente novamente.');
            }
        }, 250);
    });

    document.addEventListener('click', function (e) {
        if (!wrapper.contains(e.target)) cancelarBusca();
    });

    // ── Submeter busca ──
    function navegarParaBusca(termo = '') {
        cancelarBusca();
        const destino = LINKS_VER_TODOS[modoAtual].href;
        const alvo = termo
            ? `${destino}?busca=${encodeURIComponent(termo)}`
            : destino;

        const sessao = sessaoValida();
        if (!sessao) {
            window.location.href = `/pages/02-login.html?next=${encodeURIComponent(alvo)}`;
            return;
        }

        if (modoAtual === 'freelancers' && sessao.tipo !== 'empresas') {
            mostrarAviso('A busca de freelancers é exclusiva para empresas.');
            return;
        }

        window.location.href = alvo;
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        navegarParaBusca(input.value.trim());
    });
    linkVerTodos.addEventListener('click', function (e) {
        e.preventDefault();
        navegarParaBusca();
    });

    atualizarModo(modoAtual);
})();
