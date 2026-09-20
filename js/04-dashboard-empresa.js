document.addEventListener('DOMContentLoaded', function () {
    const sessao = exigirTipo('empresas');
    if (!sessao) return;

    renderizarSidebar(document.querySelector('.sidebar'), 'empresas', '04-dashboard-empresa');
    renderizarTopbar(document.getElementById('header-acoes'), sessao);
    renderizarBannerValidacao(document.querySelector('.main'), sessao);

    initMenuMobile();
    carregarDadosEmpresa(sessao);
    carregarOsAtivas(sessao);
    carregarMinhasVagas(sessao);
    carregarMetricasEcandidaturas(sessao);
    carregarPreviewConversas(sessao);
});

/* -------------------------------------------------------------------------- */
/* 1. MENU MOBILE (HAMBÚRGUER)                                                */
/* -------------------------------------------------------------------------- */
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

/* -------------------------------------------------------------------------- */
/* 2. MENSAGENS                                                               */
/* -------------------------------------------------------------------------- */
function mostrarMensagem(texto, tipo) {
    const el = document.getElementById('mensagemStatus');
    if (!el) return;
    el.className = `alert ${tipo === 'success' ? 'alert-success' : 'alert-error'}`;
    el.innerHTML = `<i class="bi ${tipo === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'}"></i> ${texto}`;
    el.removeAttribute('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* -------------------------------------------------------------------------- */
/* 3. CARREGAR DADOS DA EMPRESA (saudação)                                    */
/* -------------------------------------------------------------------------- */
async function carregarDadosEmpresa(sessao) {
    try {
        const res = await fetch(`${API_BASE}/empresas/${sessao.id}`);
        if (!res.ok) throw new Error('Falha ao obter dados da empresa.');

        const empresa = await res.json();
        const nome = empresa.nomeFantasia || empresa.razaoSocial || sessao.nome || '';
        document.getElementById('welcome-empresa').textContent = `Olá, ${nome}!`;
    } catch (erro) {
        console.error('Erro ao carregar dados da empresa:', erro);
        document.getElementById('welcome-empresa').textContent = `Olá, ${sessao.nome || ''}!`;
    }
}

/* -------------------------------------------------------------------------- */
/* 4. ORDENS DE SERVIÇO EM ANDAMENTO                                          */
/* -------------------------------------------------------------------------- */
async function carregarOsAtivas(sessao) {
    const container = document.getElementById('lista-os-ativas');
    const contador = document.getElementById('contador-os-texto');
    if (!container) return;

    try {
        const res = await fetch(`${API_BASE}/ordensServico?empresaId=${encodeURIComponent(sessao.id)}`);
        if (!res.ok) throw new Error('Erro ao listar ordens de serviço.');

        const ordensServico = await res.json();
        const ativas = ordensServico.filter(function (os) { return os.status === 'Em andamento'; });

        container.innerHTML = '';
        if (contador) contador.textContent = `${ativas.length} em andamento`;

        if (!ativas.length) {
            const vazio = document.createElement('p');
            vazio.style.color = 'var(--text-muted)';
            vazio.style.fontSize = '0.9rem';
            vazio.textContent = 'Nenhuma ordem de serviço em andamento no momento.';
            container.appendChild(vazio);
            return;
        }

        ativas.forEach(function (os) {
            let prazo = 'A definir';
            if (os.prazo) {
                const data = new Date(os.prazo);
                prazo = isNaN(data.getTime()) ? String(os.prazo) : data.toLocaleDateString('pt-BR');
            }
            const valorNumerico = moedaParaNumero(os.valor);
            const valor = valorNumerico > 0 ? formatarMoeda(valorNumerico) : 'A combinar';

            const item = document.createElement('div');
            item.className = 'service-item';

            const info = document.createElement('div');
            info.className = 'service-info';

            const titulo = document.createElement('h3');
            titulo.textContent = `${os.titulo} — ${os.freelancerNome || 'Freelancer'}`;

            const detalhes = document.createElement('span');
            detalhes.textContent = `Prazo: ${prazo} • Valor: ${valor}`;

            info.appendChild(titulo);
            info.appendChild(detalhes);

            const botao = document.createElement('a');
            botao.href = `/pages/14-editar-os.html?id=${encodeURIComponent(os.id)}`;
            botao.className = 'btn btn-outline-purple';
            botao.style.padding = '6px 14px';
            botao.style.fontSize = '0.8rem';
            botao.textContent = 'Abrir';

            item.appendChild(info);
            item.appendChild(botao);
            container.appendChild(item);
        });
    } catch (erro) {
        console.error('Erro ao carregar ordens de serviço:', erro);
        container.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">Não foi possível carregar as ordens de serviço.</p>';
        if (contador) contador.textContent = '';
    }
}

/* -------------------------------------------------------------------------- */
/* 5. VAGAS CRIADAS PELA EMPRESA                                              */
/* -------------------------------------------------------------------------- */
function classeBadgeStatus(status) {
    const statusNormalizado = (status || '').toLowerCase();
    if (statusNormalizado.includes('pausada')) return 'badge-warning';
    if (statusNormalizado.includes('encerrada')) return 'badge-danger';
    return 'badge-success';
}

async function carregarMinhasVagas(sessao) {
    const container = document.getElementById('lista-minhas-vagas');
    const contadorTexto = document.getElementById('contador-vagas-texto');
    const metricVagas = document.getElementById('metric-vagas-abertas');

    try {
        const res = await fetch(`${API_BASE}/vagas?empresaId=${encodeURIComponent(sessao.id)}`);
        if (!res.ok) throw new Error('Erro ao listar vagas.');

        const vagas = await res.json();
        container.innerHTML = '';

        const ativas = vagas.filter(function (vaga) {
            return vaga.status === 'Aberta' || vaga.status === 'Pausada';
        });
        metricVagas.textContent = ativas.length;
        contadorTexto.textContent = `${ativas.length} vaga(s) ativa(s)`;

        if (!vagas.length) {
            const vazio = document.createElement('div');
            vazio.style.textAlign = 'center';
            vazio.style.padding = '30px';
            vazio.style.color = 'var(--text-muted)';
            vazio.innerHTML = '<i class="bi bi-inbox" style="font-size: 2rem; color: var(--primary-bright);"></i>';
            const texto = document.createElement('p');
            texto.style.marginTop = '8px';
            texto.textContent = 'Você ainda não publicou nenhuma vaga.';
            vazio.appendChild(texto);
            container.appendChild(vazio);
            return;
        }

        vagas.forEach(function (vaga) {
            const vagaItem = document.createElement('div');
            vagaItem.className = 'company-job-item';

            const detalhes = document.createElement('div');
            detalhes.className = 'job-details';

            const titulo = document.createElement('h3');
            titulo.textContent = vaga.titulo;

            const linha = document.createElement('span');
            linha.textContent = `${vaga.especialidade || '—'} • ${vaga.valor || 'A combinar'} • Prazo: ${vaga.prazo || '—'}`;

            const badge = document.createElement('span');
            badge.className = `badge ${classeBadgeStatus(vaga.status)}`;
            badge.textContent = vaga.status || 'Aberta';

            detalhes.appendChild(titulo);
            detalhes.appendChild(linha);
            detalhes.appendChild(badge);

            const acoes = document.createElement('div');
            acoes.className = 'job-actions';

            const linkCandidatos = document.createElement('a');
            linkCandidatos.href = `/pages/17-candidatos-vaga.html?id=${encodeURIComponent(vaga.id)}`;
            linkCandidatos.className = 'btn btn-outline-purple';
            linkCandidatos.style.cssText = 'padding: 6px 12px; font-size: 0.82rem;';
            linkCandidatos.innerHTML = '<i class="bi bi-person-lines-fill"></i> Candidatos';

            const linkEditar = document.createElement('a');
            linkEditar.href = `/pages/13-editar-vaga.html?id=${encodeURIComponent(vaga.id)}`;
            linkEditar.className = 'btn btn-outline';
            linkEditar.style.cssText = 'padding: 6px 12px; font-size: 0.82rem;';
            linkEditar.innerHTML = '<i class="bi bi-pencil"></i> Editar';

            acoes.appendChild(linkCandidatos);
            acoes.appendChild(linkEditar);

            if (vaga.status !== 'Encerrada') {
                const botaoEncerrar = document.createElement('button');
                botaoEncerrar.type = 'button';
                botaoEncerrar.className = 'btn btn-outline';
                botaoEncerrar.style.cssText = 'padding: 6px 12px; font-size: 0.82rem; color: #d93025; border-color: #ffc1bc;';
                botaoEncerrar.innerHTML = '<i class="bi bi-x-circle"></i> Encerrar';
                botaoEncerrar.addEventListener('click', function () {
                    encerrarVaga(vaga);
                });
                acoes.appendChild(botaoEncerrar);
            }

            vagaItem.appendChild(detalhes);
            vagaItem.appendChild(acoes);
            container.appendChild(vagaItem);
        });
    } catch (erro) {
        console.error('Erro ao carregar vagas:', erro);
        container.innerHTML = '<p style="color: var(--text-muted);">Erro ao carregar vagas.</p>';
    }
}

async function encerrarVaga(vaga) {
    const confirmou = await modalConfirmar({
        titulo: 'Encerrar vaga',
        mensagem: `Deseja encerrar a vaga "${vaga.titulo}"? Ela sairá do Mural de Vagas, mas o histórico será preservado.`,
        textoConfirmar: 'Encerrar',
        textoCancelar: 'Cancelar',
        perigoso: true
    });
    if (!confirmou) return;

    try {
        const res = await fetch(`${API_BASE}/vagas/${vaga.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Encerrada' })
        });
        if (!res.ok) throw new Error('Falha ao encerrar vaga.');

        mostrarMensagem('Vaga encerrada com sucesso.', 'success');
        carregarMinhasVagas(obterSessao());
    } catch (erro) {
        console.error('Erro ao encerrar vaga:', erro);
        mostrarMensagem('Não foi possível encerrar a vaga. Tente novamente em instantes.', 'error');
    }
}

function classeBadgeCandidatura(status) {
    if (status === 'Selecionado' || status === 'Aprovado') return 'badge-success';
    if (status === 'Rejeitado' || status === 'Rejeitada' || status === 'Cancelada') return 'badge-danger';
    return 'badge-warning';
}

/* -------------------------------------------------------------------------- */
/* 6. MÉTRICAS (CANDIDATOS, LOTES EM PRODUÇÃO, INVESTIMENTO) E CANDIDATURAS   */
/* -------------------------------------------------------------------------- */
async function carregarMetricasEcandidaturas(sessao) {
    const metricCandidatos = document.getElementById('metric-candidatos');
    const metricLotes = document.getElementById('metric-lotes-producao');
    const metricInvestimento = document.getElementById('metric-investimento');
    const listaCandidaturas = document.getElementById('lista-candidaturas-recentes');

    try {
        const [resCandidaturas, resOS] = await Promise.all([
            fetch(`${API_BASE}/candidaturas?empresaId=${encodeURIComponent(sessao.id)}`),
            fetch(`${API_BASE}/ordensServico?empresaId=${encodeURIComponent(sessao.id)}`)
        ]);

        if (!resCandidaturas.ok) throw new Error('Erro ao carregar candidaturas.');
        if (!resOS.ok) throw new Error('Erro ao carregar ordens de serviço.');

        const candidaturas = await resCandidaturas.json();
        const ordensServico = await resOS.json();

        const lotesEmProducao = ordensServico.filter(function (os) { return os.status === 'Em andamento'; });
        const investimento = ordensServico.reduce(function (total, os) {
            return total + moedaParaNumero(os.valor);
        }, 0);
        // Candidatura cancelada pelo freelancer não conta mais como "recebida" ativa.
        const candidaturasAtivas = candidaturas.filter(function (c) { return c.status !== 'Cancelada'; });

        metricCandidatos.textContent = candidaturasAtivas.length;
        metricLotes.textContent = lotesEmProducao.length;
        metricInvestimento.textContent = formatarMoeda(investimento);

        renderizarCandidaturasRecentes(candidaturasAtivas);
    } catch (erro) {
        console.error('Erro ao carregar métricas da empresa:', erro);
        metricCandidatos.textContent = '0';
        metricLotes.textContent = '0';
        metricInvestimento.textContent = 'R$ 0';
        if (listaCandidaturas) {
            listaCandidaturas.innerHTML = '<p style="color: var(--text-muted);">Não foi possível carregar as candidaturas.</p>';
        }
    }

    function renderizarCandidaturasRecentes(candidaturas) {
        if (!listaCandidaturas) return;
        listaCandidaturas.innerHTML = '';

        if (!candidaturas.length) {
            const vazio = document.createElement('div');
            vazio.style.textAlign = 'center';
            vazio.style.padding = '24px';
            vazio.style.color = 'var(--text-muted)';
            vazio.innerHTML = '<i class="bi bi-inbox" style="font-size: 1.6rem;"></i>';
            const texto = document.createElement('p');
            texto.style.marginTop = '8px';
            texto.textContent = 'Nenhuma candidatura recebida ainda.';
            vazio.appendChild(texto);
            listaCandidaturas.appendChild(vazio);
            return;
        }

        candidaturas.slice(-5).reverse().forEach(function (candidatura) {
            const item = document.createElement('div');
            item.className = 'company-job-item';

            const detalhes = document.createElement('div');
            detalhes.className = 'job-details';

            const titulo = document.createElement('h3');
            titulo.textContent = candidatura.freelancerNome || 'Freelancer';
            const badge = document.createElement('span');
            badge.className = 'badge ' + classeBadgeCandidatura(candidatura.status);
            badge.style.fontSize = '0.8rem';
            badge.textContent = candidatura.status || '';
            titulo.appendChild(badge);

            const linha = document.createElement('span');
            linha.textContent = `Candidatou-se para: ${candidatura.titulo || '—'}`;

            detalhes.appendChild(titulo);
            detalhes.appendChild(linha);

            const acoes = document.createElement('div');
            acoes.className = 'job-actions';

            const link = document.createElement('a');
            link.href = `/pages/17-candidatos-vaga.html?id=${encodeURIComponent(candidatura.vagaId || '')}`;
            link.className = 'btn btn-outline-purple';
            link.style.cssText = 'padding: 6px 12px; font-size: 0.82rem;';
            link.innerHTML = '<i class="bi bi-eye"></i> Ver Candidatura';
            acoes.appendChild(link);

            item.appendChild(detalhes);
            item.appendChild(acoes);
            listaCandidaturas.appendChild(item);
        });
    }
}

/* -------------------------------------------------------------------------- */
/* 7. PREVIEW DE CONVERSAS (mensagens recentes)                               */
/* -------------------------------------------------------------------------- */
async function carregarPreviewConversas(sessao) {
    const container = document.getElementById('preview-conversas');
    if (!container) return;

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

        container.innerHTML = '';

        if (!minhasConversas.length) {
            const vazio = document.createElement('p');
            vazio.className = 'text-muted';
            vazio.style.fontSize = '0.85rem';
            vazio.textContent = 'Nenhuma conversa ainda. Elas aparecem aqui depois que uma candidatura for aprovada (match).';
            container.appendChild(vazio);
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
            .sort(function (a, b) {
                return new Date(b.conversa.ultimaAtualizacao || 0) - new Date(a.conversa.ultimaAtualizacao || 0);
            })
            .slice(0, 3);

        ordenadas.forEach(function (item) {
            const link = document.createElement('a');
            link.href = `/pages/11-chat.html?conversaId=${encodeURIComponent(item.conversa.id)}`;
            link.className = 'company-job-item';
            link.style.textDecoration = 'none';
            link.style.color = 'inherit';

            const info = document.createElement('div');
            info.className = 'job-details';

            const nome = document.createElement('h3');
            nome.textContent = item.contato || 'Contato';

            const mensagem = document.createElement('span');
            mensagem.textContent = item.conversa.ultimaMensagem || 'Sem mensagens ainda.';

            info.appendChild(nome);
            info.appendChild(mensagem);
            link.appendChild(info);

            if (item.naoLidas > 0) {
                const badge = document.createElement('span');
                badge.className = 'status-badge';
                badge.style.background = 'var(--danger)';
                badge.style.color = '#fff';
                badge.textContent = item.naoLidas;
                link.appendChild(badge);
            }

            container.appendChild(link);
        });
    } catch (erro) {
        console.error('Erro ao carregar preview de conversas:', erro);
        container.innerHTML = '<p class="text-muted" style="font-size: 0.85rem;">Não foi possível carregar as conversas.</p>';
    }
}
