document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    // ── Sessão: empresa OU freelancer logado pode ver a OS (cada um só a sua) ──
    const sessao = exigirLogin();
    if (!sessao) return;

    renderizarSidebar(document.querySelector('.sidebar'), sessao.tipo, sessao.tipo === 'empresas' ? '16-ordens-servico' : '29-minhas-os');
    renderizarTopbar(document.querySelector('#header-acoes'), sessao);
    renderizarBannerValidacao(document.querySelector('.main'), sessao);

    // ── Menu Lateral no Celular (Hambúrguer) ──
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

    // ── Carregar a Ordem de Serviço ──
    const params = new URLSearchParams(window.location.search);
    const idOS = params.get('id');

    if (!idOS) {
        window.location.href = sessao.tipo === 'empresas' ? '/pages/16-ordens-servico.html' : '/pages/29-minhas-os.html';
        return;
    }

    function mostrarMensagem(texto, tipo) {
        const el = document.getElementById('mensagemStatus');
        if (!el) return;
        el.className = `alert alert-${tipo}`;
        el.innerHTML = `<i class="bi ${tipo === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'}"></i> ${escapeHtml(texto)}`;
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

    // Renderiza o anexo de uma OS. Só exibe imagem/baixar quando "dados" é um
    // data URI válido de imagem (evita injetar conteúdo arbitrário no HTML).
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
            const dados = typeof valor.dados === 'string' ? valor.dados : '';
            const ehImagem = valor.tipo && valor.tipo.startsWith('image/') && dados.startsWith('data:image/');

            el.innerHTML = '';
            const linha = document.createElement('div');
            linha.style.cssText = 'display:flex; align-items:center; gap:10px;';

            if (ehImagem) {
                const img = document.createElement('img');
                img.src = dados;
                img.alt = valor.nome;
                img.style.cssText = 'width:56px; height:56px; object-fit:cover; border-radius:8px; border:1px solid var(--border);';
                linha.appendChild(img);
            } else {
                const icone = document.createElement('i');
                icone.className = 'bi bi-file-earmark-image';
                icone.style.fontSize = '24px';
                linha.appendChild(icone);
            }

            const infos = document.createElement('div');
            const nomeArquivo = document.createElement('div');
            nomeArquivo.textContent = `${valor.nome}${tamanho}`;
            infos.appendChild(nomeArquivo);

            if (ehImagem) {
                const linkBaixar = document.createElement('a');
                linkBaixar.href = dados;
                linkBaixar.download = valor.nome;
                linkBaixar.style.fontSize = '12px';
                linkBaixar.textContent = 'Baixar arquivo';
                infos.appendChild(linkBaixar);
            }

            linha.appendChild(infos);
            el.appendChild(linha);
            return;
        }

        // Formato legado: apenas o nome do arquivo.
        el.textContent = String(valor);
    }

    let osAtual = null;

    function renderizarOS(os) {
        osAtual = os;

        document.getElementById('os-titulo').textContent = os.titulo;
        document.getElementById('os-id-display').textContent = `OS-${os.id}`;
        document.getElementById('os-categoria-display').textContent = os.categoria || '—';
        document.getElementById('os-modalidade-display').textContent = os.modalidade || '—';
        document.getElementById('os-empresa-display').textContent = os.empresaNome || '—';
        document.getElementById('os-local-display').textContent = [os.cidade, os.estado].filter(Boolean).join(' - ') || '—';
        document.getElementById('os-data-display').textContent = formatarDataHora(os.dataPublicacao);
        document.getElementById('os-valor-display').textContent = os.valor || '—';
        document.getElementById('os-descricao-display').textContent = os.descricao || '—';
        document.getElementById('os-requisitos-display').textContent = os.requisitos || '—';

        const habilidadesEl = document.getElementById('os-habilidades-display');
        habilidadesEl.innerHTML = (os.habilidades && os.habilidades.length)
            ? os.habilidades.map(function (h) { return `<span class="badge">${escapeHtml(h)}</span>`; }).join('')
            : '<span class="text-muted">Nenhuma habilidade cadastrada.</span>';

        const badgeStatus = document.getElementById('os-status-badge');
        badgeStatus.className = `badge ${classeBadgeStatus(os.status)}`;
        badgeStatus.textContent = os.status;

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

        // Ações conforme o papel de quem está logado
        const ehEmpresaDona = sessao.tipo === 'empresas' && String(os.empresaId) === String(sessao.id);
        const ehFreelancerDono = sessao.tipo === 'freelancers' && String(os.freelancerId) === String(sessao.id);

        const linkEditar = document.getElementById('os-link-editar');
        const btnFinalizar = document.getElementById('btn-finalizar-os');
        const linkAvaliar = document.getElementById('os-link-avaliar');

        if (linkEditar) linkEditar.hidden = !ehEmpresaDona;
        if (linkEditar) linkEditar.href = `/pages/14-editar-os.html?id=${os.id}`;

        if (btnFinalizar) btnFinalizar.hidden = !(ehEmpresaDona && os.status === 'Em andamento');

        if (linkAvaliar) {
            const podeAvaliar = ehFreelancerDono && os.status === 'Concluída' && os.avaliacaoFreelancer !== 'Avaliado';
            linkAvaliar.hidden = !podeAvaliar;
            linkAvaliar.href = `/pages/23-avaliacao-os.html?id=${os.id}`;
        }
    }

    async function carregarOS() {
        try {
            const res = await fetch(`${API_BASE}/ordensServico/${idOS}`);
            if (!res.ok) throw new Error(`OS não encontrada (HTTP ${res.status}).`);
            const os = await res.json();

            const ehEmpresaDona = sessao.tipo === 'empresas' && String(os.empresaId) === String(sessao.id);
            const ehFreelancerDono = sessao.tipo === 'freelancers' && String(os.freelancerId) === String(sessao.id);

            if (!ehEmpresaDona && !ehFreelancerDono) {
                mostrarMensagem('Esta Ordem de Serviço não está vinculada à sua conta.', 'error');
                return;
            }

            renderizarOS(os);
        } catch (erro) {
            console.error('Erro ao carregar Ordem de Serviço:', erro);
            mostrarMensagem('Não foi possível carregar a Ordem de Serviço. Tente novamente.', 'error');
        }
    }

    carregarOS();

    // ── Finalizar Ordem de Serviço (empresa) ──
    const btnFinalizar = document.getElementById('btn-finalizar-os');

    if (btnFinalizar) {
        btnFinalizar.addEventListener('click', async function () {
            if (!osAtual) return;

            const confirmou = await modalConfirmar({
                titulo: 'Finalizar Ordem de Serviço',
                mensagem: 'Confirmar a finalização desta Ordem de Serviço?',
                textoConfirmar: 'Finalizar',
                textoCancelar: 'Cancelar'
            });
            if (!confirmou) return;

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
                btnFinalizar.hidden = true;

                setTimeout(function () {
                    window.location.href = `/pages/23-avaliacao-os.html?id=${osAtual.id}`;
                }, 800);
            } catch (erro) {
                console.error('Erro ao finalizar Ordem de Serviço:', erro);
                btnFinalizar.disabled = false;
                btnFinalizar.innerHTML = textoOriginal;
                mostrarMensagem('Não foi possível finalizar a OS. Tente novamente.', 'error');
            }
        });
    }
});
