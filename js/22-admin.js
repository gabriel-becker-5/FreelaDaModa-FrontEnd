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

    // ── 3. Abas (Relatórios / Usuários / Vagas / OS / Parâmetros / Suporte / Avisos) ──
    // .tab[i] corresponde a .tab-content[i], por índice
    const abas = document.querySelectorAll('.tab');
    const paineis = document.querySelectorAll('.tab-content');

    abas.forEach(function (aba, indice) {
        aba.addEventListener('click', function () {
            abas.forEach(function (a) { a.classList.remove('active'); a.setAttribute('aria-selected', 'false'); });
            paineis.forEach(function (p) { p.classList.remove('active'); });

            aba.classList.add('active');
            aba.setAttribute('aria-selected', 'true');
            if (paineis[indice]) paineis[indice].classList.add('active');
        });
    });

    // Painéis pela ordem fixa das abas (ver comentário acima).
    const painelUsuarios = paineis[1];
    const painelVagas = paineis[2];
    const painelOS = paineis[3];
    const painelParametros = paineis[4];
    const painelSuporte = paineis[5];
    const painelAvisos = paineis[6];

    function iniciaisDoNome(nome) {
        const partes = (nome || '').trim().split(' ');
        return partes.length > 1 ? (partes[0][0] + partes[1][0]).toUpperCase() : (nome || '??').substring(0, 2).toUpperCase();
    }

    function escapeHtml(str) {
        return String(str ?? '').replace(/[&<>"']/g, function (ch) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
        });
    }

    // ── 4. Aba Usuários ──
    // não existe coleção "usuários" — junta freelancers + empresas aqui
    // e guarda a origem em data-tipo pra excluir na coleção certa
    if (painelUsuarios) {
        const tbody = painelUsuarios.querySelector('table tbody');
        const inputBusca = painelUsuarios.querySelector('.filters .input-grow');
        const selectTipo = painelUsuarios.querySelectorAll('.filters select')[0];
        const btnFiltrar = painelUsuarios.querySelector('.filters .btn-primary');
        const loadingSkeleton = painelUsuarios.querySelector('.loading-skeleton');
        const emptyState = painelUsuarios.querySelector('.empty-state');
        const alertaErro = painelUsuarios.querySelector('.alert-error');

        let todosUsuarios = [];

        function criarLinhaUsuario(usuario) {
            const tr = document.createElement('tr');
            tr.dataset.id = usuario.id;
            tr.dataset.tipo = usuario.tipoColecao;
            tr.innerHTML = `
                <td data-label="Id">USR-${escapeHtml(usuario.id)}</td>
                <td data-label="Nome">${escapeHtml(usuario.nome)}</td>
                <td data-label="Email">${escapeHtml(usuario.email)}</td>
                <td data-label="Tipo">${escapeHtml(usuario.tipoExibicao)}</td>
                <td data-label="Status"><span class="badge badge-success">Ativo</span></td>
                <td data-label="Ações">
                    <div class="table-actions">
                        <button class="btn btn-editar">Editar</button>
                        <button class="btn btn-bloquear">Bloquear</button>
                        <button class="btn btn-danger btn-excluir" type="button">Excluir</button>
                    </div>
                </td>
            `;
            return tr;
        }

        function renderizarUsuarios(lista) {
            if (!tbody) return;
            tbody.innerHTML = '';
            if (lista.length === 0) {
                if (emptyState) emptyState.style.display = 'block';
                return;
            }
            if (emptyState) emptyState.style.display = 'none';
            lista.forEach(function (u) { tbody.appendChild(criarLinhaUsuario(u)); });
        }

        function aplicarFiltrosUsuarios() {
            const termo = inputBusca ? inputBusca.value.toLowerCase().trim() : '';
            const tipo = selectTipo ? selectTipo.value : 'Tipo de Conta';

            const filtrados = todosUsuarios.filter(function (u) {
                const bateTermo = !termo || u.nome.toLowerCase().includes(termo) || u.email.toLowerCase().includes(termo);
                const bateTipo = tipo === 'Tipo de Conta' || u.tipoExibicao === tipo;
                return bateTermo && bateTipo;
            });
            renderizarUsuarios(filtrados);
        }

        async function carregarUsuarios() {
            if (loadingSkeleton) loadingSkeleton.style.display = 'flex';
            if (alertaErro) alertaErro.style.display = 'none';
            try {
                const [resFreela, resEmpresa] = await Promise.all([
                    fetch(`${API_BASE}/freelancers`),
                    fetch(`${API_BASE}/empresas`)
                ]);
                if (!resFreela.ok || !resEmpresa.ok) throw new Error('Falha ao carregar usuários.');

                const freelancers = await resFreela.json();
                const empresas = await resEmpresa.json();

                todosUsuarios = [
                    ...freelancers.map(function (f) {
                        return { id: f.id, nome: f.nome, email: f.email, tipoColecao: 'freelancers', tipoExibicao: 'Freelancer' };
                    }),
                    ...empresas.map(function (e) {
                        return { id: e.id, nome: e.nomeFantasia || e.razaoSocial, email: e.email, tipoColecao: 'empresas', tipoExibicao: 'Empresa/Confecção' };
                    })
                ];

                aplicarFiltrosUsuarios();
            } catch (erro) {
                console.error('Erro ao carregar usuários:', erro);
                if (alertaErro) alertaErro.style.display = 'block';
            } finally {
                if (loadingSkeleton) loadingSkeleton.style.display = 'none';
            }
        }

        if (btnFiltrar) btnFiltrar.addEventListener('click', function (e) { e.preventDefault(); aplicarFiltrosUsuarios(); });

        if (tbody) {
            tbody.addEventListener('click', async function (e) {
                const linha = e.target.closest('tr');
                if (!linha) return;
                const { id, tipo } = linha.dataset;

                if (e.target.closest('.btn-bloquear')) {
                    const badge = linha.querySelector('.badge');
                    const bloqueado = badge.textContent.trim() === 'Ativo';
                    badge.className = bloqueado ? 'badge badge-danger' : 'badge badge-success';
                    badge.textContent = bloqueado ? 'Bloqueado' : 'Ativo';
                    return;
                }

                if (e.target.closest('.btn-editar')) {
                    alert('Edição de usuário: tela de edição ainda não implementada neste mock.');
                    return;
                }

                if (e.target.closest('.btn-excluir')) {
                    if (!confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) return;
                    try {
                        const res = await fetch(`${API_BASE}/${tipo}/${id}`, { method: 'DELETE' });
                        if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
                    } catch (erro) {
                        console.error('Erro ao excluir usuário:', erro);
                        alert('Não foi possível excluir o usuário. Verifique se o json-server está rodando.');
                        return;
                    }
                    todosUsuarios = todosUsuarios.filter(function (u) { return !(u.id === id && u.tipoColecao === tipo); });
                    linha.remove();
                }
            });
        }

        carregarUsuarios();
    }

    // ── 5. Aba Vagas ──
    if (painelVagas) {
        const tbody = painelVagas.querySelector('table tbody');
        const inputBusca = painelVagas.querySelector('.filters .input-grow');
        const selectStatus = painelVagas.querySelectorAll('.filters select')[0];
        const btnFiltrar = painelVagas.querySelector('.filters .btn-primary');
        const loadingSkeleton = painelVagas.querySelector('.loading-skeleton');
        const emptyState = painelVagas.querySelector('.empty-state');
        const alertaErro = painelVagas.querySelector('.alert-error');

        let todasVagas = [];

        function criarLinhaVaga(vaga) {
            const tr = document.createElement('tr');
            tr.dataset.id = vaga.id;
            tr.innerHTML = `
                <td data-label="Id">VG-${escapeHtml(vaga.id)}</td>
                <td data-label="Título">${escapeHtml(vaga.titulo)}</td>
                <td data-label="Empresa">${escapeHtml(vaga.empresaNome || '—')}</td>
                <td data-label="Status"><span class="badge">${escapeHtml(vaga.status || 'Aberta')}</span></td>
                <td data-label="Data">—</td>
                <td data-label="Ações">
                    <div class="table-actions">
                        <a href="/pages/18-vaga-detalhe.html" class="btn">Ver</a>
                        <button class="btn btn-danger btn-fechar" type="button">Fechar</button>
                    </div>
                </td>
            `;
            return tr;
        }

        function renderizarVagas(lista) {
            if (!tbody) return;
            tbody.innerHTML = '';
            if (lista.length === 0) {
                if (emptyState) emptyState.style.display = 'block';
                return;
            }
            if (emptyState) emptyState.style.display = 'none';
            lista.forEach(function (v) { tbody.appendChild(criarLinhaVaga(v)); });
        }

        function aplicarFiltrosVagas() {
            const termo = inputBusca ? inputBusca.value.toLowerCase().trim() : '';
            const status = selectStatus ? selectStatus.value : 'Status';
            const filtradas = todasVagas.filter(function (v) {
                const bateTermo = !termo || v.titulo.toLowerCase().includes(termo);
                const bateStatus = status === 'Status' || (v.status || '').toLowerCase() === status.toLowerCase();
                return bateTermo && bateStatus;
            });
            renderizarVagas(filtradas);
        }

        async function carregarVagas() {
            if (loadingSkeleton) loadingSkeleton.style.display = 'flex';
            if (alertaErro) alertaErro.style.display = 'none';
            try {
                const res = await fetch(`${API_BASE}/vagas`);
                if (!res.ok) throw new Error('Falha ao carregar vagas.');
                todasVagas = await res.json();
                aplicarFiltrosVagas();
            } catch (erro) {
                console.error('Erro ao carregar vagas (admin):', erro);
                if (alertaErro) alertaErro.style.display = 'block';
            } finally {
                if (loadingSkeleton) loadingSkeleton.style.display = 'none';
            }
        }

        if (btnFiltrar) btnFiltrar.addEventListener('click', function (e) { e.preventDefault(); aplicarFiltrosVagas(); });

        if (tbody) {
            tbody.addEventListener('click', async function (e) {
                if (!e.target.closest('.btn-fechar')) return;
                const linha = e.target.closest('tr');
                const id = linha.dataset.id;
                if (!confirm('Encerrar esta vaga na plataforma?')) return;

                try {
                    const res = await fetch(`${API_BASE}/vagas/${id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'Encerrada' })
                    });
                    if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
                } catch (erro) {
                    console.error('Erro ao encerrar vaga:', erro);
                    alert('Não foi possível encerrar a vaga. Verifique se o json-server está rodando.');
                    return;
                }
                const badge = linha.querySelector('.badge');
                badge.textContent = 'Encerrada';
            });
        }

        carregarVagas();
    }

    // ── 6. Aba Ordens de Serviço ──
    // mesma coleção "ordensServico" das telas 14/16/19
    if (painelOS) {
        const tbody = painelOS.querySelector('table tbody');
        const inputBusca = painelOS.querySelector('.filters .input-grow');
        const selectStatus = painelOS.querySelectorAll('.filters select')[0];
        const btnFiltrar = painelOS.querySelector('.filters .btn-primary');
        const loadingSkeleton = painelOS.querySelector('.loading-skeleton');
        const emptyState = painelOS.querySelector('.empty-state');
        const alertaErro = painelOS.querySelector('.alert-error');

        let todasOS = [];

        function classeBadgeStatusOS(status) {
            if (status === 'Concluída') return 'badge-success';
            if (status === 'Cancelada') return 'badge-danger';
            return 'badge-warning';
        }

        function criarLinhaOS(os) {
            const tr = document.createElement('tr');
            tr.dataset.id = os.id;
            tr.innerHTML = `
                <td data-label="Id">OS-${escapeHtml(os.id)}</td>
                <td data-label="Título">${escapeHtml(os.titulo)}</td>
                <td data-label="Empresa">${escapeHtml(os.empresaNome || '—')}</td>
                <td data-label="Freelancer">${escapeHtml(os.freelancerNome || '—')}</td>
                <td data-label="Status"><span class="badge ${classeBadgeStatusOS(os.status)}">${escapeHtml(os.status)}</span></td>
                <td data-label="Ações">
                    <div class="table-actions">
                        <a href="/pages/19-ordem-servico-detalhe.html?id=${os.id}" class="btn">Ver</a>
                        <button class="btn btn-danger btn-cancelar" type="button">Cancelar</button>
                    </div>
                </td>
            `;
            return tr;
        }

        function renderizarOS(lista) {
            if (!tbody) return;
            tbody.innerHTML = '';
            if (lista.length === 0) {
                if (emptyState) emptyState.style.display = 'block';
                return;
            }
            if (emptyState) emptyState.style.display = 'none';
            lista.forEach(function (os) { tbody.appendChild(criarLinhaOS(os)); });
        }

        function aplicarFiltrosOS() {
            const termo = inputBusca ? inputBusca.value.toLowerCase().trim() : '';
            const status = selectStatus ? selectStatus.value : 'Status';
            const filtradas = todasOS.filter(function (os) {
                const bateTermo = !termo || os.titulo.toLowerCase().includes(termo);
                const bateStatus = status === 'Status' || os.status === status;
                return bateTermo && bateStatus;
            });
            renderizarOS(filtradas);
        }

        async function carregarOS() {
            if (loadingSkeleton) loadingSkeleton.style.display = 'flex';
            if (alertaErro) alertaErro.style.display = 'none';
            try {
                const res = await fetch(`${API_BASE}/ordensServico`);
                if (!res.ok) throw new Error('Falha ao carregar ordens de serviço.');
                todasOS = await res.json();
                aplicarFiltrosOS();
            } catch (erro) {
                console.error('Erro ao carregar ordens de serviço (admin):', erro);
                if (alertaErro) alertaErro.style.display = 'block';
            } finally {
                if (loadingSkeleton) loadingSkeleton.style.display = 'none';
            }
        }

        if (btnFiltrar) btnFiltrar.addEventListener('click', function (e) { e.preventDefault(); aplicarFiltrosOS(); });

        if (tbody) {
            tbody.addEventListener('click', async function (e) {
                if (!e.target.closest('.btn-cancelar')) return;
                const linha = e.target.closest('tr');
                const id = linha.dataset.id;
                if (!confirm('Cancelar esta ordem de serviço?')) return;

                try {
                    const res = await fetch(`${API_BASE}/ordensServico/${id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'Cancelada' })
                    });
                    if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
                } catch (erro) {
                    console.error('Erro ao cancelar ordem de serviço:', erro);
                    alert('Não foi possível cancelar a ordem de serviço. Verifique se o json-server está rodando.');
                    return;
                }

                const badge = linha.querySelector('.badge');
                badge.className = 'badge badge-danger';
                badge.textContent = 'Cancelada';
            });
        }

        carregarOS();
    }

    // ── 7. Aba Parâmetros ──
    // registro único em "parametros" — config global, não fica em localStorage
    // pra todo admin ver o mesmo valor
    if (painelParametros) {
        const inputTaxa = document.getElementById('param-taxa');
        const inputLimite = document.getElementById('param-limite');
        const textareaAviso = document.getElementById('param-aviso');
        const inputCor = document.getElementById('param-cor');
        const previewCor = painelParametros.querySelector('.color-input-preview');
        const btnSalvar = painelParametros.querySelector('.form-actions .btn-primary');

        let parametrosAtuais = null;

        async function carregarParametros() {
            try {
                const res = await fetch(`${API_BASE}/parametros`);
                if (!res.ok) throw new Error('Falha ao carregar parâmetros.');
                const lista = await res.json();
                parametrosAtuais = lista[0] || null;
                if (!parametrosAtuais) return;

                if (inputTaxa) inputTaxa.value = parametrosAtuais.taxa;
                if (inputLimite) inputLimite.value = parametrosAtuais.limite;
                if (textareaAviso) textareaAviso.value = parametrosAtuais.aviso;
                if (inputCor) inputCor.value = parametrosAtuais.cor;
                if (previewCor && inputCor) previewCor.style.background = inputCor.value;
            } catch (erro) {
                console.error('Erro ao carregar parâmetros:', erro);
            }
        }

        if (inputCor && previewCor) {
            inputCor.addEventListener('input', function () {
                previewCor.style.background = inputCor.value;
            });
        }

        if (btnSalvar) {
            btnSalvar.addEventListener('click', async function () {
                const novosParametros = {
                    taxa: inputTaxa ? Number(inputTaxa.value) : null,
                    limite: inputLimite ? Number(inputLimite.value) : null,
                    aviso: textareaAviso ? textareaAviso.value : '',
                    cor: inputCor ? inputCor.value : '#7000c2'
                };

                const textoOriginal = btnSalvar.innerHTML;
                btnSalvar.disabled = true;
                btnSalvar.innerHTML = '<span class="spinner"></span> Salvando...';

                try {
                    const res = parametrosAtuais
                        ? await fetch(`${API_BASE}/parametros/${parametrosAtuais.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(novosParametros)
                        })
                        : await fetch(`${API_BASE}/parametros`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(novosParametros)
                        });
                    if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
                    alert('Parâmetros salvos com sucesso!');
                    await carregarParametros();
                } catch (erro) {
                    console.error('Erro ao salvar parâmetros:', erro);
                    alert('Não foi possível salvar os parâmetros. Verifique se o json-server está rodando.');
                } finally {
                    btnSalvar.disabled = false;
                    btnSalvar.innerHTML = textoOriginal;
                }
            });
        }

        carregarParametros();
    }

    // ── 8. Aba Mensagens do Suporte ──
    // mesma coleção "chamados" que a 24-suporte.html usa pra abrir chamado
    if (painelSuporte) {
        const tbody = painelSuporte.querySelector('table tbody');
        const loadingSkeleton = painelSuporte.querySelector('.loading-skeleton');
        const emptyState = painelSuporte.querySelector('.empty-state');
        const alertaErro = painelSuporte.querySelector('.alert-error');

        let todosChamados = [];

        function classeBadgeChamado(status) {
            if (status === 'Respondido') return 'badge-success';
            if (status === 'Fechado') return 'badge';
            return 'badge-warning'; // Aberto / Em andamento
        }

        function criarLinhaChamado(chamado) {
            const tr = document.createElement('tr');
            tr.dataset.id = chamado.id;
            tr.innerHTML = `
                <td data-label="Id">TKT-${escapeHtml(chamado.id)}</td>
                <td data-label="Usuário">${escapeHtml(chamado.autorNome || '—')}</td>
                <td data-label="Assunto">${escapeHtml(chamado.assunto)}</td>
                <td data-label="Data">${chamado.criadoEm ? new Date(chamado.criadoEm + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                <td data-label="Status"><span class="badge ${classeBadgeChamado(chamado.status)}">${escapeHtml(chamado.status)}</span></td>
                <td data-label="Ações">
                    <div class="table-actions">
                        <button class="btn btn-ver">Ver</button>
                        <button class="btn btn-responder">Responder</button>
                        <button class="btn btn-danger btn-fechar-ticket" type="button">Fechar</button>
                    </div>
                </td>
            `;
            return tr;
        }

        function renderizarChamados(lista) {
            if (!tbody) return;
            tbody.innerHTML = '';
            if (lista.length === 0) {
                if (emptyState) emptyState.style.display = 'block';
                return;
            }
            if (emptyState) emptyState.style.display = 'none';
            lista.forEach(function (c) { tbody.appendChild(criarLinhaChamado(c)); });
        }

        async function carregarChamados() {
            if (loadingSkeleton) loadingSkeleton.style.display = 'flex';
            if (alertaErro) alertaErro.style.display = 'none';
            try {
                const res = await fetch(`${API_BASE}/chamados`);
                if (!res.ok) throw new Error('Falha ao carregar chamados.');
                todosChamados = await res.json();
                renderizarChamados(todosChamados);
            } catch (erro) {
                console.error('Erro ao carregar chamados de suporte:', erro);
                if (alertaErro) alertaErro.style.display = 'block';
            } finally {
                if (loadingSkeleton) loadingSkeleton.style.display = 'none';
            }
        }

        // ── Painel de detalhe do chamado (modal) ──
        const modalDetalhe = document.getElementById('modal-chamado-detalhe');
        const detalheTitulo = document.getElementById('chamado-detalhe-titulo');
        const detalheUsuario = document.getElementById('chamado-detalhe-usuario');
        const detalheAssunto = document.getElementById('chamado-detalhe-assunto');
        const detalheData = document.getElementById('chamado-detalhe-data');
        const detalheStatus = document.getElementById('chamado-detalhe-status');
        const detalheMensagens = document.getElementById('chamado-detalhe-mensagens');
        const detalheResposta = document.getElementById('chamado-detalhe-resposta');
        const btnFecharModalDetalhe = document.getElementById('btn-fechar-chamado-detalhe');
        const btnFecharChamadoModal = document.getElementById('btn-fechar-chamado-modal');
        const btnEnviarResposta = document.getElementById('btn-enviar-resposta-chamado');

        let chamadoAberto = null;

        function renderizarConversa(chamado) {
            if (!detalheMensagens) return;
            const mensagens = chamado.mensagens && chamado.mensagens.length
                ? chamado.mensagens
                : [{ autor: chamado.autorNome, texto: chamado.descricao, data: chamado.criadoEm }];

            detalheMensagens.innerHTML = mensagens.map(function (m) {
                const ehSuporte = m.autor === 'Suporte Freela da Moda';
                const dataFormatada = m.data ? new Date(m.data + 'T00:00:00').toLocaleDateString('pt-BR') : '';
                return `
                    <div class="message-row${ehSuporte ? ' message-row-outgoing' : ''}" style="max-width: 100%;">
                        <strong style="display:block; font-size:12px; margin-bottom:2px;">${escapeHtml(m.autor || 'Usuário')}</strong>
                        ${escapeHtml(m.texto)}
                        <span class="message-timestamp">${dataFormatada}</span>
                    </div>
                `;
            }).join('');
        }

        function abrirDetalheChamado(chamado, focarResposta) {
            if (!modalDetalhe) return;
            chamadoAberto = chamado;

            detalheTitulo.textContent = `Chamado TKT-${chamado.id}`;
            detalheUsuario.textContent = chamado.autorNome || '—';
            detalheAssunto.textContent = chamado.assunto;
            detalheData.textContent = chamado.criadoEm
                ? new Date(chamado.criadoEm + 'T00:00:00').toLocaleDateString('pt-BR')
                : '—';
            detalheStatus.className = `badge ${classeBadgeChamado(chamado.status)}`;
            detalheStatus.textContent = chamado.status;
            detalheResposta.value = '';

            renderizarConversa(chamado);

            modalDetalhe.style.display = 'flex';
            if (focarResposta) detalheResposta.focus();
        }

        function fecharDetalheChamado() {
            modalDetalhe.style.display = 'none';
            chamadoAberto = null;
        }

        if (btnFecharModalDetalhe) btnFecharModalDetalhe.addEventListener('click', fecharDetalheChamado);
        if (modalDetalhe) {
            modalDetalhe.addEventListener('click', function (e) {
                if (e.target === modalDetalhe) fecharDetalheChamado();
            });
        }

        function atualizarLinhaTabela(chamado) {
            const linha = tbody.querySelector(`tr[data-id="${chamado.id}"]`);
            if (!linha) return;
            const badge = linha.querySelector('.badge');
            badge.className = `badge ${classeBadgeChamado(chamado.status)}`;
            badge.textContent = chamado.status;
        }

        if (btnEnviarResposta) {
            btnEnviarResposta.addEventListener('click', async function () {
                if (!chamadoAberto) return;
                const resposta = detalheResposta.value.trim();
                if (!resposta) {
                    detalheResposta.classList.add('input-error');
                    return;
                }

                const novasMensagens = (chamadoAberto.mensagens || []).concat([
                    { autor: 'Suporte Freela da Moda', texto: resposta, data: new Date().toISOString().slice(0, 10) }
                ]);

                const textoOriginal = btnEnviarResposta.innerHTML;
                btnEnviarResposta.disabled = true;
                btnEnviarResposta.innerHTML = '<span class="spinner"></span> Enviando...';

                try {
                    const res = await fetch(`${API_BASE}/chamados/${chamadoAberto.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'Respondido', mensagens: novasMensagens })
                    });
                    if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);

                    chamadoAberto.status = 'Respondido';
                    chamadoAberto.mensagens = novasMensagens;
                    atualizarLinhaTabela(chamadoAberto);
                    detalheStatus.className = `badge ${classeBadgeChamado(chamadoAberto.status)}`;
                    detalheStatus.textContent = chamadoAberto.status;
                    detalheResposta.value = '';
                    renderizarConversa(chamadoAberto);
                } catch (erro) {
                    console.error('Erro ao responder chamado:', erro);
                    alert('Não foi possível enviar a resposta. Verifique se o json-server está rodando.');
                } finally {
                    btnEnviarResposta.disabled = false;
                    btnEnviarResposta.innerHTML = textoOriginal;
                }
            });
        }

        if (btnFecharChamadoModal) {
            btnFecharChamadoModal.addEventListener('click', async function () {
                if (!chamadoAberto) return;
                if (!confirm('Fechar este chamado de suporte?')) return;

                try {
                    const res = await fetch(`${API_BASE}/chamados/${chamadoAberto.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'Fechado' })
                    });
                    if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
                    chamadoAberto.status = 'Fechado';
                    atualizarLinhaTabela(chamadoAberto);
                    fecharDetalheChamado();
                } catch (erro) {
                    console.error('Erro ao fechar chamado:', erro);
                    alert('Não foi possível fechar o chamado. Verifique se o json-server está rodando.');
                }
            });
        }

        if (tbody) {
            tbody.addEventListener('click', async function (e) {
                const linha = e.target.closest('tr');
                if (!linha) return;
                const id = linha.dataset.id;
                const chamado = todosChamados.find(function (c) { return String(c.id) === String(id); });
                if (!chamado) return;

                if (e.target.closest('.btn-ver')) {
                    abrirDetalheChamado(chamado, false);
                    return;
                }

                if (e.target.closest('.btn-responder')) {
                    abrirDetalheChamado(chamado, true);
                    return;
                }

                if (e.target.closest('.btn-fechar-ticket')) {
                    if (!confirm('Fechar este chamado de suporte?')) return;
                    try {
                        const res = await fetch(`${API_BASE}/chamados/${id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: 'Fechado' })
                        });
                        if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
                    } catch (erro) {
                        console.error('Erro ao fechar chamado:', erro);
                        alert('Não foi possível fechar o chamado. Verifique se o json-server está rodando.');
                        return;
                    }
                    chamado.status = 'Fechado';
                    atualizarLinhaTabela(chamado);
                }
            });
        }

        carregarChamados();
    }

    // ── 9. Aba Avisos ──
    if (painelAvisos) {
        const form = painelAvisos.querySelector('form');
        const inputTitulo = document.getElementById('aviso-titulo');
        const inputExpiracao = document.getElementById('aviso-expiracao');
        const textareaTexto = document.getElementById('aviso-texto');
        const tabelaAvisos = painelAvisos.querySelectorAll('table tbody')[0];

        function formatarDataBR(str) {
            if (!str) return '—';
            const data = new Date(str + 'T00:00:00');
            return isNaN(data) ? str : data.toLocaleDateString('pt-BR');
        }

        function criarLinhaAviso(aviso) {
            const tr = document.createElement('tr');
            tr.dataset.id = aviso.id;
            tr.className = 'animate-slide-down';
            tr.innerHTML = `
                <td data-label="Título">${escapeHtml(aviso.titulo)}</td>
                <td data-label="Publicado em">${formatarDataBR(aviso.publicadoEm)}</td>
                <td data-label="Expira em">${formatarDataBR(aviso.expiraEm)}</td>
                <td data-label="Status"><span class="badge">${escapeHtml(aviso.status || 'Ativo')}</span></td>
                <td data-label="Ações">
                    <div class="table-actions">
                        <button class="btn">Editar</button>
                        <button class="btn btn-danger btn-remover-aviso" type="button">Remover</button>
                    </div>
                </td>
            `;
            return tr;
        }

        async function carregarAvisos() {
            if (!tabelaAvisos) return;
            try {
                const res = await fetch(`${API_BASE}/avisos`);
                if (!res.ok) throw new Error('Falha ao carregar avisos.');
                const avisos = await res.json();
                tabelaAvisos.innerHTML = '';
                avisos.slice().reverse().forEach(function (aviso) {
                    tabelaAvisos.appendChild(criarLinhaAviso(aviso));
                });
            } catch (erro) {
                console.error('Erro ao carregar avisos:', erro);
            }
        }

        if (form) {
            form.addEventListener('submit', async function (e) {
                e.preventDefault();

                if (!inputTitulo.value.trim() || !textareaTexto.value.trim()) {
                    alert('Preencha o título e o texto do aviso.');
                    return;
                }

                const btnPublicar = form.querySelector('button[type="submit"]');
                const textoOriginal = btnPublicar.innerHTML;
                btnPublicar.disabled = true;
                btnPublicar.innerHTML = '<span class="spinner"></span> Publicando...';

                const novoAviso = {
                    titulo: inputTitulo.value.trim(),
                    texto: textareaTexto.value.trim(),
                    autor: 'Administração',
                    publicadoEm: new Date().toISOString().slice(0, 10),
                    expiraEm: inputExpiracao.value || null,
                    status: 'Ativo'
                };

                try {
                    const res = await fetch(`${API_BASE}/avisos`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(novoAviso)
                    });
                    if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
                    form.reset();
                    alert('Aviso publicado com sucesso!');
                    await carregarAvisos();
                } catch (erro) {
                    console.error('Erro ao publicar aviso:', erro);
                    alert('Não foi possível publicar o aviso. Verifique se o json-server está rodando.');
                } finally {
                    btnPublicar.disabled = false;
                    btnPublicar.innerHTML = textoOriginal;
                }
            });
        }

        if (tabelaAvisos) {
            tabelaAvisos.addEventListener('click', async function (e) {
                const botaoRemover = e.target.closest('.btn-remover-aviso');
                if (!botaoRemover) return;
                if (!confirm('Remover este aviso da plataforma?')) return;

                const linha = botaoRemover.closest('tr');
                const id = linha.dataset.id;
                try {
                    const res = await fetch(`${API_BASE}/avisos/${id}`, { method: 'DELETE' });
                    if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
                } catch (erro) {
                    console.error('Erro ao remover aviso:', erro);
                    alert('Não foi possível remover o aviso. Verifique se o json-server está rodando.');
                    return;
                }
                linha.remove();
            });
        }

        carregarAvisos();
    }
});
