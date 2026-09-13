const API_BASE = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', () => {
    protegerRotaEmpresa();
    carregarDadosEmpresa();
    carregarMinhasVagas();
    initModalNovaVaga();
    initLogout();
    initTemaToggle();
});

/* -------------------------------------------------------------------------- */
/* 0. TEMA CLARO / ESCURO                                                     */
/* -------------------------------------------------------------------------- */
function initTemaToggle() {
    const botaoTema = document.querySelector('.theme-toggle');
    if (!botaoTema) return;

    botaoTema.addEventListener('click', () => {
        const atual = document.documentElement.getAttribute('data-theme');
        document.documentElement.setAttribute('data-theme', atual === 'dark' ? 'light' : 'dark');
    });
}

/* -------------------------------------------------------------------------- */
/* 1. PROTEÇÃO DE ROTA (Exclusivo para Empresas)                             */
/* -------------------------------------------------------------------------- */
function protegerRotaEmpresa() {
    const sessao = JSON.parse(sessionStorage.getItem('usuarioLogado'));

    if (!sessao) {
        alert('Acesso restrito! Por favor, faça login com a conta da sua empresa.');
        window.location.href = '/pages/02-login.html';
        return;
    }

    if (sessao.tipo !== 'empresas') {
        alert('Este painel é exclusivo para Empresas/Confecções. Redirecionando...');
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
                alert('Vaga publicada com sucesso no Mural de Vagas!');
                fechar();
                carregarMinhasVagas();
            } else {
                alert('Erro ao publicar vaga.');
            }
        } catch (error) {
            console.error('Erro no POST:', error);
            alert('Não foi possível conectar com a API.');
        }
    });
}

/* -------------------------------------------------------------------------- */
/* 5. EXCLUIR VAGA (DELETE)                                                   */
/* -------------------------------------------------------------------------- */
async function excluirVaga(id) {
    if (confirm('Tem certeza que deseja excluir esta vaga do mural?')) {
        try {
            const res = await fetch(`${API_BASE}/vagas/${id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                alert('Vaga removida!');
                carregarMinhasVagas();
            }
        } catch (error) {
            console.error('Erro ao excluir:', error);
        }
    }
}

/* -------------------------------------------------------------------------- */
/* 6. LOGOUT                                                                  */
/* -------------------------------------------------------------------------- */
function initLogout() {
    const btnLogout = document.getElementById('btn-logout');
    btnLogout.addEventListener('click', () => {
        sessionStorage.removeItem('usuarioLogado');
        alert('Sessão encerrada.');
        window.location.href = '/pages/02-login.html';
    });
}