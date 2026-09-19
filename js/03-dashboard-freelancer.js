document.addEventListener('DOMContentLoaded', () => {
    protegerRota();
    carregarDadosFreelancer();
    carregarVagasRecomendadas();
    carregarMetricasEProducoes();
    carregarNotificacoes();
    carregarPreviewConversas();
    initLogout();
});

/* -------------------------------------------------------------------------- */
/* 1. PROTEÇÃO DE ROTA (Verifica se está logado como freelancer)             */
/* -------------------------------------------------------------------------- */
function protegerRota() {
    const sessao = JSON.parse(sessionStorage.getItem('usuarioLogado'));

    if (!sessao) {
        window.location.href = '/pages/02-login.html';
        return;
    }

    if (sessao.tipo !== 'freelancers') {
        window.location.href = '/pages/04-dashboard-empresa.html';
    }
}

/* -------------------------------------------------------------------------- */
/* 2. CARREGAR DADOS DO PERFIL (Do db.json ou sessionStorage)                 */
/* -------------------------------------------------------------------------- */
async function carregarDadosFreelancer() {
    const sessao = JSON.parse(sessionStorage.getItem('usuarioLogado'));
    if (!sessao) return;

    try {
        const response = await fetch(`${API_BASE}/freelancers/${sessao.id}`);
        if (!response.ok) throw new Error('Não foi possível obter os dados do freelancer.');

        const freela = await response.json();

        // Atualiza elementos na tela
        const primeiroNome = freela.nome.split(' ')[0];
        document.getElementById('welcome-name').textContent = `Olá, ${primeiroNome}!`;
        document.getElementById('profile-nome').textContent = freela.nome;
        document.getElementById('profile-email').textContent = freela.email;
        document.getElementById('profile-tipo').textContent = freela.tipoNegocio || 'Autônomo';
        document.getElementById('profile-exp').textContent = freela.experiencia || 'Não informado';
        document.getElementById('profile-disp').textContent = freela.disponibilidade || 'Sob demanda';

        if (freela.enderecoResidencial) {
            document.getElementById('profile-local').textContent = `${freela.enderecoResidencial.cidade || ''} / ${freela.enderecoResidencial.estado || ''}`;
        }

        const metricAvaliacao = document.getElementById('metric-avaliacao');
        if (metricAvaliacao) {
            metricAvaliacao.textContent = freela.mediaAvaliacoes
                ? `${Number(freela.mediaAvaliacoes).toFixed(1)} / 5.0`
                : 'Sem avaliações';
        }

        // Iniciais para o Avatar
        const partesNome = freela.nome.split(' ');
        const iniciais = partesNome.length > 1 
            ? `${partesNome[0][0]}${partesNome[1][0]}`.toUpperCase()
            : partesNome[0].substring(0, 2).toUpperCase();
        document.getElementById('avatar-iniciais').textContent = iniciais;

    } catch (error) {
        console.error('Erro ao carregar perfil:', error);
        // Fallback usando dados da sessão
        document.getElementById('welcome-name').textContent = `Olá, ${sessao.nome}!`;
        document.getElementById('profile-nome').textContent = sessao.nome;
        document.getElementById('profile-email').textContent = sessao.email;
    }
}

/* -------------------------------------------------------------------------- */
/* 3. CARREGAR VAGAS RECOMENDADAS                                             */
/* -------------------------------------------------------------------------- */
async function carregarVagasRecomendadas() {
    const container = document.getElementById('vagas-recomendadas');

    try {
        const res = await fetch(`${API_BASE}/vagas?_limit=2`);
        if (!res.ok) throw new Error('Erro ao carregar vagas.');

        const vagas = await res.json();
        container.innerHTML = '';

        if (vagas.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">Nenhuma vaga nova no momento.</p>';
            return;
        }

        vagas.forEach(vaga => {
            const vagaEl = document.createElement('div');
            vagaEl.className = 'service-item';
            vagaEl.innerHTML = `
                <div class="service-info">
                    <h3>${vaga.titulo}</h3>
                    <span>${vaga.empresaNome || 'Confecção'} • <strong>${vaga.valor}</strong></span>
                </div>
                <a href="/pages/07-vagas.html" class="btn btn-outline-purple" style="padding: 6px 14px; font-size: 0.8rem;">
                    Ver Detalhes
                </a>
            `;
            container.appendChild(vagaEl);
        });

    } catch (error) {
        container.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">Erro ao carregar recomendações.</p>';
    }
}

/* -------------------------------------------------------------------------- */
/* 4. CARREGAR MÉTRICAS DO PAINEL E PRODUÇÕES ATUAIS                          */
/* -------------------------------------------------------------------------- */
async function carregarMetricasEProducoes() {
    const sessao = JSON.parse(sessionStorage.getItem('usuarioLogado'));
    if (!sessao) return;

    const listaServicos = document.getElementById('lista-servicos');
    const contadorServicosTexto = document.getElementById('contador-servicos-texto');
    const metricAtivos = document.getElementById('metric-ativos');
    const metricCandidaturas = document.getElementById('metric-candidaturas');
    const metricFaturamento = document.getElementById('metric-faturamento');

    try {
        const [resOS, resCandidaturas] = await Promise.all([
            fetch(`${API_BASE}/ordensServico?freelancerId=${sessao.id}`),
            fetch(`${API_BASE}/candidaturas?freelancerId=${sessao.id}`)
        ]);

        if (!resOS.ok) throw new Error('Erro ao carregar ordens de serviço.');
        if (!resCandidaturas.ok) throw new Error('Erro ao carregar candidaturas.');

        const ordensServico = await resOS.json();
        const candidaturas = await resCandidaturas.json();

        const ativas = ordensServico.filter(os => os.status === 'Em andamento');
        const concluidas = ordensServico.filter(os => os.status === 'Concluída');
        const ganhos = concluidas.reduce((total, os) => total + (parseFloat(os.valor) || 0), 0);
        // Candidaturas canceladas pelo próprio freelancer não contam como "propostas enviadas" ativas.
        const candidaturasAtivas = candidaturas.filter(c => c.status !== 'Cancelada');

        metricAtivos.textContent = ativas.length;
        metricCandidaturas.textContent = candidaturasAtivas.length;
        metricFaturamento.textContent = ganhos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });

        renderizarProducoes(ativas);
    } catch (error) {
        console.error('Erro ao carregar métricas do painel:', error);
        metricAtivos.textContent = '0';
        metricCandidaturas.textContent = '0';
        metricFaturamento.textContent = 'R$ 0';
        if (listaServicos) {
            listaServicos.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">Não foi possível carregar suas produções.</p>';
        }
        if (contadorServicosTexto) contadorServicosTexto.textContent = '';
    }

    function renderizarProducoes(ativas) {
        if (!listaServicos) return;
        listaServicos.innerHTML = '';

        if (contadorServicosTexto) {
            contadorServicosTexto.textContent = `${ativas.length} ativa${ativas.length === 1 ? '' : 's'}`;
        }

        if (ativas.length === 0) {
            listaServicos.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">Você não possui nenhuma produção em andamento no momento.</p>';
            return;
        }

        ativas.forEach(os => {
            const item = document.createElement('div');
            item.className = 'service-item';
            const prazo = os.prazo ? new Date(os.prazo).toLocaleDateString('pt-BR') : 'A definir';
            const valor = os.valor ? `R$ ${Number(os.valor).toLocaleString('pt-BR')}` : 'A combinar';
            item.innerHTML = `
                <div class="service-info">
                    <h3>${os.titulo} — ${os.empresaNome || 'Confecção'}</h3>
                    <span>Prazo: ${prazo} • Valor: ${valor}</span>
                </div>
                <span class="status-badge status-em-producao">${os.categoria || os.status}</span>
            `;
            listaServicos.appendChild(item);
        });
    }
}

/* -------------------------------------------------------------------------- */
/* 5. LOGOUT                                                                  */
/* -------------------------------------------------------------------------- */
function initLogout() {
    const btnLogout = document.getElementById('btn-logout');
    btnLogout.addEventListener('click', () => {
        sessionStorage.removeItem('usuarioLogado');
        window.location.href = '/pages/02-login.html';
    });
}

function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, function (ch) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
}

/* -------------------------------------------------------------------------- */
/* 6. NOTIFICAÇÕES (sino no cabeçalho)                                       */
/* -------------------------------------------------------------------------- */
async function carregarNotificacoes() {
    const sessao = JSON.parse(sessionStorage.getItem('usuarioLogado'));
    if (!sessao) return;

    const btnNotificacoes = document.getElementById('btn-notificacoes');
    const dropdown = document.getElementById('notif-dropdown');
    const badge = document.getElementById('notif-badge');
    const lista = document.getElementById('notif-lista');
    const btnMarcarTodas = document.getElementById('btn-marcar-todas-lidas');
    if (!btnNotificacoes || !dropdown || !badge || !lista) return;

    let notificacoes = [];

    function renderizarNotificacoes() {
        const naoLidas = notificacoes.filter(function (n) { return !n.lida; }).length;
        badge.hidden = naoLidas === 0;
        badge.textContent = naoLidas > 9 ? '9+' : String(naoLidas);

        if (notificacoes.length === 0) {
            lista.innerHTML = '<p class="text-muted" style="font-size: 13px; padding: 8px 0;">Nenhuma notificação por enquanto.</p>';
            return;
        }

        lista.innerHTML = notificacoes.slice(0, 10).map(function (n) {
            const data = n.criadoEm ? new Date(n.criadoEm).toLocaleDateString('pt-BR') : '';
            return `
                <a href="${n.link || '#'}" class="notif-item ${!n.lida ? 'notif-nao-lida' : ''}" data-id="${n.id}">
                    <strong>${escapeHtml(n.titulo)}</strong>
                    <span>${escapeHtml(n.mensagem)}</span>
                    <span style="display:block; margin-top:4px;">${data}</span>
                </a>
            `;
        }).join('');

        lista.querySelectorAll('.notif-item').forEach(function (item) {
            item.addEventListener('click', function () {
                marcarNotificacaoComoLida(item.dataset.id);
            });
        });
    }

    async function marcarNotificacaoComoLida(id) {
        const notif = notificacoes.find(function (n) { return String(n.id) === String(id); });
        if (!notif || notif.lida) return;
        try {
            await fetch(`${API_BASE}/notificacoes/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lida: true })
            });
            notif.lida = true;
            renderizarNotificacoes();
        } catch (error) {
            console.error('Erro ao marcar notificação como lida:', error);
        }
    }

    btnNotificacoes.addEventListener('click', function (e) {
        e.stopPropagation();
        const abrindo = dropdown.hidden;
        dropdown.hidden = !abrindo;
        btnNotificacoes.setAttribute('aria-expanded', String(abrindo));
    });

    document.addEventListener('click', function (e) {
        if (!dropdown.hidden && !dropdown.contains(e.target) && e.target !== btnNotificacoes) {
            dropdown.hidden = true;
            btnNotificacoes.setAttribute('aria-expanded', 'false');
        }
    });

    if (btnMarcarTodas) {
        btnMarcarTodas.addEventListener('click', async function () {
            const naoLidas = notificacoes.filter(function (n) { return !n.lida; });
            if (naoLidas.length === 0) return;
            try {
                await Promise.all(naoLidas.map(function (n) {
                    return fetch(`${API_BASE}/notificacoes/${n.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ lida: true })
                    });
                }));
                naoLidas.forEach(function (n) { n.lida = true; });
                renderizarNotificacoes();
            } catch (error) {
                console.error('Erro ao marcar todas como lidas:', error);
            }
        });
    }

    try {
        const res = await fetch(`${API_BASE}/notificacoes?usuarioId=${sessao.id}`);
        if (!res.ok) throw new Error('Erro ao buscar notificações.');
        notificacoes = await res.json();
        notificacoes.sort(function (a, b) { return new Date(b.criadoEm) - new Date(a.criadoEm); });
        renderizarNotificacoes();
    } catch (error) {
        console.error('Erro ao carregar notificações:', error);
    }
}

/* -------------------------------------------------------------------------- */
/* 7. PREVIEW DE CONVERSAS (mensagens recentes)                              */
/* -------------------------------------------------------------------------- */
async function carregarPreviewConversas() {
    const sessao = JSON.parse(sessionStorage.getItem('usuarioLogado'));
    const container = document.getElementById('preview-conversas');
    if (!sessao || !container) return;

    try {
        const [resConversas, resMensagens] = await Promise.all([
            fetch(`${API_BASE}/conversas`),
            fetch(`${API_BASE}/mensagens`)
        ]);
        if (!resConversas.ok) throw new Error('Erro ao buscar conversas.');

        const todasConversas = await resConversas.json();
        const todasMensagens = resMensagens.ok ? await resMensagens.json() : [];

        const minhasConversas = todasConversas.filter(function (c) {
            return String(c.participanteAId) === String(sessao.id) || String(c.participanteBId) === String(sessao.id);
        });

        if (minhasConversas.length === 0) {
            container.innerHTML = '<p class="text-muted" style="font-size: 0.85rem;">Nenhuma conversa ainda. Elas aparecem aqui depois que uma candidatura for aprovada (match).</p>';
            return;
        }

        const ordenadas = minhasConversas
            .map(function (conversa) {
                const naoLidas = todasMensagens.filter(function (m) {
                    return String(m.conversaId) === String(conversa.id) && String(m.destinatarioId) === String(sessao.id) && m.lida === false;
                }).length;
                const contato = String(conversa.participanteAId) === String(sessao.id)
                    ? conversa.participanteBNome
                    : conversa.participanteANome;
                return { conversa: conversa, naoLidas: naoLidas, contato: contato };
            })
            .sort(function (a, b) { return new Date(b.conversa.ultimaAtualizacao || 0) - new Date(a.conversa.ultimaAtualizacao || 0); })
            .slice(0, 3);

        container.innerHTML = ordenadas.map(function (item) {
            return `
                <a href="/pages/11-chat.html?conversaId=${encodeURIComponent(item.conversa.id)}" class="service-item" style="text-decoration:none; color:inherit;">
                    <div class="service-info">
                        <h3>${escapeHtml(item.contato || 'Contato')}</h3>
                        <span>${escapeHtml(item.conversa.ultimaMensagem || 'Sem mensagens ainda.')}</span>
                    </div>
                    ${item.naoLidas > 0 ? `<span class="status-badge" style="background: var(--danger); color: #fff;">${item.naoLidas}</span>` : ''}
                </a>
            `;
        }).join('');
    } catch (error) {
        console.error('Erro ao carregar preview de conversas:', error);
        container.innerHTML = '<p class="text-muted" style="font-size: 0.85rem;">Não foi possível carregar as conversas.</p>';
    }
}