document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    // ── 1. Proteção de rota (só empresa logada) ──
    const sessao = JSON.parse(sessionStorage.getItem('usuarioLogado') || 'null');
    if (!sessao || sessao.tipo !== 'empresas') {
        window.location.href = '/pages/02-login.html';
        return;
    }

    // ── 2. Identifica a vaga pela URL (?id=) ──
    const vagaId = new URLSearchParams(window.location.search).get('id');

    const tituloVagaEl = document.getElementById('tituloVaga');
    const vagaErro = document.getElementById('vagaErro');
    const cardCandidatos = document.getElementById('cardCandidatos');
    const tbody = document.getElementById('tbodyCandidatos');
    const feedbackAlert = document.getElementById('feedbackAlert');

    const modalSelecionar = document.getElementById('modalSelecionar');
    const btnCancelarSelecao = document.getElementById('btnCancelarSelecao');
    const btnConfirmarSelecao = document.getElementById('btnConfirmarSelecao');

    let vagaAtual = null;
    let candidaturaSelecionadaId = null;

    function mostrarMensagem(texto, tipo) {
        if (!feedbackAlert) return;
        feedbackAlert.className = `alert alert-${tipo} animate-fade-in mb-md`; // tipo: 'success' | 'error'
        feedbackAlert.innerHTML = `<i class="bi ${tipo === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'}"></i> ${texto}`;
        feedbackAlert.hidden = false;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function escapeHtml(str) {
        return String(str ?? '').replace(/[&<>"']/g, function (ch) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
        });
    }

    function iniciais(nome) {
        const partes = String(nome || '').trim().split(' ').filter(Boolean);
        if (partes.length === 0) return '--';
        return partes.length > 1
            ? `${partes[0][0]}${partes[1][0]}`.toUpperCase()
            : partes[0].substring(0, 2).toUpperCase();
    }

    function classeBadgeStatus(status) {
        if (status === 'Selecionado' || status === 'Aprovado') return 'badge-success';
        if (status === 'Rejeitado' || status === 'Rejeitada') return 'badge-danger';
        return 'badge-warning';
    }

    if (!vagaId) {
        vagaErro.textContent = 'Nenhuma vaga informada. Volte para "Minhas Vagas" e clique em "Candidatos" novamente.';
        vagaErro.removeAttribute('hidden');
        return;
    }

    // ── 3. Carrega a vaga e seus candidatos reais via API ──
    async function carregarCandidatos() {
        try {
            const resVaga = await fetch(`${API_BASE}/vagas/${vagaId}`);
            if (!resVaga.ok) throw new Error(`Erro HTTP: ${resVaga.status}`);
            vagaAtual = await resVaga.json();

            if (String(vagaAtual.empresaId) !== String(sessao.id)) {
                vagaErro.textContent = 'Esta vaga não pertence à sua empresa.';
                vagaErro.removeAttribute('hidden');
                return;
            }

            tituloVagaEl.textContent = `${vagaAtual.titulo} (VG-${vagaAtual.id})`;

            // Filtra por vagaId no cliente: o json-server usado neste projeto não
            // filtra de forma confiável por "?vagaId=" (a coleção "vagas" mistura
            // ids numéricos e alfanuméricos, o que quebra a indexação dele).
            const resCandidaturas = await fetch(`${API_BASE}/candidaturas?empresaId=${sessao.id}`);
            if (!resCandidaturas.ok) throw new Error(`Erro HTTP: ${resCandidaturas.status}`);
            const todasCandidaturas = await resCandidaturas.json();
            const candidaturas = todasCandidaturas.filter(c => String(c.vagaId) === String(vagaId));

            // Busca os dados completos de cada freelancer candidato
            const candidaturasComFreelancer = await Promise.all(candidaturas.map(async (candidatura) => {
                try {
                    const resFreela = await fetch(`${API_BASE}/freelancers/${candidatura.freelancerId}`);
                    const freela = resFreela.ok ? await resFreela.json() : null;
                    return { candidatura, freela };
                } catch (erro) {
                    return { candidatura, freela: null };
                }
            }));

            renderizarCandidatos(candidaturasComFreelancer);
            cardCandidatos.removeAttribute('hidden');
        } catch (erro) {
            console.error('Erro ao carregar candidatos da vaga:', erro);
            vagaErro.removeAttribute('hidden');
        }
    }

    function renderizarCandidatos(lista) {
        tbody.innerHTML = '';

        if (lista.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Nenhum freelancer se candidatou a esta vaga ainda.</td></tr>';
            return;
        }

        lista.forEach(({ candidatura, freela }) => {
            const nome = freela ? freela.nome : (candidatura.freelancerNome || 'Freelancer');
            const especialidades = freela && Array.isArray(freela.especialidades) ? freela.especialidades : [];
            const disponibilidade = freela ? (freela.disponibilidade || 'Não informado') : 'Não informado';
            const media = freela && freela.mediaAvaliacoes ? freela.mediaAvaliacoes.toFixed(1) : '—';
            const totalAvaliacoes = freela ? (freela.totalAvaliacoes || 0) : 0;

            const tr = document.createElement('tr');
            tr.id = `candidato-${candidatura.id}`;
            tr.dataset.candidaturaId = candidatura.id;
            tr.dataset.freelancerId = candidatura.freelancerId;

            const podeAgir = candidatura.status === 'Em análise';

            tr.innerHTML = `
                <td>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div class="chat-avatar">${escapeHtml(iniciais(nome))}</div>
                        <div>
                            <strong>${escapeHtml(nome)}</strong>
                            <div style="font-size: 12px; color: var(--text-secondary);">
                                <i class="bi bi-star-fill" style="color: #f2bb55;"></i> ${media} (${totalAvaliacoes} avaliações)
                            </div>
                        </div>
                    </div>
                </td>
                <td>
                    <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                        ${especialidades.map(esp => `<span class="badge" style="font-size: 10px;">${escapeHtml(esp)}</span>`).join('') || '<span class="text-muted">—</span>'}
                    </div>
                </td>
                <td>${escapeHtml(disponibilidade)}</td>
                <td><span class="badge ${classeBadgeStatus(candidatura.status)}" id="status-${candidatura.id}">${escapeHtml(candidatura.status)}</span></td>
                <td>
                    <div class="table-actions">
                        <a href="/pages/25-perfil-freelancer-publico.html?id=${encodeURIComponent(candidatura.freelancerId)}" class="btn btn-ghost" title="Ver Perfil Completo"><i class="bi bi-person-lines-fill"></i></a>
                        ${podeAgir ? `<button class="btn btn-ghost btnSelecionar" data-id="${candidatura.id}" title="Selecionar Freela"><i class="bi bi-check-circle-fill" style="color: var(--success);"></i></button>` : ''}
                        ${podeAgir ? `<button class="btn btn-ghost btnRejeitar" data-id="${candidatura.id}" title="Rejeitar"><i class="bi bi-x-circle-fill" style="color: var(--danger);"></i></button>` : ''}
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        ativarBotoesAcao();
    }

    // ── 4. Rejeitar candidatura (PATCH real na API) ──
    function ativarBotoesAcao() {
        tbody.querySelectorAll('.btnRejeitar').forEach(botao => {
            botao.addEventListener('click', async function () {
                const candidaturaId = this.getAttribute('data-id');
                const sucesso = await atualizarStatusCandidatura(candidaturaId, 'Rejeitado');
                if (!sucesso) return;

                const statusBadge = document.getElementById(`status-${candidaturaId}`);
                if (statusBadge) {
                    statusBadge.className = `badge ${classeBadgeStatus('Rejeitado')}`;
                    statusBadge.textContent = 'Rejeitado';
                }
                const linha = document.getElementById(`candidato-${candidaturaId}`);
                const btnSelecionar = linha ? linha.querySelector('.btnSelecionar') : null;
                this.remove();
                if (btnSelecionar) btnSelecionar.remove();
            });
        });

        tbody.querySelectorAll('.btnSelecionar').forEach(botao => {
            botao.addEventListener('click', function () {
                candidaturaSelecionadaId = this.getAttribute('data-id');
                modalSelecionar.style.display = 'flex';
            });
        });
    }

    // Garante que exista uma conversa de chat entre o freelancer e a empresa
    // quando um match acontece (candidatura aprovada). O chat só deve ficar
    // disponível entre as partes depois disso — ver js/11-chat.js.
    async function garantirConversaDoMatch(freelancerId, freelancerNome, empresaId, empresaNome) {
        if (!freelancerId || !empresaId) return;

        try {
            const res = await fetch(`${API_BASE}/conversas`);
            if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
            const todasConversas = await res.json();

            const alvo = [String(freelancerId), String(empresaId)].sort();
            const jaExiste = todasConversas.some(function (c) {
                const par = [String(c.participanteAId), String(c.participanteBId)].sort();
                return par[0] === alvo[0] && par[1] === alvo[1];
            });

            if (jaExiste) return;

            await fetch(`${API_BASE}/conversas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    participanteAId: freelancerId,
                    participanteANome: freelancerNome,
                    participanteATipo: 'freelancers',
                    participanteBId: empresaId,
                    participanteBNome: empresaNome,
                    participanteBTipo: 'empresas',
                    ultimaMensagem: '',
                    ultimaAtualizacao: new Date().toISOString()
                })
            });
        } catch (erro) {
            // Não bloqueia o fluxo de aprovação/criação de OS por causa disso —
            // só registra o erro; o chat pode ser reconciliado depois.
            console.error('Erro ao garantir conversa do match:', erro);
        }
    }

    async function atualizarStatusCandidatura(candidaturaId, novoStatus) {
        try {
            const res = await fetch(`${API_BASE}/candidaturas/${candidaturaId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: novoStatus })
            });
            if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
            return true;
        } catch (erro) {
            console.error('Erro ao atualizar candidatura:', erro);
            mostrarMensagem('Não foi possível atualizar a candidatura. Verifique se o json-server está rodando.', 'error');
            return false;
        }
    }

    if (btnCancelarSelecao) {
        btnCancelarSelecao.addEventListener('click', function () {
            modalSelecionar.style.display = 'none';
            candidaturaSelecionadaId = null;
        });
    }

    // ── 5. Confirmar contratação: aprova a candidatura, rejeita as demais e cria a OS ──
    if (btnConfirmarSelecao) {
        btnConfirmarSelecao.addEventListener('click', async function () {
            modalSelecionar.style.display = 'none';
            if (!candidaturaSelecionadaId) return;

            const linhaCandidato = document.getElementById(`candidato-${candidaturaSelecionadaId}`);
            const nomeCandidato = linhaCandidato ? linhaCandidato.querySelector('strong').textContent.trim() : 'Freelancer';
            const freelancerId = linhaCandidato ? linhaCandidato.dataset.freelancerId : null;

            const aprovou = await atualizarStatusCandidatura(candidaturaSelecionadaId, 'Selecionado');
            if (!aprovou) return;

            // Match feito: garante a conversa de chat entre freelancer e empresa.
            await garantirConversaDoMatch(freelancerId, nomeCandidato, sessao.id, sessao.nome);

            // A vaga foi preenchida — encerra para não continuar aparecendo como
            // "Aberta" no mural nem receber novas candidaturas ou um segundo match.
            try {
                await fetch(`${API_BASE}/vagas/${vagaAtual.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'Encerrada' })
                });
                vagaAtual.status = 'Encerrada';
            } catch (erro) {
                console.error('Erro ao encerrar a vaga após o match:', erro);
            }

            // Rejeita automaticamente os demais candidatos "Em análise" desta vaga
            const outrasLinhas = Array.from(tbody.querySelectorAll('tr[data-candidatura-id]'))
                .filter(tr => tr.dataset.candidaturaId !== candidaturaSelecionadaId);

            await Promise.all(outrasLinhas.map(tr => {
                const statusBadge = document.getElementById(`status-${tr.dataset.candidaturaId}`);
                if (statusBadge && statusBadge.textContent.trim() === 'Em análise') {
                    return atualizarStatusCandidatura(tr.dataset.candidaturaId, 'Rejeitado');
                }
                return Promise.resolve(true);
            }));

            const novaOS = {
                titulo: vagaAtual.titulo,
                categoria: vagaAtual.especialidade || 'A definir',
                modalidade: vagaAtual.modalidade || 'Presencial',
                empresaId: sessao.id,
                empresaNome: sessao.nome,
                freelancerId: freelancerId,
                freelancerNome: nomeCandidato,
                cidade: '',
                estado: '',
                valor: vagaAtual.valor || '',
                descricao: `Ordem de serviço gerada a partir da candidatura de ${nomeCandidato} para a vaga "${vagaAtual.titulo}".`,
                requisitos: '',
                habilidades: [],
                status: 'Em andamento',
                dataPublicacao: new Date().toISOString(),
                prazo: vagaAtual.prazo || '',
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

            try {
                const res = await fetch(`${API_BASE}/ordensServico`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(novaOS)
                });
                if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);

                const criada = await res.json();

                mostrarMensagem('Candidato selecionado! Uma Ordem de Serviço foi gerada.', 'success');

                setTimeout(() => {
                    window.location.href = `/pages/19-ordem-servico-detalhe.html?id=${criada.id}`;
                }, 2000);
            } catch (erro) {
                console.error('Erro ao criar Ordem de Serviço:', erro);
                mostrarMensagem('A candidatura foi aprovada, mas não foi possível gerar a Ordem de Serviço automaticamente. Verifique se o json-server está rodando.', 'error');
                carregarCandidatos();
            }
        });
    }

    carregarCandidatos();
});
