// npx json-server --watch db.json --port 3000
// Pendências
// 1. ID do Freelancer logado
// 2. Token JWT
// 3. Requisição Cancelamento da Candidatura + UI Cancelamento
// 4. Paginar resultados

const API_URL = `${API_BASE}/candidaturas`;
const freelancerId = "-DU9G2RSk6s";
let token;
const loadingBar = document.querySelector("#perfil-loading");
const erroBar = document.querySelector("#perfil-erro");
const conteudoPerfil = document.querySelector("#perfil-conteudo");
const botaoFiltrar = document.querySelector("#btnFiltrar");
const botaoLimparFiltros = document.querySelector("#btnLimparFiltros");
const filtroTituloVaga = document.querySelector("#filterTituloVaga");
const filtroStatusVaga = document.querySelector("#filterStatusVaga");
const filtroTipoVaga = document.querySelector("#filterTipoVaga");
const bodyListaCandidaturas = document.querySelector("tbody");
const mensagemErro = document.querySelector("#msg-error");
const mensagemVazio = document.querySelector("#msg-empty");


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

// Carregar as candidaturas e ordens de serviço do Freelancer via API
async function carregarDadosFreelancer() 
{
    try 
    {
        loadingBar.removeAttribute("hidden"); // #perfil-loading
        erroBar.setAttribute("hidden", ""); // #perfil-erro
        conteudoPerfil.setAttribute("hidden", ""); // #perfil-conteudo
        
        const urlFiltros = geraURLFiltros();

        const resposta = await fetch(`${API_URL}/?freelancerId=${freelancerId}${urlFiltros}`, 
        {
            method: "GET",
            headers: 
            {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
        });

        if (!resposta.ok) 
        {
            throw new Error(`Erro HTTP: ${resposta.status}`);
        }

        limparLista();

        const dados = await resposta.json();       

        for (let index = 0; index < dados.length; index++) {
            const element = dados[index];
            preencherLista(element); 
        }

        if(dados.length === 0)
        {
            mensagemVazio.removeAttribute("hidden");
        }
        


        // Controle da exibição das páginas
        const divPagination = document.querySelector(".pagination");
        const resumoPaginas = document.querySelector("#resumoPaginas");

        if(dados.length === 0)
        {
            resumoPaginas.textContent = "";
        }
        if(dados.length > 0 && dados.length < 10)
        {
            resumoPaginas.textContent = `Mostrando 1-${dados.length} de ${dados.length}`;
        }

        if(dados.length >= 10)
        {
            resumoPaginas.textContent = `Mostrando 1-10 de ${dados.length}`;
        }

        const paginas = document.querySelector("#pages");
        paginas.innerHTML = "";

        let qtdPaginas = Math.ceil(dados.length / 10);
        
        if(qtdPaginas > 0)
        {
            for (let index = 0; index < qtdPaginas; index++) 
            {
                const pagina = document.createElement("span");
                pagina.textContent = index + 1;
                
                if(index === 0)
                {
                    pagina.classList = "page-btn active";
                }
                else
                {
                    pagina.classList = "page-btn";
                }

                paginas.appendChild(pagina);
            }
        }



        loadingBar.setAttribute("hidden", "");
        conteudoPerfil.removeAttribute("hidden");
    } 
    catch (erro)
    {
        console.error(erro);
        loadingBar.setAttribute("hidden", "");
        mensagemErro.removeAttribute("hidden");
    }
}

// Preenche a lista com os dados recebidos da API
function preencherLista(dados) 
{
    const tableRow = document.createElement("tr");
    
    const tdTipoVaga = document.createElement("td");
    tdTipoVaga.textContent = dados.tipo;

    const tdTituloVaga = document.createElement("td");
    tdTituloVaga.textContent = dados.titulo;
    
    const tdNomeEmpresa = document.createElement("td");
    tdNomeEmpresa.textContent = dados.nomeEmpresa;

    const tdStatusCandidatura = document.createElement("td");
    const badgeStatus = document.createElement("span");
    badgeStatus.className = `badge ${obterClasseBadgeStatus(dados.status)}`;
    badgeStatus.textContent = dados.status;
    tdStatusCandidatura.appendChild(badgeStatus);

    const tdBotoesAcoes = document.createElement("td");
    const divBotoesAcoes = document.createElement("div");
    divBotoesAcoes.className = "table-actions";
    const botaoVisualizar = document.createElement("a");
    botaoVisualizar.className = "btn btn-primary";
    botaoVisualizar.textContent = "Detalhar";
    
    if(dados.tipo == "Vaga")
    {
        botaoVisualizar.href = "/pages/18-vaga-detalhe.html";
    }
    else
    {
        botaoVisualizar.href = "/pages/19-ordem-servico-detalhe.html";
    }

    divBotoesAcoes.appendChild(botaoVisualizar);

    if(dados.status != "Finalizado")
    {
        const botaoCancelar = document.createElement("button");
        botaoCancelar.className = "btn btn-danger";
        botaoCancelar.type = "button";
        botaoCancelar.textContent = "Cancelar";
        divBotoesAcoes.appendChild(botaoCancelar);
    }

    if(dados.tipo == "OS" && dados.status == "Finalizado")
    {
        const botaoAvaliar = document.createElement("a");
        botaoAvaliar.className = "btn";
        botaoAvaliar.textContent = "Avaliar";
        botaoAvaliar.href = "/pages/23-avaliacao-os.html";
        divBotoesAcoes.appendChild(botaoAvaliar);
    }

    tdBotoesAcoes.appendChild(divBotoesAcoes);
    tableRow.appendChild(tdTipoVaga);
    tableRow.appendChild(tdTituloVaga);
    tableRow.appendChild(tdTituloVaga);
    tableRow.appendChild(tdNomeEmpresa);
    tableRow.appendChild(tdStatusCandidatura);
    tableRow.appendChild(tdBotoesAcoes);
    bodyListaCandidaturas.appendChild(tableRow);
}

carregarDadosFreelancer();

// Gera URL customizada com os filtros aplicados na página
function geraURLFiltros() 
{
    let urlFiltro = "";    

    if (filtroTituloVaga.value != "")
    {
        const urlFiltroTitulo = `&titulo_contains=${filtroTituloVaga.value}`;
        urlFiltro = urlFiltro.concat(urlFiltroTitulo);
    }

    if (filtroStatusVaga.value != "")
    {
        const urlFiltroStatus = `&status=${filtroStatusVaga.value}`;
        urlFiltro = urlFiltro.concat(urlFiltroStatus);
    }

    if (filtroTipoVaga.value != "")
    {
        const urlFiltroTipo = `&tipo=${filtroTipoVaga.value}`;
        urlFiltro = urlFiltro.concat(urlFiltroTipo);
    }

    if (urlFiltro != "")
    {
        urlFiltro = urlFiltro.replaceAll(" ", "%20");
    }

    return urlFiltro;
}

// Apaga todas as linhas da lista existente
function limparLista()
{
    const tabela = document.querySelector("tbody");

    while (tabela.rows.length > 0)
    {
        tabela.deleteRow(0);
    }
}

botaoFiltrar.addEventListener("click", (evento) => {
    evento.preventDefault();
    carregarDadosFreelancer();
})


botaoLimparFiltros.addEventListener("click", (evento) => {
    evento.preventDefault();
    filtroTituloVaga.value = "";
    filtroStatusVaga.value = "";
    filtroTipoVaga.value = "";
    carregarDadosFreelancer();
})

// Retorna a classe css do badge de acordo com o status da candidatura
function obterClasseBadgeStatus(status)
{
    if(status == "Em análise" || status == "Cancelada")
    {
        return "badge-danger";
    }
    else if(status == "Em andamento")
    {
        return "badge-warning";
    }
    else if(status == "Concluída" || status == "Finalizado")
    {
        return "badge-success";
    }
    else
    {
        return "badge";
    }
}
