// npx json-server --watch db.json --port 3000
// Pendências
// 1. Token JWT

const API_URL = `${API_BASE}/freelancers`;

const sessao = exigirTipo('freelancers');
if (!sessao) {
    throw new Error('Sessão inválida');
}
const freelancerId = sessao.id;
let token;

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
const inputReferencias = document.querySelector('#pf-referencias');
const fotoPreview = document.querySelector('#pf-foto-preview');
const fotoRemover = document.querySelector('#pf-foto-remover');
const referenciasPreview = document.querySelector('#pf-referencias-preview');
const seloStatus = document.querySelector('#selo-status');
const loadingBar = document.querySelector('#perfil-loading');
const erroBar = document.querySelector('#perfil-erro');
const conteudoPerfil = document.querySelector('#perfil-conteudo');

const LIMITE_FOTO_MB = 5;
const MAX_REFERENCIAS = 10;
const MIN_REFERENCIAS_SELO = 5;

// No banco são gravados somente os CAMINHOS das imagens (como será no back real).
// O preview em sessão usa URL.createObjectURL; ao carregar do banco, o caminho
// é usado direto no <img> (com placeholder caso o arquivo não exista no mock).
let fotoCaminho = '';
let fotoPreviewUrl = '';
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

/* ------------------------- badges ----------------------------------------- */

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

function marcarSelecionados(campoMultiSelect, valoresSelecionados) {
    for (let index = 0; index < campoMultiSelect.childElementCount; index++) {
        const item = campoMultiSelect.children[index];
        item.classList.toggle('selected', valoresSelecionados.includes(item.textContent));
    }
}

/* ------------------------- uploads (foto e referências) ------------------- */

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
    if (fotoPreviewUrl) {
        criarImagemComFallback(fotoPreview, fotoPreviewUrl, 'Foto de perfil');
        fotoRemover.removeAttribute('hidden');
    } else {
        fotoPreview.innerHTML = '<span class="field-message">Nenhuma foto adicionada.</span>';
        fotoRemover.setAttribute('hidden', '');
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
            atualizarStatusSelo();
        });

        item.appendChild(botao);
        referenciasPreview.appendChild(item);
    });
}

inputFoto.addEventListener('change', function () {
    const arquivo = inputFoto.files[0];
    if (!arquivo) return;
    if (!arquivo.type.startsWith('image/')) {
        mostrarMensagem('A foto de perfil deve ser uma imagem (PNG ou JPG).', 'error');
        inputFoto.value = '';
        return;
    }
    if (arquivo.size > LIMITE_FOTO_MB * 1024 * 1024) {
        mostrarMensagem(`A foto de perfil deve ter no máximo ${LIMITE_FOTO_MB}MB.`, 'error');
        inputFoto.value = '';
        return;
    }

    if (fotoPreviewUrl.startsWith('blob:')) URL.revokeObjectURL(fotoPreviewUrl);
    fotoCaminho = `/uploads/freelancers/${freelancerId}/foto-perfil.jpg`;
    fotoPreviewUrl = URL.createObjectURL(arquivo);
    renderizarFoto();
    atualizarStatusSelo();
    inputFoto.value = '';
});

fotoRemover.addEventListener('click', function () {
    if (fotoPreviewUrl.startsWith('blob:')) URL.revokeObjectURL(fotoPreviewUrl);
    fotoCaminho = '';
    fotoPreviewUrl = '';
    renderizarFoto();
    atualizarStatusSelo();
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
        referenciasCaminhos.push(`/uploads/freelancers/${freelancerId}/referencia-${Date.now()}-${indice}.jpg`);
        referenciasPreviewUrls.push(URL.createObjectURL(arquivo));
    });

    renderizarReferencias();
    atualizarStatusSelo();

    if (ignorados > 0) {
        mostrarMensagem(`Algumas fotos não foram adicionadas (são permitidas até ${MAX_REFERENCIAS} imagens de até ${LIMITE_FOTO_MB}MB cada).`, 'error');
    }
    inputReferencias.value = '';
});

function atualizarStatusSelo() {
    if (!seloStatus) return;
    const temFoto = !!fotoCaminho;
    const qtdRefs = referenciasCaminhos.length;
    const faltantes = [];

    if (!temFoto) faltantes.push('sua foto de perfil');
    if (qtdRefs < MIN_REFERENCIAS_SELO) faltantes.push(`${MIN_REFERENCIAS_SELO - qtdRefs} foto(s) de referência`);

    if (!faltantes.length) {
        seloStatus.className = 'alert alert-success';
        seloStatus.innerHTML = '<i class="bi bi-patch-check-fill"></i> Perfil completo! Ao salvar, seu perfil ficará elegível ao selo de verificado.';
    } else {
        seloStatus.className = 'alert alert-warning';
        seloStatus.innerHTML = `<i class="bi bi-hourglass-split"></i> Para receber o selo de verificado, adicione ${faltantes.join(' e ')}.`;
    }
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

        const resposta = await fetch(`${API_URL}/${freelancerId}`, {
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
    inputNome.value = dados.nome || '';
    inputDataNascimento.value = dados.dataNascimento || '';
    inputCpf.value = dados.cpf || '';
    inputEmail.value = dados.email || '';
    inputTelefone.value = dados.telefone || '';
    inputDescricao.value = dados.descricao || '';
    inputCepResidencial.value = dados.cepResidencial || '';
    inputEnderecoResidencial.value = dados.enderecoResidencial || '';
    inputNumeroResidencial.value = dados.numeroResidencial || '';
    inputBairroResidencial.value = dados.bairroResidencial || '';
    inputComplementoResidencial.value = dados.complementoResidencial || '';
    inputCidadeResidencial.value = dados.cidadeResidencial || '';
    inputEstadoResidencial.value = dados.estadoResidencial || '';
    selectExperiencia.value = dados.tempoExperiencia || '';
    selectDisponibilidade.value = dados.disponibilidadeHorario || '';
    marcarSelecionados(inputEspecialidades, dados.especialidades || []);
    marcarSelecionados(inputMaquinas, dados.maquinas || []);

    fotoCaminho = dados.foto || '';
    fotoPreviewUrl = fotoCaminho;
    referenciasCaminhos = Array.isArray(dados.referencias) ? dados.referencias : [];
    referenciasPreviewUrls = referenciasCaminhos.slice();
    renderizarFoto();
    renderizarReferencias();
    atualizarStatusSelo();
}

carregarDadosFreelancer();

/* ------------------------- validação completa ----------------------------- */

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

    if (erros.length) {
        mostrarMensagem(erros.join('<br>'), 'error');
        return false;
    }

    return true;
}

/* ------------------------- salvar alterações ------------------------------ */

form.addEventListener('submit', async function (evento) {
    evento.preventDefault();
    limparMensagem();

    if (!validarFormulario()) return;

    const freelancerAtualizado = {
        nome: inputNome.value.trim(),
        cpf: inputCpf.value,
        dataNascimento: inputDataNascimento.value,
        email: inputEmail.value.trim(),
        telefone: inputTelefone.value,
        descricao: inputDescricao.value.trim(),
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
        foto: fotoCaminho,
        referencias: referenciasCaminhos
    };

    const botaoSalvar = form.querySelector('button[type="submit"]');
    botaoSalvar.disabled = true;

    try {
        const resposta = await fetch(`${API_URL}/${freelancerId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(freelancerAtualizado)
        });

        if (!resposta.ok) throw new Error(`Erro HTTP: ${resposta.status}`);

        mostrarMensagem('Alterações salvas com sucesso.', 'success');
    } catch (erro) {
        console.error('Erro ao salvar perfil:', erro);
        mostrarMensagem('Não foi possível salvar as alterações. Tente novamente.', 'error');
    } finally {
        botaoSalvar.disabled = false;
    }
});

/* ------------------------- data máxima (hoje) ----------------------------- */

inputDataNascimento.max = new Date().toISOString().split('T')[0];
