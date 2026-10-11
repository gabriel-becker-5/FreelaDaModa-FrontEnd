document.addEventListener('DOMContentLoaded', function () {
    const sessao = exigirTipo('empresas');
    if (!sessao) return;

    renderizarSidebar(document.querySelector('.sidebar'), 'empresas', '04-dashboard-empresa');
    renderizarTopbar(document.getElementById('header-acoes'), sessao);
    renderizarBannerValidacao(document.querySelector('.main'), sessao);

    configurarMenuMobile();

    document.getElementById('btn-tentar-novamente').addEventListener('click', function () {
        carregarPainel(sessao);
    });
    carregarPainel(sessao);
});

/* -------------------------------------------------------------------------- */
/* CARGA ÚNICA DO PAINEL (GET /Dashboard/empresa)                              */
/* -------------------------------------------------------------------------- */
async function carregarPainel(sessao) {
    const botao = document.getElementById('btn-tentar-novamente');
    if (botao.disabled) return;

    const painel = document.querySelector('.main');
    const mensagemStatus = document.getElementById('mensagemStatus');
    botao.disabled = true;
    painel.setAttribute('aria-busy', 'true');
    mensagemStatus.hidden = true;
    definirMetricasIndisponiveis();
    definirTextoLista('lista-os-ativas', 'Carregando...');
    definirTextoLista('lista-minhas-vagas', 'Carregando...');
    definirTextoLista('lista-candidaturas-recentes', 'Carregando...');
    definirTextoLista('preview-conversas', 'Carregando...');

    try {
        const dados = await api('/Dashboard/empresa');
        renderizarPainel(dados, sessao);
        botao.hidden = true;
    } catch (erro) {
        if (erro.status === 401) return; // api() já redireciona para o login

        console.error('Erro ao carregar o painel:', erro);
        definirMetricasIndisponiveis();
        definirTextoLista('lista-os-ativas', 'Não foi possível carregar as ordens de serviço.');
        definirTextoLista('lista-minhas-vagas', 'Não foi possível carregar as vagas.');
        definirTextoLista('lista-candidaturas-recentes', 'Não foi possível carregar as candidaturas.');
        definirTextoLista('preview-conversas', 'Não foi possível carregar as conversas.');
        const mensagem = erro.status === 403
            ? 'Seu perfil não tem permissão para acessar o painel da empresa.'
            : erro.message || 'Não foi possível carregar seu painel. Tente novamente.';
        mostrarMensagem(mensagem, 'error');
        botao.hidden = false;
    } finally {
        painel.removeAttribute('aria-busy');
        botao.disabled = false;
    }
}

function renderizarPainel(dados, sessao) {
    const nome = dados.nomeExibicao || sessao.nome;
    document.getElementById('welcome-empresa').textContent = nome ? `Olá, ${nome}!` : 'Bem-vindo(a)!';

    document.getElementById('metric-lotes-producao').textContent = dados.lotesEmProducao;
    document.getElementById('metric-vagas-abertas').textContent = dados.vagasAbertas;
    document.getElementById('metric-candidatos').textContent = dados.candidatosRecebidos;
    document.getElementById('metric-investimento').textContent = formatarMoeda(dados.investimentoTotal);

    renderizarOsAtivas(dados.osAtivas);
    renderizarMinhasVagas(dados.minhasVagas);
    renderizarCandidaturasRecentes(dados.candidaturasRecentes);
    renderizarPreviewConversas(dados.conversasRecentes);
}

function definirMetricasIndisponiveis() {
    ['metric-lotes-producao', 'metric-vagas-abertas', 'metric-candidatos', 'metric-investimento'].forEach(function (id) {
        document.getElementById(id).textContent = '—';
    });
}

function definirTextoLista(id, texto) {
    const mensagem = document.createElement('p');
    mensagem.className = 'text-muted';
    mensagem.textContent = texto;
    document.getElementById(id).replaceChildren(mensagem);
}

// Datas ISO do back: usa apenas a parte AAAA-MM-DD (sem fuso) para não recuar
// um dia no Brasil; data "zerada" (ano <= 1) vira "A definir".
function formatarPrazoPainel(valor) {
    const partes = typeof valor === 'string' && /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(valor);
    if (!partes || Number(partes[1]) <= 1) return 'A definir';

    const data = new Date(`${partes[1]}-${partes[2]}-${partes[3]}T00:00:00`);
    if (data.getFullYear() !== Number(partes[1]) ||
        data.getMonth() + 1 !== Number(partes[2]) ||
        data.getDate() !== Number(partes[3])) return 'A definir';

    return formatarData(`${partes[1]}-${partes[2]}-${partes[3]}`);
}

function classeBadgeOS(status) {
    if (status === 'Concluída') return 'badge-success';
    if (status === 'Cancelada') return 'badge-danger';
    return 'badge-warning';
}

function classeBadgeStatus(status) {
    const statusNormalizado = (status || '').toLowerCase();
    if (statusNormalizado.includes('pausada')) return 'badge-warning';
    if (statusNormalizado.includes('encerrada')) return 'badge-danger';
    return 'badge-success';
}

function classeBadgeCandidatura(status) {
    if (status === 'Selecionado' || status === 'Aprovado') return 'badge-success';
    if (status === 'Rejeitado' || status === 'Rejeitada' || status === 'Cancelada') return 'badge-danger';
    return 'badge-warning';
}

/* -------------------------------------------------------------------------- */
/* OS EM ANDAMENTO                                                             */
/* -------------------------------------------------------------------------- */
function renderizarOsAtivas(osAtivas) {
    const container = document.getElementById('lista-os-ativas');

    if (!osAtivas.length) {
        definirTextoLista('lista-os-ativas', 'Nenhuma ordem de serviço em andamento no momento.');
        return;
    }

    container.replaceChildren();

    osAtivas.forEach(function (os) {
        const prazo = formatarPrazoPainel(os.prazo);
        const valor = os.valor > 0 ? formatarMoeda(os.valor) : 'A combinar';

        const item = document.createElement('div');
        item.className = 'service-item';

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
        detalhes.textContent = ` | Prazo: ${prazo} • Valor: ${valor}`;

        tituloLinha.appendChild(titulo);
        tituloLinha.appendChild(badgeOS);
        info.appendChild(tituloLinha);

        if (os.freelancerId) {
            const linkFreelancer = document.createElement('a');
            linkFreelancer.href = `/pages/25-perfil-freelancer-publico.html?id=${encodeURIComponent(os.freelancerId)}`;
            linkFreelancer.textContent = os.freelancerNome || 'Freelancer';
            linkFreelancer.style.cssText = 'color: var(--color-primary); font-size: 0.85rem; font-weight: 600;';
            info.appendChild(linkFreelancer);
        } else if (os.freelancerNome) {
            const nomeFreelancer = document.createElement('span');
            nomeFreelancer.textContent = os.freelancerNome;
            nomeFreelancer.style.cssText = 'font-size: 0.85rem;';
            info.appendChild(nomeFreelancer);
        }
        info.appendChild(detalhes);

        const botaoAbrir = document.createElement('a');
        botaoAbrir.href = `/pages/19-ordem-servico-detalhe.html?id=${encodeURIComponent(os.id)}`;
        botaoAbrir.className = 'btn btn-outline-purple';
        botaoAbrir.style.padding = '6px 12px';
        botaoAbrir.style.fontSize = '0.82rem';
        botaoAbrir.innerHTML = '<i class="bi-folder2-open"></i> Detalhar';

        const botaoEditar = document.createElement('a');
        botaoEditar.href = `/pages/14-editar-os.html?id=${encodeURIComponent(os.id)}`;
        botaoEditar.className = 'btn btn-outline';
        botaoEditar.style.padding = '6px 12px';
        botaoEditar.style.fontSize = '0.82rem';
        botaoEditar.innerHTML = '<i class="bi bi-pencil"></i> Editar';

        const acoes = document.createElement('div');
        acoes.className = 'job-actions';
        acoes.appendChild(botaoAbrir);
        acoes.appendChild(botaoEditar);

        item.appendChild(info);
        item.appendChild(acoes);
        container.appendChild(item);
    });
}

/* -------------------------------------------------------------------------- */
/* VAGAS PUBLICADAS                                                            */
/* -------------------------------------------------------------------------- */
function renderizarMinhasVagas(vagas) {
    const container = document.getElementById('lista-minhas-vagas');

    if (!vagas.length) {
        container.replaceChildren();

        const vazio = document.createElement('div');
        vazio.style.textAlign = 'center';
        vazio.style.padding = '30px';
        vazio.style.color = 'var(--text-muted)';
        vazio.innerHTML = '<i class="bi bi-inbox" style="font-size: 2rem; color: var(--primary-bright);"></i>';
        const texto = document.createElement('p');
        texto.style.marginTop = '8px';
        texto.textContent = 'Nenhuma vaga aberta ou pausada no momento.';
        vazio.appendChild(texto);
        container.appendChild(vazio);
        return;
    }

    container.replaceChildren();

    vagas.forEach(function (vaga) {
        const vagaItem = document.createElement('div');
        vagaItem.className = 'company-job-item';

        const detalhes = document.createElement('div');
        detalhes.className = 'job-details';

        const titulo = document.createElement('h3');
        titulo.textContent = vaga.titulo;

        const linha = document.createElement('span');
        linha.textContent = `Prazo: ${formatarPrazoPainel(vaga.prazoConclusao)} • Valor: ${vaga.valor > 0 ? formatarMoeda(vaga.valor) : 'A combinar'}`;

        const badge = document.createElement('span');
        badge.className = `badge ${classeBadgeStatus(vaga.status)}`;
        badge.textContent = vaga.status || 'Aberta';
        badge.style.marginLeft = '8px';

        detalhes.appendChild(titulo);
        titulo.appendChild(badge);
        detalhes.appendChild(linha);

        const acoes = document.createElement('div');
        acoes.className = 'job-actions';

        const linkCandidatos = document.createElement('a');
        linkCandidatos.href = `/pages/17-candidatos-vaga.html?id=${encodeURIComponent(vaga.id)}`;
        linkCandidatos.className = 'btn btn-outline-purple';
        linkCandidatos.style.cssText = 'padding: 6px 12px; font-size: 0.82rem;';
        linkCandidatos.innerHTML = '<i class="bi bi-person-lines-fill"></i> Candidatos';

        const linkDetalhar = document.createElement('a');
        linkDetalhar.href = `/pages/18-vaga-detalhe.html?id=${encodeURIComponent(vaga.id)}`;
        linkDetalhar.className = 'btn btn-outline-purple';
        linkDetalhar.style.cssText = 'padding: 6px 12px; font-size: 0.82rem;';
        linkDetalhar.innerHTML = '<i class="bi bi-folder2-open"></i> Detalhar';

        const linkEditar = document.createElement('a');
        linkEditar.href = `/pages/13-editar-vaga.html?id=${encodeURIComponent(vaga.id)}`;
        linkEditar.className = 'btn btn-outline';
        linkEditar.style.cssText = 'padding: 6px 12px; font-size: 0.82rem;';
        linkEditar.innerHTML = '<i class="bi bi-pencil"></i> Editar';

        acoes.appendChild(linkCandidatos);
        acoes.appendChild(linkDetalhar);
        acoes.appendChild(linkEditar);

        vagaItem.appendChild(detalhes);
        vagaItem.appendChild(acoes);
        container.appendChild(vagaItem);
    });
}

/* -------------------------------------------------------------------------- */
/* CANDIDATURAS RECENTES                                                       */
/* -------------------------------------------------------------------------- */
function renderizarCandidaturasRecentes(candidaturas) {
    const listaCandidaturas = document.getElementById('lista-candidaturas-recentes');

    if (!candidaturas.length) {
        listaCandidaturas.replaceChildren();

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

    listaCandidaturas.replaceChildren();

    candidaturas.forEach(function (candidatura) {
        const item = document.createElement('div');
        item.className = 'company-job-item';

        const detalhes = document.createElement('div');
        detalhes.className = 'job-details';

        const titulo = document.createElement('h3');
        if (candidatura.freelancerId) {
            const linkFreelancer = document.createElement('a');
            linkFreelancer.href = `/pages/25-perfil-freelancer-publico.html?id=${encodeURIComponent(candidatura.freelancerId)}`;
            linkFreelancer.textContent = candidatura.freelancerNome || 'Freelancer';
            titulo.appendChild(linkFreelancer);
        } else {
            titulo.textContent = candidatura.freelancerNome || 'Freelancer';
        }
        const badge = document.createElement('span');
        badge.className = 'badge ' + classeBadgeCandidatura(candidatura.status);
        badge.style.fontSize = '0.8rem';
        badge.style.marginLeft = '8px';
        badge.textContent = candidatura.status || '';
        titulo.appendChild(badge);

        const linha = document.createElement('span');
        linha.textContent = `Candidatou-se para: ${candidatura.tituloVaga || '—'}`;

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

/* -------------------------------------------------------------------------- */
/* MENSAGENS RECENTES                                                          */
/* -------------------------------------------------------------------------- */
function renderizarPreviewConversas(conversas) {
    const container = document.getElementById('preview-conversas');

    if (!conversas.length) {
        definirTextoLista('preview-conversas', 'Nenhuma conversa ainda. Elas aparecem aqui depois que uma candidatura for aprovada (match).');
        return;
    }

    container.replaceChildren();

    conversas.forEach(function (conversa) {
        const link = document.createElement('a');
        link.href = `/pages/11-chat.html?contatoId=${encodeURIComponent(conversa.contatoId)}`;
        link.className = 'company-job-item';
        link.style.textDecoration = 'none';
        link.style.color = 'inherit';

        const info = document.createElement('div');
        info.className = 'job-details';

        const nome = document.createElement('h3');
        nome.textContent = conversa.contatoNome || 'Contato';

        const mensagem = document.createElement('span');
        mensagem.textContent = conversa.ultimaMensagem || 'Sem mensagens ainda.';

        info.appendChild(nome);
        info.appendChild(mensagem);
        link.appendChild(info);
        container.appendChild(link);
    });
}
