document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    function escapeHtml(str) {
        return String(str ?? '').replace(/[&<>"']/g, function (ch) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
        });
    }

    function formatarData(str) {
        if (!str) return '—';
        const data = new Date(str + 'T00:00:00');
        return isNaN(data) ? str : data.toLocaleDateString('pt-BR');
    }

    // ── 1. Identifica a vaga pela URL (?id=) ──
    const vagaId = new URLSearchParams(window.location.search).get('id');

    const loadingBar = document.getElementById('vagaLoading');
    const erroBar = document.getElementById('vagaErro');
    const conteudo = document.getElementById('vagaConteudo');
    const feedbackAlert = document.getElementById('feedbackAlert');
    const btnCandidatar = document.getElementById('btnCandidatar');

    let vagaAtual = null;

    if (!vagaId) {
        loadingBar.setAttribute('hidden', '');
        erroBar.textContent = 'Nenhuma vaga informada. Volte para o mural de vagas e clique em uma oportunidade.';
        erroBar.removeAttribute('hidden');
        return;
    }

    // ── 2. Carrega a vaga real via API ──
    async function carregarVaga() {
        try {
            const res = await fetch(`${API_BASE}/vagas/${vagaId}`);
            if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);

            vagaAtual = await res.json();

            document.getElementById('vaga-titulo').textContent = vagaAtual.titulo || 'Vaga';
            document.getElementById('vaga-empresa').textContent = vagaAtual.empresaNome || 'Confecção Parceira';
            document.getElementById('vaga-local').textContent = vagaAtual.local || 'Não informado';
            document.getElementById('vaga-especialidade-modalidade').textContent =
                [vagaAtual.especialidade, vagaAtual.modalidade].filter(Boolean).join(' | ') || '—';
            document.getElementById('vaga-valor').textContent = vagaAtual.valor || '—';
            document.getElementById('vaga-prazo').textContent = formatarData(vagaAtual.prazo);
            document.getElementById('vaga-descricao').textContent = vagaAtual.descricao || 'Sem descrição informada.';

            const statusBadge = document.getElementById('vaga-status-badge');
            const status = vagaAtual.status || 'Aberta';
            statusBadge.textContent = status;
            statusBadge.className = `badge ${status === 'Aberta' ? 'badge-success' : status === 'Pausada' ? 'badge-warning' : 'badge-danger'}`;

            loadingBar.setAttribute('hidden', '');
            conteudo.removeAttribute('hidden');

            await atualizarEstadoCandidatura();
        } catch (erro) {
            console.error('Erro ao carregar vaga:', erro);
            loadingBar.setAttribute('hidden', '');
            erroBar.removeAttribute('hidden');
        }
    }

    // ── 3. Ajusta o botão conforme quem está vendo a vaga ──
    async function atualizarEstadoCandidatura() {
        const sessao = JSON.parse(sessionStorage.getItem('usuarioLogado') || 'null');

        if (!btnCandidatar) return;

        if (vagaAtual.status !== 'Aberta') {
            btnCandidatar.disabled = true;
            btnCandidatar.innerHTML = 'Esta vaga não está mais aberta para candidaturas';
            return;
        }

        if (!sessao) {
            btnCandidatar.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Entrar para se candidatar';
            return;
        }

        if (sessao.tipo !== 'freelancers') {
            btnCandidatar.disabled = true;
            btnCandidatar.innerHTML = 'Apenas freelancers podem se candidatar';
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/candidaturas?freelancerId=${sessao.id}`);
            const candidaturas = res.ok ? await res.json() : [];
            const jaCandidatado = candidaturas.some(c => String(c.vagaId) === String(vagaAtual.id) && c.status !== 'Cancelada');

            if (jaCandidatado) {
                btnCandidatar.disabled = true;
                btnCandidatar.innerHTML = '<i class="bi bi-check-lg"></i> Você já se candidatou';
                btnCandidatar.style.background = 'var(--success)';
                btnCandidatar.style.borderColor = 'var(--success)';
            }
        } catch (erro) {
            console.error('Erro ao verificar candidatura existente:', erro);
        }
    }

    carregarVaga();

    // ── 4. Candidatar-se (POST real na API) ──
    if (btnCandidatar) {
        btnCandidatar.addEventListener('click', async function () {
            if (this.disabled) return;

            const sessao = JSON.parse(sessionStorage.getItem('usuarioLogado') || 'null');

            if (!sessao) {
                window.location.href = '/pages/02-login.html';
                return;
            }

            if (sessao.tipo !== 'freelancers' || !vagaAtual) return;

            this.disabled = true;
            const textoOriginal = this.innerHTML;
            this.innerHTML = '<span class="spinner"></span> Enviando candidatura...';

            const novaCandidatura = {
                vagaId: vagaAtual.id,
                empresaId: vagaAtual.empresaId,
                empresaNome: vagaAtual.empresaNome || 'Confecção',
                nomeEmpresa: vagaAtual.empresaNome || 'Confecção',
                titulo: vagaAtual.titulo,
                freelancerId: sessao.id,
                freelancerNome: sessao.nome,
                status: 'Em análise',
                tipo: 'Vaga',
                link: '18-vaga-detalhe.html'
            };

            try {
                const res = await fetch(`${API_BASE}/candidaturas`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(novaCandidatura)
                });
                if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);

                feedbackAlert.style.display = 'block';
                window.scrollTo({ top: 0, behavior: 'smooth' });

                this.innerHTML = '<i class="bi bi-check-lg"></i> Candidatura Enviada';
                this.style.background = 'var(--success)';
                this.style.borderColor = 'var(--success)';
                this.style.cursor = 'default';
            } catch (erro) {
                console.error('Erro ao enviar candidatura:', erro);
                this.disabled = false;
                this.innerHTML = textoOriginal;
                erroBar.textContent = 'Não foi possível enviar sua candidatura. Verifique se o json-server está rodando e tente novamente.';
                erroBar.classList.add('alert-error');
                erroBar.removeAttribute('hidden');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }
});
