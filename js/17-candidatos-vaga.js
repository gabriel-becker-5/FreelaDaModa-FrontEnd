document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    const API_BASE = 'http://localhost:3000';

    // ── 1. Tema Claro / Escuro ──
    const themeToggle = document.getElementById('themeToggle');
    const htmlElement = document.documentElement;

    function setTheme(theme) {
        htmlElement.setAttribute('data-theme', theme);
        try {
            localStorage.setItem('fdlm-theme', theme);
        } catch (e) { }
        if (themeToggle) {
            const icon = themeToggle.querySelector('i');
            if (icon) {
                icon.className = theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-stars';
            }
        }
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', function () {
            const current = htmlElement.getAttribute('data-theme');
            setTheme(current === 'dark' ? 'light' : 'dark');
        });
    }

    // ── 2. Lógica de Rejeitar Candidato ──
    const botoesRejeitar = document.querySelectorAll('.btnRejeitar');
    botoesRejeitar.forEach(botao => {
        botao.addEventListener('click', function () {
            const id = this.getAttribute('data-id');
            const statusBadge = document.getElementById(`status-${id}`);

            if (statusBadge) {
                statusBadge.className = 'badge badge-danger';
                statusBadge.textContent = 'Rejeitado';
            }

            this.style.display = 'none';
            const btnSelecionar = this.parentElement.querySelector('.btnSelecionar');
            if (btnSelecionar) btnSelecionar.style.display = 'none';
        });
    });

    // ── 3. Lógica de Selecionar Candidato (Modal) ──
    const modalSelecionar = document.getElementById('modalSelecionar');
    const botoesSelecionar = document.querySelectorAll('.btnSelecionar');
    const btnCancelarSelecao = document.getElementById('btnCancelarSelecao');
    const btnConfirmarSelecao = document.getElementById('btnConfirmarSelecao');
    const feedbackAlert = document.getElementById('feedbackAlert');
    let candidatoSelecionadoId = null;

    botoesSelecionar.forEach(botao => {
        botao.addEventListener('click', function () {
            candidatoSelecionadoId = this.getAttribute('data-id');
            modalSelecionar.style.display = 'flex';
        });
    });

    if (btnCancelarSelecao) {
        btnCancelarSelecao.addEventListener('click', function () {
            modalSelecionar.style.display = 'none';
            candidatoSelecionadoId = null;
        });
    }

    // ── 4. Confirmar Contratação (cria a OS) ──
    // POST em "ordensServico" e redireciona pro detalhe via ?id=
    if (btnConfirmarSelecao) {
        btnConfirmarSelecao.addEventListener('click', async function () {
            modalSelecionar.style.display = 'none';

            const statusBadge = document.getElementById(`status-${candidatoSelecionadoId}`);
            const linhaCandidato = document.getElementById(`candidato-${candidatoSelecionadoId}`);
            const nomeCandidato = linhaCandidato ? linhaCandidato.querySelector('strong').textContent.trim() : 'Freelancer';

            if (statusBadge) {
                statusBadge.className = 'badge badge-success';
                statusBadge.textContent = 'Selecionado';
            }

            const sessao = JSON.parse(sessionStorage.getItem('usuarioLogado') || 'null');
            const empresaId = sessao && sessao.tipo === 'empresas' ? sessao.id : '0UEUrH8HgJE';
            const empresaNome = sessao && sessao.tipo === 'empresas' ? sessao.nome : 'Confecção X';

            const tituloVagaEl = document.querySelector('.header p strong');
            const tituloVaga = tituloVagaEl ? tituloVagaEl.textContent.replace(/\s*\(VG-\d+\)/, '').trim() : 'Nova Ordem de Serviço';

            const novaOS = {
                titulo: tituloVaga,
                categoria: 'A definir',
                modalidade: 'Presencial',
                empresaId: empresaId,
                empresaNome: empresaNome,
                freelancerId: '-DU9G2RSk6s',
                freelancerNome: nomeCandidato,
                cidade: '',
                estado: '',
                valor: '',
                descricao: `Ordem de serviço gerada a partir da candidatura de ${nomeCandidato}.`,
                requisitos: '',
                habilidades: [],
                status: 'Em andamento',
                dataPublicacao: new Date().toISOString(),
                prazo: '',
                previsaoConclusao: '',
                avaliacaoFreelancer: 'Pendente',
                avaliacaoConfeccao: 'Pendente',
                observacoes: '',
                referenciaBriefing: '',
                referenciaEntrega: '',
                historico: [
                    { data: new Date().toISOString().slice(0, 10), evento: 'OS criada a partir da seleção do candidato.' }
                ]
            };

            let idNovaOS = null;
            try {
                const res = await fetch(`${API_BASE}/ordensServico`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(novaOS)
                });
                if (res.ok) {
                    const criada = await res.json();
                    idNovaOS = criada.id;
                }
            } catch (erro) {
                console.error('Erro ao criar Ordem de Serviço:', erro);
            }

            feedbackAlert.style.display = 'block';
            window.scrollTo({ top: 0, behavior: 'smooth' });

            setTimeout(() => {
                window.location.href = idNovaOS
                    ? `/pages/19-ordem-servico-detalhe.html?id=${idNovaOS}`
                    : '/pages/19-ordem-servico-detalhe.html';
            }, 2000);
        });
    }
});
