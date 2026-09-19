const API_URL = `${API_BASE}/vagas`;
let todasVagas = [];

function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, function (ch) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
}

function mostrarMensagem(texto, tipo) {
    const el = document.getElementById('mensagemStatus');
    if (!el) return;
    el.className = `alert alert-${tipo}`; // tipo: 'success' | 'error'
    el.innerHTML = `<i class="bi ${tipo === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'}"></i> ${texto}`;
    el.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.addEventListener('DOMContentLoaded', () => {
    verificarUsuarioLogado();
    carregarVagas();
    initFiltros();
});

/* -------------------------------------------------------------------------- */
/* 1. VERIFICAR AUTENTICAÇÃO DO USUÁRIO                                      */
/* -------------------------------------------------------------------------- */
function verificarUsuarioLogado() {
    const sessao = JSON.parse(sessionStorage.getItem('usuarioLogado'));
    const greeting = document.getElementById('user-greeting');
    const btnAuth = document.getElementById('btn-auth');
    const linkDashboard = document.getElementById('link-dashboard');

    if (sessao) {
        greeting.textContent = `Olá, ${sessao.nome.split(' ')[0]}!`;
        btnAuth.textContent = 'Sair';
        btnAuth.href = '#';
        btnAuth.addEventListener('click', (e) => {
            e.preventDefault();
            sessionStorage.removeItem('usuarioLogado');
            window.location.reload();
        });

        if (sessao.tipo === 'empresas') {
            linkDashboard.href = '/pages/04-dashboard-empresa.html';
        } else {
            linkDashboard.href = '/pages/03-dashboard-freelancer.html';
        }
    } else {
        greeting.textContent = '';
        btnAuth.textContent = 'Entrar';
        btnAuth.href = '/pages/02-login.html';
    }
}

/* -------------------------------------------------------------------------- */
/* 2. CARREGAR VAGAS DA API (GET)                                             */
/* -------------------------------------------------------------------------- */
async function carregarVagas() {
    const container = document.getElementById('lista-vagas');
    container.innerHTML = '<div class="empty-state"><i class="bi bi-hourglass-split"></i><p>Carregando vagas disponíveis...</p></div>';

    try {
        // Só mostra vagas realmente abertas — pausadas/encerradas não devem
        // aparecer no mural nem poder receber novas candidaturas.
        const response = await fetch(`${API_URL}?status=Aberta`);
        if (!response.ok) throw new Error('Erro ao buscar vagas.');

        todasVagas = await response.json();

        // vindo da lupa da Home via ?busca=
        const termoDaUrl = new URLSearchParams(window.location.search).get('busca');
        if (termoDaUrl) {
            const inputBusca = document.getElementById('filtro-busca');
            if (inputBusca) inputBusca.value = termoDaUrl;
            const termo = termoDaUrl.toLowerCase().trim();
            const filtradas = todasVagas.filter(vaga =>
                vaga.titulo.toLowerCase().includes(termo) ||
                (vaga.descricao || '').toLowerCase().includes(termo) ||
                (vaga.especialidade || '').toLowerCase().includes(termo) ||
                (vaga.empresaNome && vaga.empresaNome.toLowerCase().includes(termo))
            );
            renderizarVagas(filtradas);
        } else {
            renderizarVagas(todasVagas);
        }
    } catch (error) {
        console.error(error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-exclamation-triangle"></i>
                <p>Não foi possível carregar as vagas. Certifique-se de que a API (json-server) está ativa.</p>
            </div>
        `;
    }
}

/* -------------------------------------------------------------------------- */
/* 3. RENDERIZAR CARDS NO HTML                                                */
/* -------------------------------------------------------------------------- */
function renderizarVagas(vagas) {
    const container = document.getElementById('lista-vagas');
    container.innerHTML = '';

    if (vagas.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-inbox"></i>
                <h3>Nenhuma vaga encontrada</h3>
                <p>Tente ajustar os filtros ou pesquisar por outro termo.</p>
            </div>
        `;
        return;
    }

    vagas.forEach(vaga => {
        const card = document.createElement('article');
        card.className = 'job-card';
        card.style.cursor = 'pointer';
        card.addEventListener('click', (e) => {
            // Não navega se o clique foi no botão de candidatura ou no link da empresa
            if (e.target.closest('.btn-candidatar') || e.target.closest('.company-name')) return;
            window.location.href = `/pages/18-vaga-detalhe.html?id=${encodeURIComponent(vaga.id)}`;
        });

        const empresaNomeSeguro = escapeHtml(vaga.empresaNome || 'Confecção Parceira');

        card.innerHTML = `
            <div>
                <div class="job-card-header">
                    <div>
                        <h2 class="job-title">${escapeHtml(vaga.titulo)}</h2>
                        ${vaga.empresaId
                            ? `<a class="company-name" href="/pages/26-perfil-empresa-publico.html?id=${encodeURIComponent(vaga.empresaId)}"><i class="bi bi-building"></i> ${empresaNomeSeguro}</a>`
                            : `<span class="company-name"><i class="bi bi-building"></i> ${empresaNomeSeguro}</span>`}
                    </div>
                    <span class="job-badge">${escapeHtml(vaga.especialidade)}</span>
                </div>

                <p class="job-desc">${escapeHtml(vaga.descricao)}</p>
            </div>

            <div class="job-meta">
                <div class="meta-tags">
                    <div class="meta-item">
                        <i class="bi bi-cash-stack"></i> <strong>${escapeHtml(vaga.valor)}</strong>
                    </div>
                    <div class="meta-item">
                        <i class="bi bi-clock"></i> Prazo: <strong>${escapeHtml(vaga.prazo)}</strong>
                    </div>
                    <div class="meta-item">
                        <i class="bi bi-geo-alt"></i> <span>${escapeHtml(vaga.local)}</span>
                    </div>
                </div>

                <button class="btn btn-purple btn-candidatar" data-id="${escapeHtml(vaga.id)}" data-titulo="${escapeHtml(vaga.titulo)}">
                    Candidatar-se <i class="bi bi-send"></i>
                </button>
            </div>
        `;

        container.appendChild(card);
    });

    initBotoesCandidatura();
}

/* -------------------------------------------------------------------------- */
/* 4. FILTROS DE BUSCA E ESPECIALIDADE                                        */
/* -------------------------------------------------------------------------- */
function initFiltros() {
    const inputBusca = document.getElementById('filtro-busca');
    const selectEspecialidade = document.getElementById('filtro-especialidade');
    const btnLimpar = document.getElementById('btn-limpar-filtros');

    const aplicarFiltros = () => {
        const termo = inputBusca.value.toLowerCase().trim();
        const esp = selectEspecialidade.value;

        const filtradas = todasVagas.filter(vaga => {
            const bateTermo =
                !termo ||
                vaga.titulo.toLowerCase().includes(termo) ||
                (vaga.descricao || '').toLowerCase().includes(termo) ||
                (vaga.especialidade || '').toLowerCase().includes(termo) ||
                (vaga.empresaNome && vaga.empresaNome.toLowerCase().includes(termo));

            const bateEsp = esp === '' || vaga.especialidade === esp;

            return bateTermo && bateEsp;
        });

        renderizarVagas(filtradas);
    };

    inputBusca.addEventListener('input', aplicarFiltros);
    selectEspecialidade.addEventListener('change', aplicarFiltros);

    btnLimpar.addEventListener('click', () => {
        inputBusca.value = '';
        selectEspecialidade.value = '';
        renderizarVagas(todasVagas);
    });
}

/* -------------------------------------------------------------------------- */
/* 5. AÇÃO DE CANDIDATURA                                                     */
/* -------------------------------------------------------------------------- */
function initBotoesCandidatura() {
    const botoes = document.querySelectorAll('.btn-candidatar');

    botoes.forEach(btn => {
        btn.addEventListener('click', async () => {
            const sessao = JSON.parse(sessionStorage.getItem('usuarioLogado'));

            if (!sessao) {
                window.location.href = '/pages/02-login.html';
                return;
            }

            if (sessao.tipo !== 'freelancers') {
                mostrarMensagem('Apenas perfis de Freelancer podem se candidatar às vagas.', 'error');
                return;
            }

            const vagaId = btn.getAttribute('data-id');
            const vaga = todasVagas.find(v => String(v.id) === String(vagaId));
            if (!vaga) return;

            if (vaga.status !== 'Aberta') {
                mostrarMensagem('Esta vaga não está mais aberta para candidaturas.', 'error');
                return;
            }

            btn.disabled = true;
            const textoOriginal = btn.innerHTML;
            btn.innerHTML = '<span class="spinner"></span> Enviando...';

            try {
                // Evita candidatura duplicada para a mesma vaga.
                // Filtra "vagaId" no cliente: o json-server usado neste projeto não
                // filtra de forma confiável por "?vagaId=" (a coleção "vagas" mistura
                // ids numéricos e alfanuméricos, o que quebra a indexação dele).
                const resExistente = await fetch(`${API_BASE}/candidaturas?freelancerId=${sessao.id}`);
                const candidaturasDoFreelancer = resExistente.ok ? await resExistente.json() : [];
                const existentes = candidaturasDoFreelancer.filter(c => String(c.vagaId) === String(vaga.id) && c.status !== 'Cancelada');

                if (existentes.length > 0) {
                    mostrarMensagem('Você já se candidatou a esta vaga.', 'error');
                    btn.disabled = false;
                    btn.innerHTML = textoOriginal;
                    return;
                }

                const novaCandidatura = {
                    vagaId: vaga.id,
                    empresaId: vaga.empresaId,
                    empresaNome: vaga.empresaNome || 'Confecção',
                    nomeEmpresa: vaga.empresaNome || 'Confecção',
                    titulo: vaga.titulo,
                    freelancerId: sessao.id,
                    freelancerNome: sessao.nome,
                    status: 'Em análise',
                    tipo: 'Vaga',
                    link: '18-vaga-detalhe.html'
                };

                const res = await fetch(`${API_BASE}/candidaturas`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(novaCandidatura)
                });

                if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);

                btn.classList.replace('btn-purple', 'btn-light-purple');
                btn.innerHTML = 'Candidatura Enviada! <i class="bi bi-check2"></i>';
                btn.style.backgroundColor = '#e6f4ea';
                btn.style.color = '#137333';

                mostrarMensagem(`Parabéns, ${sessao.nome.split(' ')[0]}! Sua proposta para "${vaga.titulo}" foi enviada para a confecção.`, 'success');
            } catch (error) {
                console.error('Erro ao enviar candidatura:', error);
                mostrarMensagem('Não foi possível enviar sua candidatura. Verifique se o json-server está rodando e tente novamente.', 'error');
                btn.disabled = false;
                btn.innerHTML = textoOriginal;
            }
        });
    });
}