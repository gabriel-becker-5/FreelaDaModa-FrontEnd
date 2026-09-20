// Assinatura (empresa) — padrão nav.js + modalConfirmar (ui.js)
// O catálogo de planos vem da API (entidade `planos`, fonte de verdade).

const API_URL_ASSINATURAS = `${API_BASE}/assinaturas`;
const API_URL_PLANOS = `${API_BASE}/planos`;

const sessao = exigirTipo('empresas');
if (!sessao) {
    throw new Error('Sessão inválida');
}
let token;

renderizarSidebar(document.querySelector('.sidebar'), 'empresas', '21-assinatura');
renderizarTopbar(document.querySelector('#header-acoes'), sessao);
renderizarBannerValidacao(document.querySelector('.main'), sessao);
configurarMenuMobile();

const empresaId = sessao.id;

const planoAtualNome = document.querySelector('#plano-atual-nome');
const planoAtualStatus = document.querySelector('#plano-atual-status');
const planoAtualCobranca = document.querySelector('#plano-atual-cobranca');
const containerPlanos = document.getElementById('planos-assinatura');

let assinaturaAtual = null;

/* ------------------------- plano atual ------------------------------------ */

function formatarDataCobranca(iso) {
    if (!iso) return '—';
    const data = new Date(`${String(iso)}T00:00:00`);
    return isNaN(data) ? '—' : data.toLocaleDateString('pt-BR');
}

function obterCardsPlanos() {
    return Array.from(containerPlanos.querySelectorAll('.card.stack-sm'));
}

function renderizarAssinatura(assinatura) {
    assinaturaAtual = assinatura;
    if (planoAtualNome) planoAtualNome.textContent = `Empresa ${assinatura.plano}`;
    if (planoAtualStatus) planoAtualStatus.textContent = `Status: ${assinatura.status}`;
    if (planoAtualCobranca) planoAtualCobranca.textContent = `Próxima cobrança: ${formatarDataCobranca(assinatura.proximaCobranca)}`;

    obterCardsPlanos().forEach(function (card) {
        const btn = card.querySelector('.btn-contratar');
        const nomePlano = card.querySelector('h3');
        if (!btn || !nomePlano || btn.dataset.semValor) return;
        // Só é "plano atual" quando ativo; assinatura inativa pode ser recontratada.
        const ehPlanoAtual = nomePlano.textContent.trim() === assinatura.plano && assinatura.status === 'ativo';
        btn.textContent = ehPlanoAtual ? 'Plano atual' : 'Contratar';
        btn.classList.toggle('btn-primary', !ehPlanoAtual);
        btn.disabled = ehPlanoAtual;
    });
}

function renderizarSemAssinatura() {
    if (planoAtualNome) planoAtualNome.textContent = 'Você ainda não tem um plano contratado.';
    if (planoAtualStatus) planoAtualStatus.textContent = '';
    if (planoAtualCobranca) planoAtualCobranca.textContent = '';
    // Sem assinatura ativa, nenhum card pode estar marcado como "Plano atual".
    obterCardsPlanos().forEach(function (card) {
        const btn = card.querySelector('.btn-contratar');
        if (!btn || btn.dataset.semValor) return;
        btn.textContent = 'Contratar';
        btn.classList.add('btn-primary');
        btn.disabled = false;
    });
}

async function carregarAssinatura() {
    try {
        const res = await fetch(`${API_URL_ASSINATURAS}?empresaId=${encodeURIComponent(empresaId)}`);
        if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
        const assinaturas = await res.json();
        // Prioriza uma assinatura ativa; registros legados serão alinhados pelo job.
        const ativa = assinaturas.find(function (a) { return a.status === 'ativo'; });
        if (ativa) renderizarAssinatura(ativa);
        else if (assinaturas.length) renderizarAssinatura(assinaturas[0]);
        else renderizarSemAssinatura();
    } catch (erro) {
        console.error('Erro ao carregar assinatura:', erro);
        renderizarSemAssinatura();
    }
}

/* ------------------------- contratar plano -------------------------------- */

function configurarContratar() {
    obterCardsPlanos().forEach(function (card) {
        const btn = card.querySelector('.btn-contratar');
        const nomePlano = card.querySelector('h3');
        const preco = card.querySelector('.preco-plano');
        if (!btn || !nomePlano) return;

        btn.addEventListener('click', async function () {
            if (btn.disabled || btn.textContent.trim() === 'Plano atual') return;

            const nomeDoPlano = nomePlano.textContent.trim();
            const valorPlano = preco ? preco.textContent.trim().split('/')[0].trim() : '';

            const confirmou = await modalConfirmar({
                titulo: 'Contratar plano',
                mensagem: valorPlano && valorPlano !== 'Sob consulta'
                    ? `Contratar o plano ${nomeDoPlano} por ${valorPlano}/mês?`
                    : `Contratar o plano ${nomeDoPlano}?`,
                textoConfirmar: 'Contratar',
                textoCancelar: 'Voltar'
            });
            if (!confirmou) return;

            const textoOriginal = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner"></span> Processando...';

            const hoje = new Date();
            // Dia 1 evita o transbordo de data (31/jan + 1 mês cairia em mar/3).
            const proximaCobranca = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
            const proximaCobrancaISO = dataLocalISO(proximaCobranca);
            const hojeISO = hojeLocalISO();

            try {
                if (assinaturaAtual) {
                    const novoHistorico = (assinaturaAtual.historico || []).concat([
                        { data: hojeISO, plano: nomeDoPlano, valor: valorPlano, status: 'pago' }
                    ]);

                    const res = await fetch(`${API_URL_ASSINATURAS}/${assinaturaAtual.id}`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            plano: nomeDoPlano,
                            valor: valorPlano,
                            status: 'ativo',
                            proximaCobranca: proximaCobrancaISO,
                            historico: novoHistorico
                        })
                    });
                    if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
                } else {
                    const res = await fetch(`${API_URL_ASSINATURAS}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            empresaId: empresaId,
                            plano: nomeDoPlano,
                            valor: valorPlano,
                            status: 'ativo',
                            proximaCobranca: proximaCobrancaISO,
                            historico: [{ data: hojeISO, plano: nomeDoPlano, valor: valorPlano, status: 'pago' }]
                        })
                    });
                    if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
                }

                await carregarAssinatura();

                // Avisa a empresa sobre a cobrança confirmada.
                criarNotificacao({
                    usuarioId: empresaId,
                    usuarioTipo: 'empresas',
                    tipo: 'pagamento',
                    titulo: 'Pagamento confirmado',
                    mensagem: `Pagamento de ${valorPlano} do plano ${nomeDoPlano} confirmado. Próxima cobrança em ${proximaCobranca.toLocaleDateString('pt-BR')}.`,
                    link: '/pages/21-assinatura.html'
                });

                mostrarMensagem(`Plano ${nomeDoPlano} contratado com sucesso!`, 'success');
            } catch (erro) {
                console.error('Erro ao contratar plano:', erro);
                mostrarMensagem('Não foi possível contratar o plano. Tente novamente em instantes.', 'error');
                btn.innerHTML = textoOriginal;
            } finally {
                btn.disabled = false;
            }
        });
    });
}

/* ------------------------- detalhes do plano (modal) ---------------------- */

const modalDetalhe = document.getElementById('modal-detalhe-plano');
const detalheNome = document.getElementById('detalhe-plano-nome');
const detalhePreco = document.getElementById('detalhe-plano-preco');
const detalheLista = document.getElementById('detalhe-plano-lista');
const btnFecharDetalhe = document.getElementById('btn-fechar-detalhe-plano');
const btnContratarDoDetalhe = document.getElementById('btn-contratar-do-detalhe');

let cardDetalheAberto = null;

function abrirDetalhePlano(card) {
    if (!modalDetalhe) return;
    cardDetalheAberto = card;

    const nomePlano = card.querySelector('h3');
    const preco = card.querySelector('.preco-plano');
    const lista = card.querySelector('.pricing-features');
    const btnContratar = card.querySelector('.btn-contratar');

    if (detalheNome) detalheNome.textContent = nomePlano ? nomePlano.textContent.trim() : 'Plano';
    if (detalhePreco) detalhePreco.textContent = preco ? preco.textContent.trim() : '';
    if (detalheLista) detalheLista.innerHTML = lista ? lista.innerHTML : '';
    if (btnContratarDoDetalhe) {
        const ehPlanoAtual = btnContratar && btnContratar.textContent.trim() === 'Plano atual';
        btnContratarDoDetalhe.textContent = ehPlanoAtual ? 'Plano atual' : 'Contratar';
        btnContratarDoDetalhe.classList.toggle('btn-primary', !ehPlanoAtual);
        btnContratarDoDetalhe.disabled = ehPlanoAtual;
    }

    modalDetalhe.style.display = 'flex';
}

function fecharDetalhePlano() {
    modalDetalhe.style.display = 'none';
    cardDetalheAberto = null;
}

function configurarDetalhes() {
    document.querySelectorAll('.btn-ver-detalhes-plano').forEach(function (botao) {
        botao.addEventListener('click', function () {
            abrirDetalhePlano(botao.closest('.card'));
        });
    });
}

if (btnFecharDetalhe) btnFecharDetalhe.addEventListener('click', fecharDetalhePlano);
if (modalDetalhe) {
    modalDetalhe.addEventListener('click', function (e) {
        if (e.target === modalDetalhe) fecharDetalhePlano();
    });
}

// "Contratar" dentro do modal só delega pro botão real do card — mantém
// uma única fonte de verdade pro fluxo de contratação (sem lógica nova aqui).
if (btnContratarDoDetalhe) {
    btnContratarDoDetalhe.addEventListener('click', function () {
        if (!cardDetalheAberto) return;
        const btnContratarReal = cardDetalheAberto.querySelector('.btn-contratar');
        fecharDetalhePlano();
        if (btnContratarReal && !btnContratarReal.disabled) btnContratarReal.click();
    });
}

/* ------------------------- catálogo (API) --------------------------------- */

function montarCardsPlanos(planos) {
    containerPlanos.innerHTML = '';
    planos.forEach(function (plano) {
        const card = document.createElement('div');
        card.className = 'card stack-sm';

        const nome = document.createElement('h3');
        nome.textContent = plano.nome;

        const preco = document.createElement('p');
        preco.className = 'preco-plano';
        preco.style.cssText = 'font-size: 22px; font-weight: 800; color: var(--color-primary);';
        if (plano.valor) {
            preco.textContent = `${plano.valor} /mês`;
        } else {
            preco.textContent = 'Sob consulta';
        }

        const descricao = document.createElement('p');
        descricao.textContent = plano.descricao || '';

        const lista = document.createElement('ul');
        lista.className = 'pricing-features';
        lista.hidden = true;
        (plano.beneficios || []).forEach(function (beneficio) {
            const item = document.createElement('li');
            item.innerHTML = `<i class="bi bi-check-circle-fill"></i> ${escapeHtml(beneficio)}`;
            lista.appendChild(item);
        });

        const btnDetalhes = document.createElement('button');
        btnDetalhes.type = 'button';
        btnDetalhes.className = 'btn btn-outline-primary btn-ver-detalhes-plano';
        btnDetalhes.textContent = 'Ver detalhes';

        const btnContratar = document.createElement('button');
        btnContratar.type = 'button';
        btnContratar.className = 'btn btn-primary btn-contratar';
        if (plano.valor) {
            btnContratar.textContent = 'Contratar';
        } else {
            btnContratar.textContent = 'Sob consulta';
            btnContratar.disabled = true;
            btnContratar.dataset.semValor = '1';
        }

        card.appendChild(nome);
        card.appendChild(preco);
        card.appendChild(descricao);
        card.appendChild(lista);
        card.appendChild(btnDetalhes);
        card.appendChild(btnContratar);
        containerPlanos.appendChild(card);
    });

    configurarContratar();
    configurarDetalhes();
    carregarAssinatura();
}

async function carregarPlanos() {
    try {
        const res = await fetch(`${API_URL_PLANOS}?tipo=assinatura`);
        if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
        const planos = await res.json();
        if (!planos.length) throw new Error('Nenhum plano encontrado');
        montarCardsPlanos(planos);
    } catch (erro) {
        console.error('Erro ao carregar planos:', erro);
        containerPlanos.innerHTML = '<p style="color: var(--text-muted);">Não foi possível carregar os planos.</p>';
    }
}

carregarPlanos();
