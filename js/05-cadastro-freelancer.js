// npx json-server --watch db.json --port 3000
const API_URL = `${API_BASE}/freelancers`;
const form = document.querySelector("form");
const inputNome = document.querySelector("#nome");
const inputDataNascimento = document.querySelector("#nascimento");
const inputEmail = document.querySelector("#email");
const inputTelefone = document.querySelector("#telefone");
const inputDescricao = document.querySelector("#descricao");
const inputSenha = document.querySelector("#senha");
const inputConfirmaSenha = document.querySelector("#senha-confirmacao");
const inputCepResidencial = document.querySelector("#res-cep");
const inputEnderecoResidencial = document.querySelector("#res-endereco");
const inputNumeroResidencial = document.querySelector("#res-numero");
const inputBairroResidencial = document.querySelector("#res-bairro");
const inputComplementoResidencial = document.querySelector("#res-complemento");
const inputCidadeResidencial = document.querySelector("#res-cidade");
const inputEstadoResidencial = document.querySelector("#res-estado");
const checkEnderecoComercialIgualResidencial = document.querySelector("#endereco-igual");
const inputCepComercial = document.querySelector("#com-cep");
const inputEnderecoComercial = document.querySelector("#com-endereco");
const inputNumeroComercial = document.querySelector("#com-numero");
const inputBairroComercial = document.querySelector("#com-bairro");
const inputComplementoComercial = document.querySelector("#com-complemento");
const inputCidadeComercial = document.querySelector("#com-cidade");
const inputEstadoComercial = document.querySelector("#com-estado");
const selectTipoNegocio = document.querySelector("#tipo-negocio");
const inputTempoExperiencia = document.querySelector("#experiencia");
const inputTamanhoOficina = document.querySelector("#oficina");
const inputComoFechaServicos = document.querySelector("#fechamento");
const inputDisponibilidadeHorario = document.querySelector("#disponibilidade");
const selectPreferencias = document.querySelector("#preferencias");
const selectProdutorFixo = document.querySelector("#produtor-fixo");
const inputNomeProdutor = document.querySelector("#nome-produtor");
const labelNomeProdutor = document.querySelector('label[for="nome-produtor"]');
const selectVeiculo = document.querySelector("#veiculo");
const inputFaturamentoMedio = document.querySelector("#faturamento");
const alertBar = document.querySelector(".alert.alert-success");
const inputEspecialidades = document.querySelector("#multi-select-especialidades");
const inputMaquinas = document.querySelector("#multi-select-maquinas");
const exibeSenha = document.querySelector("#exibeSenha");
const exibeConfirmaSenha = document.querySelector("#exibeConfirmaSenha");

// Toggle exibe / oculta senha
exibeSenha.addEventListener("click", () => 
{
    inputSenha.type === "password" ? inputSenha.type = "text" : inputSenha.type = "password";
})

exibeConfirmaSenha.addEventListener("click", () => 
{
    inputConfirmaSenha.type === "password" ? inputConfirmaSenha.type = "text" : inputConfirmaSenha.type = "password";
})

// Especialidades & Máquinas que possui
const badgeEspecialidades = document.querySelectorAll(".badge.badge-selectable");

for (let index = 0; index < badgeEspecialidades.length; index++) 
{
    const item = badgeEspecialidades[index];
    
    item.addEventListener("click", () => 
    {

        if(item.className === "badge badge-selectable selected") 
            {
                item.classList = "badge badge-selectable";
            }
        else 
        {
            item.classList = "badge badge-selectable selected";
        }
    }
)};

function obterSelecionados(campoMultiSelect) 
{
    let listaSelecionados = [];

    for (let index = 0; index < campoMultiSelect.childElementCount; index++) 
    {
        var item = campoMultiSelect.children[index];
        
        if(item.className === "badge badge-selectable selected") 
        {
            listaSelecionados.push(item.textContent);
        }
    }
    return listaSelecionados;
}

// Função para limpar as seleções de Especialidades e Maquinas após criar o cadastro
function desmarcarSelecionados(campoMultiSelect, valoresSelecionados) 
{
    for (let index = 0; index < campoMultiSelect.childElementCount; index++) 
    {
        var item = campoMultiSelect.children[index];

        if(valoresSelecionados.includes(item.textContent))
        {
            item.classList = "badge badge-selectable";
        }
        else
        {
            item.classList = "badge badge-selectable selected";
        }
    }
}

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

// Campo condicional Produtor fixo
function ExibeOcultaCampoProdutorFixo() 
{
    if(selectProdutorFixo.value === "Sim") 
    {
        inputNomeProdutor.removeAttribute("hidden");
        labelNomeProdutor.removeAttribute("hidden");
        inputNomeProdutor.setAttribute("required", "");
        labelNomeProdutor.setAttribute("required", "");
    } 
    else 
    {
        inputNomeProdutor.setAttribute("hidden", "");
        labelNomeProdutor.setAttribute("hidden", "");
        inputNomeProdutor.removeAttribute("required");
        labelNomeProdutor.removeAttribute("required");
    } 
}

selectProdutorFixo.addEventListener("change", () => 
{
    ExibeOcultaCampoProdutorFixo();
})

// Se Produtor Fixo = Sim então obriga o preenchimento do nome do produtor
function preenchimentoProdutorFixo() 
{
    if(selectProdutorFixo.value === "Sim" && inputNomeProdutor.value === "") 
    {
        alert("Informe o Nome do Produtor Fixo.");
        return false;
    }
    else 
    { 
        return true; 
    }
}

// Habilitar/Desabilitar campos de endereço comercial
checkEnderecoComercialIgualResidencial.addEventListener("click", () => 
{
    habilitarDesabilitarCampoEnderecoComercial();
});

function habilitarDesabilitarCampoEnderecoComercial() 
{
    if(checkEnderecoComercialIgualResidencial.checked) 
    {
        inputCepComercial.disabled = true;
        inputNumeroComercial.disabled = true;
        inputComplementoComercial.disabled = true;
        inputEnderecoComercial.disabled = true;
        inputBairroComercial.disabled = true;
        inputCidadeComercial.disabled = true;
        inputEstadoComercial.disabled = true;
        inputCepComercial.value = "";
        inputEnderecoComercial.value = "";
        inputNumeroComercial.value = "";
        inputBairroComercial.value = "";
        inputComplementoComercial.value = "";
        inputCidadeComercial.value = "";
        inputEstadoComercial.value = "";
        inputCepComercial.removeAttribute("required");
        inputNumeroComercial.removeAttribute("required");
        inputEnderecoComercial.removeAttribute("required");
        inputBairroComercial.removeAttribute("required");
        inputCidadeComercial.removeAttribute("required");
        inputEstadoComercial.removeAttribute("required");
    }
    else 
    {
        inputCepComercial.disabled = false;
        inputNumeroComercial.disabled = false;
        inputComplementoComercial.disabled = false;
        inputEnderecoComercial.disabled = false;
        inputBairroComercial.disabled = false;
        inputCidadeComercial.disabled = false;
        inputEstadoComercial.disabled = false;
        inputCepComercial.setAttribute("required", "");
        inputNumeroComercial.setAttribute("required", "");
        inputEnderecoComercial.setAttribute("required", "");
        inputBairroComercial.setAttribute("required", "");
        inputCidadeComercial.setAttribute("required", "");
        inputEstadoComercial.setAttribute("required", "");
    }
}

function limparFormulario() 
{
    inputNome.value = "",
    inputDataNascimento.value = "",
    inputEmail.value = "",
    inputTelefone.value = "",
    inputDescricao.value = "",
    inputSenha.value = "",
    inputConfirmaSenha.value = "",
    inputCepResidencial.value = "",
    inputEnderecoResidencial.value = "",
    inputNumeroResidencial.value = "",
    inputBairroResidencial.value = "",
    inputComplementoResidencial.value = "",
    inputCidadeResidencial.value = "",
    inputEstadoResidencial.value = "",
    inputCepComercial.value = "",
    inputEnderecoComercial.value = "",
    inputNumeroComercial.value = "",
    inputBairroComercial.value = "",
    inputComplementoComercial.value = "",
    inputCidadeComercial.value = "",
    inputEstadoComercial.value = "",
    isEnderecoComercialIgualResidencial = "",
    selectTipoNegocio.value = "",
    inputTempoExperiencia.value = "",
    inputTamanhoOficina.value = "",
    inputComoFechaServicos.value = "",
    inputDisponibilidadeHorario.value = "",
    selectPreferencias.value = "",
    isProdutorFixo = "",
    inputNomeProdutor.value = "",
    isCarroProprio = "",
    inputFaturamentoMedio.value = "",
    desmarcarSelecionados(inputEspecialidades, obterSelecionados(inputEspecialidades));
    desmarcarSelecionados(inputMaquinas, obterSelecionados(inputMaquinas));

    document.querySelectorAll("#senha-requisitos [data-requisito]").forEach((mensagem) => { mensagem.hidden = true; });
    if (msgSenhasDiferentes) msgSenhasDiferentes.hidden = true;
    inputSenha.classList.remove("input-error", "input-success");
    inputConfirmaSenha.classList.remove("input-error", "input-success");
}

// Cadastrar novo Freelancer
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

    if(!senhaEhValida() ||
       !preenchimentoProdutorFixo())
    {
        return;
    }

    const isProdutorFixo = selectProdutorFixo.value === "Sim";
    const isCarroProprio = selectVeiculo.value === "Sim";
    const isEnderecoComercialIgualResidencial = checkEnderecoComercialIgualResidencial.checked;
    
    var especialidadesSelecionadas = obterSelecionados(inputEspecialidades);

    if(especialidadesSelecionadas.length < 1)
    {
        alert("Selecione pelo menos uma Especialidade antes de prosseguir.");
        return;
    }

    var maquinasSelecionadas = obterSelecionados(inputMaquinas);

    if(maquinasSelecionadas.length < 1)
    {
        alert("Selecione pelo menos uma Máquina antes de prosseguir.");
        return;
    }

    const novoFreelancer = 
    {
            id: "",
            nome: inputNome.value,
            dataNascimento: inputDataNascimento.value,
            email: inputEmail.value,
            telefone: inputTelefone.value,
            descricao: inputDescricao.value,
            senha: inputSenha.value,
            cepResidencial: inputCepResidencial.value,
            enderecoResidencial: inputEnderecoResidencial.value,
            numeroResidencial: inputNumeroResidencial.value,
            bairroResidencial: inputBairroResidencial.value,
            complementoResidencial: inputComplementoResidencial.value,
            cidadeResidencial: inputCidadeResidencial.value,
            estadoResidencial: inputEstadoResidencial.value,
            cepComercial: inputCepComercial.value,
            enderecoComercial: inputEnderecoComercial.value,
            numeroComercial: inputNumeroComercial.value,
            bairroComercial: inputBairroComercial.value,
            complementoComercial: inputComplementoComercial.value,
            cidadeComercial: inputCidadeComercial.value,
            estadoComercial: inputEstadoComercial.value,
            enderecoComercialIgualResidencial: isEnderecoComercialIgualResidencial,
            tipoNegocio: selectTipoNegocio.value,
            tempoExperiencia: inputTempoExperiencia.value,
            tamanhoOficina: inputTamanhoOficina.value,
            comoFechaServicos: inputComoFechaServicos.value,
            disponibilidadeHorario: inputDisponibilidadeHorario.value,
            preferenciaDeFreela: selectPreferencias.value,
            temProdutorFixo: isProdutorFixo,
            nomeProdutor: inputNomeProdutor.value,
            temVeiculo: isCarroProprio,
            faturamentoMedio: inputFaturamentoMedio.value,
            especialidades: especialidadesSelecionadas,
            maquinas: maquinasSelecionadas,
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
        body: JSON.stringify(novoFreelancer)
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
})

// Busca endereço comercial e residencial via API
async function consultaCEP(campoCEP, campoEndereco, campoNumero, campoBairro, campoCidade, campoEstado, campoComplemento) {
    try 
    {
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

inputCepResidencial.addEventListener("change", () => 
{
    consultaCEP(inputCepResidencial, 
                inputEnderecoResidencial,
                inputNumeroResidencial,
                inputBairroResidencial, 
                inputCidadeResidencial, 
                inputEstadoResidencial, 
                inputComplementoResidencial);
});

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

// Máscara de CEP (Comercial e Residencial)
function mascaraCEP(campo) 
{
    const numeros = campo.value.replace(/\D/g, "").slice(0, 8);
    campo.value = numeros.length > 5
        ? `${numeros.slice(0, 5)}-${numeros.slice(5)}`
        : numeros;
}

inputCepResidencial.addEventListener("input", () => mascaraCEP(inputCepResidencial));
inputCepComercial.addEventListener("input", () => mascaraCEP(inputCepComercial));
