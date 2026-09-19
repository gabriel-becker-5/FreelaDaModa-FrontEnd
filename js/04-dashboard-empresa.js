document.addEventListener('DOMContentLoaded', () => {
    protegerRotaEmpresa();
    carregarDadosEmpresa();
    carregarMinhasVagas();
    carregarMetricasEcandidaturas();
    carregarNotificacoes();
    carregarPreviewConversas();
    initModalNovaVaga();
    initLogout();
});

function mostrarMensagem(texto, tipo) {
    const el = document.getElementById('mensagemStatus');
    if (!el) return;
    el.className = `alert alert-${tipo}`; // tipo: 'success' | 'error'
    el.innerHTML = `<i class="bi ${tipo === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'}"></i> ${texto}`;
    el.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Confere se a empresa tem uma assinatura com status "ativo" — publicar vaga é
// um recurso pago, então isso não pode continuar funcionando pra quem nunca
// contratou nenhum plano (ver tela de Assinatura).
async function empresaTemAssinaturaAtiva(empresaId) {
    try {
        const res = await fetch(`${API_BASE}/assinaturas?empresaId=${empresaId}`);
        if (!res.ok) return false;
        const assinaturas = await res.json();
        return assinaturas.some(function (a) { return a.status === 'ativo'; });
    } catch (erro) {
        console.error('Erro ao verificar assinatura:', erro);
        return false;
    }
}

/* -------------------------------------------------------------------------- */
/* 1. PROTEÇÃO DE ROTA (Exclusivo para Empresas)                             */
/* -------------------------------------------------------------------------- */
function protegerRotaEmpresa() {
    const sessao = JSON.parse(sessionStorage.getItem('usuarioLogado'));

    if (!sessao) {
        window.location.href = '/pages/02-login.html';
        return;
    }

    if (sessao.tipo !== 'empresas') {
        window.location.href = '/pages/03-dashboard-freelancer.html';
    }
}

/* -------------------------------------------------------------------------- */
/* 2. CARREGAR DADOS DA EMPRESA                                              */
/* -------------------------------------------------------------------------- */
async function carregarDadosEmpresa() {
    const sessao = JSON.parse(sessionStorage.getItem('usuarioLogado'));
    if (!sessao) return;

    try {
        const res = await fetch(`${API_BASE}/empresas/${sessao.id}`);
        if (!res.ok) throw new Error('Falha ao obter dados da empresa.');

        const empresa = await res.json();

        document.getElementById('welcome-empresa').textContent = `Olá, ${empresa.nomeFantasia || empresa.razaoSocial}!`;
        document.getElementById('empresa-nome-fantasia').textContent = empresa.nomeFantasia || empresa.razaoSocial;
        document.getElementById('empresa-razao-social').textContent = empresa.razaoSocial;
        document.getElementById('empresa-cnpj').textContent = empresa.cnpj || 'Não informado';
        document.getElementById('empresa-email').textContent = empresa.email;
        document.getElementById('empresa-ramo').textContent = empresa.ramo || 'Moda em Geral';
        document.getElementById('empresa-local').textContent = `${empresa.cidade || ''} / ${empresa.estado || ''}`;

        // Iniciais para o Avatar
        const nomeParaIniciais = empresa.nomeFantasia || empresa.razaoSocial;
        const partes = nomeParaIniciais.split(' ');
        const iniciais = partes.length > 1 
            ? `${partes[0][0]}${partes[1][0]}`.toUpperCase()
            : partes[0].substring(0, 2).toUpperCase();
        document.getElementById('empresa-iniciais').textContent = iniciais;

    } catch (error) {
        console.error(error);
        document.getElementById('welcome-empresa').textContent = `Olá, ${sessao.nome}!`;
    }
}

/* -------------------------------------------------------------------------- */
/* 3. CARREGAR VAGAS CRIADAS PELA EMPRESA (GET)                              */
/* -------------------------------------------------------------------------- */
async function carregarMinhasVagas() {
    const sessao = JSON.parse(sessionStorage.getItem('usuarioLogado'));
    const container = document.getElementById('lista-minhas-vagas');
    const contadorTexto = document.getElementById('contador-vagas-texto');
    const metricVagas = document.getElementById('metric-vagas-abertas');

    try {
        // Busca as vagas vinculadas ao id da empresa logada
        const res = await fetch(`${API_BASE}/vagas?empresaId=${sessao.id}`);
        if (!res.ok) throw new Error('Erro ao listar vagas.');

        const vagas = await res.json();
        container.innerHTML = '';

        metricVagas.textContent = vagas.length;
        contadorTexto.textContent = `${vagas.length} vaga(s) ativa(s)`;

        if (vagas.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 30px; color: var(--text-muted);">
                    <i class="bi bi-inbox" style="font-size: 2rem; color: var(--primary-bright);"></i>
                    <p style="margin-top: 8px;">Você ainda não publicou nenhuma vaga.</p>
                </div>
            `;
            return;
        }

        vagas.forEach(vaga => {
            const vagaItem = document.createElement('div');
            vagaItem.className = 'company-job-item';
            vagaItem.innerHTML = `
                <div class="job-details">
                    <h3>${vaga.titulo}</h3>
                    <span>${vaga.especialidade} • <strong>${vaga.valor}</strong> • Prazo: ${vaga.prazo}</span>
                </div>
                <div class="job-actions">
                    <a href="/pages/17-candidatos-vaga.html?id=${encodeURIComponent(vaga.id)}" class="btn btn-outline-purple" style="padding: 6px 12px; font-size: 0.82rem;">
                        <i class="bi bi-person-lines-fill"></i> Candidatos
                    </a>
                    <a href="/pages/13-editar-vaga.html?id=${encodeURIComponent(vaga.id)}" class="btn btn-outline" style="padding: 6px 12px; font-size: 0.82rem;">
                        <i class="bi bi-pencil"></i> Editar
                    </a>
                    <button class="btn btn-outline" onclick="excluirVaga('${vaga.id}')" style="padding: 6px 12px; font-size: 0.82rem; color: #d93025; border-color: #ffc1bc;">
                        <i class="bi bi-trash"></i> Excluir
                    </button>
                </div>
            `;
            container.appendChild(vagaItem);
        });

    } catch (error) {
        console.error(error);
        container.innerHTML = '<p style="color: var(--text-muted);">Erro ao carregar vagas.</p>';
    }
}

/* -------------------------------------------------------------------------- */
/* 4. MODAL E POST DE NOVA VAGA                                               */
/* -------------------------------------------------------------------------- */
function initModalNovaVaga() {
    const modal = document.getElementById('modal-nova-vaga');
    const btnAbrir = document.getElementById('btn-abrir-modal-vaga');
    const btnFechar = document.getElementById('btn-fechar-modal');
    const btnCancelar = document.getElementById('btn-cancelar-modal');
    const form = document.getElementById('form-nova-vaga');

    const abrir = () => modal.style.display = 'flex';
    const fechar = () => {
        modal.style.display = 'none';
        form.reset();
    };

    btnAbrir.addEventListener('click', abrir);
    btnFechar.addEventListener('click', fechar);
    btnCancelar.addEventListener('click', fechar);

    // Enviar formulário (POST na rota /vagas)
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const sessao = JSON.parse(sessionStorage.getItem('usuarioLogado'));

        const assinaturaAtiva = await empresaTemAssinaturaAtiva(sessao.id);
        if (!assinaturaAtiva) {
            fechar();
            mostrarMensagem('Sua empresa não tem uma assinatura ativa. Contrate um plano na página de Assinatura para publicar vagas.', 'error');
            return;
        }

        const novaVaga = {
            empresaId: sessao.id,
            empresaNome: sessao.nome,
            titulo: document.getElementById('vaga-titulo').value.trim(),
            especialidade: document.getElementById('vaga-especialidade').value,
            valor: document.getElementById('vaga-valor').value.trim(),
            prazo: document.getElementById('vaga-prazo').value.trim(),
            local: document.getElementById('vaga-local').value.trim(),
            descricao: document.getElementById('vaga-desc').value.trim(),
            status: 'Aberta'
        };

        try {
            const res = await fetch(`${API_BASE}/vagas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(novaVaga)
            });

            if (res.ok) {
                fechar();
                mostrarMensagem('Vaga publicada com sucesso no Mural de Vagas!', 'success');
                carregarMinhasVagas();
            } else {
                fechar();
                mostrarMensagem('Erro ao publicar vaga.', 'error');
            }
        } catch (error) {
            console.error('Erro no POST:', error);
            fechar();
            mostrarMensagem('Não foi possível conectar com a API.', 'error');
        }
    });
}

/* -------------------------------------------------------------------------- */
/* 5. EXCLUIR VAGA (DELETE)                                                   */
/* -------------------------------------------------------------------------- */
async function excluirVaga(id) {
    if (!confirm('Tem certeza que deseja excluir esta vaga do mural?')) return;

    const sessao = JSON.parse(sessionStorage.getItem('usuarioLogado'));

    try {
        // Não deixa excluir uma vaga que já recebeu candidaturas — isso deixaria
        // registros órfãos em "candidaturas" (e possivelmente uma OS já gerada
        // a partir de um match) apontando para uma vaga que não existe mais.
        const resCandidaturas = await fetch(`${API_BASE}/candidaturas?empresaId=${sessao.id}`);
        const candidaturasDaEmpresa = resCandidaturas.ok ? await resCandidaturas.json() : [];
        const temCandidaturas = candidaturasDaEmpresa.some(function (c) { return String(c.vagaId) === String(id); });

        if (temCandidaturas) {
            mostrarMensagem('Esta vaga já recebeu candidaturas e não pode ser excluída. Encerre a vaga em vez de excluir, para preservar o histórico.', 'error');
            return;
        }

        const res = await fetch(`${API_BASE}/vagas/${id}`, {
            method: 'DELETE'
        });

        if (res.ok) {
            mostrarMensagem('Vaga removida!', 'success');
            carregarMinhasVagas();
        }
    } catch (error) {
        console.error('Erro ao excluir:', error);
        mostrarMensagem('Não foi possível excluir a vaga. Verifique se o json-server está rodando.', 'error');
    }
}

/* -------------------------------------------------------------------------- */
/* 6. MÉTRICAS (CANDIDATOS, LOTES EM PRODUÇÃO, INVESTIMENTO) E CANDIDATURAS   */
/* -------------------------------------------------------------------------- */
async function carregarMetricasEcandidaturas() {
    const sessao = JSON.parse(sessionStorage.getItem('usuarioLogado'));
    if (!sessao) return;

    const metricCandidatos = document.getElementById('metric-candidatos');
    const metricLotes = document.getElementById('metric-lotes-producao');
    const metricInvestimento = document.getElementById('metric-investimento');
    const listaCandidaturas = document.getElementById('lista-candidaturas-recentes');

    try {
        const [resCandidaturas, resOS] = await Promise.all([
            fetch(`${API_BASE}/candidaturas?empresaId=${sessao.id}`),
            fetch(`${API_BASE}/ordensServico?empresaId=${sessao.id}`)
        ]);

        if (!resCandidaturas.ok) throw new Error('Erro ao carregar candidaturas.');
        if (!resOS.ok) throw new Error('Erro ao carregar ordens de serviço.');

        const candidaturas = await resCandidaturas.json();
        const ordensServico = await resOS.json();

        const lotesEmProducao = ordensServico.filter(os => os.status === 'Em andamento');
        const investimento = ordensServico.reduce((total, os) => total + (parseFloat(os.valor) || 0), 0);
        // Candidatura cancelada pelo freelancer não conta mais como "recebida" ativa.
        const candidaturasAtivas = candidaturas.filter(c => c.status !== 'Cancelada');

        metricCandidatos.textContent = candidaturasAtivas.length;
        metricLotes.textContent = lotesEmProducao.length;
        metricInvestimento.textContent = investimento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });

        renderizarCandidaturasRecentes(candidaturas);
    } catch (error) {
        console.error('Erro ao carregar métricas da empresa:', error);
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

        if (candidaturas.length === 0) {
            listaCandidaturas.innerHTML = `
                <div style="text-align: center; padding: 24px; color: var(--text-muted);">
                    <i class="bi bi-inbox" style="font-size: 1.6rem;"></i>
                    <p style="margin-top: 8px;">Nenhuma candidatura recebida ainda.</p>
                </div>
            `;
            return;
        }

        candidaturas
            .slice(-5)
            .reverse()
            .forEach(candidatura => {
                const item = document.createElement('div');
                item.className = 'company-job-item';
                item.innerHTML = `
                    <div class="job-details">
                        <h3>${candidatura.freelancerNome || 'Freelancer'} <span style="font-size: 0.8rem; color: #137333; background: #e6f4ea; padding: 2px 8px; border-radius: 10px;">${candidatura.status}</span></h3>
                        <span>Candidatou-se para: <strong>${candidatura.titulo}</strong></span>
                    </div>
                    <div class="job-actions">
                        <a href="/pages/17-candidatos-vaga.html?id=${encodeURIComponent(candidatura.vagaId || '')}" class="btn btn-outline-purple" style="padding: 6px 12px; font-size: 0.82rem;">
                            <i class="bi bi-eye"></i> Ver Candidatura
                        </a>
                    </div>
                `;
                listaCandidaturas.appendChild(item);
            });
    }
}

/* -------------------------------------------------------------------------- */
/* 7. LOGOUT                                                                  */
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
/* 8. NOTIFICAÇÕES (sino no cabeçalho)                                       */
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
/* 9. PREVIEW DE CONVERSAS (mensagens recentes)                              */
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
                <a href="/pages/11-chat.html?conversaId=${encodeURIComponent(item.conversa.id)}" class="company-job-item" style="text-decoration:none; color:inherit;">
                    <div class="job-details">
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