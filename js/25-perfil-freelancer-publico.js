// npx json-server --watch db.json --port 3000
// Pendências
// 1. ID do Freelancer logado
// 2. Token JWT
// 3. Fetch no botão 'Convidar para Vaga'

const API_URL = `${API_BASE}/freelancers`;
const API_URL_AVALIACOES = `${API_BASE}/avaliacoes`;
const freelancerId = new URLSearchParams(window.location.search).get("id") || "-DU9G2RSk6s";
const loadingBar = document.querySelector("#perfil-loading");
const erroBar = document.querySelector("#perfil-erro");
const conteudoPerfil = document.querySelector("#perfil-conteudo");
const avatarFreelancer = document.querySelector("#avatar-freelancer");
const nomeFreelancer = document.querySelector("#nome-freelancer");
const estrelasMedia = document.querySelector("#estrelas-media");
const textoAvaliacoes = document.querySelector("#texto-avaliacoes");
const localizacaoFreelancer = document.querySelector("#localizacao-freelancer");
const badgeTipoNegocio = document.querySelector("#badge-tipo-negocio");
const descricaoFreelancer = document.querySelector("#descricao-freelancer");
const listaEspecialidades = document.querySelector("#lista-especialidades");
const listaMaquinas = document.querySelector("#lista-maquinas");
const listaAvaliacoes = document.querySelector("#lista-avaliacoes");
const botoesConvidar = document.querySelectorAll(".btn-primary.btn-lg");
const infoTipoNegocio = document.querySelector("#info-tipo-negocio");
const infoExperiencia = document.querySelector("#info-experiencia");
const infoOficina = document.querySelector("#info-oficina");
const infoDisponibilidade = document.querySelector("#info-disponibilidade");
const infoPreferencias = document.querySelector("#info-preferencias");
const infoFechamento = document.querySelector("#info-fechamento");
const infoProdutorFixo = document.querySelector("#info-produtor-fixo");
const infoVeiculo = document.querySelector("#info-veiculo");
const infoFaturamento = document.querySelector("#info-faturamento");
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
    const partesNome = nome.trim().split(" ");
    const primeiraLetraNome = partesNome[0].charAt(0);
    const primeiraLetraSobreNome = partesNome[partesNome.length - 1].charAt(0);
    return (primeiraLetraNome + primeiraLetraSobreNome).toUpperCase();
}

// Cria Badges para as Especialidades e Máquinas a partir dos dados da API
function marcarSelecionados(campoMultiSelect, valoresSelecionados) 
{
    campoMultiSelect.innerHTML = "";

    for (let index = 0; index < valoresSelecionados.length; index++) 
    {
        const badge = document.createElement("span");
        badge.className = "badge";
        badge.textContent = valoresSelecionados[index];
        campoMultiSelect.appendChild(badge);
    }
}

// Preenche a avaliação média do freelancer | Escala: 1 a 5 estrelas
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

// Monta os cards para exibir as três avaliações mais recentes do Freelancer
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

// Preenche os campos com os dados recebidos da API
function preencherPerfil(dados, avaliacoes) 
{
    avatarFreelancer.textContent = calcularIniciais(dados.nome);
    nomeFreelancer.textContent = dados.nome;
    localizacaoFreelancer.textContent = `${dados.bairroResidencial}, ${dados.cidadeResidencial} - ${dados.estadoResidencial}`;
    badgeTipoNegocio.textContent = dados.tipoNegocio;
    descricaoFreelancer.textContent = dados.descricao;
    infoTipoNegocio.textContent = dados.tipoNegocio;
    infoExperiencia.textContent = dados.tempoExperiencia;
    infoOficina.textContent = dados.tamanhoOficina;
    infoDisponibilidade.textContent = dados.disponibilidadeHorario;
    infoPreferencias.textContent = dados.preferenciaDeFreela;
    infoFechamento.textContent = dados.comoFechaServicos;
    infoProdutorFixo.textContent = dados.temProdutorFixo ? "Sim" : "Não";
    infoVeiculo.textContent = dados.temVeiculo ? "Sim" : "Não";
    infoFaturamento.textContent = dados.faturamentoMedio;
    marcarSelecionados(listaEspecialidades, dados.especialidades);
    marcarSelecionados(listaMaquinas, dados.maquinas);
    preencheEstrelasNotaMedia(dados.mediaAvaliacoes, dados.totalAvaliacoes);
    exibirAvaliacoesRecentes(avaliacoes);
}

// Requisição API: Carregar cadastro do freelancer e avaliações
async function carregarPerfil() 
{
    try {
        loadingBar.removeAttribute("hidden"); // #perfil-loading
        erroBar.setAttribute("hidden", ""); // #perfil-erro
        conteudoPerfil.setAttribute("hidden", ""); // #perfil-conteudo

        const respostaFreelancer = await fetch(`${API_URL}/${freelancerId}`, 
        {
            method: "GET",
            headers: 
            {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
        });

        if (!respostaFreelancer.ok) {
            throw new Error(`Erro HTTP: ${respostaFreelancer.status}`);
        }

        const dadosFreelancer = await respostaFreelancer.json();

        const respostaAvaliacoes = await fetch(`${API_URL_AVALIACOES}?freelancerId=${freelancerId}`,
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

        preencherPerfil(dadosFreelancer, dadosAvaliacoes);

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

// Botão "Convidar para vaga"
for (let index = 0; index < botoesConvidar.length; index++) 
{
    botoesConvidar[index].addEventListener("click", () => 
    {
        alert("Convite enviado para o freelancer!");
    });
}
