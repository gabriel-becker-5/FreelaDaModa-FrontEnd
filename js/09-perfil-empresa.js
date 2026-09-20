// Perfil da Empresa
const API_URL = `${API_BASE}/empresas`;

const sessao = exigirTipo('empresas');
if (!sessao) {
    throw new Error('Sessão inválida');
}
const empresaId = sessao.id;
let token;

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
const inputReferencias = document.querySelector('#pe-referencias');
const logoPreview = document.querySelector('#pe-logo-preview');
const logoRemover = document.querySelector('#pe-logo-remover');
const referenciasPreview = document.querySelector('#pe-referencias-preview');
const seloStatus = document.querySelector('#selo-status');
const loadingBar = document.querySelector('#perfil-loading');
const erroBar = document.querySelector('#perfil-erro');
const conteudoPerfil = document.querySelector('#perfil-conteudo');

const LIMITE_FOTO_MB = 5;
const MAX_REFERENCIAS = 10;

// No banco são gravados somente os CAMINHOS das imagens (como será no back real).
// O preview em sessão usa URL.createObjectURL; ao carregar do banco, o caminho
// é usado direto no <img> (com placeholder caso o arquivo não exista no mock).
let logoCaminho = '';
let logoPreviewUrl = '';
let referenciasCaminhos = [];
let referenciasPreviewUrls = [];

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
    alertBar.innerHTML = `<i class="bi ${tipo === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'}"></i> ${texto}`;
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

/* ------------------------- uploads (logo e referências) ------------------- */

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
    if (logoPreviewUrl) {
        criarImagemComFallback(logoPreview, logoPreviewUrl, 'Logo da empresa');
        logoRemover.removeAttribute('hidden');
    } else {
        logoPreview.innerHTML = '<span class="field-message">Nenhum logo adicionado.</span>';
        logoRemover.setAttribute('hidden', '');
    }
}

function renderizarReferencias() {
    referenciasPreview.innerHTML = '';
    if (!referenciasPreviewUrls.length) {
        referenciasPreview.innerHTML = '<span class="field-message">Nenhuma foto de referência adicionada.</span>';
        return;
    }
    referenciasPreviewUrls.forEach(function (url, indice) {
        const item = document.createElement('div');
        item.className = 'referencia-item';

        criarImagemComFallback(item, url, `Referência ${indice + 1}`);

        const botao = document.createElement('button');
        botao.type = 'button';
        botao.setAttribute('aria-label', 'Remover referência');
        botao.innerHTML = '<i class="bi bi-x"></i>';
        botao.addEventListener('click', function () {
            const urlRemovida = referenciasPreviewUrls.splice(indice, 1)[0];
            referenciasCaminhos.splice(indice, 1);
            if (urlRemovida && urlRemovida.startsWith('blob:')) URL.revokeObjectURL(urlRemovida);
            renderizarReferencias();
        });

        item.appendChild(botao);
        referenciasPreview.appendChild(item);
    });
}

inputLogo.addEventListener('change', function () {
    const arquivo = inputLogo.files[0];
    if (!arquivo) return;
    if (!arquivo.type.startsWith('image/')) {
        mostrarMensagem('O logo deve ser uma imagem (PNG ou JPG).', 'error');
        inputLogo.value = '';
        return;
    }
    if (arquivo.size > LIMITE_FOTO_MB * 1024 * 1024) {
        mostrarMensagem(`O logo deve ter no máximo ${LIMITE_FOTO_MB}MB.`, 'error');
        inputLogo.value = '';
        return;
    }

    if (logoPreviewUrl.startsWith('blob:')) URL.revokeObjectURL(logoPreviewUrl);
    logoCaminho = `/uploads/empresas/${empresaId}/logo-perfil.jpg`;
    logoPreviewUrl = URL.createObjectURL(arquivo);
    renderizarLogo();
    inputLogo.value = '';
});

logoRemover.addEventListener('click', function () {
    if (logoPreviewUrl.startsWith('blob:')) URL.revokeObjectURL(logoPreviewUrl);
    logoCaminho = '';
    logoPreviewUrl = '';
    renderizarLogo();
});

inputReferencias.addEventListener('change', function () {
    const arquivos = Array.from(inputReferencias.files);
    let ignorados = 0;

    arquivos.forEach(function (arquivo) {
        if (referenciasCaminhos.length >= MAX_REFERENCIAS) {
            ignorados++;
            return;
        }
        if (!arquivo.type.startsWith('image/')) {
            ignorados++;
            return;
        }
        if (arquivo.size > LIMITE_FOTO_MB * 1024 * 1024) {
            ignorados++;
            return;
        }
        const indice = referenciasCaminhos.length + 1;
        referenciasCaminhos.push(`/uploads/empresas/${empresaId}/referencia-${Date.now()}-${indice}.jpg`);
        referenciasPreviewUrls.push(URL.createObjectURL(arquivo));
    });

    renderizarReferencias();

    if (ignorados > 0) {
        mostrarMensagem(`Algumas fotos não foram adicionadas (são permitidas até ${MAX_REFERENCIAS} imagens de até ${LIMITE_FOTO_MB}MB cada).`, 'error');
    }
    inputReferencias.value = '';
});

/* ------------------------- selo de verificação (empresa) ------------------ */

function atualizarStatusSelo() {
    if (!seloStatus) return;

    const pendentes = [];
    if (!inputNomeResponsavel.value.trim()) pendentes.push('nome do responsável');
    if (!inputDataNascimento.value) pendentes.push('data de nascimento');
    if (!inputCPFResponsavel.value.trim()) pendentes.push('CPF');
    if (!inputRazaoSocial.value.trim()) pendentes.push('razão social');
    if (!inputNomeFantasia.value.trim()) pendentes.push('nome fantasia');
    if (!inputCNPJ.value.trim()) pendentes.push('CNPJ');
    if (!inputRamoAtuacao.value.trim()) pendentes.push('ramo de atuação');
    if (!inputEmail.value.trim()) pendentes.push('e-mail');
    if (!inputTelefone.value.trim()) pendentes.push('telefone');
    if (!inputDescricao.value.trim()) pendentes.push('descrição do perfil');
    if (!inputCepComercial.value.trim()) pendentes.push('CEP');
    if (!inputEnderecoComercial.value.trim()) pendentes.push('endereço');
    if (!inputNumeroComercial.value) pendentes.push('número');
    if (!inputBairroComercial.value.trim()) pendentes.push('bairro');
    if (!inputCidadeComercial.value.trim()) pendentes.push('cidade');
    if (!inputEstadoComercial.value.trim()) pendentes.push('estado');

    if (!pendentes.length) {
        seloStatus.className = 'alert alert-success';
        seloStatus.innerHTML = '<i class="bi bi-patch-check-fill"></i> Perfil completo! Envie seus documentos pelo Suporte para solicitar o selo de verificado.';
    } else {
        seloStatus.className = 'alert alert-warning';
        seloStatus.innerHTML = `<i class="bi bi-hourglass-split"></i> Para solicitar o selo de verificado, complete o perfil: ${pendentes.join(', ')}.`;
    }
}

// Avisa a alteração de qualquer campo do formulário para atualizar o selo
form.addEventListener('input', atualizarStatusSelo);

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

        const resposta = await fetch(`${API_URL}/${empresaId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!resposta.ok) throw new Error(`Erro HTTP: ${resposta.status}`);

        const dados = await resposta.json();
        preencherPerfil(dados);

        loadingBar.setAttribute('hidden', '');
        conteudoPerfil.removeAttribute('hidden');
    } catch (erro) {
        console.error('Erro ao carregar perfil:', erro);
        loadingBar.setAttribute('hidden', '');
        erroBar.removeAttribute('hidden');
    }
}

function preencherPerfil(dados) {
    inputNomeResponsavel.value = dados.nomeResponsavel || '';
    inputDataNascimento.value = dados.dataNascimento || '';
    inputCPFResponsavel.value = dados.cpfResponsavel || '';
    inputRazaoSocial.value = dados.razaoSocial || '';
    inputNomeFantasia.value = dados.nomeFantasia || '';
    inputCNPJ.value = dados.cnpjEmpresa || '';
    inputRamoAtuacao.value = dados.ramoAtuacao || '';
    inputEmail.value = dados.email || '';
    inputTelefone.value = dados.telefone || '';
    inputDescricao.value = dados.descricaoPerfil || '';
    inputCepComercial.value = dados.cep || '';
    inputEnderecoComercial.value = dados.enderecoComercial || '';
    inputNumeroComercial.value = dados.numeroComercial || '';
    inputBairroComercial.value = dados.bairroComercial || '';
    inputComplementoComercial.value = dados.complementoComercial || '';
    inputCidadeComercial.value = dados.cidadeComercial || '';
    inputEstadoComercial.value = dados.estadoComercial || '';

    logoCaminho = dados.foto || '';
    logoPreviewUrl = logoCaminho;
    referenciasCaminhos = Array.isArray(dados.referencias) ? dados.referencias : [];
    referenciasPreviewUrls = referenciasCaminhos.slice();
    renderizarLogo();
    renderizarReferencias();
    atualizarStatusSelo();
}

carregarDadosEmpresa();

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

    if (erros.length) {
        mostrarMensagem(erros.join('<br>'), 'error');
        return false;
    }

    return true;
}

/* ------------------------- salvar alterações ------------------------------- */

form.addEventListener('submit', async function (evento) {
    evento.preventDefault();
    limparMensagem();

    if (!validarFormulario()) return;

    const empresaAtualizada = {
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
        foto: logoCaminho,
        referencias: referenciasCaminhos
    };

    const botaoSalvar = form.querySelector('button[type="submit"]');
    botaoSalvar.disabled = true;

    try {
        const resposta = await fetch(`${API_URL}/${empresaId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(empresaAtualizada)
        });

        if (!resposta.ok) throw new Error(`Erro HTTP: ${resposta.status}`);

        mostrarMensagem('Alterações salvas com sucesso.', 'success');
    } catch (erro) {
        console.error('Erro ao salvar perfil:', erro);
        mostrarMensagem('Não foi possível salvar as alterações. Tente novamente em instantes.', 'error');
    } finally {
        botaoSalvar.disabled = false;
    }
});

/* ------------------------- data máxima (hoje) ------------------------------ */

inputDataNascimento.max = new Date().toISOString().split('T')[0];
