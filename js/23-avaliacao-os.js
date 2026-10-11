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
    const idNumerico = Number(idOS);

    if (!idOS || !Number.isSafeInteger(idNumerico) || idNumerico <= 0) {
        window.location.href = sessao.tipo === 'empresas' ? '/pages/16-ordens-servico.html' : '/pages/29-minhas-os.html';
        return;
    }

    let osAtual = null;
    let podeAvaliar = false;
    let enviando = false;

    const avisoNaoConcluida = document.getElementById('avisoNaoConcluida');
    const avisoSemAcesso = document.getElementById('avisoSemAcesso');
    const avisoJaAvaliado = document.getElementById('avisoJaAvaliado');
    const formAvaliacao = document.getElementById('formAvaliacao');
    const avaliadoAlvo = document.getElementById('avaliado-alvo');
    const linkVoltarRodape = document.getElementById('link-voltar-rodape');

    function atualizarLinksVoltar() {
        const destino = osAtual ? `/pages/19-ordem-servico-detalhe.html?id=${encodeURIComponent(osAtual.id)}` : '/pages/19-ordem-servico-detalhe.html';
        if (linkVoltarRodape) linkVoltarRodape.href = destino;
    }

    async function nomeDePerfil(tipo, userId) {
        const caminho = tipo === 'empresas'
            ? `/Company/exibirPerfilPublicoEmpresa?userId=${encodeURIComponent(userId)}`
            : `/Freelancer/exibirPerfilPublicoFreelancer?userId=${encodeURIComponent(userId)}`;
        try {
            const perfil = await api(caminho, { semRedirect: true });
            const nome = perfil && (tipo === 'empresas' ? perfil.companyName : perfil.legalResponsibleFullName);
            return typeof nome === 'string' && nome.trim() ? nome.trim() : '—';
        } catch (erro) {
            return '—';
        }
    }

    async function preencherParticipantes(os) {
        const [nomeEmpresa, nomeFreelancer] = await Promise.all([
            os.userId ? nomeDePerfil('empresas', os.userId) : '—',
            os.freelancerId ? nomeDePerfil('freelancers', os.freelancerId) : '—'
        ]);

        const resumoEmpresa = document.getElementById('resumo-empresa');
        resumoEmpresa.textContent = '';
        if (os.userId) {
            const linkEmpresa = document.createElement('a');
            linkEmpresa.href = `/pages/26-perfil-empresa-publico.html?id=${encodeURIComponent(os.userId)}`;
            linkEmpresa.textContent = nomeEmpresa;
            resumoEmpresa.appendChild(linkEmpresa);
        } else {
            resumoEmpresa.textContent = nomeEmpresa;
        }

        const resumoFreelancer = document.getElementById('resumo-freelancer');
        resumoFreelancer.textContent = '';
        if (os.freelancerId) {
            const linkFreelancer = document.createElement('a');
            linkFreelancer.href = `/pages/25-perfil-freelancer-publico.html?id=${encodeURIComponent(os.freelancerId)}`;
            linkFreelancer.textContent = nomeFreelancer;
            resumoFreelancer.appendChild(linkFreelancer);
        } else {
            resumoFreelancer.textContent = nomeFreelancer;
        }

        if (avaliadoAlvo) {
            avaliadoAlvo.textContent = sessao.tipo === 'empresas'
                ? `o freelancer ${nomeFreelancer}`
                : `a confecção ${nomeEmpresa}`;
        }
    }

    async function carregarResumo() {
        try {
            const os = await api(`/OrdemServico/detalhe/${idNumerico}`);
            osAtual = os;

            document.getElementById('resumo-projeto').textContent = os.titulo || '—';
            document.getElementById('resumo-status').textContent = os.status || '—';
            atualizarLinksVoltar();
            await preencherParticipantes(os);

            const ehEmpresaDona = sessao.tipo === 'empresas' && Number(os.userId) === Number(sessao.id);
            const ehFreelancerDono = sessao.tipo === 'freelancers' && Number(os.freelancerId) === Number(sessao.id);

            if (!ehEmpresaDona && !ehFreelancerDono) {
                avisoSemAcesso.hidden = false;
                return;
            }

            // O back ainda não impede duplicidade; só liberar após confirmar a listagem.
            const avaliacoes = await api(`/Avaliacao/listar/${idNumerico}`);
            if (!Array.isArray(avaliacoes)) {
                throw new Error('Não foi possível verificar as avaliações desta Ordem de Serviço. Tente novamente.');
            }
            const jaAvaliou = avaliacoes.some(function (avaliacao) {
                return Number(avaliacao.userId) === Number(sessao.id);
            });

            podeAvaliar = os.status === 'Concluída' && !jaAvaliou;
            avisoNaoConcluida.hidden = os.status === 'Concluída';
            avisoJaAvaliado.hidden = !(os.status === 'Concluída' && jaAvaliou);
            formAvaliacao.hidden = !podeAvaliar;
        } catch (erro) {
            podeAvaliar = false;
            formAvaliacao.hidden = true;
            avisoSemAcesso.textContent = erro.message || 'Não foi possível carregar a Ordem de Serviço. Tente novamente.';
            avisoSemAcesso.hidden = false;
            if (erro.status === 401) return; // api() já redireciona para o login
            console.error('Erro ao carregar a Ordem de Serviço:', erro);
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

    if (formAvaliacao) {
        formAvaliacao.addEventListener('submit', async function (e) {
            e.preventDefault();
            if (!podeAvaliar || enviando || formAvaliacao.hidden) return;

            const nota = notaSelecionada();
            const comentario = textareaComentario.value.trim();
            const erros = [];
            if (!Number.isInteger(nota) || nota < 1 || nota > 5) erros.push('Selecione uma nota de 1 a 5.');
            const comentarioInvalido = comentario.length === 0 || comentario.length > 1000;
            textareaComentario.classList.toggle('input-error', comentarioInvalido);
            if (!comentario.length) erros.push('Preencha o comentário.');
            else if (comentario.length > 1000) erros.push('O comentário deve ter no máximo 1000 caracteres.');
            if (erros.length) {
                mostrarMensagem(erros.join(' '), 'error');
                return;
            }

            const btnEnviar = formAvaliacao.querySelector('button[type="submit"]');
            const textoOriginal = btnEnviar.innerHTML;
            enviando = true;
            btnEnviar.disabled = true;
            btnEnviar.innerHTML = '<span class="spinner"></span> Enviando...';

            try {
                await api('/Avaliacao/enviar', {
                    method: 'POST',
                    body: { ordemServicoId: idNumerico, nota, comentario }
                });
                podeAvaliar = false;
                mostrarMensagem(`Avaliação enviada! Nota ${nota} de 5.`, 'success');

                setTimeout(function () {
                    window.location.href = `/pages/19-ordem-servico-detalhe.html?id=${encodeURIComponent(osAtual.id)}`;
                }, 1500);
            } catch (erro) {
                if (erro.status === 401) {
                    podeAvaliar = false;
                    formAvaliacao.hidden = true;
                    return;
                }
                console.error('Erro ao enviar avaliação:', erro);
                enviando = false;
                btnEnviar.disabled = false;
                btnEnviar.innerHTML = textoOriginal;
                mostrarMensagem(erro.message || 'Não foi possível enviar a avaliação. Tente novamente.', 'error');
            }
        });
    }
});
