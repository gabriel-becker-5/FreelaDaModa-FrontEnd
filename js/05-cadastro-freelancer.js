const API_URL = `${API_BASE}/freelancers`;
const form = document.querySelector('#form-cadastro');
const alertBar = document.querySelector('#alert-cadastro');
const inputNome = document.querySelector('#nome');
const inputDataNascimento = document.querySelector('#nascimento');
const inputCpf = document.querySelector('#cpf');
const inputEmail = document.querySelector('#email');
const inputTelefone = document.querySelector('#telefone');
const inputDescricao = document.querySelector('#descricao');
const inputSenha = document.querySelector('#senha');
const inputConfirmaSenha = document.querySelector('#senha-confirmacao');
const requisitosContainer = document.querySelector('#senha-requisitos');
const inputCepResidencial = document.querySelector('#res-cep');
const inputEnderecoResidencial = document.querySelector('#res-endereco');
const inputNumeroResidencial = document.querySelector('#res-numero');
const inputBairroResidencial = document.querySelector('#res-bairro');
const inputComplementoResidencial = document.querySelector('#res-complemento');
const inputCidadeResidencial = document.querySelector('#res-cidade');
const inputEstadoResidencial = document.querySelector('#res-estado');
const selectExperiencia = document.querySelector('#experiencia');
const selectDisponibilidade = document.querySelector('#disponibilidade');
const inputEspecialidades = document.querySelector('#multi-select-especialidades');
const inputMaquinas = document.querySelector('#multi-select-maquinas');
const exibeSenha = document.querySelector('#exibeSenha');
const exibeConfirmaSenha = document.querySelector('#exibeConfirmaSenha');
const msgSenhasDiferentes = document.querySelector('#msg-senhas-diferentes');

// Mensagens injetadas via ui.js que controlam o toast com as mensagens de campos com validação incorreta. Se não existir, o toast não será exibido.
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

// Máscaras para melhorar a experiência do usuário
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

inputTelefone.addEventListener('input', () => mascaraTelefone(inputTelefone));
inputCpf.addEventListener('input', () => mascaraCPF(inputCpf));
inputCepResidencial.addEventListener('input', () => mascaraCEP(inputCepResidencial));

// Validação do CPF
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

// Validação da senha e se os requisitos foram atendidos
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

// Controla os badges de especialidades e máquinas
document.querySelectorAll('.badge.badge-selectable').forEach(function (item) {
    item.addEventListener('click', function () {
        item.classList.toggle('selected');
    });
});

function obterSelecionados(campoMultiSelect) {
    const listaSelecionados = [];
    for (let index = 0; index < campoMultiSelect.childElementCount; index++) {
        const item = campoMultiSelect.children[index];
        if (item.classList.contains('selected')) listaSelecionados.push(item.textContent);
    }
    return listaSelecionados;
}

function desmarcarSelecionados(campoMultiSelect) {
    for (let index = 0; index < campoMultiSelect.childElementCount; index++) {
        campoMultiSelect.children[index].classList.remove('selected');
    }
}

// API para buscar CEP
const CAMPOS_ENDERECO_READONLY = [inputEnderecoResidencial, inputBairroResidencial, inputCidadeResidencial, inputEstadoResidencial];

function travarEndereco(travado) {
    CAMPOS_ENDERECO_READONLY.forEach(function (campo) {
        if (travado) campo.setAttribute('readonly', '');
        else campo.removeAttribute('readonly');
    });
}

inputCepResidencial.addEventListener('change', async function () {
    const cep = inputCepResidencial.value.replace(/\D/g, '');
    if (cep.length !== 8) {
        mostrarMensagem('Informe um CEP com 8 dígitos.', 'error');
        return;
    }

    const resultado = await buscarCep(inputCepResidencial.value);

    if (resultado.erro) {
        travarEndereco(false);
        mostrarMensagem('Não foi possível localizar o CEP. Preencha o endereço manualmente.', 'error');
        return;
    }

    inputEnderecoResidencial.value = resultado.logradouro;
    inputBairroResidencial.value = resultado.bairro;
    inputCidadeResidencial.value = resultado.cidade;
    inputEstadoResidencial.value = resultado.estado;
    inputNumeroResidencial.value = '';
    inputComplementoResidencial.value = '';
    travarEndereco(true);
});

// Validação do preenchimento do formulário
function validarFormulario() {
    const erros = [];
    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!inputNome.value.trim()) erros.push('Informe o nome completo.');
    if (!inputDataNascimento.value) erros.push('Informe a data de nascimento.');
    else if (new Date(inputDataNascimento.value) > new Date()) erros.push('A data de nascimento não pode ser no futuro.');
    if (!inputCpf.value.trim()) erros.push('Informe o CPF.');
    else if (!validarCPF(inputCpf.value)) erros.push('O CPF informado não é válido.');
    if (!inputEmail.value.trim()) erros.push('Informe o e-mail.');
    else if (!emailValido.test(inputEmail.value.trim())) erros.push('Informe um e-mail válido.');
    if (!inputTelefone.value.trim()) erros.push('Informe o telefone/WhatsApp.');
    if (!inputDescricao.value.trim()) erros.push('A descrição do perfil é obrigatória.');

    if (!inputCepResidencial.value.trim()) erros.push('Informe o CEP.');
    else if (inputCepResidencial.value.replace(/\D/g, '').length !== 8) erros.push('O CEP deve ter 8 dígitos.');
    if (!inputEnderecoResidencial.value.trim()) erros.push('Endereço não preenchido — informe um CEP válido.');
    if (!inputNumeroResidencial.value) erros.push('Informe o número do endereço.');
    else if (Number(inputNumeroResidencial.value) < 0) erros.push('O número do endereço não pode ser negativo.');
    if (!inputBairroResidencial.value.trim()) erros.push('Bairro não preenchido — informe um CEP válido.');
    if (!inputCidadeResidencial.value.trim()) erros.push('Cidade não preenchida — informe um CEP válido.');
    if (!inputEstadoResidencial.value.trim()) erros.push('Estado não preenchido — informe um CEP válido.');

    if (!selectExperiencia.value) erros.push('Selecione o tempo de experiência.');
    if (!selectDisponibilidade.value) erros.push('Selecione a disponibilidade de tempo.');
    if (obterSelecionados(inputEspecialidades).length < 1) erros.push('Selecione pelo menos uma Especialidade.');
    if (obterSelecionados(inputMaquinas).length < 1) erros.push('Selecione pelo menos uma Máquina.');

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

// Limpeza do formulário após cadastro bem-sucedido
function limparFormulario() {
    form.reset();
    desmarcarSelecionados(inputEspecialidades);
    desmarcarSelecionados(inputMaquinas);

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

// Fetch para cadastrar o freelancer no back-end
form.addEventListener('submit', async function (evento) {
    evento.preventDefault();
    limparMensagem();

    if (!validarFormulario()) return;

    const novoFreelancer = {
        id: '',
        nome: inputNome.value.trim(),
        cpf: inputCpf.value,
        dataNascimento: inputDataNascimento.value,
        email: inputEmail.value.trim(),
        telefone: inputTelefone.value,
        descricao: inputDescricao.value.trim(),
        senha: inputSenha.value,
        cepResidencial: inputCepResidencial.value,
        enderecoResidencial: inputEnderecoResidencial.value,
        numeroResidencial: inputNumeroResidencial.value,
        bairroResidencial: inputBairroResidencial.value,
        complementoResidencial: inputComplementoResidencial.value,
        cidadeResidencial: inputCidadeResidencial.value,
        estadoResidencial: inputEstadoResidencial.value,
        tempoExperiencia: selectExperiencia.value,
        disponibilidadeHorario: selectDisponibilidade.value,
        especialidades: obterSelecionados(inputEspecialidades),
        maquinas: obterSelecionados(inputMaquinas),
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
            body: JSON.stringify(novoFreelancer)
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
        console.error('Erro ao cadastrar freelancer:', erro);
        mostrarMensagem('Não foi possível concluir o cadastro. Tente novamente.', 'error');
    } finally {
        botao.disabled = false;
    }
});

// Data máxima = hoje para o campo de data de nascimento
inputDataNascimento.max = hojeLocalISO();