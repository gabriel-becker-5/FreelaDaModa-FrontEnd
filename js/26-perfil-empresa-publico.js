// npx json-server --watch db.json --port 3000
// Pendências
// 1. ID da Empresa logada
// 2. Token JWT
// 3. Fetch no botão 'Entrar em contato'

const API_URL = `${API_BASE}/empresas`;
const API_URL_VAGAS = `${API_BASE}/vagas`;
const API_URL_AVALIACOES = `${API_BASE}/avaliacoes`;
const empresaId = new URLSearchParams(window.location.search).get("id") || "0UEUrH8HgJE";
const form = document.querySelector("form");
const loadingBar = document.querySelector("#perfil-loading");
const erroBar = document.querySelector("#perfil-erro");
const conteudoPerfil = document.querySelector("#perfil-conteudo");
const avatarEmpresa = document.querySelector("#avatar-empresa");
const nomeEmpresa = document.querySelector("#nome-empresa");
const estrelasMedia = document.querySelector("#estrelas-media");
const textoAvaliacoes = document.querySelector("#texto-avaliacoes");
const localizacaoEmpresa = document.querySelector("#localizacao-empresa");
const descricaoEmpresa = document.querySelector("#descricao-empresa");
const ramoEmpresa = document.querySelector("#ramo-empresa");
const telefoneEmpresa = document.querySelector("#telefone-empresa");
const emailEmpresa = document.querySelector("#email-empresa");
const enderecoEmpresa = document.querySelector("#endereco-empresa");
const listaAvaliacoes = document.querySelector("#lista-avaliacoes");
const listaVagasAtivas = document.querySelector("#lista-vagas-ativas");
let token;

// Toggle Menu Mobile (Hambúrguer)
const sidebarToggleBtn = document.querySelector(".sidebar-toggle-btn");
const sidebar = document.querySelector(".sidebar");
const sidebarOverlay = document.querySelector(".sidebar-overlay");
 
function abrirMenu() 
{
    sidebar.classList.add("open");
    sidebarOverlay.classList.add("open");
    sidebarToggleBtn.classList.add("open");
    sidebarToggleBtn.setAttribute("aria-expanded", "true");
}
 
function fecharMenu() 
{
    sidebar.classList.remove("open");
    sidebarOverlay.classList.remove("open");
    sidebarToggleBtn.classList.remove("open");
    sidebarToggleBtn.setAttribute("aria-expanded", "false");
}
 
sidebarToggleBtn.addEventListener("click", () => 
{
    sidebar.classList.contains("open") ? fecharMenu() : abrirMenu();
});
 
sidebarOverlay.addEventListener("click", fecharMenu);

// Calcula iniciais do nome para Avatar
function calcularIniciais(nome) 
{
    const partesNomeEmpresa = nome.trim().split(" ");
    const primeiraParte = partesNomeEmpresa[0].charAt(0);
    const segundaParte = partesNomeEmpresa[partesNomeEmpresa.length - 1].charAt(0);
    return (primeiraParte + segundaParte).toUpperCase();
}

// Preenche a avaliação média da empresa | Escala: 1 a 5 estrelas
function preencheEstrelasNotaMedia(avaliacaoMedia, totalAvaliacoes) 
{
    estrelasMedia.innerHTML = "";

    if (totalAvaliacoes <= 0 || avaliacaoMedia <= 0) 
    {
        textoAvaliacoes.textContent = "Freelancer sem avaliações.";
        return;
    }

    for (let contador = 1; contador <= 5; contador++) {
        const estrela = document.createElement("i");
        estrela.className = contador <= Math.round(avaliacaoMedia) ? "bi bi-star-fill" : "bi bi-star";
        estrelasMedia.appendChild(estrela);
    }

    textoAvaliacoes.textContent = `${avaliacaoMedia.toFixed(1)}  ·  ${totalAvaliacoes} avaliações`;
}

// Monta os cards para exibir as três avaliações mais recentes da Empresa
function exibirAvaliacoesRecentes(avaliacoes) 
{
    const maximoAvaliacoes = 3;
    listaAvaliacoes.innerHTML = "";

    if (avaliacoes.length < 1) 
    {
        listaAvaliacoes.innerHTML = "<p>Não há avaliações no momento.</p>";
        return;
    }

    for (let index = 0; index < maximoAvaliacoes; index++) 
    {
        const avaliacao = avaliacoes[index];

        const card = document.createElement("div");
        card.className = "review-card";
        const comentario = document.createElement("p");
        comentario.textContent = `"${avaliacao.comentario}"`;

        const autorDiv = document.createElement("div");
        autorDiv.className = "review-author";
        const autorNome = document.createElement("strong");
        autorNome.textContent = avaliacao.autor;

        const estrelasDaAvaliacao = document.createElement("span");
        estrelasDaAvaliacao.className = "review-stars";

        for (let contador = 1; contador <= 5; contador++) 
        {
            const estrela = document.createElement("i");
            estrela.className = contador <= avaliacao.nota ? "bi bi-star-fill" : "bi bi-star";
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
function exibirVagasAtivas(vagas) 
{
    const maximoVagas = 3;
    listaVagasAtivas.innerHTML = "";

    if (vagas.length < 1) 
    {
        listaVagasAtivas.innerHTML = "<p>Não há vagas ativas no momento.</p>";
        return;
    }

    for (let index = 0; index < Math.min(vagas.length, maximoVagas); index++) 
    {
        const vaga = vagas[index];

        const card = document.createElement("div");
        card.className = "card";
        card.style.background = "var(--surface-alt)";
        card.style.padding = "14px";

        const divClusterBetween = document.createElement("div");
        divClusterBetween.className = "cluster-between";
        
        const apenasDIV = document.createElement("div");

        const tituloDaVaga = document.createElement("strong");
        tituloDaVaga.style.cssText = "font-size: 14px;";
        tituloDaVaga.textContent = vaga.titulo;

        const detalheVaga = document.createElement("p");
        detalheVaga.textContent = `R$ ${vaga.valor} · ${vaga.modalidade}`;
        detalheVaga.style.cssText = "font-size: 12px; margin: 2px 0;";

        const divCluster = document.createElement("div");
        divCluster.className = "cluster";

        const linkVaga = document.createElement('a');
        linkVaga.textContent = 'Ver vaga';
        linkVaga.href = vaga.link;
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

// Preenche os campos com os dados recebidos da API
function preencherPerfil(dados, avaliacoes, vagas) 
{
    avatarEmpresa.textContent = calcularIniciais(dados.nomeFantasia);
    nomeEmpresa.textContent = dados.nomeFantasia;
    localizacaoEmpresa.textContent = `${dados.bairroComercial}, ${dados.cidadeComercial} - ${dados.estadoComercial}`;
    descricaoEmpresa.textContent = dados.descricaoPerfil;
    ramoEmpresa.textContent = dados.ramoAtuacao;
    telefoneEmpresa.textContent = dados.telefone;
    emailEmpresa.textContent = dados.email;
    enderecoEmpresa.textContent = `${dados.enderecoComercial}, ${dados.numeroComercial} | ${dados.complementoComercial}`;
    preencheEstrelasNotaMedia(dados.mediaAvaliacoes, dados.totalAvaliacoes);
    exibirAvaliacoesRecentes(avaliacoes);
    exibirVagasAtivas(vagas);
}

// Requisição API: Carregar cadastro da empresa e avaliações
async function carregarPerfil() 
{
    try {
        loadingBar.removeAttribute("hidden"); // #perfil-loading
        erroBar.setAttribute("hidden", ""); // #perfil-erro
        conteudoPerfil.setAttribute("hidden", ""); // #perfil-conteudo

        const respostaEmpresa = await fetch(`${API_URL}/${empresaId}`, 
        {
            method: "GET",
            headers: 
            {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
        });

        if (!respostaEmpresa.ok) {
            throw new Error(`Erro HTTP: ${respostaEmpresa.status}`);
        }

        const dadosEmpresa = await respostaEmpresa.json();

        const respostaAvaliacoes = await fetch(`${API_URL_AVALIACOES}?empresaId=${empresaId}`,
        {
            method: "GET",
            headers: 
            {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
        });

        if (!respostaAvaliacoes.ok) 
        {
            throw new Error(`Erro HTTP: ${respostaAvaliacoes.status}`);
        }

        const dadosAvaliacoes = await respostaAvaliacoes.json();

        const respostaVagas = await fetch(`${API_URL_VAGAS}?empresaId=${empresaId}&status=ativa`,
        {
            method: "GET",
            headers: 
            {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
        });

        if (!respostaVagas.ok) 
        {
            throw new Error(`Erro HTTP: ${respostaVagas.status}`);
        }

        const dadosVagas = await respostaVagas.json();


        preencherPerfil(dadosEmpresa, dadosAvaliacoes, dadosVagas);
        loadingBar.setAttribute("hidden", "");
        conteudoPerfil.removeAttribute("hidden");
    } 
    catch (erro) 
    {
        console.error(erro);
        loadingBar.setAttribute("hidden", "");
        erroBar.removeAttribute("hidden");
    }
}

carregarPerfil();


// Botão "Entrar em contato" -> redireciona para chat
const botoesContatar = document.querySelectorAll(".btn-primary.btn-lg");

for (let index = 0; index < botoesContatar.length; index++) 
{
    botoesContatar[index].addEventListener("click", () => 
    {
        window.location.href = "/pages/11-chat.html";
    });
}
