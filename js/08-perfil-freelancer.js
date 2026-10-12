// Editar Perfil Freelancer

const sessao = exigirTipo('freelancers');
if (!sessao) {
    throw new Error('Sessão inválida');
}
const freelancerId = sessao.id;

// profileImageUrl vem como caminho relativo (ex.: "/api/v1/User/{id}/imagem-perfil"),
// então para exibir a imagem é preciso prefixar a origem do back (API_BASE sem o /api/v1).
const ORIGEM_BACK = API_BASE.replace(/\/api\/v1\/?$/, '');

const btnVerPerfilPublico = document.querySelector('#btn-ver-perfil-publico');
if (btnVerPerfilPublico) {
    btnVerPerfilPublico.href = `/pages/25-perfil-freelancer-publico.html?id=${encodeURIComponent(freelancerId)}`;
}

renderizarSidebar(document.querySelector('.sidebar'), 'freelancers', '08-perfil-freelancer');
renderizarTopbar(document.querySelector('#header-acoes'), sessao);
renderizarBannerValidacao(document.querySelector('.main'), sessao);

const form = document.querySelector('#form-perfil');
const alertBar = document.querySelector('#alert-perfil');
const inputNome = document.querySelector('#pf-nome');
const inputDataNascimento = document.querySelector('#pf-nascimento');
const inputCpf = document.querySelector('#pf-cpf');
const inputEmail = document.querySelector('#pf-email');
const inputTelefone = document.querySelector('#pf-telefone');
const inputDescricao = document.querySelector('#pf-descricao');
const inputCepResidencial = document.querySelector('#pf-res-cep');
const inputEnderecoResidencial = document.querySelector('#pf-res-endereco');
const inputNumeroResidencial = document.querySelector('#pf-res-numero');
const inputBairroResidencial = document.querySelector('#pf-res-bairro');
const inputComplementoResidencial = document.querySelector('#pf-res-complemento');
const inputCidadeResidencial = document.querySelector('#pf-res-cidade');
const inputEstadoResidencial = document.querySelector('#pf-res-estado');
const selectExperiencia = document.querySelector('#pf-exp');
const selectDisponibilidade = document.querySelector('#pf-disponibilidade');
const inputEspecialidades = document.querySelector('#multi-select-especialidades');
const inputMaquinas = document.querySelector('#multi-select-maquinas');
const inputFoto = document.querySelector('#pf-foto');
const fotoPreview = document.querySelector('#pf-foto-preview');
const fotoRemover = document.querySelector('#pf-foto-remover');
const seloStatus = document.querySelector('#selo-status');
const loadingBar = document.querySelector('#perfil-loading');
const erroBar = document.querySelector('#perfil-erro');
const conteudoPerfil = document.querySelector('#perfil-conteudo');

const LIMITE_FOTO_MB = 5;
const TIPOS_IMAGEM_PERMITIDOS = ['image/png', 'image/jpeg', 'image/jpg'];

// URL atual da foto de perfil (já com a origem do back e cache-busting) ou '' se não houver foto.
let fotoUrl = '';

// Listas de opções vindas do back (id/label) e cópia dos valores carregados no GET,
// usada para calcular somente os campos alterados no PATCH.
let listasCampos = { especialidades: [], maquinas: [], experiencias: [], disponibilidades: [] };
let valoresCarregados = {};

/* ------------------------- menu mobile ------------------------------------ */

const sidebarToggleBtn = document.querySelector('.sidebar-toggle-btn');
const sidebar = document.querySelector('.sidebar');
const sidebarOverlay = document.querySelector('.sidebar-overlay');

function abrirMenu() {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('open');
    sidebarToggleBtn.classList.add('open');
    sidebarToggleBtn.setAttribute('aria-expanded', 'true');
}

function fecharMenu() {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('open');
    sidebarToggleBtn.classList.remove('open');
    sidebarToggleBtn.setAttribute('aria-expanded', 'false');
}

sidebarToggleBtn.addEventListener('click', () => {
    sidebar.classList.contains('open') ? fecharMenu() : abrirMenu();
});
sidebarOverlay.addEventListener('click', fecharMenu);

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

inputTelefone.addEventListener('input', () => mascaraTelefone(inputTelefone));
inputCpf.addEventListener('input', () => mascaraCPF(inputCpf));
inputCepResidencial.addEventListener('input', () => mascaraCEP(inputCepResidencial));

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

/* ------------------------- selects / multi-select (ids do back) ----------- */

function preencherSelect(select, lista) {
    select.querySelectorAll('option[value]:not([value=""])').forEach(function (opcao) {
        opcao.remove();
    });
    lista.forEach(function (item) {
        const opcao = document.createElement('option');
        opcao.value = item.id;
        opcao.textContent = item.label;
        select.appendChild(opcao);
    });
}

function criarBadgeSelecionavel(item) {
    const badge = document.createElement('span');
    badge.className = 'badge badge-selectable';
    badge.dataset.id = item.id;
    badge.textContent = item.label;
    badge.addEventListener('click', function () {
        badge.classList.toggle('selected');
    });
    return badge;
}

function preencherMultiSelect(campoMultiSelect, lista) {
    campoMultiSelect.innerHTML = '';
    lista.forEach(function (item) {
        campoMultiSelect.appendChild(criarBadgeSelecionavel(item));
    });
}

function obterSelecionados(campoMultiSelect) {
    const listaSelecionados = [];
    for (let index = 0; index < campoMultiSelect.childElementCount; index++) {
        const item = campoMultiSelect.children[index];
        if (item.classList.contains('selected')) listaSelecionados.push(Number(item.dataset.id));
    }
    return listaSelecionados;
}

function marcarSelecionadosPorId(campoMultiSelect, idsSelecionados) {
    for (let index = 0; index < campoMultiSelect.childElementCount; index++) {
        const item = campoMultiSelect.children[index];
        item.classList.toggle('selected', idsSelecionados.includes(Number(item.dataset.id)));
    }
}

// Cruza os NOMES devolvidos pelo perfil com os labels das listas (comparação exata,
// sem diferenciar maiúsculas/minúsculas). Se não encontrar, não quebra: fica sem
// seleção e registra um aviso no console.
function encontrarIdPorLabel(lista, nome) {
    if (!nome) return null;
    const alvo = String(nome).trim().toLowerCase();
    const encontrado = lista.find(function (item) {
        return String(item.label).trim().toLowerCase() === alvo;
    });
    return encontrado ? encontrado.id : null;
}

function encontrarIdsPorLabels(lista, nomes) {
    if (!Array.isArray(nomes)) return [];
    const ids = [];
    nomes.forEach(function (nome) {
        const id = encontrarIdPorLabel(lista, nome);
        if (id === null) {
            console.warn(`Perfil do freelancer: opção "${nome}" não encontrada na lista do back.`);
            return;
        }
        ids.push(id);
    });
    return ids;
}

function arraysDeIdsIguais(a, b) {
    if (a.length !== b.length) return false;
    const x = a.slice().sort((p, q) => p - q);
    const y = b.slice().sort((p, q) => p - q);
    return x.every((valor, indice) => valor === y[indice]);
}

/* ------------------------- foto de perfil (upload real) -------------------- */

function criarImagemComFallback(container, src, alt) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt;
    img.onerror = function () {
        const placeholder = document.createElement('div');
        placeholder.className = 'imagem-placeholder';
        placeholder.innerHTML = '<i class="bi bi-image"></i>';
        container.replaceChild(placeholder, img);
    };
    container.appendChild(img);
}

function renderizarFoto() {
    fotoPreview.innerHTML = '';
    if (fotoUrl) {
        criarImagemComFallback(fotoPreview, fotoUrl, 'Foto de perfil');
        fotoRemover.removeAttribute('hidden');
    } else {
        fotoPreview.innerHTML = '<span class="field-message">Nenhuma foto adicionada.</span>';
        fotoRemover.setAttribute('hidden', '');
    }
}

// api.js já trata FormData sem forçar Content-Type (deixa o navegador montar o
// boundary), então o upload pode usar api() normalmente, sem fetch manual.
inputFoto.addEventListener('change', async function () {
    const arquivo = inputFoto.files[0];
    if (!arquivo) return;

    if (!TIPOS_IMAGEM_PERMITIDOS.includes(arquivo.type)) {
        mostrarMensagem('A foto de perfil deve ser uma imagem PNG ou JPG.', 'error');
        inputFoto.value = '';
        return;
    }
    if (arquivo.size > LIMITE_FOTO_MB * 1024 * 1024) {
        mostrarMensagem(`A foto de perfil deve ter no máximo ${LIMITE_FOTO_MB}MB.`, 'error');
        inputFoto.value = '';
        return;
    }

    const formData = new FormData();
    formData.append('Image', arquivo);

    inputFoto.disabled = true;
    try {
        const resultado = await api('/User/perfil/imagem', { method: 'PUT', body: formData });
        fotoUrl = resultado && resultado.profileImageUrl
            ? `${ORIGEM_BACK}${resultado.profileImageUrl}?t=${Date.now()}`
            : '';
        renderizarFoto();
        atualizarStatusSelo();
        mostrarMensagem('Foto de perfil atualizada com sucesso.', 'success');
    } catch (erro) {
        console.error('Erro ao enviar foto de perfil:', erro);
        mostrarMensagem(erro.message || 'Não foi possível enviar a foto de perfil. Tente novamente.', 'error');
    } finally {
        inputFoto.disabled = false;
        inputFoto.value = '';
    }
});

fotoRemover.addEventListener('click', async function () {
    fotoRemover.disabled = true;
    try {
        await api('/User/perfil/imagem', { method: 'DELETE' });
        fotoUrl = '';
        renderizarFoto();
        atualizarStatusSelo();
        mostrarMensagem('Foto de perfil removida.', 'success');
    } catch (erro) {
        console.error('Erro ao remover foto de perfil:', erro);
        mostrarMensagem(erro.message || 'Não foi possível remover a foto de perfil. Tente novamente.', 'error');
    } finally {
        fotoRemover.disabled = false;
    }
});

// Fotos de referência e solicitação de verificação: sem endpoint no back.
function atualizarStatusSelo() {
    if (!seloStatus) return;
    seloStatus.className = 'alert alert-warning';
    seloStatus.innerHTML = '<i class="bi bi-hourglass-split"></i> Solicitação de verificação indisponível no MVP.';
}

/* ------------------------- CEP (ViaCEP com fallback manual) --------------- */

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

/* ------------------------- carregar perfil --------------------------------- */

async function carregarDadosFreelancer() {
    try {
        loadingBar.removeAttribute('hidden');
        erroBar.setAttribute('hidden', '');
        conteudoPerfil.setAttribute('hidden', '');

        const [especialidades, maquinas, experiencias, disponibilidades, perfil] = await Promise.all([
            api('/FreelancerFields/listar/camposDoFreelancer?fieldName=Specialty'),
            api('/FreelancerFields/listar/camposDoFreelancer?fieldName=OwnMachine'),
            api('/FreelancerFields/listar/camposDoFreelancer?fieldName=ExperienceYears'),
            api('/FreelancerFields/listar/camposDoFreelancer?fieldName=AvailableTime'),
            api('/User/perfil/freelancer')
        ]);

        listasCampos = {
            especialidades: especialidades || [],
            maquinas: maquinas || [],
            experiencias: experiencias || [],
            disponibilidades: disponibilidades || []
        };

        preencherSelect(selectExperiencia, listasCampos.experiencias);
        preencherSelect(selectDisponibilidade, listasCampos.disponibilidades);
        preencherMultiSelect(inputEspecialidades, listasCampos.especialidades);
        preencherMultiSelect(inputMaquinas, listasCampos.maquinas);

        preencherPerfil(perfil || {});

        loadingBar.setAttribute('hidden', '');
        conteudoPerfil.removeAttribute('hidden');
    } catch (erro) {
        console.error('Erro ao carregar perfil:', erro);
        loadingBar.setAttribute('hidden', '');
        erroBar.removeAttribute('hidden');
    }
}

function preencherPerfil(dados) {
    const nome = dados.legalResponsibleFullName || '';
    const email = dados.email || '';
    const telefone = dados.contactNumber || '';
    const descricao = dados.publicProfileDescription || '';
    const cep = dados.postalCode || '';
    const endereco = dados.address || '';
    const numero = dados.addressNumber != null ? String(dados.addressNumber) : '';
    const bairro = dados.neighborhood || '';
    const complemento = dados.additionalAddressInfo || '';
    const cidade = dados.city || '';
    const estado = dados.state || '';
    // O back devolve birthDate como datetime ISO completo (ex.: "1990-05-10T00:00:00"),
    // não só "yyyy-MM-dd" como descrito no contrato. Um <input type="date"> só aceita
    // "yyyy-MM-dd", então truncamos aqui.
    const nascimento = dados.birthDate ? String(dados.birthDate).slice(0, 10) : '';

    inputNome.value = nome;
    inputDataNascimento.value = nascimento;
    // O back nunca devolve o CPF: o campo começa sempre vazio (ver cabeçalho do arquivo).
    inputCpf.value = '';
    inputEmail.value = email;
    inputTelefone.value = telefone;
    inputDescricao.value = descricao;
    inputCepResidencial.value = cep;
    inputEnderecoResidencial.value = endereco;
    inputNumeroResidencial.value = numero;
    inputBairroResidencial.value = bairro;
    inputComplementoResidencial.value = complemento;
    inputCidadeResidencial.value = cidade;
    inputEstadoResidencial.value = estado;

    const idExperiencia = encontrarIdPorLabel(listasCampos.experiencias, dados.experienceYearsName);
    const idDisponibilidade = encontrarIdPorLabel(listasCampos.disponibilidades, dados.availableTimeName);
    const idsEspecialidades = encontrarIdsPorLabels(listasCampos.especialidades, dados.specialtyNames);
    const idsMaquinas = encontrarIdsPorLabels(listasCampos.maquinas, dados.ownMachineNames);

    selectExperiencia.value = idExperiencia !== null ? String(idExperiencia) : '';
    selectDisponibilidade.value = idDisponibilidade !== null ? String(idDisponibilidade) : '';
    marcarSelecionadosPorId(inputEspecialidades, idsEspecialidades);
    marcarSelecionadosPorId(inputMaquinas, idsMaquinas);

    if (dados.experienceYearsName && idExperiencia === null) {
        console.warn(`Perfil do freelancer: experiência "${dados.experienceYearsName}" não encontrada na lista.`);
    }
    if (dados.availableTimeName && idDisponibilidade === null) {
        console.warn(`Perfil do freelancer: disponibilidade "${dados.availableTimeName}" não encontrada na lista.`);
    }

    fotoUrl = dados.profileImageUrl ? `${ORIGEM_BACK}${dados.profileImageUrl}?t=${Date.now()}` : '';
    renderizarFoto();
    atualizarStatusSelo();

    valoresCarregados = {
        nome, email, telefone, descricao, cep, endereco, numero, bairro, complemento, cidade, estado, nascimento,
        experienceYearsId: idExperiencia,
        availableTimeId: idDisponibilidade,
        specialtyIds: idsEspecialidades.slice(),
        ownMachineIds: idsMaquinas.slice()
    };
}

carregarDadosFreelancer();

/* ------------------------- validação completa ----------------------------- */

function validarFormulario() {
    const erros = [];
    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!inputNome.value.trim()) erros.push('Informe o nome completo.');
    if (!inputDataNascimento.value) erros.push('Informe a data de nascimento.');
    else if (new Date(inputDataNascimento.value) > new Date()) erros.push('A data de nascimento não pode ser no futuro.');
    // CPF agora é opcional: o back não devolve o valor atual, então só validamos
    // formato se o usuário digitar um novo CPF para alterá-lo.
    if (inputCpf.value.trim() && !validarCPF(inputCpf.value)) erros.push('O CPF informado não é válido.');
    if (!inputEmail.value.trim()) erros.push('Informe o e-mail.');
    else if (!emailValido.test(inputEmail.value.trim())) erros.push('Informe um e-mail válido.');
    if (!inputTelefone.value.trim()) erros.push('Informe o telefone/WhatsApp.');
    else {
        const digitosTelefone = inputTelefone.value.replace(/\D/g, '');
        if (digitosTelefone.length !== 10 && digitosTelefone.length !== 11) erros.push('O telefone deve ter 10 ou 11 dígitos.');
    }
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

    if (erros.length) {
        mostrarMensagem(erros.join('\n'), 'error');
        return false;
    }

    return true;
}

/* ------------------------- montar PATCH (somente o que mudou) -------------- */

function montarCorpoAtualizacao() {
    const corpo = {};

    const nome = inputNome.value.trim();
    if (nome !== valoresCarregados.nome) corpo.legalResponsibleFullName = nome;

    const cpfDigitado = inputCpf.value.replace(/\D/g, '');
    if (cpfDigitado) corpo.legalResponsibleDocument = cpfDigitado;

    const email = inputEmail.value.trim();
    if (email !== valoresCarregados.email) corpo.email = email;

    const telefone = inputTelefone.value.replace(/\D/g, '');
    if (telefone !== valoresCarregados.telefone) corpo.contactNumber = telefone;

    const descricao = inputDescricao.value.trim();
    if (descricao !== valoresCarregados.descricao) corpo.publicProfileDescription = descricao;

    const cep = inputCepResidencial.value.trim();
    if (cep !== valoresCarregados.cep) corpo.postalCode = cep;

    const endereco = inputEnderecoResidencial.value.trim();
    if (endereco !== valoresCarregados.endereco) corpo.address = endereco;

    const numero = inputNumeroResidencial.value;
    if (numero !== valoresCarregados.numero) corpo.addressNumber = Number(numero);

    const bairro = inputBairroResidencial.value.trim();
    if (bairro !== valoresCarregados.bairro) corpo.neighborhood = bairro;

    const complemento = inputComplementoResidencial.value.trim();
    if (complemento !== valoresCarregados.complemento) corpo.additionalAddressInfo = complemento;

    const cidade = inputCidadeResidencial.value.trim();
    if (cidade !== valoresCarregados.cidade) corpo.city = cidade;

    const estado = inputEstadoResidencial.value.trim();
    if (estado !== valoresCarregados.estado) corpo.state = estado;

    const nascimento = inputDataNascimento.value;
    if (nascimento !== valoresCarregados.nascimento) corpo.birthDate = nascimento;

    const idExperiencia = selectExperiencia.value ? Number(selectExperiencia.value) : null;
    if (idExperiencia !== valoresCarregados.experienceYearsId) corpo.experienceYearsId = idExperiencia;

    const idDisponibilidade = selectDisponibilidade.value ? Number(selectDisponibilidade.value) : null;
    if (idDisponibilidade !== valoresCarregados.availableTimeId) corpo.availableTimeId = idDisponibilidade;

    const idsEspecialidades = obterSelecionados(inputEspecialidades);
    if (!arraysDeIdsIguais(idsEspecialidades, valoresCarregados.specialtyIds)) corpo.specialtyIds = idsEspecialidades;

    const idsMaquinas = obterSelecionados(inputMaquinas);
    if (!arraysDeIdsIguais(idsMaquinas, valoresCarregados.ownMachineIds)) corpo.ownMachineIds = idsMaquinas;

    return corpo;
}

// Reflete no snapshot local só os campos que foram realmente enviados e aceitos,
// para a próxima comparação já partir do estado salvo (sem precisar recarregar).
function atualizarValoresCarregadosPosSalvar(corpo) {
    const mapa = {
        legalResponsibleFullName: 'nome',
        email: 'email',
        contactNumber: 'telefone',
        publicProfileDescription: 'descricao',
        postalCode: 'cep',
        address: 'endereco',
        neighborhood: 'bairro',
        additionalAddressInfo: 'complemento',
        city: 'cidade',
        state: 'estado',
        birthDate: 'nascimento',
        experienceYearsId: 'experienceYearsId',
        availableTimeId: 'availableTimeId',
        specialtyIds: 'specialtyIds',
        ownMachineIds: 'ownMachineIds'
    };

    Object.keys(corpo).forEach(function (chaveBack) {
        if (chaveBack === 'addressNumber') {
            valoresCarregados.numero = String(corpo.addressNumber);
            return;
        }
        if (chaveBack === 'legalResponsibleDocument') return; // nunca reexibido
        const chaveLocal = mapa[chaveBack];
        if (chaveLocal) valoresCarregados[chaveLocal] = corpo[chaveBack];
    });
}

/* ------------------------- salvar alterações ------------------------------ */

form.addEventListener('submit', async function (evento) {
    evento.preventDefault();
    limparMensagem();

    if (!validarFormulario()) return;

    const corpo = montarCorpoAtualizacao();

    if (Object.keys(corpo).length === 0) {
        mostrarMensagem('Nenhuma alteração para salvar.', 'error');
        return;
    }

    const botaoSalvar = form.querySelector('button[type="submit"]');
    botaoSalvar.disabled = true;

    try {
        await api('/User/atualizarcadastro/freelancer', { method: 'PATCH', body: corpo });

        mostrarMensagem('Alterações salvas com sucesso.', 'success');
        atualizarValoresCarregadosPosSalvar(corpo);
        inputCpf.value = '';

        if (corpo.legalResponsibleFullName !== undefined) {
            const sessaoAtual = obterSessao();
            if (sessaoAtual) {
                sessaoAtual.nome = corpo.legalResponsibleFullName;
                salvarSessao(sessaoAtual);
                const topbar = document.getElementById('header-acoes');
                if (topbar) renderizarTopbar(topbar, sessaoAtual);
            }
        }
    } catch (erro) {
        console.error('Erro ao salvar perfil:', erro);
        if (erro.status === 400 || erro.status === 409) {
            mostrarMensagem(erro.message || 'Não foi possível salvar as alterações. Verifique os dados informados.', 'error');
        } else {
            mostrarMensagem('Não foi possível salvar as alterações. Tente novamente.', 'error');
        }
    } finally {
        botaoSalvar.disabled = false;
    }
});

/* ------------------------- data máxima (hoje) ------------------------------ */

inputDataNascimento.max = hojeLocalISO();
