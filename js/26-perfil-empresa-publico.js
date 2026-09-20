// Perfil público da empresa — padrão da 25-perfil-freelancer-publico

const API_URL = `${API_BASE}/empresas`;
const API_URL_VAGAS = `${API_BASE}/vagas`;
const API_URL_AVALIACOES = `${API_BASE}/avaliacoes`;

const empresaId = new URLSearchParams(window.location.search).get('id');
const loadingBar = document.querySelector('#perfil-loading');
const erroBar = document.querySelector('#perfil-erro');
const conteudoPerfil = document.querySelector('#perfil-conteudo');
const avatarEmpresa = document.querySelector('#avatar-empresa');
const nomeEmpresa = document.querySelector('#nome-empresa');
const estrelasMedia = document.querySelector('#estrelas-media');
const textoAvaliacoes = document.querySelector('#texto-avaliacoes');
const localizacaoEmpresa = document.querySelector('#localizacao-empresa');
const seloVerificado = document.querySelector('#selo-verificado');
const seloContainer = document.querySelector('#selo-container');
const descricaoEmpresa = document.querySelector('#descricao-empresa');
const ramoEmpresa = document.querySelector('#ramo-empresa');
const listaReferencias = document.querySelector('#lista-referencias');
const listaAvaliacoes = document.querySelector('#lista-avaliacoes');
const listaVagasAtivas = document.querySelector('#lista-vagas-ativas');
let token;

// Cabeçalho: público (Entrar) ou logado (saudação, sino e sair)
renderizarHeaderPublico(document.querySelector('#header-acoes'));

// Calcula iniciais do nome para Avatar (quando não há logo)
function calcularIniciais(nome) {
    const partesNomeEmpresa = String(nome || '').trim().split(' ');
    const primeiraParte = partesNomeEmpresa[0] ? partesNomeEmpresa[0].charAt(0) : '';
    const segundaParte = partesNomeEmpresa[partesNomeEmpresa.length - 1] ? partesNomeEmpresa[partesNomeEmpresa.length - 1].charAt(0) : '';
    return (primeiraParte + segundaParte).toUpperCase();
}

// Preenche a avaliação média da empresa | Escala: 1 a 5 estrelas
function preencheEstrelasNotaMedia(avaliacaoMedia, totalAvaliacoes) {
    estrelasMedia.innerHTML = '';

    if (totalAvaliacoes <= 0 || avaliacaoMedia <= 0) {
        textoAvaliacoes.textContent = 'Sem avaliações.';
        return;
    }

    for (let contador = 1; contador <= 5; contador++) {
        const estrela = document.createElement('i');
        estrela.className = contador <= Math.round(avaliacaoMedia) ? 'bi bi-star-fill' : 'bi bi-star';
        estrelasMedia.appendChild(estrela);
    }

    textoAvaliacoes.textContent = `${avaliacaoMedia.toFixed(1)}  ·  ${totalAvaliacoes} avaliações`;
}

// Monta os cards para exibir as três avaliações mais recentes da Empresa
function exibirAvaliacoesRecentes(avaliacoes) {
    const maximoAvaliacoes = 3;
    listaAvaliacoes.innerHTML = '';

    if (avaliacoes.length < 1) {
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

// Monta os cards para exibir até três vagas ativas da Empresa
function exibirVagasAtivas(vagas) {
    const maximoVagas = 3;
    listaVagasAtivas.innerHTML = '';

    if (vagas.length < 1) {
        listaVagasAtivas.innerHTML = '<p>Não há vagas ativas no momento.</p>';
        return;
    }

    for (let index = 0; index < Math.min(vagas.length, maximoVagas); index++) {
        const vaga = vagas[index];

        const card = document.createElement('div');
        card.className = 'card';
        card.style.background = 'var(--surface-alt)';
        card.style.padding = '14px';

        const divClusterBetween = document.createElement('div');
        divClusterBetween.className = 'cluster-between';

        const apenasDIV = document.createElement('div');

        const tituloDaVaga = document.createElement('strong');
        tituloDaVaga.style.cssText = 'font-size: 14px;';
        tituloDaVaga.textContent = vaga.titulo;

        const detalheVaga = document.createElement('p');
        detalheVaga.textContent = `${vaga.valor || '—'} · ${vaga.modalidade || '—'}`;
        detalheVaga.style.cssText = 'font-size: 12px; margin: 2px 0;';

        const divCluster = document.createElement('div');
        divCluster.className = 'cluster';

        const linkVaga = document.createElement('a');
        linkVaga.textContent = 'Ver vaga';
        linkVaga.href = `/pages/18-vaga-detalhe.html?id=${encodeURIComponent(vaga.id)}`;
        linkVaga.className = 'btn';
        linkVaga.style.cssText = 'padding: 5px 10px; font-size: 12px;';

        apenasDIV.appendChild(tituloDaVaga);
        apenasDIV.appendChild(detalheVaga);
        divClusterBetween.appendChild(apenasDIV);

        divCluster.appendChild(linkVaga);
        divClusterBetween.appendChild(divCluster);

        card.appendChild(divClusterBetween);

        listaVagasAtivas.appendChild(card);
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
function preencherPerfil(dados, avaliacoes, vagas) {
    // Logo da empresa (com fallback para iniciais)
    avatarEmpresa.innerHTML = '';
    if (dados.foto) {
        const img = document.createElement('img');
        img.src = dados.foto;
        img.alt = `Logo da ${dados.nomeFantasia}`;
        img.onerror = function () {
            avatarEmpresa.textContent = calcularIniciais(dados.nomeFantasia);
        };
        avatarEmpresa.appendChild(img);
    } else {
        avatarEmpresa.textContent = calcularIniciais(dados.nomeFantasia);
    }

    // Selo verificado: controlado pelo campo validado (a aprovação em si
    // seguirá pelo fluxo do Suporte; no back real o campo continua sendo a fonte).
    // O contêiner também é oculto para não sobrar barra vazia no perfil.
    const verificado = dados.validado === true;
    if (seloVerificado) seloVerificado.hidden = !verificado;
    if (seloContainer) seloContainer.hidden = !verificado;

    nomeEmpresa.textContent = dados.nomeFantasia;
    // Só cidade/UF — telefone, e-mail e endereço completo ficam restritos
    // ao cadastro formal da empresa.
    localizacaoEmpresa.textContent = `${dados.cidadeComercial || ''}${dados.estadoComercial ? ' - ' + dados.estadoComercial : ''}`;
    descricaoEmpresa.textContent = dados.descricaoPerfil;
    ramoEmpresa.textContent = dados.ramoAtuacao;

    // Referências da empresa (caminhos salvos no banco)
    const referencias = Array.isArray(dados.referencias) ? dados.referencias : [];
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

    preencheEstrelasNotaMedia(dados.mediaAvaliacoes, dados.totalAvaliacoes);
    exibirAvaliacoesRecentes(avaliacoes);
    exibirVagasAtivas(vagas);
}

// Requisição API: Carregar cadastro da empresa e avaliações
async function carregarPerfil() {
    if (!empresaId) {
        loadingBar.setAttribute('hidden', '');
        erroBar.textContent = 'Nenhuma empresa informada. Verifique o link e tente novamente.';
        erroBar.removeAttribute('hidden');
        return;
    }

    try {
        loadingBar.removeAttribute('hidden');
        erroBar.setAttribute('hidden', '');
        conteudoPerfil.setAttribute('hidden', '');

        const respostaEmpresa = await fetch(`${API_URL}/${empresaId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!respostaEmpresa.ok) {
            throw new Error(`Erro HTTP: ${respostaEmpresa.status}`);
        }

        const dadosEmpresa = await respostaEmpresa.json();

        const respostaAvaliacoes = await fetch(`${API_URL_AVALIACOES}?empresaId=${empresaId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!respostaAvaliacoes.ok) {
            throw new Error(`Erro HTTP: ${respostaAvaliacoes.status}`);
        }

        const dadosAvaliacoes = await respostaAvaliacoes.json();

        // O json-server beta não filtra de forma confiável com múltiplos
        // parâmetros — as vagas são filtradas no cliente.
        const respostaVagas = await fetch(`${API_URL_VAGAS}?empresaId=${empresaId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!respostaVagas.ok) {
            throw new Error(`Erro HTTP: ${respostaVagas.status}`);
        }

        const todasVagas = await respostaVagas.json();
        const vagasAtivas = todasVagas.filter(function (vaga) { return vaga.status === 'Aberta'; });

        preencherPerfil(dadosEmpresa, dadosAvaliacoes, vagasAtivas);
        loadingBar.setAttribute('hidden', '');
        conteudoPerfil.removeAttribute('hidden');
    } catch (erro) {
        console.error(erro);
        loadingBar.setAttribute('hidden', '');
        erroBar.removeAttribute('hidden');
    }
}

carregarPerfil();

// Botão "Ver vagas abertas" -> leva até a lista de vagas da empresa nesta mesma
// página. O freelancer se candidata pela vaga (fluxo correto), não por um
// botão genérico de contato direto com a empresa.
const botoesVerVagas = document.querySelectorAll('.btn-ver-vagas');

for (let index = 0; index < botoesVerVagas.length; index++) {
    botoesVerVagas[index].addEventListener('click', () => {
        listaVagasAtivas.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
}
