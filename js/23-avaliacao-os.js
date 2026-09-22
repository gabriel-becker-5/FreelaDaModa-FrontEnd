document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    // ── Sessão: empresa ou freelancer logado ──
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

    // ── Carregar Resumo da Ordem de Serviço ──
    const params = new URLSearchParams(window.location.search);
    const idOS = params.get('id');

    if (!idOS) {
        window.location.href = sessao.tipo === 'empresas' ? '/pages/16-ordens-servico.html' : '/pages/29-minhas-os.html';
        return;
    }

    let osAtual = null;
    // Quem avalia quem:
    //  - empresa logada -> avalia o freelancer (alvo: freelancerId)
    //  - freelancer logado -> avalia a empresa (alvo: empresaId)
    let alvoTipo = null;   // 'freelancers' | 'empresas'
    let alvoId = null;
    let autorAvaliacao = '';

    const avisoNaoConcluida = document.getElementById('avisoNaoConcluida');
    const avisoSemAcesso = document.getElementById('avisoSemAcesso');
    const avisoJaAvaliado = document.getElementById('avisoJaAvaliado');
    const formAvaliacao = document.getElementById('formAvaliacao');
    const avaliadoAlvo = document.getElementById('avaliado-alvo');
    const linkVoltarRodape = document.getElementById('link-voltar-rodape');

    function atualizarLinksVoltar() {
        const destino = osAtual ? `/pages/19-ordem-servico-detalhe.html?id=${osAtual.id}` : '/pages/19-ordem-servico-detalhe.html';
        if (linkVoltarRodape) linkVoltarRodape.href = destino;
    }

    async function carregarResumo() {
        try {
            const res = await fetch(`${API_BASE}/ordensServico/${idOS}`);
            if (!res.ok) throw new Error(`OS não encontrada (HTTP ${res.status}).`);
            const os = await res.json();

            osAtual = os;
            document.getElementById('resumo-projeto').textContent = os.titulo;
            const resumoEmpresa = document.getElementById('resumo-empresa');
            resumoEmpresa.textContent = '';
            if (os.empresaId) {
                const linkEmpresa = document.createElement('a');
                linkEmpresa.href = `/pages/26-perfil-empresa-publico.html?id=${encodeURIComponent(os.empresaId)}`;
                linkEmpresa.textContent = os.empresaNome || '—';
                resumoEmpresa.appendChild(linkEmpresa);
            } else {
                resumoEmpresa.textContent = os.empresaNome || '—';
            }
            const resumoFreelancer = document.getElementById('resumo-freelancer');
            resumoFreelancer.textContent = '';
            if (os.freelancerId) {
                const linkFreelancer = document.createElement('a');
                linkFreelancer.href = `/pages/25-perfil-freelancer-publico.html?id=${encodeURIComponent(os.freelancerId)}`;
                linkFreelancer.textContent = os.freelancerNome || '—';
                resumoFreelancer.appendChild(linkFreelancer);
            } else {
                resumoFreelancer.textContent = os.freelancerNome || '—';
            }
            document.getElementById('resumo-status').textContent = os.status;
            atualizarLinksVoltar();

            // Define o papel de quem está logado
            const ehEmpresaDona = sessao.tipo === 'empresas' && String(os.empresaId) === String(sessao.id);
            const ehFreelancerDono = sessao.tipo === 'freelancers' && String(os.freelancerId) === String(sessao.id);

            if (ehEmpresaDona) {
                alvoTipo = 'freelancers';
                alvoId = os.freelancerId;
                autorAvaliacao = sessao.nome;
                if (avaliadoAlvo) avaliadoAlvo.textContent = os.freelancerNome || 'o freelancer';
            } else if (ehFreelancerDono) {
                alvoTipo = 'empresas';
                alvoId = os.empresaId;
                autorAvaliacao = sessao.nome;
                if (avaliadoAlvo) avaliadoAlvo.textContent = os.empresaNome || 'a confecção';
            } else {
                avisoSemAcesso.hidden = false;
                return;
            }

            // Só avalia depois de concluída e se ainda não avaliou
            const jaAvaliou = ehEmpresaDona
                ? os.avaliacaoConfeccao === 'Avaliado'
                : os.avaliacaoFreelancer === 'Avaliado';

            const podeAvaliar = os.status === 'Concluída' && !jaAvaliou;

            avisoNaoConcluida.hidden = os.status === 'Concluída';
            avisoJaAvaliado.hidden = !(os.status === 'Concluída' && jaAvaliou);
            formAvaliacao.hidden = !podeAvaliar;
        } catch (erro) {
            console.error('Erro ao carregar resumo da OS:', erro);
            avisoSemAcesso.textContent = 'Não foi possível carregar a Ordem de Serviço. Tente novamente.';
            avisoSemAcesso.hidden = false;
        }
    }

    carregarResumo();

    // ── Formulário de Avaliação (dois sentidos) ──
    const textareaComentario = document.getElementById('comentario');
    const alertaAvaliacao = document.getElementById('alerta-avaliacao');

    function mostrarMensagem(texto, tipo) {
        if (!alertaAvaliacao) return;
        alertaAvaliacao.className = `alert mb-md alert-${tipo}`;
        alertaAvaliacao.textContent = texto;
        alertaAvaliacao.hidden = false;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function notaSelecionada() {
        const radioMarcado = formAvaliacao.querySelector('input[name="nota"]:checked');
        return radioMarcado ? Number(radioMarcado.value) : null;
    }

    // Recalcula a média do perfil avaliado (freelancer ou empresa)
    async function atualizarMediaDoAlvo() {
        const res = await fetch(`${API_BASE}/avaliacoes?${alvoTipo === 'freelancers' ? 'freelancerId' : 'empresaId'}=${alvoId}`);
        if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
        const avaliacoes = await res.json();

        const total = avaliacoes.length;
        const soma = avaliacoes.reduce(function (soma, a) { return soma + (Number(a.nota) || 0); }, 0);
        const media = total > 0 ? soma / total : 0;

        const patchRes = await fetch(`${API_BASE}/${alvoTipo}/${alvoId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mediaAvaliacoes: media, totalAvaliacoes: total })
        });
        if (!patchRes.ok) throw new Error(`Erro HTTP: ${patchRes.status}`);
    }

    if (formAvaliacao) {
        formAvaliacao.addEventListener('submit', async function (e) {
            e.preventDefault();

            let valido = true;

            if (notaSelecionada() === null) valido = false;

            const comentarioVazio = textareaComentario.value.trim().length === 0;
            textareaComentario.classList.toggle('input-error', comentarioVazio);
            if (comentarioVazio) valido = false;

            if (!valido) return;

            const btnEnviar = formAvaliacao.querySelector('button[type="submit"]');
            const textoOriginal = btnEnviar.innerHTML;
            btnEnviar.disabled = true;
            btnEnviar.innerHTML = '<span class="spinner"></span> Enviando...';

            try {
                const payloadAvaliacao = {
                    nota: notaSelecionada(),
                    comentario: textareaComentario.value.trim(),
                    autor: autorAvaliacao,
                    criadoEm: new Date().toISOString()
                };
                if (alvoTipo === 'freelancers') {
                    payloadAvaliacao.freelancerId = alvoId;
                } else {
                    payloadAvaliacao.empresaId = alvoId;
                }

                const resAvaliacao = await fetch(`${API_BASE}/avaliacoes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payloadAvaliacao)
                });
                if (!resAvaliacao.ok) throw new Error(`Erro HTTP: ${resAvaliacao.status}`);

                // Marca na OS que este lado já avaliou
                const campoOS = alvoTipo === 'freelancers' ? 'avaliacaoConfeccao' : 'avaliacaoFreelancer';
                const resOS = await fetch(`${API_BASE}/ordensServico/${osAtual.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ [campoOS]: 'Avaliado' })
                });
                if (!resOS.ok) throw new Error(`Erro HTTP: ${resOS.status}`);

                // Atualiza a média no perfil do avaliado
                await atualizarMediaDoAlvo();

                // Avisa a parte avaliada sobre a nova avaliação.
                const linkAvaliado = alvoTipo === 'freelancers'
                    ? `/pages/25-perfil-freelancer-publico.html?id=${encodeURIComponent(alvoId)}`
                    : `/pages/26-perfil-empresa-publico.html?id=${encodeURIComponent(alvoId)}`;
                criarNotificacao({
                    usuarioId: alvoId,
                    usuarioTipo: alvoTipo,
                    tipo: 'avaliacao',
                    titulo: 'Nova avaliação recebida',
                    mensagem: `${autorAvaliacao} avaliou você com nota ${notaSelecionada()} de 5.`,
                    link: linkAvaliado
                });

                mostrarMensagem(`Avaliação enviada! Nota ${notaSelecionada()} de 5.`, 'success');

                setTimeout(function () {
                    window.location.href = `/pages/19-ordem-servico-detalhe.html?id=${osAtual.id}`;
                }, 1500);
            } catch (erro) {
                console.error('Erro ao enviar avaliação:', erro);
                btnEnviar.disabled = false;
                btnEnviar.innerHTML = textoOriginal;
                mostrarMensagem('Não foi possível enviar a avaliação. Tente novamente.', 'error');
            }
        });
    }
});
