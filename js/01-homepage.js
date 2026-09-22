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

    if (!seletor || !form || !input || !linkVerTodos) return;

    let modoAtual = 'freelancers'; // 'freelancers' (empresa buscando) ou 'vagas' (freelancer buscando)
    let cacheFreelancers = null;
    let cacheVagas = null;

    const PLACEHOLDERS = {
        freelancers: 'Busque por nome ou especialidade (ex: Modelagem, Bordado...)',
        vagas: 'Busque por título, especialidade ou palavra-chave...'
    };
    const LINKS_VER_TODOS = {
        freelancers: { href: '/pages/27-mural-freelancers.html', texto: 'Ver todos os freelancers' },
        vagas: { href: '/pages/07-vagas.html', texto: 'Ver todas as vagas' }
    };

    function atualizarModo(modo) {
        modoAtual = modo;
        opcoes.forEach(function (op) { op.classList.toggle('active', op.dataset.modo === modo); });
        input.placeholder = PLACEHOLDERS[modo];
        const destino = LINKS_VER_TODOS[modo];
        linkVerTodos.href = destino.href;
        linkVerTodos.innerHTML = `${destino.texto} <i class="bi bi-arrow-right"></i>`;
        fecharDropdown();
        input.value = '';
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

    async function buscarFreelancers() {
        if (cacheFreelancers) return cacheFreelancers;
        try {
            const res = await fetch(`${API_BASE}/freelancers`);
            cacheFreelancers = res.ok ? await res.json() : [];
        } catch (erro) {
            console.error('Erro ao carregar freelancers para busca:', erro);
            cacheFreelancers = [];
        }
        return cacheFreelancers;
    }

    async function buscarVagas() {
        if (cacheVagas) return cacheVagas;
        try {
            const res = await fetch(`${API_BASE}/vagas`);
            cacheVagas = res.ok ? await res.json() : [];
        } catch (erro) {
            console.error('Erro ao carregar vagas para busca:', erro);
            cacheVagas = [];
        }
        return cacheVagas;
    }

    function bateTermo(texto, termo) {
        return (texto || '').toLowerCase().includes(termo);
    }

    async function montarSugestoes(termo) {
        if (modoAtual === 'freelancers') {
            const freelancers = await buscarFreelancers();
            return freelancers
                .filter(function (f) {
                    const espec = Array.isArray(f.especialidades) ? f.especialidades.join(' ') : '';
                    return bateTermo(f.nome, termo) || bateTermo(espec, termo);
                })
                .slice(0, 6)
                .map(function (f) {
                    const subtitulo = Array.isArray(f.especialidades) && f.especialidades.length
                        ? f.especialidades.join(', ')
                        : 'Freelancer';
                    return { titulo: f.nome, subtitulo: subtitulo, valor: f.nome };
                });
        }
        const vagas = await buscarVagas();
        return vagas
            .filter(function (v) {
                return bateTermo(v.titulo, termo) || bateTermo(v.especialidade, termo) || bateTermo(v.descricao, termo);
            })
            .slice(0, 6)
            .map(function (v) {
                return { titulo: v.titulo, subtitulo: v.especialidade || v.empresaNome || 'Vaga', valor: v.titulo };
            });
    }

    let buscaAtual = 0;

    input.addEventListener('input', function () {
        const termo = input.value.trim().toLowerCase();
        if (!termo) { fecharDropdown(); return; }

        const minhaBusca = ++buscaAtual;

        setTimeout(async function () {
            if (minhaBusca !== buscaAtual) return;

            const sugestoes = await montarSugestoes(termo);
            if (minhaBusca !== buscaAtual) return;

            dropdown.innerHTML = '';

            if (sugestoes.length === 0) {
                fecharDropdown();
                return;
            }

            sugestoes.forEach(function (s) {
                const item = document.createElement('div');
                item.className = 'autocomplete-item';
                item.innerHTML = `<strong>${escapeHtml(s.titulo)}</strong> <span class="text-muted" style="font-size:12px;">— ${escapeHtml(s.subtitulo)}</span>`;
                item.addEventListener('click', function () {
                    input.value = s.valor;
                    fecharDropdown();
                });
                dropdown.appendChild(item);
            });

            dropdown.style.display = 'block';
        }, 250);
    });

    document.addEventListener('click', function (e) {
        if (!wrapper.contains(e.target)) fecharDropdown();
    });

    // ── Submeter busca ──
    function temSessao() {
        try {
            return !!sessionStorage.getItem('usuarioLogado');
        } catch (erro) {
            return false;
        }
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        const termo = input.value.trim();
        const destino = LINKS_VER_TODOS[modoAtual].href;
        const alvo = termo
            ? `${destino}?busca=${encodeURIComponent(termo)}`
            : destino;

        if (!temSessao()) {
            window.location.href = `/pages/02-login.html?next=${encodeURIComponent(alvo)}`;
            return;
        }

        window.location.href = alvo;
    });
})();

/* -------------------------------------------------------------------------- */
/* PLANOS E PREÇOS — catálogo vem da API (entidade `planos`, fonte de verdade) */
/* -------------------------------------------------------------------------- */
(function initPlanosHomepage() {
    function escapeHtml(str) {
        return String(str ?? '').replace(/[&<>"']/g, function (ch) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
        });
    }

    const grade = document.getElementById('pricing-grid');
    if (!grade) return;

    // Ação (CTA) de cada plano varia pelo nome; os valores vêm do back.
    function montarAcao(nome) {
        if (nome === 'Empresarial') {
            return { href: 'https://wa.me/5547996654584', alvo: '_blank', classe: 'btn btn-outline-purple w-full', rotulo: 'Falar com vendas' };
        }
        if (nome === 'Básico') {
            return { href: '/pages/05-cadastro-freelancer.html', alvo: '_self', classe: 'btn btn-outline-purple w-full', rotulo: 'Começar grátis' };
        }
        return { href: '/pages/21-assinatura.html', alvo: '_self', classe: 'btn btn-purple w-full', rotulo: `Assinar ${nome}` };
    }

    fetch(`${API_BASE}/planos?tipo=assinatura`)
        .then(function (res) {
            if (!res.ok) throw new Error('Erro HTTP: ' + res.status);
            return res.json();
        })
        .then(function (planos) {
            grade.innerHTML = '';
            planos.forEach(function (plano) {
                const card = document.createElement('div');
                card.className = plano.destaque ? 'pricing-card featured' : 'pricing-card';

                if (plano.destaque) {
                    const badge = document.createElement('div');
                    badge.className = 'badge-featured';
                    badge.textContent = 'Mais Popular';
                    card.appendChild(badge);
                }

                const nome = document.createElement('div');
                nome.className = 'pricing-name';
                nome.textContent = plano.nome;
                card.appendChild(nome);

                const preco = document.createElement('div');
                preco.className = 'pricing-price';
                const amount = document.createElement('span');
                amount.className = 'amount';
                amount.textContent = plano.valor || 'Sob consulta';
                preco.appendChild(amount);
                if (plano.valor) {
                    const periodo = document.createElement('span');
                    periodo.className = 'period';
                    periodo.textContent = '/mês';
                    preco.appendChild(periodo);
                }
                card.appendChild(preco);

                const descricao = document.createElement('p');
                descricao.className = 'pricing-desc';
                descricao.textContent = plano.descricao || '';
                card.appendChild(descricao);

                const lista = document.createElement('ul');
                lista.className = 'pricing-features';
                (plano.beneficios || []).forEach(function (beneficio) {
                    const item = document.createElement('li');
                    item.innerHTML = `<i class="bi bi-check-circle-fill"></i> ${escapeHtml(beneficio)}`;
                    lista.appendChild(item);
                });
                card.appendChild(lista);

                const acao = montarAcao(plano.nome);
                const link = document.createElement('a');
                link.href = acao.href;
                link.className = acao.classe;
                link.textContent = acao.rotulo;
                if (acao.alvo === '_blank') {
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                }
                card.appendChild(link);

                grade.appendChild(card);
            });
        })
        .catch(function (erro) {
            console.error('Erro ao carregar planos:', erro);
            grade.innerHTML = '<p class="text-muted">Não foi possível carregar os planos.</p>';
        });
})();