document.addEventListener('DOMContentLoaded', function () {
    const sessao = exigirTipo('freelancers');
    if (!sessao) return;

    renderizarSidebar(document.querySelector('.sidebar'), 'freelancers', '03-dashboard-freelancer');
    renderizarTopbar(document.getElementById('header-acoes'), sessao);
    renderizarBannerValidacao(document.querySelector('.main'), sessao);
    configurarMenuMobile();
    atualizarSaudacao(sessao.nome);

    document.getElementById('btn-tentar-novamente').addEventListener('click', function () {
        carregarPainel(sessao);
    });
    carregarPainel(sessao);
});

async function carregarPainel(sessao) {
    const botao = document.getElementById('btn-tentar-novamente');
    if (botao.disabled) return;

    const painel = document.querySelector('.main');
    const mensagemStatus = document.getElementById('mensagemStatus');
    botao.disabled = true;
    painel.setAttribute('aria-busy', 'true');
    mensagemStatus.hidden = true;
    definirMetricasIndisponiveis();
    definirTextoLista('lista-servicos', 'Carregando...');
    definirTextoLista('vagas-recomendadas', 'Carregando...');
    definirTextoLista('preview-conversas', 'Carregando...');

    try {
        const dados = await api('/Dashboard/freelancer');
        renderizarPainel(dados, sessao);
        botao.hidden = true;
    } catch (erro) {
        if (erro.status === 401) return;

        console.error('Erro ao carregar o painel:', erro);
        definirMetricasIndisponiveis();
        definirTextoLista('lista-servicos', 'Não foi possível carregar suas produções.');
        definirTextoLista('vagas-recomendadas', 'Não foi possível carregar as recomendações.');
        definirTextoLista('preview-conversas', 'Não foi possível carregar as conversas.');
        const mensagem = erro.status === 403
            ? 'Seu perfil não tem permissão para acessar o painel do freelancer.'
            : erro.message || 'Não foi possível carregar seu painel. Tente novamente.';
        mostrarMensagem(mensagem, 'error');
        botao.hidden = false;
    } finally {
        painel.removeAttribute('aria-busy');
        botao.disabled = false;
    }
}

function renderizarPainel(dados, sessao) {
    atualizarSaudacao(dados.nomeExibicao || sessao.nome);
    document.getElementById('metric-ativos').textContent = dados.producoesAtivas;
    document.getElementById('metric-candidaturas').textContent = dados.candidaturasEnviadas;
    document.getElementById('metric-faturamento').textContent = formatarMoeda(dados.faturamentoTotal);
    document.getElementById('metric-avaliacao').textContent = dados.totalAvaliacoes === 0 || dados.mediaAvaliacao == null
        ? 'Sem avaliações'
        : `${dados.mediaAvaliacao.toFixed(1)} / 5.0`;

    renderizarProducoes(dados.producoes);
    renderizarVagasRecomendadas(dados.vagasRecomendadas);
    renderizarPreviewConversas(dados.conversasRecentes);
}

function atualizarSaudacao(nome) {
    const primeiroNome = (nome || '').trim().split(/\s+/)[0];
    document.getElementById('welcome-name').textContent = primeiroNome
        ? `Olá, ${primeiroNome}!`
        : 'Bem-vindo(a)!';
}

function definirMetricasIndisponiveis() {
    ['metric-ativos', 'metric-candidaturas', 'metric-faturamento', 'metric-avaliacao'].forEach(function (id) {
        document.getElementById(id).textContent = '—';
    });
}

function definirTextoLista(id, texto) {
    const mensagem = document.createElement('p');
    mensagem.className = 'text-muted';
    mensagem.textContent = texto;
    document.getElementById(id).replaceChildren(mensagem);
}

function classeBadgeStatus(status) {
    if (status === 'Aberta' || status === 'Concluída') return 'badge-success';
    if (status === 'Encerrada' || status === 'Cancelada') return 'badge-danger';
    return 'badge-warning';
}

function formatarPrazoPainel(valor) {
    const partes = typeof valor === 'string' && /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(valor);
    if (!partes || Number(partes[1]) <= 1) return 'A definir';

    // Prazo é uma data de calendário, sem conversão do horário UTC da API.
    const data = new Date(`${partes[1]}-${partes[2]}-${partes[3]}T00:00:00`);
    if (data.getFullYear() !== Number(partes[1]) ||
        data.getMonth() + 1 !== Number(partes[2]) ||
        data.getDate() !== Number(partes[3])) return 'A definir';

    return formatarData(`${partes[1]}-${partes[2]}-${partes[3]}`);
}

function criarItemServico(item, paginaDetalhe, prazo, statusPadrao) {
    const elemento = document.createElement('div');
    elemento.className = 'service-item';

    const info = document.createElement('div');
    info.className = 'service-info';
    const tituloLinha = document.createElement('div');
    tituloLinha.className = 'service-title';

    const titulo = document.createElement('h3');
    titulo.textContent = item.titulo;
    const badge = document.createElement('span');
    const status = item.status || statusPadrao;
    badge.className = `badge ${classeBadgeStatus(status)}`;
    badge.textContent = status;
    tituloLinha.append(titulo, badge);
    info.appendChild(tituloLinha);

    const detalhes = document.createElement('span');
    if (item.empresaId) {
        const empresa = document.createElement('a');
        empresa.href = `/pages/26-perfil-empresa-publico.html?id=${encodeURIComponent(item.empresaId)}`;
        empresa.className = 'service-company';
        empresa.textContent = item.empresaNome || 'Confecção';
        detalhes.appendChild(empresa);
    } else {
        detalhes.appendChild(document.createTextNode(item.empresaNome || 'Confecção'));
    }

    const valor = item.valor > 0 ? formatarMoeda(item.valor) : 'A combinar';
    detalhes.appendChild(document.createTextNode(` | Prazo: ${formatarPrazoPainel(prazo)} • Valor: ${valor}`));
    info.appendChild(detalhes);

    const botao = document.createElement('a');
    botao.href = `/pages/${paginaDetalhe}.html?id=${encodeURIComponent(item.id)}`;
    botao.className = 'btn btn-outline-purple service-detail';
    const icone = document.createElement('i');
    icone.className = 'bi bi-folder2-open';
    icone.setAttribute('aria-hidden', 'true');
    botao.append(icone, document.createTextNode('Detalhar'));

    elemento.append(info, botao);
    return elemento;
}

function renderizarProducoes(producoes) {
    if (!producoes.length) {
        definirTextoLista('lista-servicos', 'Você não possui nenhuma produção em andamento no momento.');
        return;
    }
    const lista = document.getElementById('lista-servicos');
    lista.replaceChildren();
    producoes.forEach(function (producao) {
        lista.appendChild(criarItemServico(producao, '19-ordem-servico-detalhe', producao.prazo, 'Em andamento'));
    });
}

function renderizarVagasRecomendadas(vagas) {
    if (!vagas.length) {
        definirTextoLista('vagas-recomendadas', 'Nenhuma vaga nova no momento.');
        return;
    }
    const lista = document.getElementById('vagas-recomendadas');
    lista.replaceChildren();
    vagas.forEach(function (vaga) {
        lista.appendChild(criarItemServico(vaga, '18-vaga-detalhe', vaga.prazoConclusao, 'Aberta'));
    });
}

function renderizarPreviewConversas(conversas) {
    if (!conversas.length) {
        definirTextoLista('preview-conversas', 'Nenhuma conversa ainda.');
        return;
    }
    const lista = document.getElementById('preview-conversas');
    lista.replaceChildren();
    conversas.forEach(function (conversa) {
        const link = document.createElement('a');
        link.href = `/pages/11-chat.html?contatoId=${encodeURIComponent(conversa.contatoId)}`;
        link.className = 'service-item conversation-preview';
        const info = document.createElement('div');
        info.className = 'service-info';
        const nome = document.createElement('h3');
        nome.textContent = conversa.contatoNome || 'Contato';
        const mensagem = document.createElement('span');
        mensagem.textContent = conversa.ultimaMensagem || 'Sem mensagens ainda.';
        info.append(nome, mensagem);
        link.appendChild(info);
        lista.appendChild(link);
    });
}
