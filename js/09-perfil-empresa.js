// Editar perfil Empresa

const sessao = exigirTipo('empresas');
if (!sessao) {
    throw new Error('Sessão inválida');
}
const empresaId = sessao.id;

// profileImageUrl vem como caminho relativo (ex.: "/api/v1/User/{id}/imagem-perfil"),
// então para exibir a imagem é preciso prefixar a origem do back (API_BASE sem o /api/v1).
const ORIGEM_BACK = API_BASE.replace(/\/api\/v1\/?$/, '');

const btnVerPerfilPublico = document.querySelector('#btn-ver-perfil-publico');
if (btnVerPerfilPublico) {
    btnVerPerfilPublico.href = `/pages/26-perfil-empresa-publico.html?id=${encodeURIComponent(empresaId)}`;
}

renderizarSidebar(document.querySelector('.sidebar'), 'empresas', '09-perfil-empresa');
renderizarTopbar(document.querySelector('#header-acoes'), sessao);
renderizarBannerValidacao(document.querySelector('.main'), sessao);

const form = document.querySelector('#perfil-empresa');
const alertBar = document.querySelector('#alert-perfil-empresa');
const inputNomeResponsavel = document.querySelector('#pe-resp');
const inputDataNascimento = document.querySelector('#pe-nascimento');
const inputCPFResponsavel = document.querySelector('#pe-cpf');
const inputRazaoSocial = document.querySelector('#pe-razao');
const inputNomeFantasia = document.querySelector('#pe-fantasia');
const inputCNPJ = document.querySelector('#pe-cnpj');
const inputRamoAtuacao = document.querySelector('#pe-ramo');
const inputEmail = document.querySelector('#pe-email');
const inputTelefone = document.querySelector('#pe-telefone');
const inputDescricao = document.querySelector('#pe-descricao');
const inputCepComercial = document.querySelector('#pe-cep');
const inputEnderecoComercial = document.querySelector('#pe-endereco');
const inputNumeroComercial = document.querySelector('#pe-numero');
const inputBairroComercial = document.querySelector('#pe-bairro');
const inputComplementoComercial = document.querySelector('#pe-complemento');
const inputCidadeComercial = document.querySelector('#pe-cidade');
const inputEstadoComercial = document.querySelector('#pe-estado');
const inputLogo = document.querySelector('#pe-logo');
const logoPreview = document.querySelector('#pe-logo-preview');
const logoRemover = document.querySelector('#pe-logo-remover');
const seloStatus = document.querySelector('#selo-status');
const loadingBar = document.querySelector('#perfil-loading');
const erroBar = document.querySelector('#perfil-erro');
const conteudoPerfil = document.querySelector('#perfil-conteudo');

const LIMITE_FOTO_MB = 5;
const TIPOS_IMAGEM_PERMITIDOS = ['image/png', 'image/jpeg', 'image/jpg'];

// URL atual do logo (já com a origem do back e cache-busting) ou '' se não houver logo.
let logoUrl = '';

// Cópia dos valores carregados no GET, usada para calcular somente os campos
// alterados no PATCH.
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

// O back valida o CNPJ alfanumérico com a regex ^[A-Z0-9]{8}[0-9]{6}$ (8 primeiros
// alfanuméricos maiúsculos + 6 dígitos finais). Aqui só confirmamos o formato; os
// dígitos verificadores ficam a cargo do back.
function validarFormatoCNPJ(cnpj) {
    const caracteres = String(cnpj || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return /^[A-Z0-9]{8}[0-9]{6}$/.test(caracteres);
}

/* ------------------------- logo da empresa (upload real) ------------------- */

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

function renderizarLogo() {
    logoPreview.innerHTML = '';
    if (logoUrl) {
        criarImagemComFallback(logoPreview, logoUrl, 'Logo da empresa');
        logoRemover.removeAttribute('hidden');
    } else {
        logoPreview.innerHTML = '<span class="field-message">Nenhum logo adicionado.</span>';
        logoRemover.setAttribute('hidden', '');
    }
}

// api.js já trata FormData sem forçar Content-Type (deixa o navegador montar o
// boundary), então o upload pode usar api() normalmente, sem fetch manual.
inputLogo.addEventListener('change', async function () {
    const arquivo = inputLogo.files[0];
    if (!arquivo) return;

    if (!TIPOS_IMAGEM_PERMITIDOS.includes(arquivo.type)) {
        mostrarMensagem('O logo deve ser uma imagem PNG ou JPG.', 'error');
        inputLogo.value = '';
        return;
    }
    if (arquivo.size > LIMITE_FOTO_MB * 1024 * 1024) {
        mostrarMensagem(`O logo deve ter no máximo ${LIMITE_FOTO_MB}MB.`, 'error');
        inputLogo.value = '';
        return;
    }

    const formData = new FormData();
    formData.append('Image', arquivo);

    inputLogo.disabled = true;
    try {
        const resultado = await api('/User/perfil/imagem', { method: 'PUT', body: formData });
        logoUrl = resultado && resultado.profileImageUrl
            ? `${ORIGEM_BACK}${resultado.profileImageUrl}?t=${Date.now()}`
            : '';
        renderizarLogo();
        mostrarMensagem('Logo atualizado com sucesso.', 'success');
    } catch (erro) {
        console.error('Erro ao enviar logo:', erro);
        mostrarMensagem(erro.message || 'Não foi possível enviar o logo. Tente novamente.', 'error');
    } finally {
        inputLogo.disabled = false;
        inputLogo.value = '';
    }
});

logoRemover.addEventListener('click', async function () {
    logoRemover.disabled = true;
    try {
        await api('/User/perfil/imagem', { method: 'DELETE' });
        logoUrl = '';
        renderizarLogo();
        mostrarMensagem('Logo removido.', 'success');
    } catch (erro) {
        console.error('Erro ao remover logo:', erro);
        mostrarMensagem(erro.message || 'Não foi possível remover o logo. Tente novamente.', 'error');
    } finally {
        logoRemover.disabled = false;
    }
});

/* ------------------------- selo de verificação (empresa) ------------------ */

// Fotos de referência e solicitação de verificação: sem endpoint no back.
// Não encaminhar a empresa ao Suporte (fora do MVP).
function atualizarStatusSelo() {
    if (!seloStatus) return;
    seloStatus.className = 'alert alert-warning';
    seloStatus.innerHTML = '<i class="bi bi-hourglass-split"></i> Solicitação de verificação indisponível no MVP.';
}

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

/* ------------------------- carregar perfil --------------------------------- */

async function carregarDadosEmpresa() {
    try {
        loadingBar.removeAttribute('hidden');
        erroBar.setAttribute('hidden', '');
        conteudoPerfil.setAttribute('hidden', '');

        const perfil = await api('/User/perfil/empresa');
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
    const nomeResponsavel = dados.legalResponsibleFullName || '';
    const razaoSocial = dados.legalName || '';
    const nomeFantasia = dados.companyName || '';
    const ramoAtuacao = dados.coreBusiness || '';
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

    inputNomeResponsavel.value = nomeResponsavel;
    // O back não devolve data de nascimento do responsável nesta tela (nem aceita
    // esse campo no PATCH): o campo fica sempre em branco e nunca é enviado.
    inputDataNascimento.value = '';
    // O back também nunca devolve CPF/CNPJ: os campos começam sempre vazios.
    inputCPFResponsavel.value = '';
    inputCNPJ.value = '';
    inputRazaoSocial.value = razaoSocial;
    inputNomeFantasia.value = nomeFantasia;
    inputRamoAtuacao.value = ramoAtuacao;
    inputEmail.value = email;
    inputTelefone.value = telefone;
    inputDescricao.value = descricao;
    inputCepComercial.value = cep;
    inputEnderecoComercial.value = endereco;
    inputNumeroComercial.value = numero;
    inputBairroComercial.value = bairro;
    inputComplementoComercial.value = complemento;
    inputCidadeComercial.value = cidade;
    inputEstadoComercial.value = estado;

    logoUrl = dados.profileImageUrl ? `${ORIGEM_BACK}${dados.profileImageUrl}?t=${Date.now()}` : '';
    renderizarLogo();
    atualizarStatusSelo();

    valoresCarregados = {
        nomeResponsavel, razaoSocial, nomeFantasia, ramoAtuacao, email, telefone, descricao,
        cep, endereco, numero, bairro, complemento, cidade, estado
    };
}

carregarDadosEmpresa();

/* ------------------------- validação completa ------------------------------ */

function validarFormulario() {
    const erros = [];
    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!inputNomeResponsavel.value.trim()) erros.push('Informe o nome completo do responsável.');
    // CPF do responsável agora é opcional: só validamos formato se o usuário digitar
    // um novo valor para alterá-lo (o back não devolve o CPF atual).
    if (inputCPFResponsavel.value.trim() && !validarCPF(inputCPFResponsavel.value)) erros.push('O CPF informado não é válido.');

    if (!inputRazaoSocial.value.trim()) erros.push('Informe a razão social.');
    if (!inputNomeFantasia.value.trim()) erros.push('Informe o nome fantasia.');
    // CNPJ também é opcional pelo mesmo motivo do CPF.
    if (inputCNPJ.value.trim() && !validarFormatoCNPJ(inputCNPJ.value)) erros.push('O CNPJ informado não é válido.');
    if (!inputRamoAtuacao.value.trim()) erros.push('Informe o ramo de atuação.');
    if (!inputEmail.value.trim()) erros.push('Informe o e-mail.');
    else if (!emailValido.test(inputEmail.value.trim())) erros.push('Informe um e-mail válido.');
    if (!inputTelefone.value.trim()) erros.push('Informe o telefone/WhatsApp.');
    else {
        const digitosTelefone = inputTelefone.value.replace(/\D/g, '');
        if (digitosTelefone.length !== 10 && digitosTelefone.length !== 11) erros.push('O telefone deve ter 10 ou 11 dígitos.');
    }
    if (!inputDescricao.value.trim()) erros.push('A descrição do perfil é obrigatória.');

    if (!inputCepComercial.value.trim()) erros.push('Informe o CEP.');
    else if (inputCepComercial.value.replace(/\D/g, '').length !== 8) erros.push('O CEP deve ter 8 dígitos.');
    if (!inputEnderecoComercial.value.trim()) erros.push('Endereço não preenchido — informe um CEP válido.');
    if (!inputNumeroComercial.value) erros.push('Informe o número do endereço.');
    else if (Number(inputNumeroComercial.value) < 0) erros.push('O número do endereço não pode ser negativo.');
    if (!inputBairroComercial.value.trim()) erros.push('Bairro não preenchido — informe um CEP válido.');
    if (!inputCidadeComercial.value.trim()) erros.push('Cidade não preenchida — informe um CEP válido.');
    if (!inputEstadoComercial.value.trim()) erros.push('Estado não preenchido — informe um CEP válido.');

    if (erros.length) {
        mostrarMensagem(erros.join('\n'), 'error');
        return false;
    }

    return true;
}

/* ------------------------- montar PATCH (somente o que mudou) -------------- */

function montarCorpoAtualizacao() {
    const corpo = {};

    const nomeResponsavel = inputNomeResponsavel.value.trim();
    if (nomeResponsavel !== valoresCarregados.nomeResponsavel) corpo.legalResponsibleFullName = nomeResponsavel;

    const cpfDigitado = inputCPFResponsavel.value.replace(/\D/g, '');
    if (cpfDigitado) corpo.legalResponsibleDocument = cpfDigitado;

    const razaoSocial = inputRazaoSocial.value.trim();
    if (razaoSocial !== valoresCarregados.razaoSocial) corpo.legalName = razaoSocial;

    const nomeFantasia = inputNomeFantasia.value.trim();
    if (nomeFantasia !== valoresCarregados.nomeFantasia) corpo.companyName = nomeFantasia;

    const cnpjDigitado = inputCNPJ.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (cnpjDigitado) corpo.companyRegistrationDocument = cnpjDigitado;

    const ramoAtuacao = inputRamoAtuacao.value.trim();
    if (ramoAtuacao !== valoresCarregados.ramoAtuacao) corpo.coreBusiness = ramoAtuacao;

    const email = inputEmail.value.trim();
    if (email !== valoresCarregados.email) corpo.email = email;

    const telefone = inputTelefone.value.replace(/\D/g, '');
    if (telefone !== valoresCarregados.telefone) corpo.contactNumber = telefone;

    const descricao = inputDescricao.value.trim();
    if (descricao !== valoresCarregados.descricao) corpo.publicProfileDescription = descricao;

    const cep = inputCepComercial.value.trim();
    if (cep !== valoresCarregados.cep) corpo.postalCode = cep;

    const endereco = inputEnderecoComercial.value.trim();
    if (endereco !== valoresCarregados.endereco) corpo.address = endereco;

    const numero = inputNumeroComercial.value;
    if (numero !== valoresCarregados.numero) corpo.addressNumber = Number(numero);

    const bairro = inputBairroComercial.value.trim();
    if (bairro !== valoresCarregados.bairro) corpo.neighborhood = bairro;

    const complemento = inputComplementoComercial.value.trim();
    if (complemento !== valoresCarregados.complemento) corpo.additionalAddressInfo = complemento;

    const cidade = inputCidadeComercial.value.trim();
    if (cidade !== valoresCarregados.cidade) corpo.city = cidade;

    const estado = inputEstadoComercial.value.trim();
    if (estado !== valoresCarregados.estado) corpo.state = estado;

    // Data de nascimento do responsável NUNCA é enviada: o PATCH de empresa não
    // aceita esse campo (contrato da Fase 1.3).

    return corpo;
}

// Reflete no snapshot local só os campos que foram realmente enviados e aceitos,
// para a próxima comparação já partir do estado salvo (sem precisar recarregar).
function atualizarValoresCarregadosPosSalvar(corpo) {
    const mapa = {
        legalResponsibleFullName: 'nomeResponsavel',
        legalName: 'razaoSocial',
        companyName: 'nomeFantasia',
        coreBusiness: 'ramoAtuacao',
        email: 'email',
        contactNumber: 'telefone',
        publicProfileDescription: 'descricao',
        postalCode: 'cep',
        address: 'endereco',
        neighborhood: 'bairro',
        additionalAddressInfo: 'complemento',
        city: 'cidade',
        state: 'estado'
    };

    Object.keys(corpo).forEach(function (chaveBack) {
        if (chaveBack === 'addressNumber') {
            valoresCarregados.numero = String(corpo.addressNumber);
            return;
        }
        if (chaveBack === 'legalResponsibleDocument' || chaveBack === 'companyRegistrationDocument') return; // nunca reexibidos
        const chaveLocal = mapa[chaveBack];
        if (chaveLocal) valoresCarregados[chaveLocal] = corpo[chaveBack];
    });
}

/* ------------------------- salvar alterações ------------------------------- */

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
        await api('/User/atualizarcadastro/empresa', { method: 'PATCH', body: corpo });

        mostrarMensagem('Alterações salvas com sucesso.', 'success');
        atualizarValoresCarregadosPosSalvar(corpo);
        inputCPFResponsavel.value = '';
        inputCNPJ.value = '';

        if (corpo.companyName !== undefined) {
            const sessaoAtual = obterSessao();
            if (sessaoAtual) {
                sessaoAtual.nome = corpo.companyName;
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
            mostrarMensagem('Não foi possível salvar as alterações. Tente novamente em instantes.', 'error');
        }
    } finally {
        botaoSalvar.disabled = false;
    }
});

/* ------------------------- data máxima (hoje) ------------------------------ */

inputDataNascimento.max = hojeLocalISO();
