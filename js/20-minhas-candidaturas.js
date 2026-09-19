// npx json-server --watch db.json --port 3000
// Pendências
// 1. Token JWT
// 2. Paginar resultados

const API_URL = `${API_BASE}/candidaturas`;

// Sempre mostra as candidaturas de quem está realmente logado — nunca um ID fixo.
const sessao = JSON.parse(sessionStorage.getItem("usuarioLogado") || "null");
if (!sessao || sessao.tipo !== "freelancers") {
    window.location.href = "/pages/02-login.html";
}
const freelancerId = sessao ? sessao.id : null;
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
const modalCancelamento = document.querySelector(".modal-static");
const btnConfirmarCancelamento = document.querySelector("#btnConfirmarCancelamento");
const btnFecharCancelamento = document.querySelector("#btnFecharCancelamento");
let candidaturaIdParaCancelar = null;

// Convites recebidos (empresa convidou o freelancer para uma vaga)
const API_URL_CONVITES = `${API_BASE}/convites`;
const cardConvites = document.querySelector("#cardConvites");
const listaConvites = document.querySelector("#listaConvites");
const modalAceitarConvite = document.querySelector("#modalAceitarConvite");
const conviteTituloModal = document.querySelector("#convite-titulo-modal");
const btnCancelarAceiteConvite = document.querySelector("#btnCancelarAceiteConvite");
const btnConfirmarAceiteConvite = document.querySelector("#btnConfirmarAceiteConvite");
let conviteSelecionado = null;


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
    tableRow.dataset.id = dados.id;

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

    // Só pode cancelar enquanto a candidatura/OS ainda está em andamento — uma
    // vez decidida (Selecionado, Rejeitado, Concluída, Cancelada), cancelar por
    // aqui não faz mais sentido (um match já gerou OS/chat; para desistir de uma
    // OS em andamento, isso é feito na tela de Ordens de Serviço).
    const podeCancelar = dados.tipo == "OS"
        ? dados.status == "Em andamento"
        : dados.status == "Em análise";

    if(podeCancelar)
    {
        const botaoCancelar = document.createElement("button");
        botaoCancelar.className = "btn btn-danger";
        botaoCancelar.type = "button";
        botaoCancelar.textContent = "Cancelar";
        botaoCancelar.addEventListener("click", () => {
            candidaturaIdParaCancelar = dados.id;
            modalCancelamento.hidden = false;
        });
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
    tableRow.appendChild(tdNomeEmpresa);
    tableRow.appendChild(tdStatusCandidatura);
    tableRow.appendChild(tdBotoesAcoes);
    bodyListaCandidaturas.appendChild(tableRow);
}

if (freelancerId) {
    carregarDadosFreelancer();
    carregarConvites();
}

// ── Convites recebidos ──────────────────────────────────────────────────────

// Carrega os convites pendentes desse freelancer e renderiza a seção
async function carregarConvites()
{
    if (!cardConvites || !listaConvites) return;

    try
    {
        const resposta = await fetch(`${API_URL_CONVITES}?freelancerId=${freelancerId}&status=Pendente`);
        if (!resposta.ok)
        {
            throw new Error(`Erro HTTP: ${resposta.status}`);
        }

        const convites = await resposta.json();
        listaConvites.innerHTML = "";

        if (convites.length === 0)
        {
            cardConvites.hidden = true;
            return;
        }

        cardConvites.hidden = false;

        convites.forEach(function (convite)
        {
            const item = document.createElement("div");
            item.className = "company-job-item";
            item.innerHTML = `
                <div class="job-details">
                    <h3>${convite.empresaNome || "Empresa"}</h3>
                    <span>Convidou você para a vaga: <strong>${convite.vagaTitulo}</strong></span>
                </div>
                <div class="job-actions">
                    <button class="btn btn-outline-purple btnRecusarConvite" style="padding: 6px 12px; font-size: 0.82rem;">Recusar</button>
                    <button class="btn btn-purple-bright btnAceitarConvite" style="padding: 6px 12px; font-size: 0.82rem;">Aceitar</button>
                </div>
            `;

            item.querySelector(".btnAceitarConvite").addEventListener("click", function ()
            {
                conviteSelecionado = convite;
                if (conviteTituloModal) conviteTituloModal.textContent = convite.vagaTitulo;
                if (modalAceitarConvite) modalAceitarConvite.style.display = "flex";
            });

            item.querySelector(".btnRecusarConvite").addEventListener("click", function ()
            {
                recusarConvite(convite.id);
            });

            listaConvites.appendChild(item);
        });
    }
    catch (erro)
    {
        console.error("Erro ao carregar convites:", erro);
    }
}

async function recusarConvite(conviteId)
{
    try
    {
        const resposta = await fetch(`${API_URL_CONVITES}/${conviteId}`,
        {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "Recusado" })
        });
        if (!resposta.ok)
        {
            throw new Error(`Erro HTTP: ${resposta.status}`);
        }
        carregarConvites();
    }
    catch (erro)
    {
        console.error("Erro ao recusar convite:", erro);
        mensagemErro.removeAttribute("hidden");
    }
}

if (btnCancelarAceiteConvite)
{
    btnCancelarAceiteConvite.addEventListener("click", function ()
    {
        conviteSelecionado = null;
        if (modalAceitarConvite) modalAceitarConvite.style.display = "none";
    });
}

// Aceitar um convite equivale a um match: gera/atualiza a candidatura como
// "Selecionado", rejeita as demais candidaturas em análise daquela vaga,
// encerra a vaga, garante a conversa de chat e cria a Ordem de Serviço — os
// mesmos efeitos de quando a empresa aprova alguém em "Candidatos da Vaga".
if (btnConfirmarAceiteConvite)
{
    btnConfirmarAceiteConvite.addEventListener("click", async function ()
    {
        if (!conviteSelecionado) return;

        const convite = conviteSelecionado;
        if (modalAceitarConvite) modalAceitarConvite.style.display = "none";

        btnConfirmarAceiteConvite.disabled = true;
        const textoOriginal = btnConfirmarAceiteConvite.innerHTML;
        btnConfirmarAceiteConvite.innerHTML = "<span class=\"spinner\"></span> Processando...";

        try
        {
            // 1. Busca (ou cria) a candidatura desse freelancer para essa vaga e a marca "Selecionado".
            const respCandidaturas = await fetch(`${API_BASE}/candidaturas?empresaId=${convite.empresaId}`);
            const candidaturasDaEmpresa = respCandidaturas.ok ? await respCandidaturas.json() : [];
            const candidaturasDaVaga = candidaturasDaEmpresa.filter(function (c) { return String(c.vagaId) === String(convite.vagaId); });
            const candidaturaExistente = candidaturasDaVaga.find(function (c) { return String(c.freelancerId) === String(freelancerId); });

            if (candidaturaExistente)
            {
                await fetch(`${API_BASE}/candidaturas/${candidaturaExistente.id}`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: "Selecionado" })
                });
            }
            else
            {
                await fetch(`${API_BASE}/candidaturas`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        vagaId: convite.vagaId,
                        empresaId: convite.empresaId,
                        empresaNome: convite.empresaNome,
                        nomeEmpresa: convite.empresaNome,
                        titulo: convite.vagaTitulo,
                        freelancerId: freelancerId,
                        freelancerNome: convite.freelancerNome,
                        status: "Selecionado",
                        tipo: "Vaga",
                        link: "18-vaga-detalhe.html"
                    })
                });
            }

            // 2. Rejeita as demais candidaturas dessa vaga que ainda estavam em análise.
            await Promise.all(candidaturasDaVaga
                .filter(function (c) { return c.status === "Em análise" && String(c.freelancerId) !== String(freelancerId); })
                .map(function (c) {
                    return fetch(`${API_BASE}/candidaturas/${c.id}`,
                    {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ status: "Rejeitado" })
                    });
                }));

            // 3. Encerra a vaga — foi preenchida.
            await fetch(`${API_BASE}/vagas/${convite.vagaId}`,
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "Encerrada" })
            });

            // 4. Garante a conversa de chat entre freelancer e empresa (mesma lógica de "Candidatos da Vaga").
            const respConversas = await fetch(`${API_BASE}/conversas`);
            const todasConversas = respConversas.ok ? await respConversas.json() : [];
            const alvoConversa = [String(freelancerId), String(convite.empresaId)].sort();
            const jaExisteConversa = todasConversas.some(function (c) {
                const par = [String(c.participanteAId), String(c.participanteBId)].sort();
                return par[0] === alvoConversa[0] && par[1] === alvoConversa[1];
            });

            if (!jaExisteConversa)
            {
                await fetch(`${API_BASE}/conversas`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        participanteAId: freelancerId,
                        participanteANome: convite.freelancerNome,
                        participanteATipo: "freelancers",
                        participanteBId: convite.empresaId,
                        participanteBNome: convite.empresaNome,
                        participanteBTipo: "empresas",
                        ultimaMensagem: "",
                        ultimaAtualizacao: new Date().toISOString()
                    })
                });
            }

            // 5. Marca o convite como aceito.
            await fetch(`${API_URL_CONVITES}/${convite.id}`,
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "Aceito" })
            });

            // 6. Gera a Ordem de Serviço.
            const respVaga = await fetch(`${API_BASE}/vagas/${convite.vagaId}`);
            const vaga = respVaga.ok ? await respVaga.json() : {};

            const novaOS = {
                titulo: convite.vagaTitulo,
                categoria: vaga.especialidade || "A definir",
                modalidade: vaga.modalidade || "Presencial",
                empresaId: convite.empresaId,
                empresaNome: convite.empresaNome,
                freelancerId: freelancerId,
                freelancerNome: convite.freelancerNome,
                cidade: "",
                estado: "",
                valor: vaga.valor || "",
                descricao: `Ordem de serviço gerada a partir do convite aceito para a vaga "${convite.vagaTitulo}".`,
                requisitos: "",
                habilidades: [],
                status: "Em andamento",
                dataPublicacao: new Date().toISOString(),
                prazo: vaga.prazo || "",
                previsaoConclusao: "",
                avaliacaoFreelancer: "Pendente",
                avaliacaoConfeccao: "Pendente",
                observacoes: "",
                referenciaBriefing: "",
                referenciaEntrega: "",
                historico: [
                    { data: new Date().toISOString().slice(0, 10), evento: "OS criada a partir da aceitação do convite." }
                ]
            };

            const respOS = await fetch(`${API_BASE}/ordensServico`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(novaOS)
            });
            const osCriada = respOS.ok ? await respOS.json() : null;

            conviteSelecionado = null;
            carregarConvites();
            carregarDadosFreelancer();

            if (osCriada)
            {
                window.location.href = `/pages/19-ordem-servico-detalhe.html?id=${osCriada.id}`;
            }
        }
        catch (erro)
        {
            console.error("Erro ao aceitar convite:", erro);
            mensagemErro.removeAttribute("hidden");
        }
        finally
        {
            btnConfirmarAceiteConvite.disabled = false;
            btnConfirmarAceiteConvite.innerHTML = textoOriginal;
        }
    });
}

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

btnFecharCancelamento.addEventListener("click", () => {
    modalCancelamento.hidden = true;
    candidaturaIdParaCancelar = null;
});

btnConfirmarCancelamento.addEventListener("click", async () => {
    if (!candidaturaIdParaCancelar) return;

    try
    {
        const resposta = await fetch(`${API_URL}/${candidaturaIdParaCancelar}`,
        {
            method: "PATCH",
            headers:
            {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ status: "Cancelada" })
        });

        if (!resposta.ok)
        {
            throw new Error(`Erro HTTP: ${resposta.status}`);
        }

        modalCancelamento.hidden = true;
        candidaturaIdParaCancelar = null;
        carregarDadosFreelancer();
    }
    catch (erro)
    {
        console.error(erro);
        mensagemErro.removeAttribute("hidden");
    }
});

// Retorna a classe css do badge de acordo com o status da candidatura
function obterClasseBadgeStatus(status)
{
    if(status == "Em análise" || status == "Cancelada" || status == "Rejeitado")
    {
        return "badge-danger";
    }
    else if(status == "Em andamento")
    {
        return "badge-warning";
    }
    else if(status == "Concluída" || status == "Finalizado" || status == "Selecionado")
    {
        return "badge-success";
    }
    else
    {
        return "badge";
    }
}
