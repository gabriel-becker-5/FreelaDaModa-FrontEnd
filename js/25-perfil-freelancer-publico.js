// npx json-server --watch db.json --port 3000
// Pendências
// 1. Token JWT

const API_URL = `${API_BASE}/freelancers`;
const API_URL_AVALIACOES = `${API_BASE}/avaliacoes`;
const freelancerId = new URLSearchParams(window.location.search).get('id');
const loadingBar = document.querySelector('#perfil-loading');
const erroBar = document.querySelector('#perfil-erro');
const conteudoPerfil = document.querySelector('#perfil-conteudo');
const avatarFreelancer = document.querySelector('#avatar-freelancer');
const nomeFreelancer = document.querySelector('#nome-freelancer');
const estrelasMedia = document.querySelector('#estrelas-media');
const textoAvaliacoes = document.querySelector('#texto-avaliacoes');
const localizacaoFreelancer = document.querySelector('#localizacao-freelancer');
const seloVerificado = document.querySelector('#selo-verificado');
const descricaoFreelancer = document.querySelector('#descricao-freelancer');
const listaEspecialidades = document.querySelector('#lista-especialidades');
const listaMaquinas = document.querySelector('#lista-maquinas');
const listaReferencias = document.querySelector('#lista-referencias');
const listaAvaliacoes = document.querySelector('#lista-avaliacoes');
const botoesConvidar = document.querySelectorAll('.btn-convidar');
const infoExperiencia = document.querySelector('#info-experiencia');
const infoDisponibilidade = document.querySelector('#info-disponibilidade');
let token;

const MIN_REFERENCIAS_SELO = 5;

// Cabeçalho: público (Entrar) ou logado (saudação, sino e sair)
renderizarHeaderPublico(document.querySelector('#header-acoes'));

// Calcula iniciais do nome para Avatar (quando não há foto)
function calcularIniciais(nome) {
    const partesNome = String(nome || '').trim().split(' ');
    const primeiraLetraNome = partesNome[0] ? partesNome[0].charAt(0) : '';
    const primeiraLetraSobreNome = partesNome[partesNome.length - 1] ? partesNome[partesNome.length - 1].charAt(0) : '';
    return (primeiraLetraNome + primeiraLetraSobreNome).toUpperCase();
}

// Cria Badges para as Especialidades e Máquinas a partir dos dados da API
function marcarSelecionados(campoMultiSelect, valoresSelecionados) {
    campoMultiSelect.innerHTML = '';
    (valoresSelecionados || []).forEach(function (valor) {
        const badge = document.createElement('span');
        badge.className = 'badge';
        badge.textContent = valor;
        campoMultiSelect.appendChild(badge);
    });
}

// Preenche a avaliação média do freelancer | Escala: 1 a 5 estrelas
function preencheEstrelasNotaMedia(avaliacoes) {
    estrelasMedia.innerHTML = '';

    if (!avaliacoes.length) {
        textoAvaliacoes.textContent = 'Sem avaliações.';
        return;
    }

    const soma = avaliacoes.reduce(function (total, avaliacao) {
        return total + (Number(avaliacao.nota) || 0);
    }, 0);
    const media = soma / avaliacoes.length;

    for (let contador = 1; contador <= 5; contador++) {
        const estrela = document.createElement('i');
        estrela.className = contador <= Math.round(media) ? 'bi bi-star-fill' : 'bi bi-star';
        estrelasMedia.appendChild(estrela);
    }

    textoAvaliacoes.textContent = `${media.toFixed(1)}  ·  ${avaliacoes.length} avaliações`;
}

// Monta os cards para exibir as três avaliações mais recentes do Freelancer
function exibirAvaliacoesRecentes(avaliacoes) {
    const maximoAvaliacoes = 3;
    listaAvaliacoes.innerHTML = '';

    if (!avaliacoes.length) {
        listaAvaliacoes.innerHTML = '<p>Não há avaliações no momento.</p>';
        return;
    }

    // Limita ao número de avaliações que realmente existem (evita erro
    // quando há menos de 3 avaliações).
    const quantidade = Math.min(avaliacoes.length, maximoAvaliacoes);

    for (let index = 0; index < quantidade; index++) {
        const avaliacao = avaliacoes[index];

        const card = document.createElement('div');
        card.className = 'review-card';

        const comentario = document.createElement('p');
        comentario.textContent = `"${avaliacao.comentario}"`;

        const autorDiv = document.createElement('div');
        autorDiv.className = 'review-author';

        const autorNome = document.createElement('strong');
        autorNome.textContent = avaliacao.autor;

        const estrelasDaAvaliacao = document.createElement('span');
        estrelasDaAvaliacao.className = 'review-stars';

        for (let contador = 1; contador <= 5; contador++) {
            const estrela = document.createElement('i');
            estrela.className = contador <= avaliacao.nota ? 'bi bi-star-fill' : 'bi bi-star';
            estrelasDaAvaliacao.appendChild(estrela);
        }

        autorDiv.appendChild(autorNome);
        autorDiv.appendChild(estrelasDaAvaliacao);
        card.appendChild(comentario);
        card.appendChild(autorDiv);
        listaAvaliacoes.appendChild(card);
    }
}

function criarImagemComFallback(container, src, alt) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt;
    img.onerror = function () {
        const placeholder = document.createElement('div');
        placeholder.className = 'imagem-placeholder';
        placeholder.innerHTML = '<i class="bi bi-image"></i>';
        container.replaceChild(placeholder, img);
    };
    container.appendChild(img);
}

// Preenche os campos com os dados recebidos da API
function preencherPerfil(dados, avaliacoes) {
    // Foto de perfil (com fallback para iniciais) e selo verificado
    avatarFreelancer.innerHTML = '';
    if (dados.foto) {
        const img = document.createElement('img');
        img.src = dados.foto;
        img.alt = `Foto de ${dados.nome}`;
        img.onerror = function () {
            avatarFreelancer.textContent = calcularIniciais(dados.nome);
        };
        avatarFreelancer.appendChild(img);
    } else {
        avatarFreelancer.textContent = calcularIniciais(dados.nome);
    }

    const referencias = Array.isArray(dados.referencias) ? dados.referencias : [];
    const elegivelSelo = !!dados.foto && referencias.length >= MIN_REFERENCIAS_SELO;
    if (seloVerificado) seloVerificado.hidden = !elegivelSelo;

    nomeFreelancer.textContent = dados.nome;
    // Só cidade/UF — bairro e endereço ficam restritos ao cadastro formal.
    localizacaoFreelancer.textContent = `${dados.cidadeResidencial || ''}${dados.estadoResidencial ? ' - ' + dados.estadoResidencial : ''}`;
    descricaoFreelancer.textContent = dados.descricao;
    infoExperiencia.textContent = dados.tempoExperiencia;
    infoDisponibilidade.textContent = dados.disponibilidadeHorario;
    marcarSelecionados(listaEspecialidades, dados.especialidades);
    marcarSelecionados(listaMaquinas, dados.maquinas);

    // Referências do trabalho (caminhos salvos no banco)
    listaReferencias.innerHTML = '';
    if (!referencias.length) {
        listaReferencias.innerHTML = '<span class="field-message">Nenhuma referência cadastrada.</span>';
    } else {
        referencias.forEach(function (caminho, indice) {
            const item = document.createElement('div');
            item.className = 'referencia-item';
            criarImagemComFallback(item, caminho, `Referência ${indice + 1}`);
            listaReferencias.appendChild(item);
        });
    }

    preencheEstrelasNotaMedia(avaliacoes);
    exibirAvaliacoesRecentes(avaliacoes);
}

// Requisição API: Carregar cadastro do freelancer e avaliações
async function carregarPerfil() {
    if (!freelancerId) {
        loadingBar.setAttribute('hidden', '');
        erroBar.textContent = 'Nenhum freelancer informado. Volte para o mural e clique em um perfil.';
        erroBar.removeAttribute('hidden');
        return;
    }

    try {
        loadingBar.removeAttribute('hidden');
        erroBar.setAttribute('hidden', '');
        conteudoPerfil.setAttribute('hidden', '');

        const respostaFreelancer = await fetch(`${API_URL}/${freelancerId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!respostaFreelancer.ok) throw new Error(`Erro HTTP: ${respostaFreelancer.status}`);

        const dadosFreelancer = await respostaFreelancer.json();

        const respostaAvaliacoes = await fetch(`${API_URL_AVALIACOES}?freelancerId=${freelancerId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!respostaAvaliacoes.ok) throw new Error(`Erro HTTP: ${respostaAvaliacoes.status}`);

        const dadosAvaliacoes = await respostaAvaliacoes.json();

        preencherPerfil(dadosFreelancer, dadosAvaliacoes);

        loadingBar.setAttribute('hidden', '');
        conteudoPerfil.removeAttribute('hidden');
    } catch (erro) {
        console.error('Erro ao carregar perfil público:', erro);
        loadingBar.setAttribute('hidden', '');
        erroBar.textContent = 'Não foi possível carregar este perfil. Verifique o link e tente novamente.';
        erroBar.removeAttribute('hidden');
    }
}

carregarPerfil();

// Confere se a empresa tem uma assinatura com status "ativo" — convidar um
// freelancer é um recurso pago.
async function empresaTemAssinaturaAtiva(empresaId) {
    try {
        const res = await fetch(`${API_BASE}/assinaturas?empresaId=${empresaId}`);
        if (!res.ok) return false;
        const assinaturas = await res.json();
        return assinaturas.some(function (a) { return a.status === 'ativo'; });
    } catch (erro) {
        console.error('Erro ao verificar assinatura:', erro);
        return false;
    }
}

// Botão "Convidar para vaga" -> abre modal para escolher a vaga antes de registrar o convite
const modalConvidar = document.getElementById('modalConvidar');
const listaVagasConvite = document.getElementById('convidar-lista-vagas');
const btnCancelarConvite = document.getElementById('btnCancelarConvite');
const btnConfirmarConvite = document.getElementById('btnConfirmarConvite');
const nomeFreelancerConvite = document.getElementById('convidar-nome-freelancer');
let vagaSelecionadaConvite = null;

function fecharModalConvidar() {
    if (modalConvidar) modalConvidar.style.display = 'none';
    vagaSelecionadaConvite = null;
    if (btnConfirmarConvite) btnConfirmarConvite.disabled = true;
}

async function abrirModalConvidar() {
    const sessao = obterSessao();

    if (!sessao || sessao.tipo !== 'empresas') {
        mostrarMensagem('Apenas empresas logadas podem convidar freelancers para uma vaga.', 'error');
        return;
    }

    const assinaturaAtiva = await empresaTemAssinaturaAtiva(sessao.id);
    if (!assinaturaAtiva) {
        mostrarMensagem('Sua empresa não tem uma assinatura ativa. Contrate um plano na página de Assinatura para convidar freelancers.', 'error');
        return;
    }

    if (nomeFreelancerConvite) nomeFreelancerConvite.textContent = nomeFreelancer.textContent || 'este freelancer';
    if (listaVagasConvite) listaVagasConvite.innerHTML = '<p class="text-muted">Carregando suas vagas abertas...</p>';
    if (modalConvidar) modalConvidar.style.display = 'flex';

    try {
        const resposta = await fetch(`${API_BASE}/vagas?empresaId=${sessao.id}&status=Aberta`);
        if (!resposta.ok) throw new Error(`Erro HTTP: ${resposta.status}`);
        const vagasAbertas = await resposta.json();

        if (!listaVagasConvite) return;
        listaVagasConvite.innerHTML = '';

        if (vagasAbertas.length === 0) {
            listaVagasConvite.innerHTML = '<p class="text-muted">Você não tem nenhuma vaga aberta no momento. Publique uma vaga antes de convidar um freelancer.</p>';
            return;
        }

        vagasAbertas.forEach(function (vaga) {
            const opcao = document.createElement('label');
            opcao.className = 'checkbox-label';
            opcao.style.cssText = 'border:1px solid var(--border); border-radius:8px; padding:10px 12px; cursor:pointer;';

            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = 'vaga-convite';
            radio.value = vaga.id;

            const texto = document.createElement('span');
            texto.textContent = vaga.titulo;
            const detalhes = document.createElement('span');
            detalhes.className = 'text-muted';
            detalhes.style.fontSize = '12px';
            detalhes.textContent = `(${vaga.especialidade || '—'} · ${vaga.valor || '—'})`;

            opcao.appendChild(radio);
            opcao.appendChild(document.createTextNode(' '));
            opcao.appendChild(texto);
            opcao.appendChild(document.createTextNode(' '));
            opcao.appendChild(detalhes);
            listaVagasConvite.appendChild(opcao);
        });

        listaVagasConvite.querySelectorAll('input[name="vaga-convite"]').forEach(function (radio) {
            radio.addEventListener('change', function () {
                vagaSelecionadaConvite = vagasAbertas.find(function (v) { return String(v.id) === String(radio.value); }) || null;
                if (btnConfirmarConvite) btnConfirmarConvite.disabled = !vagaSelecionadaConvite;
            });
        });
    } catch (erro) {
        console.error('Erro ao carregar vagas abertas para convite:', erro);
        if (listaVagasConvite) listaVagasConvite.innerHTML = '<p class="text-muted">Não foi possível carregar suas vagas. Tente novamente.</p>';
    }
}

for (let index = 0; index < botoesConvidar.length; index++) {
    botoesConvidar[index].addEventListener('click', abrirModalConvidar);
}

if (btnCancelarConvite) btnCancelarConvite.addEventListener('click', fecharModalConvidar);

if (btnConfirmarConvite) {
    btnConfirmarConvite.addEventListener('click', async function () {
        const sessao = obterSessao();
        if (!sessao || sessao.tipo !== 'empresas' || !vagaSelecionadaConvite) return;

        btnConfirmarConvite.disabled = true;
        const textoOriginal = btnConfirmarConvite.innerHTML;
        btnConfirmarConvite.innerHTML = '<span class="spinner"></span> Enviando...';

        try {
            // Evita convidar o mesmo freelancer duas vezes para a mesma vaga.
            const respostaExistentes = await fetch(`${API_BASE}/convites?empresaId=${sessao.id}`);
            const convitesDaEmpresa = respostaExistentes.ok ? await respostaExistentes.json() : [];
            const jaConvidado = convitesDaEmpresa.some(function (c) {
                return String(c.vagaId) === String(vagaSelecionadaConvite.id) && String(c.freelancerId) === String(freelancerId) && c.status !== 'Recusado';
            });

            if (jaConvidado) {
                fecharModalConvidar();
                mostrarMensagem('Você já convidou este freelancer para essa vaga.', 'error');
                return;
            }

            const novoConvite = {
                vagaId: vagaSelecionadaConvite.id,
                vagaTitulo: vagaSelecionadaConvite.titulo,
                empresaId: sessao.id,
                empresaNome: sessao.nome,
                freelancerId: freelancerId,
                freelancerNome: nomeFreelancer.textContent || '',
                status: 'Pendente',
                tipo: 'Convite',
                criadoEm: new Date().toISOString()
            };

            const resposta = await fetch(`${API_BASE}/convites`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(novoConvite)
            });
            if (!resposta.ok) throw new Error(`Erro HTTP: ${resposta.status}`);

            // Avisa o freelancer que ele recebeu um convite.
            criarNotificacao({
                usuarioId: freelancerId,
                usuarioTipo: 'freelancers',
                tipo: 'convite',
                titulo: 'Novo convite de vaga',
                mensagem: `${sessao.nome} convidou você para a vaga "${novoConvite.vagaTitulo}".`,
                link: '/pages/20-minhas-candidaturas.html'
            });

            fecharModalConvidar();
            mostrarMensagem(`Convite para a vaga "${novoConvite.vagaTitulo}" enviado ao freelancer!`, 'success');
        } catch (erro) {
            console.error('Erro ao registrar convite:', erro);
            mostrarMensagem('Não foi possível registrar o convite. Tente novamente.', 'error');
        } finally {
            btnConfirmarConvite.disabled = false;
            btnConfirmarConvite.innerHTML = textoOriginal;
        }
    });
}
