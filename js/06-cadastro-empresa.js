const API_URL = `${API_BASE}/empresas`;
const form = document.querySelector('#form-cadastro-empresa');
const alertBar = document.querySelector('#alert-cadastro-empresa');
const inputNomeResponsavel = document.querySelector('#resp-nome');
const inputDataNascimento = document.querySelector('#resp-nascimento');
const inputCPFResponsavel = document.querySelector('#resp-cpf');
const inputRazaoSocial = document.querySelector('#razao');
const inputNomeFantasia = document.querySelector('#fantasia');
const inputCNPJ = document.querySelector('#cnpj');
const inputRamoAtuacao = document.querySelector('#ramo');
const inputEmail = document.querySelector('#email-empresa');
const inputTelefone = document.querySelector('#telefone-empresa');
const inputDescricao = document.querySelector('#descricao-empresa');
const inputCepComercial = document.querySelector('#cep-empresa');
const inputEnderecoComercial = document.querySelector('#endereco-empresa');
const inputNumeroComercial = document.querySelector('#numero-empresa');
const inputBairroComercial = document.querySelector('#bairro-empresa');
const inputCidadeComercial = document.querySelector('#cidade-empresa');
const inputEstadoComercial = document.querySelector('#estado-empresa');
const inputComplementoComercial = document.querySelector('#complemento-empresa');
const inputSenha = document.querySelector('#senha');
const inputConfirmaSenha = document.querySelector('#senha-confirmacao');
const requisitosContainer = document.querySelector('#senha-requisitos');
const exibeSenha = document.querySelector('#exibeSenha');
const exibeConfirmaSenha = document.querySelector('#exibeConfirmaSenha');
const msgSenhasDiferentes = document.querySelector('#msg-senhas-diferentes');

/* ------------------------- mensagens -------------------------------------- */

function mostrarMensagem(texto, tipo) {
    if (!alertBar) return;
    alertBar.className = `alert mb-md ${tipo === 'success' ? 'alert-success' : 'alert-error'}`;
    alertBar.innerHTML = `<i class="bi ${tipo === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'}"></i> ${escapeHtml(texto)}`;
    alertBar.removeAttribute('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function limparMensagem() {
    if (alertBar) alertBar.setAttribute('hidden', '');
}

/* ------------------------- máscaras --------------------------------------- */

function mascaraTelefone(campo) {
    const numeros = campo.value.replace(/\D/g, '').slice(0, 11);
    if (numeros.length <= 10) {
        campo.value = numeros.replace(/(\d{2})(\d{0,4})(\d{0,4})/, (_, ddd, inicio, fim) => {
            if (!inicio) return `(${ddd}`;
            if (!fim) return `(${ddd}) ${inicio}`;
            return `(${ddd}) ${inicio}-${fim}`;
        });
        return;
    }
    campo.value = numeros.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
}

function mascaraCEP(campo) {
    const numeros = campo.value.replace(/\D/g, '').slice(0, 8);
    campo.value = numeros.length > 5 ? `${numeros.slice(0, 5)}-${numeros.slice(5)}` : numeros;
}

function mascaraCPF(campo) {
    const numeros = campo.value.replace(/\D/g, '').slice(0, 11);
    if (numeros.length <= 3) campo.value = numeros;
    else if (numeros.length <= 6) campo.value = `${numeros.slice(0, 3)}.${numeros.slice(3)}`;
    else if (numeros.length <= 9) campo.value = `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6)}`;
    else campo.value = `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6, 9)}-${numeros.slice(9)}`;
}

// CNPJ alfanumérico (aceita letras e números, formato XX.XXX.XXX/XXXX-XX)
function mascaraCNPJ(campo) {
    const caracteres = campo.value
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase()
        .slice(0, 14);

    campo.value = caracteres.replace(
        /([A-Z0-9]{2})([A-Z0-9]{3})([A-Z0-9]{3})([A-Z0-9]{4})([A-Z0-9]{0,2})/,
        (_, parte1, parte2, parte3, parte4, parte5) => {
            if (!parte2) return parte1;
            if (!parte3) return `${parte1}.${parte2}`;
            if (!parte4) return `${parte1}.${parte2}.${parte3}`;
            if (!parte5) return `${parte1}.${parte2}.${parte3}/${parte4}`;
            return `${parte1}.${parte2}.${parte3}/${parte4}-${parte5}`;
        }
    );
}

inputTelefone.addEventListener('input', () => mascaraTelefone(inputTelefone));
inputCPFResponsavel.addEventListener('input', () => mascaraCPF(inputCPFResponsavel));
inputCepComercial.addEventListener('input', () => mascaraCEP(inputCepComercial));
inputCNPJ.addEventListener('input', () => mascaraCNPJ(inputCNPJ));

/* ------------------------- validação de CPF -------------------------------- */

function validarCPF(cpf) {
    const digitos = String(cpf || '').replace(/\D/g, '');
    if (digitos.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(digitos)) return false;

    function calcularDigito(base) {
        let soma = 0;
        for (let i = 0; i < base.length; i++) {
            soma += Number(base[i]) * (base.length + 1 - i);
        }
        const resto = (soma * 10) % 11;
        return resto === 10 ? 0 : resto;
    }

    return calcularDigito(digitos.slice(0, 9)) === Number(digitos[9]) &&
           calcularDigito(digitos.slice(0, 10)) === Number(digitos[10]);
}

/* ------------------------- senha (padrão 05) ------------------------------- */

const REQUISITOS_SENHA = [
    { chave: 'tamanho', testar: (s) => s.length >= 10 },
    { chave: 'maiuscula', testar: (s) => /[A-Z]/.test(s) },
    { chave: 'minuscula', testar: (s) => /[a-z]/.test(s) },
    { chave: 'numero', testar: (s) => /[0-9]/.test(s) },
    { chave: 'especial', testar: (s) => /[^A-Za-z0-9]/.test(s) }
];

function atualizarRequisitosSenha() {
    const senha = inputSenha.value;
    const jaDigitou = senha.length > 0 || inputConfirmaSenha.value.length > 0;

    if (jaDigitou) requisitosContainer.removeAttribute('hidden');

    let todosAtendidos = true;

    REQUISITOS_SENHA.forEach(function (requisito) {
        const atendido = requisito.testar(senha);
        const mensagem = requisitosContainer.querySelector(`[data-requisito="${requisito.chave}"]`);
        if (!mensagem) return;

        mensagem.hidden = false;
        mensagem.classList.toggle('requisito-ok', atendido);
        mensagem.classList.toggle('field-message-error', !atendido);

        const icone = mensagem.querySelector('i');
        if (icone) icone.className = atendido ? 'bi bi-check-circle-fill' : 'bi bi-exclamation-circle-fill';

        if (!atendido) todosAtendidos = false;
    });

    inputSenha.classList.toggle('input-error', senha.length > 0 && !todosAtendidos);
    inputSenha.classList.toggle('input-success', senha.length > 0 && todosAtendidos);

    return todosAtendidos;
}

function atualizarConfirmacaoSenha() {
    const temConfirmacao = inputConfirmaSenha.value.length > 0;
    const coincide = inputSenha.value === inputConfirmaSenha.value;

    if (msgSenhasDiferentes) msgSenhasDiferentes.hidden = !temConfirmacao || coincide;
    inputConfirmaSenha.classList.toggle('input-error', temConfirmacao && !coincide);
    inputConfirmaSenha.classList.toggle('input-success', temConfirmacao && coincide);

    return coincide;
}

inputSenha.addEventListener('input', function () {
    atualizarRequisitosSenha();
    atualizarConfirmacaoSenha();
});
inputConfirmaSenha.addEventListener('input', function () {
    atualizarRequisitosSenha();
    atualizarConfirmacaoSenha();
});

function alternarSenha(input, icone) {
    if (input.type === 'password') {
        input.type = 'text';
        icone.className = 'bi bi-eye-slash';
    } else {
        input.type = 'password';
        icone.className = 'bi bi-eye';
    }
}

exibeSenha.addEventListener('click', () => alternarSenha(inputSenha, exibeSenha));
exibeConfirmaSenha.addEventListener('click', () => alternarSenha(inputConfirmaSenha, exibeConfirmaSenha));

/* ------------------------- CEP (ViaCEP com fallback manual) ---------------- */

const CAMPOS_ENDERECO_READONLY = [inputEnderecoComercial, inputBairroComercial, inputCidadeComercial, inputEstadoComercial];

function travarEndereco(travado) {
    CAMPOS_ENDERECO_READONLY.forEach(function (campo) {
        if (travado) campo.setAttribute('readonly', '');
        else campo.removeAttribute('readonly');
    });
}

inputCepComercial.addEventListener('change', async function () {
    const cep = inputCepComercial.value.replace(/\D/g, '');
    if (cep.length !== 8) {
        mostrarMensagem('Informe um CEP com 8 dígitos.', 'error');
        return;
    }

    const resultado = await buscarCep(inputCepComercial.value);

    if (resultado.erro) {
        travarEndereco(false);
        mostrarMensagem('Não foi possível localizar o CEP. Preencha o endereço manualmente.', 'error');
        return;
    }

    inputEnderecoComercial.value = resultado.logradouro;
    inputBairroComercial.value = resultado.bairro;
    inputCidadeComercial.value = resultado.cidade;
    inputEstadoComercial.value = resultado.estado;
    inputNumeroComercial.value = '';
    inputComplementoComercial.value = '';
    travarEndereco(true);
});

/* ------------------------- validação completa ------------------------------ */

function validarFormulario() {
    const erros = [];
    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!inputNomeResponsavel.value.trim()) erros.push('Informe o nome completo do responsável.');
    if (!inputDataNascimento.value) erros.push('Informe a data de nascimento do responsável.');
    else if (new Date(inputDataNascimento.value) > new Date()) erros.push('A data de nascimento não pode ser no futuro.');
    if (!inputCPFResponsavel.value.trim()) erros.push('Informe o CPF do responsável.');
    else if (!validarCPF(inputCPFResponsavel.value)) erros.push('O CPF informado não é válido.');

    if (!inputRazaoSocial.value.trim()) erros.push('Informe a razão social.');
    if (!inputNomeFantasia.value.trim()) erros.push('Informe o nome fantasia.');
    if (!inputCNPJ.value.trim()) erros.push('Informe o CNPJ.');
    else if (inputCNPJ.value.replace(/[^A-Za-z0-9]/g, '').length !== 14) erros.push('O CNPJ deve ter 14 caracteres.');
    if (!inputRamoAtuacao.value.trim()) erros.push('Informe o ramo de atuação.');
    if (!inputEmail.value.trim()) erros.push('Informe o e-mail.');
    else if (!emailValido.test(inputEmail.value.trim())) erros.push('Informe um e-mail válido.');
    if (!inputTelefone.value.trim()) erros.push('Informe o telefone/WhatsApp.');
    if (!inputDescricao.value.trim()) erros.push('A descrição do perfil é obrigatória.');

    if (!inputCepComercial.value.trim()) erros.push('Informe o CEP.');
    else if (inputCepComercial.value.replace(/\D/g, '').length !== 8) erros.push('O CEP deve ter 8 dígitos.');
    if (!inputEnderecoComercial.value.trim()) erros.push('Endereço não preenchido — informe um CEP válido.');
    if (!inputNumeroComercial.value) erros.push('Informe o número do endereço.');
    else if (Number(inputNumeroComercial.value) < 0) erros.push('O número do endereço não pode ser negativo.');
    if (!inputBairroComercial.value.trim()) erros.push('Bairro não preenchido — informe um CEP válido.');
    if (!inputCidadeComercial.value.trim()) erros.push('Cidade não preenchida — informe um CEP válido.');
    if (!inputEstadoComercial.value.trim()) erros.push('Estado não preenchido — informe um CEP válido.');

    if (!inputSenha.value) erros.push('Informe a senha.');
    else if (!atualizarRequisitosSenha()) erros.push('A senha não atende aos requisitos mínimos.');
    if (!inputConfirmaSenha.value) erros.push('Confirme a senha.');
    else if (!atualizarConfirmacaoSenha()) erros.push('As senhas não coincidem.');

    if (erros.length) {
        mostrarMensagem(erros.join('\n'), 'error');
        return false;
    }

    return true;
}

/* ------------------------- limpeza do formulário --------------------------- */

function limparFormulario() {
    form.reset();

    requisitosContainer.setAttribute('hidden', '');
    requisitosContainer.querySelectorAll('[data-requisito]').forEach(function (mensagem) {
        mensagem.hidden = true;
        mensagem.classList.remove('requisito-ok');
        mensagem.classList.add('field-message-error');
        const icone = mensagem.querySelector('i');
        if (icone) icone.className = 'bi bi-exclamation-circle-fill';
    });
    if (msgSenhasDiferentes) msgSenhasDiferentes.hidden = true;
    inputSenha.classList.remove('input-error', 'input-success');
    inputConfirmaSenha.classList.remove('input-error', 'input-success');
    travarEndereco(true);
}

/* ------------------------- cadastro ---------------------------------------- */

form.addEventListener('submit', async function (evento) {
    evento.preventDefault();
    limparMensagem();

    if (!validarFormulario()) return;

    const novaEmpresa = {
        id: '',
        nomeResponsavel: inputNomeResponsavel.value.trim(),
        cpfResponsavel: inputCPFResponsavel.value,
        dataNascimento: inputDataNascimento.value,
        razaoSocial: inputRazaoSocial.value.trim(),
        nomeFantasia: inputNomeFantasia.value.trim(),
        cnpjEmpresa: inputCNPJ.value,
        ramoAtuacao: inputRamoAtuacao.value.trim(),
        email: inputEmail.value.trim(),
        telefone: inputTelefone.value,
        descricaoPerfil: inputDescricao.value.trim(),
        cep: inputCepComercial.value,
        enderecoComercial: inputEnderecoComercial.value,
        numeroComercial: inputNumeroComercial.value,
        bairroComercial: inputBairroComercial.value,
        complementoComercial: inputComplementoComercial.value,
        cidadeComercial: inputCidadeComercial.value,
        estadoComercial: inputEstadoComercial.value,
        senha: inputSenha.value,
        foto: '',
        referencias: [],
        validado: false,
        mediaAvaliacoes: 0,
        totalAvaliacoes: 0
    };

    const botao = document.querySelector('#btn-cadastrar');
    botao.disabled = true;

    try {
        const resposta = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(novaEmpresa)
        });

        if (!resposta.ok) throw new Error(`Erro HTTP: ${resposta.status}`);

        mostrarMensagem('Cadastro realizado com sucesso! Você será redirecionado em instantes...', 'success');

        setTimeout(function () {
            window.location.assign('/pages/01-homepage.html');
        }, 3000);

        try {
            limparFormulario();
        } catch (erroLimpeza) {
            console.error('Erro ao limpar formulário:', erroLimpeza);
        }
    } catch (erro) {
        console.error('Erro ao cadastrar empresa:', erro);
        mostrarMensagem('Não foi possível concluir o cadastro. Tente novamente em instantes.', 'error');
    } finally {
        botao.disabled = false;
    }
});

/* ------------------------- data máxima (hoje) ------------------------------ */

inputDataNascimento.max = hojeLocalISO();
