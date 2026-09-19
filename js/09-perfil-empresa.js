// npx json-server --watch db.json --port 3000
// Pendências
// 1. Token JWT

const API_URL = `${API_BASE}/empresas`;

// Sempre edita o perfil de quem está realmente logado — nunca um ID fixo.
const sessao = JSON.parse(sessionStorage.getItem("usuarioLogado") || "null");
if (!sessao || sessao.tipo !== "empresas") {
    window.location.href = "/pages/02-login.html";
}
const empresaId = sessao ? sessao.id : null;
const form = document.querySelector("form");
const inputNomeResponsavel = document.querySelector("#pe-resp");
const inputCPFResponsavel = document.querySelector("#pe-cpf");
const inputRazaoSocial = document.querySelector("#pe-razao");
const inputNomeFantasia = document.querySelector("#pe-fantasia");
const inputCNPJ = document.querySelector("#pe-cnpj");
const inputRamoAtuacao = document.querySelector("#pe-ramo");
const inputEmail = document.querySelector("#pe-email");
const inputTelefone = document.querySelector("#pe-telefone");
const inputDescricao = document.querySelector("#pe-descricao");
const inputCepComercial = document.querySelector("#pe-cep");
const inputEnderecoComercial = document.querySelector("#pe-endereco");
const inputNumeroComercial = document.querySelector("#pe-numero");
const inputBairroComercial = document.querySelector("#pe-bairro");
const inputComplementoComercial = document.querySelector("#pe-complemento");
const inputCidadeComercial = document.querySelector("#pe-cidade");
const inputEstadoComercial = document.querySelector("#pe-estado");
const alertBar = document.querySelector(".alert.alert-success");

function mostrarMensagem(texto, tipo) {
    if (!alertBar) return;
    alertBar.className = `alert alert-${tipo}`; // tipo: 'success' | 'error'
    alertBar.innerHTML = `<i class="bi ${tipo === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'}"></i> ${texto}`;
    alertBar.removeAttribute("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
}
let mediaEmpresa;
let totalAvaliacao;
let token;
const loadingBar = document.querySelector("#perfil-loading");
const erroBar = document.querySelector("#perfil-erro");
const conteudoPerfil = document.querySelector("#perfil-conteudo");

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

// Busca endereço via API
async function consultaCEP(campoCEP, campoEndereco, campoNumero, campoBairro, campoCidade, campoEstado, campoComplemento) {
    try {
        const cep = campoCEP.value.replace(/\D/g, "");
        const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`, 
        {
            method: "GET"
        });
        
        const dados = await resposta.json();

        if(dados.erro) 
        {
            campoEndereco.value = "";
            campoCidade.value = "";
            campoEstado.value = "";
            campoComplemento.value = "";
            campoNumero.value = "";
            campoComplemento.value = "";
            campoBairro.value = "";
            campoCEP.value = "";
            mostrarMensagem("Verifique o CEP informado, endereço incorreto ou não localizado.", "error");
            return;
        }
        else 
        {
            campoEndereco.value = dados.logradouro;
            campoBairro.value = dados.bairro;
            campoCidade.value = dados.localidade;
            campoEstado.value = dados.estado;
            campoNumero.value = "";
            campoComplemento.value = "";
        }
    } 
    catch (erro) 
    {
        console.error(erro);
    }
}

// Máscara de Telefone 
function mascaraTelefone(campo) 
{
    const numeros = campo.value.replace(/\D/g, "").slice(0, 11);

    if(numeros.length <= 10) 
    {
        campo.value = numeros.replace(/(\d{2})(\d{0,4})(\d{0,4})/, (_, ddd, inicio, fim) => 
        {
            if(!inicio) return `(${ddd}`;
            if(!fim) return `(${ddd}) ${inicio}`;
            return `(${ddd}) ${inicio}-${fim}`;
        });
        return;
    }

    campo.value = numeros.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
}

inputTelefone.addEventListener("input", () => mascaraTelefone(inputTelefone));

// Máscara de CEP (Comercial e Residencial)
function mascaraCEP(campo) 
{
    const numeros = campo.value.replace(/\D/g, "").slice(0, 8);
    campo.value = numeros.length > 5
        ? `${numeros.slice(0, 5)}-${numeros.slice(5)}`
        : numeros;
}

inputCepComercial.addEventListener("input", () => mascaraCEP(inputCepComercial));

// Máscara de CNPJ
function mascaraCNPJ(campo)
{
    const caracteres = campo.value
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase()
        .slice(0, 14);

    campo.value = caracteres.replace(
        /([A-Z0-9]{2})([A-Z0-9]{3})([A-Z0-9]{3})([A-Z0-9]{4})([A-Z0-9]{0,2})/,
        (_, parte1, parte2, parte3, parte4, parte5) =>
        {
            if(!parte2) return parte1;
            if(!parte3) return `${parte1}.${parte2}`;
            if(!parte4) return `${parte1}.${parte2}.${parte3}`;
            if(!parte5) return `${parte1}.${parte2}.${parte3}/${parte4}`;

            return `${parte1}.${parte2}.${parte3}/${parte4}-${parte5}`;
        }
    );
}

inputCNPJ.addEventListener("input", () => mascaraCNPJ(inputCNPJ));

// Máscara de CPF
function mascaraCPF(campo)
{
    const numeros = campo.value
        .replace(/\D/g, "")
        .slice(0, 11);

    campo.value = numeros.replace(
        /(\d{3})(\d{3})(\d{3})(\d{0,2})/,
        (_, parte1, parte2, parte3, parte4) =>
        {
            if(!parte2) return parte1;
            if(!parte3) return `${parte1}.${parte2}`;
            if(!parte4) return `${parte1}.${parte2}.${parte3}`;

            return `${parte1}.${parte2}.${parte3}-${parte4}`;
        }
    );
}

inputCPFResponsavel.addEventListener("input", () => mascaraCPF(inputCPFResponsavel));

// Busca endereço via API
async function consultaCEP(campoCEP, campoEndereco, campoNumero, campoBairro, campoCidade, campoEstado, campoComplemento) {
    try {
        const cep = campoCEP.value.replace(/\D/g, "");
        const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`, 
        {
            method: "GET"
        });
        
        const dados = await resposta.json();

        if(dados.erro) 
        {
            campoEndereco.value = "";
            campoCidade.value = "";
            campoEstado.value = "";
            campoComplemento.value = "";
            campoNumero.value = "";
            campoComplemento.value = "";
            campoBairro.value = "";
            campoCEP.value = "";
            mostrarMensagem("Verifique o CEP informado, endereço incorreto ou não localizado.", "error");
            return;
        }
        else 
        {
            campoEndereco.value = dados.logradouro;
            campoBairro.value = dados.bairro;
            campoCidade.value = dados.localidade;
            campoEstado.value = dados.estado;
            campoNumero.value = "";
            campoComplemento.value = "";
        }
    } 
    catch (erro) 
    {
        console.error(erro);
    }
}

inputCepComercial.addEventListener("change", () => 
{
    consultaCEP(inputCepComercial, 
                inputEnderecoComercial, 
                inputNumeroComercial, 
                inputBairroComercial, 
                inputCidadeComercial, 
                inputEstadoComercial, 
                inputComplementoComercial);
});

// Carregar dados da Empresa logada via API
async function carregarDadosEmpresa() 
{
    try 
    {
        loadingBar.removeAttribute("hidden"); // #perfil-loading
        erroBar.setAttribute("hidden", ""); // #perfil-erro
        conteudoPerfil.setAttribute("hidden", ""); // #perfil-conteudo

        const resposta = await fetch(`${API_URL}/${empresaId}`, 
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

        const dados = await resposta.json();
        preencherPerfil(dados);        
        mediaEmpresa = dados.mediaAvaliacoes;        
        totalAvaliacao = dados.totalAvaliacoes;

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

// Preencher os campos com os dados da API
function preencherPerfil(dados) 
{
    inputNomeResponsavel.value = dados.nomeResponsavel;
    inputCPFResponsavel.value = dados.cpfResponsavel;
    mascaraCPF(inputCPFResponsavel);
    inputRazaoSocial.value = dados.razaoSocial;
    inputNomeFantasia.value = dados.nomeFantasia;
    inputCNPJ.value = dados.cnpjEmpresa;
    inputRamoAtuacao.value = dados.ramoAtuacao;
    inputEmail.value = dados.email;
    inputTelefone.value = dados.telefone;
    inputDescricao.value = dados.descricaoPerfil;
    inputCepComercial.value = dados.cep;
    inputEnderecoComercial.value = dados.enderecoComercial;
    inputNumeroComercial.value = dados.numeroComercial;
    inputBairroComercial.value = dados.bairroComercial;
    inputComplementoComercial.value = dados.complementoComercial;
    inputCidadeComercial.value = dados.cidadeComercial;
    inputEstadoComercial.value = dados.estadoComercial;
}

if (empresaId) carregarDadosEmpresa();

// Salvar alterações
form.addEventListener("submit", async (evento) => 
{
    evento.preventDefault();

    if (!form.checkValidity()) 
    {
        form.reportValidity();
        return;
    }

    const empresaAtualizada = {
            id: empresaId,
            nomeResponsavel: inputNomeResponsavel.value,
            cpfResponsavel: inputCPFResponsavel.value,
            razaoSocial: inputRazaoSocial.value,
            nomeFantasia: inputNomeFantasia.value,
            cnpjEmpresa: inputCNPJ.value,
            ramoAtuacao: inputRamoAtuacao.value,
            email: inputEmail.value,
            telefone: inputTelefone.value,
            descricaoPerfil: inputDescricao.value,
            cep: inputCepComercial.value,
            enderecoComercial: inputEnderecoComercial.value,
            numeroComercial: inputNumeroComercial.value,
            bairroComercial: inputBairroComercial.value,
            complementoComercial: inputComplementoComercial.value,
            cidadeComercial: inputCidadeComercial.value,
            estadoComercial: inputEstadoComercial.value,
            mediaAvaliacoes: mediaEmpresa,
            totalAvaliacoes: totalAvaliacao
    }

try {
    loadingBar.removeAttribute("hidden"); // #perfil-loading
    erroBar.setAttribute("hidden", ""); // #perfil-erro
    conteudoPerfil.setAttribute("hidden", ""); // #perfil-conteudo

    const resposta = await fetch(`${API_URL}/${empresaId}`, 
    {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(empresaAtualizada)
    });

    if (!resposta.ok) 
    {
        throw new Error(`Erro HTTP: ${resposta.status}`);
    }

    mostrarMensagem("Alterações salvas com sucesso.", "success");

    loadingBar.setAttribute("hidden", "");
    conteudoPerfil.removeAttribute("hidden");
} 
catch (erro) 
{
    console.error(erro);
    loadingBar.setAttribute("hidden", "");
    erroBar.removeAttribute("hidden");
}
})
