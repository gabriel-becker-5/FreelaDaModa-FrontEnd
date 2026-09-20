// Assinatura (empresa) — padrão nav.js + modalConfirmar (ui.js)

const API_URL_ASSINATURAS = `${API_BASE}/assinaturas`;

const sessao = exigirTipo('empresas');
if (!sessao) {
    throw new Error('Sessão inválida');
}
let token;

renderizarSidebar(document.querySelector('.sidebar'), 'empresas', '21-assinatura');
renderizarTopbar(document.querySelector('#header-acoes'), sessao);
renderizarBannerValidacao(document.querySelector('.main'), sessao);

const empresaId = sessao.id;

const planoAtualNome = document.querySelector('#plano-atual-nome');
const planoAtualStatus = document.querySelector('#plano-atual-status');
const planoAtualCobranca = document.querySelector('#plano-atual-cobranca');
const mensagemStatus = document.querySelector('#mensagemStatus');
const cardsPlanos = document.querySelectorAll('.pricing-card, .grid-3 .card.stack-sm');

let assinaturaAtual = null;

/* ------------------------- menu mobile ------------------------------------ */

const sidebarToggleBtn = document.querySelector('.sidebar-toggle-btn');
const sidebar = document.querySelector('.sidebar');
const sidebarOverlay = document.querySelector('.sidebar-overlay');

function abrirMenu() {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('open');
    sidebarToggleBtn.classList.add('open');
    sidebarToggleBtn.setAttribute('aria-expanded', 'true');
}

function fecharMenu() {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('open');
    sidebarToggleBtn.classList.remove('open');
    sidebarToggleBtn.setAttribute('aria-expanded', 'false');
}

sidebarToggleBtn.addEventListener('click', () => {
    sidebar.classList.contains('open') ? fecharMenu() : abrirMenu();
});
sidebarOverlay.addEventListener('click', fecharMenu);

/* ------------------------- mensagens -------------------------------------- */

// Confirmação de compra: mensagem inline persistente no topo (padrão da 10),
// sem toast duplicado.
function mostrarMensagem(texto, tipo) {
    if (!mensagemStatus) return;
    mensagemStatus.className = `alert alert-${tipo}`;
    mensagemStatus.innerHTML = `<i class="bi ${tipo === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'}"></i> ${texto}`;
    mensagemStatus.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ------------------------- plano atual ------------------------------------ */

function formatarDataCobranca(iso) {
    if (!iso) return '—';
    const data = new Date(`${String(iso)}T00:00:00`);
    return isNaN(data) ? '—' : data.toLocaleDateString('pt-BR');
}

function renderizarAssinatura(assinatura) {
    assinaturaAtual = assinatura;
    if (planoAtualNome) planoAtualNome.textContent = `Empresa ${assinatura.plano}`;
    if (planoAtualStatus) planoAtualStatus.textContent = `Status: ${assinatura.status}`;
    if (planoAtualCobranca) planoAtualCobranca.textContent = `Próxima cobrança: ${formatarDataCobranca(assinatura.proximaCobranca)}`;

    cardsPlanos.forEach(function (card) {
        const btn = card.querySelector('.btn-contratar');
        const nomePlano = card.querySelector('h3');
        if (!btn || !nomePlano) return;
        // Só é "plano atual" quando ativo; assinatura inativa pode ser recontratada.
        const ehPlanoAtual = nomePlano.textContent.trim() === assinatura.plano && assinatura.status === 'ativo';
        btn.textContent = ehPlanoAtual ? 'Plano atual' : 'Contratar';
        btn.classList.toggle('btn-primary', !ehPlanoAtual);
    });
}

function renderizarSemAssinatura() {
    if (planoAtualNome) planoAtualNome.textContent = 'Você ainda não tem um plano contratado.';
    if (planoAtualStatus) planoAtualStatus.textContent = '';
    if (planoAtualCobranca) planoAtualCobranca.textContent = '';
}

async function carregarAssinatura() {
    try {
        const res = await fetch(`${API_URL_ASSINATURAS}?empresaId=${encodeURIComponent(empresaId)}`);
        if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
        const assinaturas = await res.json();
        if (assinaturas.length) renderizarAssinatura(assinaturas[0]);
        else renderizarSemAssinatura();
    } catch (erro) {
        console.error('Erro ao carregar assinatura:', erro);
        renderizarSemAssinatura();
    }
}

carregarAssinatura();

/* ------------------------- contratar plano -------------------------------- */

cardsPlanos.forEach(function (card) {
    const btn = card.querySelector('.btn-contratar');
    const nomePlano = card.querySelector('h3');
    const preco = card.querySelector('p');
    if (!btn || !nomePlano) return;

    btn.addEventListener('click', async function () {
        if (btn.textContent.trim() === 'Plano atual') return;

        const nomeDoPlano = nomePlano.textContent.trim();
        const valorPlano = preco ? preco.textContent.trim().split('/')[0] : '';

        const confirmou = await modalConfirmar({
            titulo: 'Contratar plano',
            mensagem: `Contratar o plano ${nomeDoPlano} por ${valorPlano}/mês?`,
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

        try {
            if (assinaturaAtual) {
                const novoHistorico = (assinaturaAtual.historico || []).concat([
                    { data: hoje.toISOString().slice(0, 10), plano: nomeDoPlano, valor: valorPlano, status: 'pago' }
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
                        proximaCobranca: proximaCobranca.toISOString().slice(0, 10),
                        historico: novoHistorico
                    })
                });
                if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
                renderizarAssinatura(await res.json());
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
                        proximaCobranca: proximaCobranca.toISOString().slice(0, 10),
                        historico: [{ data: hoje.toISOString().slice(0, 10), plano: nomeDoPlano, valor: valorPlano, status: 'pago' }]
                    })
                });
                if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
                renderizarAssinatura(await res.json());
            }

            // Avisa a empresa sobre a cobrança confirmada.
            fetch(`${API_BASE}/notificacoes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    usuarioId: empresaId,
                    usuarioTipo: 'empresas',
                    tipo: 'pagamento',
                    titulo: 'Pagamento confirmado',
                    mensagem: `Pagamento de ${valorPlano} do plano ${nomeDoPlano} confirmado. Próxima cobrança em ${proximaCobranca.toLocaleDateString('pt-BR')}.`,
                    lida: false,
                    criadoEm: hoje.toISOString(),
                    link: '/pages/21-assinatura.html'
                })
            }).catch(function (erro) { console.error('Erro ao criar notificação de pagamento:', erro); });

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
    const preco = card.querySelector('p');
    const lista = card.querySelector('.pricing-features');
    const btnContratar = card.querySelector('.btn-contratar');

    if (detalheNome) detalheNome.textContent = nomePlano ? nomePlano.textContent.trim() : 'Plano';
    if (detalhePreco) detalhePreco.innerHTML = preco ? preco.innerHTML : '';
    if (detalheLista) detalheLista.innerHTML = lista ? lista.innerHTML : '';
    if (btnContratarDoDetalhe) {
        const ehPlanoAtual = btnContratar && btnContratar.textContent.trim() === 'Plano atual';
        btnContratarDoDetalhe.textContent = ehPlanoAtual ? 'Plano atual' : 'Contratar';
        btnContratarDoDetalhe.classList.toggle('btn-primary', !ehPlanoAtual);
    }

    modalDetalhe.style.display = 'flex';
}

function fecharDetalhePlano() {
    modalDetalhe.style.display = 'none';
    cardDetalheAberto = null;
}

document.querySelectorAll('.btn-ver-detalhes-plano').forEach(function (botao) {
    botao.addEventListener('click', function () {
        abrirDetalhePlano(botao.closest('.card'));
    });
});

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
        if (btnContratarReal) btnContratarReal.click();
    });
}
