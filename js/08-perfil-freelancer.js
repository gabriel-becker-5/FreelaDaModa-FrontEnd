// npx json-server --watch db.json --port 3000
// Pendências
// 1. Token JWT

const API_URL = `${API_BASE}/freelancers`;

// Sempre edita o perfil de quem está realmente logado — nunca um ID fixo.
const sessao = JSON.parse(sessionStorage.getItem("usuarioLogado") || "null");
if (!sessao || sessao.tipo !== "freelancers") {
    window.location.href = "/pages/02-login.html";
}
const freelancerId = sessao ? sessao.id : null;
const form = document.querySelector("#form-perfil");
const inputNome = document.querySelector("#pf-nome");
const inputDataNascimento = document.querySelector("#pf-nascimento");
const inputEmail = document.querySelector("#pf-email");
const inputTelefone = document.querySelector("#pf-telefone");
const inputDescricao = document.querySelector("#pf-descricao");
const inputCepResidencial = document.querySelector("#pf-res-cep");
const inputEnderecoResidencial = document.querySelector("#pf-res-endereco");
const inputNumeroResidencial = document.querySelector("#pf-res-numero");
const inputBairroResidencial = document.querySelector("#pf-res-bairro");
const inputComplementoResidencial = document.querySelector("#pf-res-complemento");
const inputCidadeResidencial = document.querySelector("#pf-res-cidade");
const inputEstadoResidencial = document.querySelector("#pf-res-estado");
const checkEnderecoComercialIgualResidencial = document.querySelector("#pf-igual");
const inputCepComercial = document.querySelector("#pf-com-cep");
const inputEnderecoComercial = document.querySelector("#pf-com-endereco");
const inputNumeroComercial = document.querySelector("#pf-com-numero");
const inputBairroComercial = document.querySelector("#pf-com-bairro");
const inputComplementoComercial = document.querySelector("#pf-com-complemento");
const inputCidadeComercial = document.querySelector("#pf-com-cidade");
const inputEstadoComercial = document.querySelector("#pf-com-estado");
const selectTipoNegocio = document.querySelector("#pf-tipo");
const inputTempoExperiencia = document.querySelector("#pf-exp");
const inputTamanhoOficina = document.querySelector("#pf-oficina");
const inputComoFechaServicos = document.querySelector("#pf-fecha");
const inputDisponibilidadeHorario = document.querySelector("#pf-disponibilidade");
const selectPreferencias = document.querySelector("#pf-preferencias");
const selectProdutorFixo = document.querySelector("#pf-produtor");
const inputNomeProdutor = document.querySelector("#pf-nome-produtor");
const labelNomeProdutor = document.querySelector('label[for="pf-nome-produtor"]');
const selectVeiculo = document.querySelector("#pf-veiculo");
const inputFaturamentoMedio = document.querySelector("#pf-faturamento");
const alertBar = document.querySelector(".alert.alert-success");

function mostrarMensagem(texto, tipo) {
    if (!alertBar) return;
    alertBar.className = `alert alert-${tipo}`; // tipo: 'success' | 'error'
    alertBar.innerHTML = `<i class="bi ${tipo === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'}"></i> ${texto}`;
    alertBar.removeAttribute("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
}
const inputEspecialidades = document.querySelector("#multi-select-especialidades");
const inputMaquinas = document.querySelector("#multi-select-maquinas");
let mediaFreela;
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

// Especialidades & Máquinas que possui
const badgeEspecialidades = document.querySelectorAll(".badge.badge-selectable");

for (let index = 0; index < badgeEspecialidades.length; index++) 
{
    const item = badgeEspecialidades[index];

    item.addEventListener("click", () => {

        if(item.className === "badge badge-selectable selected")
            {
                item.classList = "badge badge-selectable";
            }
        else
        {
            item.classList = "badge badge-selectable selected";
        }
})};

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

// Marca Especialidades e Maquinas como "selected" na página
function marcarSelecionados(campoMultiSelect, valoresSelecionados) 
{
    for (let index = 0; index < campoMultiSelect.childElementCount; index++) 
    {
        var item = campoMultiSelect.children[index];

        if(valoresSelecionados.includes(item.textContent))
        {
            item.classList = "badge badge-selectable selected";
        }
        else
        {
            item.classList = "badge badge-selectable";
        }
    }
}

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
        mostrarMensagem("Informe o Nome do Produtor Fixo.", "error");
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

// Carregar dados do freelancer logado via API
async function carregarDadosFreelancer() 
{
    try 
    {
        loadingBar.removeAttribute("hidden"); // #perfil-loading
        erroBar.setAttribute("hidden", ""); // #perfil-erro
        conteudoPerfil.setAttribute("hidden", ""); // #perfil-conteudo

        const resposta = await fetch(`${API_URL}/${freelancerId}`, 
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
        mediaFreela = dados.mediaAvaliacoes;        
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
    inputNome.value = dados.nome;
    inputDataNascimento.value = dados.dataNascimento;
    inputEmail.value = dados.email;
    inputTelefone.value = dados.telefone;
    inputDescricao.value = dados.descricao;
    inputCepResidencial.value = dados.cepResidencial;
    inputEnderecoResidencial.value = dados.enderecoResidencial;
    inputNumeroResidencial.value = dados.numeroResidencial;
    inputBairroResidencial.value = dados.bairroResidencial;
    inputComplementoResidencial.value = dados.complementoResidencial;
    inputCidadeResidencial.value = dados.cidadeResidencial;
    inputEstadoResidencial.value = dados.estadoResidencial;
    checkEnderecoComercialIgualResidencial.checked = dados.enderecoComercialIgualResidencial;
    inputCepComercial.value = dados.cepComercial;
    inputEnderecoComercial.value = dados.enderecoComercial;
    inputNumeroComercial.value = dados.numeroComercial;
    inputBairroComercial.value = dados.bairroComercial;
    inputComplementoComercial.value = dados.complementoComercial;
    inputCidadeComercial.value = dados.cidadeComercial;
    inputEstadoComercial.value = dados.estadoComercial;
    selectTipoNegocio.value = dados.tipoNegocio;
    inputTempoExperiencia.value = dados.tempoExperiencia;
    inputTamanhoOficina.value = dados.tamanhoOficina;
    inputComoFechaServicos.value = dados.comoFechaServicos;
    inputDisponibilidadeHorario.value = dados.disponibilidadeHorario;
    selectPreferencias.value = dados.preferenciaDeFreela;
    selectProdutorFixo.value = dados.temProdutorFixo ? "Sim" : "Não";
    inputNomeProdutor.value = dados.nomeProdutor;
    selectVeiculo.value = dados.temVeiculo ? "Sim" : "Não";
    inputFaturamentoMedio.value = dados.faturamentoMedio;
    marcarSelecionados(inputEspecialidades, dados.especialidades);
    marcarSelecionados(inputMaquinas, dados.maquinas);
    ExibeOcultaCampoProdutorFixo();
    habilitarDesabilitarCampoEnderecoComercial();
}

if (freelancerId) carregarDadosFreelancer();

// Salvar alterações
form.addEventListener("submit", async (evento) => 
{
    evento.preventDefault();

    if (!form.checkValidity()) 
    {
        form.reportValidity();
        return;
    }

    if(!preenchimentoProdutorFixo()) 
    {
        return;
    }

    const isProdutorFixo = selectProdutorFixo.value === "Sim";
    const isCarroProprio = selectVeiculo.value === "Sim";
    const isEnderecoComercialIgualResidencial = checkEnderecoComercialIgualResidencial.checked;

    var especialidadesSelecionadas = obterSelecionados(inputEspecialidades);

    if(especialidadesSelecionadas.length < 1)
    {
        mostrarMensagem("Selecione pelo menos uma Especialidade antes de prosseguir.", "error");
        return;
    }

    var maquinasSelecionadas = obterSelecionados(inputMaquinas);

    if(maquinasSelecionadas.length < 1)
    {
        mostrarMensagem("Selecione pelo menos uma Máquina antes de prosseguir.", "error");
        return;
    }

    const freelancerAtualizado = {
            id: freelancerId,
            nome: inputNome.value,
            dataNascimento: inputDataNascimento.value,
            email: inputEmail.value,
            telefone: inputTelefone.value,
            descricao: inputDescricao.value,
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
            mediaAvaliacoes: mediaFreela,
            totalAvaliacoes : totalAvaliacao
    }

try {
    loadingBar.removeAttribute("hidden"); // #perfil-loading
    erroBar.setAttribute("hidden", ""); // #perfil-erro
    conteudoPerfil.setAttribute("hidden", ""); // #perfil-conteudo    

    const resposta = await fetch(`${API_URL}/${freelancerId}`, 
    {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(freelancerAtualizado)
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

// Busca endereço comercial e residencial via API
async function consultaCEP(campoCEP, campoEndereco, campoNumero, campoBairro, campoCidade, campoEstado, campoComplemento) 
{
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

inputCepResidencial.addEventListener("focusout", () => 
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
function mascaraTelefone(campo) {
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
function mascaraCEP(campo) {
    const numeros = campo.value.replace(/\D/g, "").slice(0, 8);
    campo.value = numeros.length > 5
        ? `${numeros.slice(0, 5)}-${numeros.slice(5)}`
        : numeros;
}

inputCepResidencial.addEventListener("input", () => mascaraCEP(inputCepResidencial));
inputCepComercial.addEventListener("input", () => mascaraCEP(inputCepComercial));
