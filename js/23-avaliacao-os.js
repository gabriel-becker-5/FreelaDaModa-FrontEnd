document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    const API_BASE = 'http://localhost:3000';

    // ── 1. Alternador de Tema Claro / Escuro ──
    const themeToggle = document.querySelector('.theme-toggle');
    const htmlElement = document.documentElement;

    if (themeToggle) {
        themeToggle.addEventListener('click', function () {
            const atual = htmlElement.getAttribute('data-theme');
            htmlElement.setAttribute('data-theme', atual === 'dark' ? 'light' : 'dark');
        });
    }

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

    // ── 3. Carregar Resumo da Ordem de Serviço ──
    const params = new URLSearchParams(window.location.search);
    const idOS = params.get('id');

    let osAtual = null;

    function atualizarLinksVoltar() {
        const destino = osAtual ? `/pages/19-ordem-servico-detalhe.html?id=${osAtual.id}` : '/pages/19-ordem-servico-detalhe.html';
        const linkTopo = document.getElementById('link-voltar-topo');
        const linkRodape = document.getElementById('link-voltar-rodape');
        if (linkTopo) linkTopo.href = destino;
        if (linkRodape) linkRodape.href = destino;
    }

    async function carregarResumo() {
        try {
            let os;
            if (idOS) {
                const res = await fetch(`${API_BASE}/ordensServico/${idOS}`);
                if (!res.ok) throw new Error('OS não encontrada.');
                os = await res.json();
            } else {
                const res = await fetch(`${API_BASE}/ordensServico`);
                if (!res.ok) throw new Error('Falha ao carregar ordens de serviço.');
                const todas = await res.json();
                os = todas[0];
            }
            if (!os) return;

            osAtual = os;
            document.getElementById('resumo-projeto').textContent = os.titulo;
            document.getElementById('resumo-empresa').textContent = os.empresaNome || '—';
            document.getElementById('resumo-freelancer').textContent = os.freelancerNome || '—';
            document.getElementById('resumo-status').textContent = os.status;
            atualizarLinksVoltar();
        } catch (erro) {
            console.error('Erro ao carregar resumo da OS:', erro);
        }
    }

    carregarResumo();

    // ── 4. Formulário de Avaliação ──
    // grava em "avaliacoes" (mesma coleção dos perfis públicos)
    const form = document.querySelector('form.card');
    const textareaComentario = document.getElementById('comentario');
    const alertaSucesso = form ? form.querySelector('.alert-success') : null;

    if (form) {
        if (alertaSucesso) alertaSucesso.hidden = true;

        function notaSelecionada() {
            const radioMarcado = form.querySelector('input[name="nota"]:checked');
            return radioMarcado ? Number(radioMarcado.value) : null;
        }

        form.addEventListener('submit', async function (e) {
            e.preventDefault();

            let valido = true;

            if (notaSelecionada() === null) valido = false;

            const comentarioVazio = textareaComentario.value.trim().length === 0;
            textareaComentario.classList.toggle('input-error', comentarioVazio);
            if (comentarioVazio) valido = false;

            if (!valido) return;

            const btnEnviar = form.querySelector('button[type="submit"]');
            const textoOriginal = btnEnviar.innerHTML;
            btnEnviar.disabled = true;
            btnEnviar.innerHTML = '<span class="spinner"></span> Enviando...';

            try {
                // assume que quem avalia aqui é sempre a empresa
                await fetch(`${API_BASE}/avaliacoes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        freelancerId: osAtual ? osAtual.freelancerId : null,
                        nota: notaSelecionada(),
                        comentario: textareaComentario.value.trim(),
                        autor: osAtual ? osAtual.empresaNome : 'Empresa'
                    })
                });

                if (osAtual) {
                    await fetch(`${API_BASE}/ordensServico/${osAtual.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ avaliacaoConfeccao: 'Avaliado' })
                    });
                }

                if (alertaSucesso) {
                    alertaSucesso.textContent = `Avaliação enviada! Nota ${notaSelecionada()} de 5.`;
                    alertaSucesso.hidden = false;
                }
                window.scrollTo({ top: 0, behavior: 'smooth' });

                setTimeout(function () {
                    window.location.href = osAtual
                        ? `/pages/19-ordem-servico-detalhe.html?id=${osAtual.id}`
                        : '/pages/19-ordem-servico-detalhe.html';
                }, 1500);
            } catch (erro) {
                console.error('Erro ao enviar avaliação:', erro);
                btnEnviar.disabled = false;
                btnEnviar.innerHTML = textoOriginal;
                alert('Não foi possível enviar a avaliação. Verifique se o json-server está rodando.');
            }
        });
    }
});
