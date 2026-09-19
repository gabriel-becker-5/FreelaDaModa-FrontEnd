document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    // ── 2. Menu Lateral no Celular (Hambúrguer) ──
    const sidebarToggleBtn = document.querySelector('.sidebar-toggle-btn');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.querySelector('.sidebar-overlay');

    if (sidebarToggleBtn && sidebar && sidebarOverlay) {
        sidebarToggleBtn.addEventListener('click', function () {
            const abrindo = !sidebar.classList.contains('open');
            sidebar.classList.toggle('open', abrindo);
            sidebarOverlay.classList.toggle('open', abrindo);
            sidebarToggleBtn.setAttribute('aria-expanded', String(abrindo));
        });
        sidebarOverlay.addEventListener('click', function () {
            sidebar.classList.remove('open');
            sidebarOverlay.classList.remove('open');
            sidebarToggleBtn.setAttribute('aria-expanded', 'false');
        });
    }

    // ── Proteção de rota (só empresa logada) ──
    const sessao = JSON.parse(sessionStorage.getItem('usuarioLogado') || 'null');
    if (!sessao || sessao.tipo !== 'empresas') {
        window.location.href = '/pages/02-login.html';
        return;
    }

    // ── 3. Carregar a Ordem de Serviço ──
    const params = new URLSearchParams(window.location.search);
    const idOS = params.get('id');

    if (!idOS) {
        window.location.href = '/pages/16-ordens-servico.html';
        return;
    }

    function mostrarMensagem(texto, tipo) {
        const el = document.getElementById('mensagemStatus');
        if (!el) return;
        el.className = `alert alert-${tipo}`;
        el.innerHTML = `<i class="bi ${tipo === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'}"></i> ${texto}`;
        el.hidden = false;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function formatarDataHora(iso) {
        if (!iso) return '—';
        const data = new Date(iso);
        if (isNaN(data)) return iso;
        return data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    function formatarData(str) {
        if (!str) return '—';
        const data = new Date(str + 'T00:00:00');
        return isNaN(data) ? str : data.toLocaleDateString('pt-BR');
    }

    function classeBadgeStatus(status) {
        if (status === 'Concluída') return 'badge-success';
        if (status === 'Cancelada') return 'badge-danger';
        return 'badge-warning';
    }

    function escapeHtml(str) {
        return String(str ?? '').replace(/[&<>"']/g, function (ch) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
        });
    }

    // Renderiza o anexo de uma OS (briefing/entrega). Aceita tanto o formato
    // novo, gravado pelo upload real ({ nome, tipo, tamanho, dados }, "dados"
    // em base64), quanto o formato legado (apenas um nome de arquivo em texto).
    function renderizarAnexo(elementoId, valor) {
        const el = document.getElementById(elementoId);
        if (!el) return;

        if (!valor) {
            el.textContent = 'Nenhum arquivo anexado.';
            return;
        }

        if (typeof valor === 'object' && valor.nome) {
            const tamanho = typeof valor.tamanho === 'number'
                ? ` (${(valor.tamanho / 1024 / 1024).toFixed(1)} MB)`
                : '';
            const ehImagem = valor.tipo && valor.tipo.startsWith('image/') && valor.dados;
            el.innerHTML = `
                <div style="display:flex; align-items:center; gap:10px;">
                    ${ehImagem ? `<img src="${valor.dados}" alt="${escapeHtml(valor.nome)}" style="width:56px; height:56px; object-fit:cover; border-radius:8px; border:1px solid var(--border);">` : '<i class="bi bi-file-earmark-image" style="font-size:24px;"></i>'}
                    <div>
                        <div>${escapeHtml(valor.nome)}${tamanho}</div>
                        ${valor.dados ? `<a href="${valor.dados}" download="${escapeHtml(valor.nome)}" style="font-size:12px;">Baixar arquivo</a>` : ''}
                    </div>
                </div>
            `;
            return;
        }

        // Formato legado: apenas o nome do arquivo, sem dados reais para exibir/baixar.
        el.textContent = String(valor);
    }

    let osAtual = null;
    let acessoNegado = false;

    function renderizarOS(os) {
        osAtual = os;

        document.getElementById('os-titulo').textContent = os.titulo;
        document.getElementById('os-id-display').textContent = `OS-${os.id}`;
        document.getElementById('os-categoria-display').textContent = os.categoria || '—';
        document.getElementById('os-modalidade-display').textContent = os.modalidade || '—';
        document.getElementById('os-empresa-display').textContent = os.empresaNome || '—';
        document.getElementById('os-local-display').textContent = [os.cidade, os.estado].filter(Boolean).join(' - ') || '—';
        document.getElementById('os-data-display').textContent = formatarDataHora(os.dataPublicacao);
        document.getElementById('os-valor-display').textContent = os.valor ? `R$ ${os.valor}` : '—';
        document.getElementById('os-descricao-display').textContent = os.descricao || '—';
        document.getElementById('os-requisitos-display').textContent = os.requisitos || '—';

        const habilidadesEl = document.getElementById('os-habilidades-display');
        habilidadesEl.innerHTML = (os.habilidades && os.habilidades.length)
            ? os.habilidades.map(function (h) { return `<span class="badge">${escapeHtml(h)}</span>`; }).join('')
            : '<span class="text-muted">Nenhuma habilidade cadastrada.</span>';

        const badgeStatus = document.getElementById('os-status-badge');
        badgeStatus.className = `badge ${classeBadgeStatus(os.status)}`;
        badgeStatus.textContent = os.status;

        // "Finalizar" só faz sentido enquanto a OS está em andamento — uma OS
        // já concluída ou cancelada não deve poder ser "finalizada" de novo.
        const btnFinalizarOS = document.getElementById('btn-finalizar-os');
        if (btnFinalizarOS) btnFinalizarOS.hidden = os.status !== 'Em andamento';

        document.getElementById('os-freelancer-display').textContent = os.freelancerNome || '—';
        document.getElementById('os-prazo-display').textContent = formatarData(os.prazo);
        document.getElementById('os-previsao-display').textContent = formatarData(os.previsaoConclusao);
        document.getElementById('os-avaliacao-freela-display').textContent = os.avaliacaoFreelancer || 'Pendente';
        document.getElementById('os-avaliacao-conf-display').textContent = os.avaliacaoConfeccao || 'Pendente';
        document.getElementById('os-observacoes-display').textContent = os.observacoes || '—';
        renderizarAnexo('os-briefing-display', os.referenciaBriefing);
        renderizarAnexo('os-entrega-display', os.referenciaEntrega);

        const timeline = document.getElementById('os-timeline');
        timeline.innerHTML = (os.historico && os.historico.length)
            ? os.historico.map(function (item) {
                return `<div class="timeline-item">${formatarData(item.data)} - ${escapeHtml(item.evento)}</div>`;
            }).join('')
            : '<div class="timeline-item">Nenhum evento registrado.</div>';

        const linkEditar = document.getElementById('os-link-editar');
        if (linkEditar) linkEditar.href = `/pages/14-editar-os.html?id=${os.id}`;
    }

    async function carregarOS() {
        try {
            const res = await fetch(`${API_BASE}/ordensServico/${idOS}`);
            if (!res.ok) throw new Error(`OS não encontrada (HTTP ${res.status}).`);
            const os = await res.json();

            if (String(os.empresaId) !== String(sessao.id)) {
                acessoNegado = true;
                mostrarMensagem('Esta Ordem de Serviço não pertence à sua empresa.', 'error');
                const btnFinalizarOS = document.getElementById('btn-finalizar-os');
                const linkEditarOS = document.getElementById('os-link-editar');
                if (btnFinalizarOS) btnFinalizarOS.hidden = true;
                if (linkEditarOS) linkEditarOS.hidden = true;
                return;
            }

            renderizarOS(os);
        } catch (erro) {
            console.error('Erro ao carregar Ordem de Serviço:', erro);
        }
    }

    carregarOS();

    // ── 4. Finalizar Ordem de Serviço ──
    const btnFinalizar = document.getElementById('btn-finalizar-os');

    if (btnFinalizar) {
        btnFinalizar.addEventListener('click', async function () {
            if (!osAtual) return;
            if (!confirm('Confirmar a finalização desta Ordem de Serviço?')) return;

            const textoOriginal = btnFinalizar.innerHTML;
            btnFinalizar.disabled = true;
            btnFinalizar.innerHTML = '<span class="spinner"></span> Finalizando...';

            try {
                const novoHistorico = (osAtual.historico || []).concat([
                    { data: new Date().toISOString().slice(0, 10), evento: 'OS finalizada pela empresa.' }
                ]);

                const res = await fetch(`${API_BASE}/ordensServico/${osAtual.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'Concluída', historico: novoHistorico })
                });
                if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);

                const badgeStatus = document.getElementById('os-status-badge');
                badgeStatus.className = 'badge badge-success';
                badgeStatus.textContent = 'Concluída';

                setTimeout(function () {
                    window.location.href = `/pages/23-avaliacao-os.html?id=${osAtual.id}`;
                }, 800);
            } catch (erro) {
                console.error('Erro ao finalizar Ordem de Serviço:', erro);
                btnFinalizar.disabled = false;
                btnFinalizar.innerHTML = textoOriginal;
                mostrarMensagem('Não foi possível finalizar a OS. Verifique se o json-server está rodando.', 'error');
            }
        });
    }
});
