// npx json-server --watch db.json --port 3000
// Pendências
// 1. ID do Freelancer logado
// 2. Token JWT

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
const botoesConvidar = document.querySelectorAll(".btn-convidar");
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

// Mensagem inline (mesmo padrão do Suporte)
function mostrarMensagem(texto, tipo)
{
    const el = document.getElementById("mensagemStatus");
    if (!el) return;
    el.className = `alert alert-${tipo}`; // tipo: 'success' | 'error'
    el.innerHTML = `<i class="bi ${tipo === "success" ? "bi-check-circle-fill" : "bi-exclamation-circle-fill"}"></i> ${texto}`;
    el.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
}

// Confere se a empresa tem uma assinatura com status "ativo" — convidar um
// freelancer é um recurso pago, então isso não pode continuar funcionando pra
// quem nunca contratou nenhum plano (ver tela de Assinatura).
async function empresaTemAssinaturaAtiva(empresaId)
{
    try
    {
        const res = await fetch(`${API_BASE}/assinaturas?empresaId=${empresaId}`);
        if (!res.ok) return false;
        const assinaturas = await res.json();
        return assinaturas.some(function (a) { return a.status === "ativo"; });
    }
    catch (erro)
    {
        console.error("Erro ao verificar assinatura:", erro);
        return false;
    }
}

// Botão "Convidar para vaga" -> abre modal para escolher a vaga antes de registrar o convite
const modalConvidar = document.getElementById("modalConvidar");
const listaVagasConvite = document.getElementById("convidar-lista-vagas");
const btnCancelarConvite = document.getElementById("btnCancelarConvite");
const btnConfirmarConvite = document.getElementById("btnConfirmarConvite");
const nomeFreelancerConvite = document.getElementById("convidar-nome-freelancer");
let vagaSelecionadaConvite = null;

function fecharModalConvidar()
{
    if (modalConvidar) modalConvidar.style.display = "none";
    vagaSelecionadaConvite = null;
    if (btnConfirmarConvite) btnConfirmarConvite.disabled = true;
}

async function abrirModalConvidar()
{
    const sessao = JSON.parse(sessionStorage.getItem("usuarioLogado") || "null");

    if (!sessao || sessao.tipo !== "empresas")
    {
        mostrarMensagem("Apenas empresas logadas podem convidar freelancers para uma vaga.", "error");
        return;
    }

    const assinaturaAtiva = await empresaTemAssinaturaAtiva(sessao.id);
    if (!assinaturaAtiva)
    {
        mostrarMensagem("Sua empresa não tem uma assinatura ativa. Contrate um plano na página de Assinatura para convidar freelancers.", "error");
        return;
    }

    if (nomeFreelancerConvite) nomeFreelancerConvite.textContent = nomeFreelancer.textContent || "este freelancer";
    if (listaVagasConvite) listaVagasConvite.innerHTML = "<p class=\"text-muted\">Carregando suas vagas abertas...</p>";
    if (modalConvidar) modalConvidar.style.display = "flex";

    try
    {
        const resposta = await fetch(`${API_BASE}/vagas?empresaId=${sessao.id}&status=Aberta`);
        if (!resposta.ok) throw new Error(`Erro HTTP: ${resposta.status}`);
        const vagasAbertas = await resposta.json();

        if (!listaVagasConvite) return;
        listaVagasConvite.innerHTML = "";

        if (vagasAbertas.length === 0)
        {
            listaVagasConvite.innerHTML = "<p class=\"text-muted\">Você não tem nenhuma vaga aberta no momento. Publique uma vaga antes de convidar um freelancer.</p>";
            return;
        }

        vagasAbertas.forEach(function (vaga)
        {
            const opcao = document.createElement("label");
            opcao.className = "checkbox-label";
            opcao.style.cssText = "border:1px solid var(--border); border-radius:8px; padding:10px 12px; cursor:pointer;";
            opcao.innerHTML = `
                <input type="radio" name="vaga-convite" value="${vaga.id}">
                <span>${vaga.titulo} <span class="text-muted" style="font-size:12px;">(${vaga.especialidade || "—"} · ${vaga.valor || "—"})</span></span>
            `;
            listaVagasConvite.appendChild(opcao);
        });

        listaVagasConvite.querySelectorAll('input[name="vaga-convite"]').forEach(function (radio)
        {
            radio.addEventListener("change", function ()
            {
                vagaSelecionadaConvite = vagasAbertas.find(function (v) { return String(v.id) === String(radio.value); }) || null;
                if (btnConfirmarConvite) btnConfirmarConvite.disabled = !vagaSelecionadaConvite;
            });
        });
    }
    catch (erro)
    {
        console.error("Erro ao carregar vagas abertas para convite:", erro);
        if (listaVagasConvite) listaVagasConvite.innerHTML = "<p class=\"text-muted\">Não foi possível carregar suas vagas. Verifique se o json-server está rodando.</p>";
    }
}

for (let index = 0; index < botoesConvidar.length; index++)
{
    botoesConvidar[index].addEventListener("click", abrirModalConvidar);
}

if (btnCancelarConvite) btnCancelarConvite.addEventListener("click", fecharModalConvidar);

if (btnConfirmarConvite)
{
    btnConfirmarConvite.addEventListener("click", async function ()
    {
        const sessao = JSON.parse(sessionStorage.getItem("usuarioLogado") || "null");
        if (!sessao || sessao.tipo !== "empresas" || !vagaSelecionadaConvite) return;

        btnConfirmarConvite.disabled = true;
        const textoOriginal = btnConfirmarConvite.innerHTML;
        btnConfirmarConvite.innerHTML = "<span class=\"spinner\"></span> Enviando...";

        try
        {
            // Evita convidar o mesmo freelancer duas vezes para a mesma vaga.
            const respostaExistentes = await fetch(`${API_BASE}/convites?empresaId=${sessao.id}`);
            const convitesDaEmpresa = respostaExistentes.ok ? await respostaExistentes.json() : [];
            const jaConvidado = convitesDaEmpresa.some(function (c) {
                return String(c.vagaId) === String(vagaSelecionadaConvite.id) && String(c.freelancerId) === String(freelancerId) && c.status !== 'Recusado';
            });

            if (jaConvidado)
            {
                fecharModalConvidar();
                mostrarMensagem("Você já convidou este freelancer para essa vaga.", "error");
                return;
            }

            const novoConvite = {
                vagaId: vagaSelecionadaConvite.id,
                vagaTitulo: vagaSelecionadaConvite.titulo,
                empresaId: sessao.id,
                empresaNome: sessao.nome,
                freelancerId: freelancerId,
                freelancerNome: nomeFreelancer.textContent || "",
                status: "Pendente",
                tipo: "Convite",
                criadoEm: new Date().toISOString()
            };

            const resposta = await fetch(`${API_BASE}/convites`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(novoConvite)
            });
            if (!resposta.ok) throw new Error(`Erro HTTP: ${resposta.status}`);

            // Avisa o freelancer que ele recebeu um convite.
            fetch(`${API_BASE}/notificacoes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    usuarioId: freelancerId,
                    usuarioTipo: "freelancers",
                    tipo: "convite",
                    titulo: "Novo convite de vaga",
                    mensagem: `${sessao.nome} convidou você para a vaga "${novoConvite.vagaTitulo}".`,
                    lida: false,
                    criadoEm: new Date().toISOString(),
                    link: "/pages/20-minhas-candidaturas.html"
                })
            }).catch(function (erro) { console.error("Erro ao criar notificação de convite:", erro); });

            fecharModalConvidar();
            mostrarMensagem(`Convite para a vaga "${novoConvite.vagaTitulo}" enviado ao freelancer!`, "success");
        }
        catch (erro)
        {
            console.error("Erro ao registrar convite:", erro);
            mostrarMensagem("Não foi possível registrar o convite. Verifique se o json-server está rodando.", "error");
        }
        finally
        {
            btnConfirmarConvite.disabled = false;
            btnConfirmarConvite.innerHTML = textoOriginal;
        }
    });
}
