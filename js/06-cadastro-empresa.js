// npx json-server --watch db.json --port 3000

const API_URL = `${API_BASE}/empresas`;
const form = document.querySelector("form");
const inputNomeResponsavel = document.querySelector("#resp-nome");
const inputCPFResponsavel = document.querySelector("#resp-cpf");
const inputRazaoSocial = document.querySelector("#razao");
const inputNomeFantasia = document.querySelector("#fantasia");
const inputCNPJ = document.querySelector("#cnpj");
const inputRamoAtuacao = document.querySelector("#ramo");
const inputEmail = document.querySelector("#email-empresa");
const inputTelefone = document.querySelector("#telefone-empresa");
const inputDescricao = document.querySelector("#descricao-empresa");
const inputCepComercial = document.querySelector("#cep-empresa");
const inputEnderecoComercial = document.querySelector("#endereco-empresa");
const inputNumeroComercial = document.querySelector("#numero-empresa");
const inputBairroComercial = document.querySelector("#bairro-empresa");
const inputCidadeComercial = document.querySelector("#cidade-empresa");
const inputEstadoComercial = document.querySelector("#estado-empresa");
const inputComplementoComercial = document.querySelector("#complemento-empresa");
const inputSenha = document.querySelector("#senha");
const inputConfirmaSenha = document.querySelector("#senha-confirmacao");
const alertBar = document.querySelector(".alert.alert-success");

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
            alert("Verifique o CEP informado, endereço incorreto ou não localizado.");
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

// Máscara de CEP
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

// Toggle exibe / oculta senha
const exibeSenha = document.querySelector("#exibeSenha");
const exibeConfirmaSenha = document.querySelector("#exibeConfirmaSenha");

exibeSenha.addEventListener("click", () =>
{
    inputSenha.type === "password" ? inputSenha.type = "text" : inputSenha.type = "password";
})

exibeConfirmaSenha.addEventListener("click", () => 
{
    inputConfirmaSenha.type === "password" ? inputConfirmaSenha.type = "text" : inputConfirmaSenha.type = "password";
})

// Validação de senha em tempo real — mensagens inline (mesmo padrão do Suporte),
// sem alert(). Requisitos batem com o texto que já existia no formulário.
const REQUISITOS_SENHA = [
    { chave: "tamanho", testar: (s) => s.length >= 10 },
    { chave: "maiuscula", testar: (s) => /[A-Z]/.test(s) },
    { chave: "minuscula", testar: (s) => /[a-z]/.test(s) },
    { chave: "numero", testar: (s) => /[0-9]/.test(s) },
    { chave: "especial", testar: (s) => /[^A-Za-z0-9]/.test(s) }
];
const msgSenhasDiferentes = document.querySelector("#msg-senhas-diferentes");

function validarRequisitosSenha()
{
    const senha = inputSenha.value;
    let todosAtendidos = true;

    REQUISITOS_SENHA.forEach((requisito) =>
    {
        const atendido = requisito.testar(senha);
        const mensagem = document.querySelector(`#senha-requisitos [data-requisito="${requisito.chave}"]`);
        if (mensagem) mensagem.hidden = atendido;
        if (!atendido) todosAtendidos = false;
    });

    inputSenha.classList.toggle("input-error", senha.length > 0 && !todosAtendidos);
    inputSenha.classList.toggle("input-success", senha.length > 0 && todosAtendidos);

    return todosAtendidos;
}

function validarConfirmacaoSenha()
{
    const temConfirmacao = inputConfirmaSenha.value.length > 0;
    const coincide = inputSenha.value === inputConfirmaSenha.value;

    if (msgSenhasDiferentes) msgSenhasDiferentes.hidden = !temConfirmacao || coincide;
    inputConfirmaSenha.classList.toggle("input-error", temConfirmacao && !coincide);
    inputConfirmaSenha.classList.toggle("input-success", temConfirmacao && coincide);

    return coincide;
}

function senhaEhValida()
{
    const requisitosOk = validarRequisitosSenha();
    const confirmacaoOk = validarConfirmacaoSenha();

    if (!requisitosOk)
    {
        inputSenha.focus();
        return false;
    }
    if (!confirmacaoOk)
    {
        inputConfirmaSenha.focus();
        return false;
    }
    return true;
}

inputSenha.addEventListener("input", () =>
{
    validarRequisitosSenha();
    validarConfirmacaoSenha();
});
inputConfirmaSenha.addEventListener("input", validarConfirmacaoSenha);

function limparFormulario() 
{
    inputNomeResponsavel.value = "",
    inputCPFResponsavel.value = "",
    inputRazaoSocial.value = "",
    inputNomeFantasia.value = "",
    inputCNPJ.value = "",
    inputRamoAtuacao.value = "",
    inputEmail.value = "",
    inputTelefone.value = "",
    inputDescricao.value = "",
    inputCepComercial.value = "",
    inputEnderecoComercial.value = "",
    inputNumeroComercial.value = "",
    inputEstadoComercial.value = "",
    inputCidadeComercial.value = "",
    inputEstadoComercial.value = "",
    inputComplementoComercial.value = "",
    inputSenha.value = "",
    inputConfirmaSenha.value = ""

    document.querySelectorAll("#senha-requisitos [data-requisito]").forEach((mensagem) => { mensagem.hidden = true; });
    if (msgSenhasDiferentes) msgSenhasDiferentes.hidden = true;
    inputSenha.classList.remove("input-error", "input-success");
    inputConfirmaSenha.classList.remove("input-error", "input-success");
}

// Cadastrar nova Empresa
function sleep(ms) 
{
  return new Promise(resolve => setTimeout(resolve, ms))
}

form.addEventListener("submit", async (evento) => 
{
    evento.preventDefault();

    if (!form.checkValidity()) 
    {
        form.reportValidity();
        return;
    }

    if(!senhaEhValida())
    {
        return;
    }

    const novaEmpresa = 
    {
            id: "",
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
            cidadeComercial: inputCidadeComercial.value,
            estadoComercial: inputEstadoComercial.value,
            complementoComercial: inputComplementoComercial.value,
            senha: inputSenha.value,
            mediaAvaliacoes: 0,
            totalAvaliacoes: 0
    }

try 
{
    const resposta = await fetch(API_URL, 
    {
        method: "POST",
        headers: 
        {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(novaEmpresa)
    });

    if (!resposta.ok) 
    {
        throw new Error(`Erro HTTP: ${resposta.status}`);
    }

    limparFormulario();
    alertBar.removeAttribute("hidden");
    window.scrollTo({top: 0, behavior: "smooth"});
    await sleep(5000);
    window.location.href = "/pages/01-homepage.html";
    
} 
catch (erro) 
{
    console.error(erro);
}
});
