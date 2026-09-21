document.addEventListener('DOMContentLoaded', function () {
    const sessao = exigirTipo('freelancers');
    if (!sessao) return;

    renderizarSidebar(document.querySelector('.sidebar'), 'freelancers', '03-dashboard-freelancer');
    renderizarTopbar(document.getElementById('header-acoes'), sessao);
    renderizarBannerValidacao(document.querySelector('.main'), sessao);
    configurarMenuMobile();

    carregarPainel(sessao);
});

function classeBadgeOS(status) {
    if (status === 'Concluída') return 'badge-success';
    if (status === 'Cancelada') return 'badge-danger';
    return 'badge-warning';
}

/* -------------------------------------------------------------------------- */
/* 1. CARREGAR PAINEL (dados do perfil + seções)                              */
/* -------------------------------------------------------------------------- */
async function carregarPainel(sessao) {
    let freela = null;
    try {
        const res = await fetch(`${API_BASE}/freelancers/${sessao.id}`);
        if (res.ok) freela = await res.json();
    } catch (erro) {
        console.error('Erro ao carregar dados do freelancer:', erro);
    }

    const nomeCompleto = (freela && freela.nome) || sessao.nome || '';
    const primeiroNome = nomeCompleto.split(' ')[0];
    document.getElementById('welcome-name').textContent = `Olá, ${primeiroNome}!`;

    carregarAvaliacoes(sessao.id);
    carregarVagasRecomendadas(freela);
    carregarMetricasEProducoes(sessao.id);
    carregarPreviewConversas(sessao);
}

/* -------------------------------------------------------------------------- */
/* 2. AVALIAÇÕES                                                              */
/* -------------------------------------------------------------------------- */
async function carregarAvaliacoes(freelancerId) {
    const metricAvaliacao = document.getElementById('metric-avaliacao');
    if (!metricAvaliacao) return;

    try {
        const res = await fetch(`${API_BASE}/avaliacoes?freelancerId=${encodeURIComponent(freelancerId)}`);
        if (!res.ok) throw new Error('Erro ao carregar avaliações.');

        const avaliacoes = await res.json();

        if (!avaliacoes.length) {
            metricAvaliacao.textContent = 'Sem avaliações';
            return;
        }

        const soma = avaliacoes.reduce(function (total, avaliacao) {
            return total + (Number(avaliacao.nota) || 0);
        }, 0);
        const media = soma / avaliacoes.length;
        metricAvaliacao.textContent = `${media.toFixed(1)} / 5.0`;
    } catch (erro) {
        console.error('Erro ao carregar avaliações:', erro);
        metricAvaliacao.textContent = '—';
    }
}

/* -------------------------------------------------------------------------- */
/* 3. VAGAS RECOMENDADAS                                                      */
/* -------------------------------------------------------------------------- */
// Implementado filtro por cidade e estado do freelancer, caso disponíveis.
function classeBadgeStatus(status) {
    const statusNormalizado = (status || '').toLowerCase();
    if (statusNormalizado.includes('pausada')) return 'badge-warning';
    if (statusNormalizado.includes('encerrada')) return 'badge-danger';
    return 'badge-success';
}

function classeBadgeOS(status) {
    if (status === 'Concluída') return 'badge-success';
    if (status === 'Cancelada') return 'badge-danger';
    return 'badge-warning';
}

async function carregarVagasRecomendadas(freela) {
    const container = document.getElementById('vagas-recomendadas');
    if (!container) return;

    try {
        const res = await fetch(`${API_BASE}/vagas?status=Aberta`);
        if (!res.ok) throw new Error('Erro ao carregar vagas.');

        const abertas = await res.json();

        let candidatas = abertas;
        if (freela && (freela.cidadeResidencial || freela.estadoResidencial)) {
            const naCidade = abertas.filter(function (vaga) {
                return freela.cidadeResidencial &&
                    String(vaga.cidade || '').toLowerCase() === String(freela.cidadeResidencial).toLowerCase();
            });
            if (naCidade.length) {
                candidatas = naCidade;
            } else {
                const noEstado = abertas.filter(function (vaga) {
                    return freela.estadoResidencial &&
                        String(vaga.estado || '').toUpperCase() === String(freela.estadoResidencial).toUpperCase();
                });
                candidatas = noEstado.length ? noEstado : abertas;
            }
        }

        const vagas = candidatas.slice(0, 2);
        container.innerHTML = '';

        if (!vagas.length) {
            container.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">Nenhuma vaga nova no momento.</p>';
            return;
        }

        vagas.forEach(function (vaga) {
            const vagaEl = document.createElement('div');
            vagaEl.className = 'service-item';

            const info = document.createElement('div');
            info.className = 'service-info';

            const badge = document.createElement('span');
            badge.className = `badge ${classeBadgeStatus(vaga.status)}`;
            badge.textContent = vaga.status || 'Aberta';

            const tituloLinha = document.createElement('div');
            tituloLinha.style.cssText = 'display:flex; align-items:center; gap:8px; flex-wrap:wrap;';

            const titulo = document.createElement('h3');
            titulo.textContent = vaga.titulo;
            
            tituloLinha.appendChild(titulo);

            titulo.appendChild(badge);
            badge.style.marginLeft = '8px';            

            const detalhes = document.createElement('span');
            if (vaga.empresaId) {
                const linkEmpresa = document.createElement('a');
                linkEmpresa.href = `/pages/26-perfil-empresa-publico.html?id=${encodeURIComponent(vaga.empresaId)}`;
                linkEmpresa.textContent = vaga.empresaNome || 'Confecção';
                linkEmpresa.style.cssText = 'color: var(--color-primary); font-weight: 600;';
                detalhes.appendChild(linkEmpresa);
                detalhes.appendChild(document.createTextNode(` | Prazo: ${formatarData(vaga.prazo)} • Valor: ${vaga.valor || 'A combinar'}`));
            } else {
                detalhes.textContent = `${vaga.empresaNome || 'Confecção'} | ${vaga.valor || 'A combinar'}`;
            }

            info.appendChild(titulo);
            info.appendChild(tituloLinha);
            info.appendChild(detalhes);

            const botao = document.createElement('a');
            botao.href = `/pages/18-vaga-detalhe.html?id=${encodeURIComponent(vaga.id)}`;
            botao.className = 'btn btn-outline-purple bi-folder2-open';
            botao.style.padding = '6px 14px';
            botao.style.fontSize = '0.8rem';
            botao.textContent = 'Detalhar';

            vagaEl.appendChild(info);
            vagaEl.appendChild(botao);
            container.appendChild(vagaEl);
        });
    } catch (erro) {
        console.error('Erro ao carregar vagas recomendadas:', erro);
        container.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">Erro ao carregar recomendações.</p>';
    }
}

/* -------------------------------------------------------------------------- */
/* 4. MÉTRICAS DO PAINEL E PRODUÇÕES ATUAIS                                   */
/* -------------------------------------------------------------------------- */
async function carregarMetricasEProducoes(freelancerId) {
    const listaServicos = document.getElementById('lista-servicos');
    const contadorServicosTexto = document.getElementById('contador-servicos-texto');
    const metricAtivos = document.getElementById('metric-ativos');
    const metricCandidaturas = document.getElementById('metric-candidaturas');
    const metricFaturamento = document.getElementById('metric-faturamento');

    try {
        const [resOS, resCandidaturas] = await Promise.all([
            fetch(`${API_BASE}/ordensServico?freelancerId=${encodeURIComponent(freelancerId)}`),
            fetch(`${API_BASE}/candidaturas?freelancerId=${encodeURIComponent(freelancerId)}`)
        ]);

        if (!resOS.ok) throw new Error('Erro ao carregar ordens de serviço.');
        if (!resCandidaturas.ok) throw new Error('Erro ao carregar candidaturas.');

        const ordensServico = await resOS.json();
        const candidaturas = await resCandidaturas.json();

        const ativas = ordensServico.filter(function (os) { return os.status === 'Em andamento'; });
        const concluidas = ordensServico.filter(function (os) { return os.status === 'Concluída'; });
        const ganhos = concluidas.reduce(function (total, os) {
            return total + moedaParaNumero(os.valor);
        }, 0);
        // Candidaturas canceladas pelo próprio freelancer não contam como "propostas enviadas" ativas.
        const candidaturasAtivas = candidaturas.filter(function (c) { return c.status !== 'Cancelada'; });

        metricAtivos.textContent = ativas.length;
        metricCandidaturas.textContent = candidaturasAtivas.length;
        metricFaturamento.textContent = formatarMoeda(ganhos);

        renderizarProducoes(ativas);
    } catch (erro) {
        console.error('Erro ao carregar métricas do painel:', erro);
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


        if (!ativas.length) {
            listaServicos.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">Você não possui nenhuma produção em andamento no momento.</p>';
            return;
        }

        ativas.forEach(function (os) {
            const item = document.createElement('div');
            item.className = 'service-item';

            let prazo = 'A definir';
            if (os.prazo) {
                prazo = formatarData(os.prazo);
            }
            const valorNumerico = moedaParaNumero(os.valor);
            const valor = valorNumerico > 0 ? formatarMoeda(valorNumerico) : 'A combinar';

            const info = document.createElement('div');
            info.className = 'service-info';

            const tituloLinha = document.createElement('div');
            tituloLinha.style.cssText = 'display:flex; align-items:center; gap:8px; flex-wrap:wrap;';

            const titulo = document.createElement('h3');
            titulo.textContent = os.titulo;

            const badgeOS = document.createElement('span');
            badgeOS.className = `badge ${classeBadgeOS(os.status)}`;
            badgeOS.textContent = os.status || 'Em andamento';

            const detalhes = document.createElement('span');
            detalhes.textContent = `  | Prazo: ${prazo} • Valor: ${valor}`;
            
            info.appendChild(titulo);
            info.appendChild(tituloLinha);
           
            if (os.empresaId) {
                const linkEmpresa = document.createElement('a');
                linkEmpresa.href = `/pages/26-perfil-empresa-publico.html?id=${encodeURIComponent(os.empresaId)}`;
                linkEmpresa.textContent = os.empresaNome || 'Confecção';
                linkEmpresa.style.cssText = 'color: var(--color-primary); font-size: 0.85rem; font-weight: 600;';
                info.appendChild(linkEmpresa);
            } else if (os.empresaNome) {
                const nomeEmpresa = document.createElement('span');
                nomeEmpresa.textContent = os.empresaNome;
                nomeEmpresa.style.cssText = 'font-size: 0.85rem;';
                info.appendChild(nomeEmpresa);
            }
            info.appendChild(detalhes);

            const botaoDetalhar = document.createElement('a');
            botaoDetalhar.href = `/pages/19-ordem-servico-detalhe.html?id=${encodeURIComponent(os.id)}`;
            botaoDetalhar.className = 'btn btn-outline-purple bi-folder2-open';
            botaoDetalhar.style.padding = '6px 14px';
            botaoDetalhar.style.fontSize = '0.8rem';
            botaoDetalhar.textContent = 'Detalhar';

            tituloLinha.appendChild(titulo);
            tituloLinha.appendChild(badgeOS);

            item.appendChild(info);
            item.appendChild(botaoDetalhar);
            listaServicos.appendChild(item);
        });
    }
}

/* -------------------------------------------------------------------------- */
/* 5. PREVIEW DE CONVERSAS (mensagens recentes)                               */
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

        if (!minhasConversas.length) {
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
            .sort(function (a, b) {
                return new Date(b.conversa.ultimaAtualizacao || 0) - new Date(a.conversa.ultimaAtualizacao || 0);
            })
            .slice(0, 3);

        container.innerHTML = '';
        ordenadas.forEach(function (item) {
            const link = document.createElement('a');
            link.href = `/pages/11-chat.html?conversaId=${encodeURIComponent(item.conversa.id)}`;
            link.className = 'service-item';
            link.style.textDecoration = 'none';
            link.style.color = 'inherit';

            const info = document.createElement('div');
            info.className = 'service-info';

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