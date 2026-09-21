// Script para centralizar funções utilitárias compartilhadas entre as páginas
// Carregar 'ui.js' sempre após 'config.js'

// Evitar ataques XSS
function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, function (ch) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
}

function removerAcentos(texto) {
    return String(texto ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/* Formataçõs de Moeda */
function moedaParaNumero(valor) {
    if (valor == null) return 0;
    const texto = String(valor).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
    const numero = parseFloat(texto);
    return Number.isFinite(numero) ? numero : 0;
}

function formatarMoeda(numero) {
    return (numero || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function aplicarMascaraMoeda(inputEl, maximo) {
    const teto = maximo || 999999.99;
    inputEl.addEventListener('input', function () {
        let digitos = inputEl.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
        if (!digitos.length) {
            inputEl.value = '';
            return;
        }
        let numero = parseInt(digitos, 10) / 100;
        if (numero > teto) {
            numero = teto;
        }
        inputEl.value = formatarMoeda(numero);
    });
}

// Limites de data (AAAA-MM-DD) para prazos: mínimo = hoje, máximo = hoje + dias
// Usa data LOCAL (não toISOString/UTC) para não recuar um dia no fuso do Brasil
function limitesDataPrazo(dias) {
    function paraISO(data) {
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const dia = String(data.getDate()).padStart(2, '0');
        return `${data.getFullYear()}-${mes}-${dia}`;
    }
    const hoje = new Date();
    const limite = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + (dias || 0));
    return { min: paraISO(hoje), max: paraISO(limite) };
}

// 'Toast / Barra de mensagens (sucesso, erro, aviso, info)
function toastMsg(texto, tipo, duracao) {
    const tiposValidos = ['success', 'error', 'warning', 'info'];
    const tipoClasse = tiposValidos.includes(tipo) ? tipo : 'success';
    const icones = {
        success: 'bi-check-circle-fill',
        error: 'bi-exclamation-circle-fill',
        warning: 'bi-exclamation-triangle-fill',
        info: 'bi-info-circle-fill'
    };

    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${tipoClasse}`;
    toast.setAttribute('role', 'status');

    const icone = document.createElement('i');
    icone.className = `bi ${icones[tipoClasse]}`;
    toast.appendChild(icone);

    const span = document.createElement('span');
    span.textContent = texto;
    toast.appendChild(span);

    container.appendChild(toast);

    setTimeout(function () {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(function () { toast.remove(); }, 300);
    }, duracao || 5000);
}

// Modais para confirmação de ações
function modalConfirmar(opcoes) {
    const titulo = opcoes.titulo || 'Confirmar';
    const mensagem = opcoes.mensagem || '';
    const textoConfirmar = opcoes.textoConfirmar || 'Confirmar';
    const textoCancelar = opcoes.textoCancelar || 'Cancelar';
    const perigoso = !!opcoes.perigoso;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.display = 'flex';

    const conteudo = document.createElement('div');
    conteudo.className = 'modal-content';
    conteudo.setAttribute('role', 'dialog');
    conteudo.setAttribute('aria-modal', 'true');

    const cabecalho = document.createElement('div');
    cabecalho.className = 'modal-header';

    const tituloEl = document.createElement('h2');
    tituloEl.textContent = titulo;
    cabecalho.appendChild(tituloEl);

    const fechar = document.createElement('button');
    fechar.type = 'button';
    fechar.className = 'btn-close-modal';
    fechar.setAttribute('aria-label', 'Fechar');
    fechar.innerHTML = '&times;';
    cabecalho.appendChild(fechar);

    const textoEl = document.createElement('p');
    textoEl.className = 'modal-confirm-mensagem';
    textoEl.textContent = mensagem;

    const acoes = document.createElement('div');
    acoes.className = 'form-actions';

    const btnCancelar = document.createElement('button');
    btnCancelar.type = 'button';
    btnCancelar.className = 'btn btn-outline';
    btnCancelar.textContent = textoCancelar;

    const btnConfirmar = document.createElement('button');
    btnConfirmar.type = 'button';
    btnConfirmar.className = `btn ${perigoso ? 'btn-danger' : 'btn-primary'}`;
    btnConfirmar.textContent = textoConfirmar;

    acoes.appendChild(btnCancelar);
    acoes.appendChild(btnConfirmar);

    conteudo.appendChild(cabecalho);
    conteudo.appendChild(textoEl);
    conteudo.appendChild(acoes);
    overlay.appendChild(conteudo);
    document.body.appendChild(overlay);

    return new Promise(function (resolve) {
        function concluir(resultado) {
            overlay.remove();
            document.removeEventListener('keydown', aoTeclar);
            resolve(resultado);
        }
        function aoTeclar(evento) {
            if (evento.key === 'Escape') concluir(false);
        }
        fechar.addEventListener('click', function () { concluir(false); });
        btnCancelar.addEventListener('click', function () { concluir(false); });
        btnConfirmar.addEventListener('click', function () { concluir(true); });
        overlay.addEventListener('click', function (evento) {
            if (evento.target === overlay) concluir(false);
        });
        document.addEventListener('keydown', aoTeclar);
    });
}

// Fallback caso a API do IBGE esteja indisponível
const UFS_FALLBACK = [
    { sigla: 'AC', nome: 'Acre' },
    { sigla: 'AL', nome: 'Alagoas' },
    { sigla: 'AP', nome: 'Amapá' },
    { sigla: 'AM', nome: 'Amazonas' },
    { sigla: 'BA', nome: 'Bahia' },
    { sigla: 'CE', nome: 'Ceará' },
    { sigla: 'DF', nome: 'Distrito Federal' },
    { sigla: 'ES', nome: 'Espírito Santo' },
    { sigla: 'GO', nome: 'Goiás' },
    { sigla: 'MA', nome: 'Maranhão' },
    { sigla: 'MT', nome: 'Mato Grosso' },
    { sigla: 'MS', nome: 'Mato Grosso do Sul' },
    { sigla: 'MG', nome: 'Minas Gerais' },
    { sigla: 'PA', nome: 'Pará' },
    { sigla: 'PB', nome: 'Paraíba' },
    { sigla: 'PR', nome: 'Paraná' },
    { sigla: 'PE', nome: 'Pernambuco' },
    { sigla: 'PI', nome: 'Piauí' },
    { sigla: 'RJ', nome: 'Rio de Janeiro' },
    { sigla: 'RN', nome: 'Rio Grande do Norte' },
    { sigla: 'RS', nome: 'Rio Grande do Sul' },
    { sigla: 'RO', nome: 'Rondônia' },
    { sigla: 'RR', nome: 'Roraima' },
    { sigla: 'SC', nome: 'Santa Catarina' },
    { sigla: 'SP', nome: 'São Paulo' },
    { sigla: 'SE', nome: 'Sergipe' },
    { sigla: 'TO', nome: 'Tocantins' }
];

// Obter localidades - API do IBGE
function ufsOrdenadas() {
    return UFS_FALLBACK.slice().sort(function (a, b) { return a.nome.localeCompare(b.nome); });
}

async function obterUFs() {
    try {
        const salvo = sessionStorage.getItem('fdlm-ufs');
        if (salvo) return JSON.parse(salvo);
        const res = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome');
        if (!res.ok) throw new Error('IBGE indisponível');
        const dados = await res.json();
        const ufs = dados.map(function (uf) { return { sigla: uf.sigla, nome: uf.nome }; });
        sessionStorage.setItem('fdlm-ufs', JSON.stringify(ufs));
        return ufs;
    } catch (erro) {
        console.error('Falha ao carregar estados do IBGE:', erro);
        return ufsOrdenadas();
    }
}

async function carregarUFs(selectEl, ufSelecionada) {
    const ufs = await obterUFs();
    selectEl.innerHTML = '';
    const vazia = document.createElement('option');
    vazia.value = '';
    vazia.textContent = 'Selecione o estado';
    selectEl.appendChild(vazia);
    ufs.forEach(function (uf) {
        const opcao = document.createElement('option');
        opcao.value = uf.sigla;
        opcao.textContent = `${uf.nome} (${uf.sigla})`;
        if (uf.sigla === ufSelecionada) opcao.selected = true;
        selectEl.appendChild(opcao);
    });
}

async function obterMunicipios(uf) {
    try {
        const chave = `fdlm-municipios-${uf}`;
        const salvo = sessionStorage.getItem(chave);
        if (salvo) return JSON.parse(salvo);
        const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${encodeURIComponent(uf)}/municipios?orderBy=nome`);
        if (!res.ok) throw new Error('IBGE indisponível');
        const dados = await res.json();
        const municipios = dados.map(function (municipio) { return municipio.nome; });
        sessionStorage.setItem(chave, JSON.stringify(municipios));
        return municipios;
    } catch (erro) {
        console.error(`Falha ao carregar municípios de ${uf}:`, erro);
        return null;
    }
}

// Função para exibir o autocomplete da cidade para o usuário conforme ele digita
function montarAutocompleteCidade(inputEl, ufSelectEl) {
    let wrapper = inputEl.closest('.autocomplete-wrapper');
    if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.className = 'autocomplete-wrapper';
        inputEl.parentNode.insertBefore(wrapper, inputEl);
        wrapper.appendChild(inputEl);
    }

    let dropdown = wrapper.querySelector('.autocomplete-dropdown');
    if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.className = 'autocomplete-dropdown';
        dropdown.style.display = 'none';
        wrapper.appendChild(dropdown);
    }

    let municipios = [];

    function fechar() {
        dropdown.style.display = 'none';
        dropdown.innerHTML = '';
    }

    async function atualizarLista() {
        const uf = ufSelectEl ? ufSelectEl.value : '';
        if (!uf) {
            municipios = [];
            fechar();
            return;
        }
        municipios = await obterMunicipios(uf);
    }

    function mostrar(termo) {
        dropdown.innerHTML = '';
        if (municipios === null) {
            const aviso = document.createElement('div');
            aviso.className = 'autocomplete-item disabled';
            aviso.textContent = 'Lista de cidades indisponível — digite manualmente';
            dropdown.appendChild(aviso);
            dropdown.style.display = 'block';
            return;
        }
        const opcoes = municipios
            .filter(function (cidade) {
                return removerAcentos(cidade).toLowerCase().startsWith(termo);
            })
            .slice(0, 10);
        if (!opcoes.length) {
            fechar();
            return;
        }
        opcoes.forEach(function (cidade) {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.textContent = cidade;
            item.addEventListener('click', function () {
                inputEl.value = cidade;
                fechar();
            });
            dropdown.appendChild(item);
        });
        dropdown.style.display = 'block';
    }

    inputEl.addEventListener('input', function () {
        const termo = removerAcentos(inputEl.value.trim()).toLowerCase();
        if (termo.length < 2) {
            fechar();
            return;
        }
        mostrar(termo);
    });

    inputEl.addEventListener('focus', function () {
        const termo = removerAcentos(inputEl.value.trim()).toLowerCase();
        if (termo.length >= 2) mostrar(termo);
    });

    if (ufSelectEl) {
        ufSelectEl.addEventListener('change', function () {
            inputEl.value = '';
            fechar();
            atualizarLista();
        });
    }

    document.addEventListener('click', function (evento) {
        if (!wrapper.contains(evento.target)) fechar();
    });

    atualizarLista();
}

// Cria uma notificação no sino (usuarioId + usuarioTipo + link).
// Falha aqui nunca bloqueia o fluxo principal (log silencioso).
function criarNotificacao(opcoes) {
    return fetch(`${API_BASE}/notificacoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            usuarioId: opcoes.usuarioId,
            usuarioTipo: opcoes.usuarioTipo,
            tipo: opcoes.tipo || 'geral',
            titulo: opcoes.titulo,
            mensagem: opcoes.mensagem,
            lida: opcoes.lida === true,
            criadoEm: new Date().toISOString(),
            link: opcoes.link || null
        })
    }).then(function (res) {
        if (!res.ok) console.error('Falha ao criar notificação (HTTP ' + res.status + ').');
    }).catch(function (erro) { console.error('Erro ao criar notificação:', erro); });
}

// Mensagem inline única no topo (substitui os "mostrarMensagem" locais).
// Escapa o texto (XSS) e mantém a classe utilitária mb-md para não colar no
// conteúdo vizinho. Usa o elemento #mensagemStatus, presente nas telas logadas.
function mostrarMensagem(texto, tipo) {
    const el = document.getElementById('mensagemStatus');
    if (!el) return;
    const tipoClasse = ['success', 'error', 'warning'].includes(tipo) ? tipo : 'error';
    const icones = {
        success: 'bi-check-circle-fill',
        error: 'bi-exclamation-circle-fill',
        warning: 'bi-exclamation-triangle-fill'
    };
    el.className = `alert mb-md alert-${tipoClasse}`;
    el.innerHTML = `<i class="bi ${icones[tipoClasse]}"></i> ${escapeHtml(texto).replace(/\n/g, '<br>')}`;
    el.removeAttribute('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Data no formato AAAA-MM-DD usando o fuso LOCAL (evita o recuo de um dia
// causado por toISOString/UTC no Brasil).
function dataLocalISO(data) {
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${data.getFullYear()}-${mes}-${dia}`;
}

function hojeLocalISO() {
    return dataLocalISO(new Date());
}

// Formata data (AAAA-MM-DD ou ISO) em pt-BR usando data LOCAL (sem recuar um
// dia no fuso do Brasil). Fallback '—' para vazio/inválido.
function formatarData(str) {
    if (!str) return '—';
    const data = new Date(String(str).length === 10 ? str + 'T00:00:00' : str);
    return isNaN(data.getTime()) ? String(str) : data.toLocaleDateString('pt-BR');
}

// Formata data + hora (ISO) em pt-BR. Fallback '—'.
function formatarDataHora(iso) {
    if (!iso) return '—';
    const data = new Date(iso);
    if (isNaN(data.getTime())) return String(iso);
    return data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// Cria uma <img> com placeholder caso o arquivo (caminho /uploads/...) não
// exista no mock. Imagens/anexos são gravados somente por CAMINHO no banco.
function criarImagemComFallback(container, src, alt) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt || '';
    img.onerror = function () {
        const placeholder = document.createElement('div');
        placeholder.className = 'imagem-placeholder';
        placeholder.innerHTML = '<i class="bi bi-image"></i>';
        container.replaceChild(placeholder, img);
    };
    container.appendChild(img);
}

// Iniciais a partir do nome (robusto a espaços duplos/vazios).
function calcularIniciais(nome) {
    const partes = String(nome || '').trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return '--';
    return partes.length > 1
        ? `${partes[0][0]}${partes[1][0]}`.toUpperCase()
        : partes[0].substring(0, 2).toUpperCase();
}

/* ------------------------- máscaras (inputs) ------------------------------ */

function aplicarMascaraTelefone(input) {
    input.addEventListener('input', function () {
        const numeros = input.value.replace(/\D/g, '').slice(0, 11);
        if (numeros.length <= 10) {
            input.value = numeros.replace(/(\d{2})(\d{0,4})(\d{0,4})/, function (_, ddd, inicio, fim) {
                if (!inicio) return `(${ddd}`;
                if (!fim) return `(${ddd}) ${inicio}`;
                return `(${ddd}) ${inicio}-${fim}`;
            });
            return;
        }
        input.value = numeros.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
    });
}

function aplicarMascaraCEP(input) {
    input.addEventListener('input', function () {
        const numeros = input.value.replace(/\D/g, '').slice(0, 8);
        input.value = numeros.length > 5 ? `${numeros.slice(0, 5)}-${numeros.slice(5)}` : numeros;
    });
}

function aplicarMascaraCPF(input) {
    input.addEventListener('input', function () {
        const numeros = input.value.replace(/\D/g, '').slice(0, 11);
        if (numeros.length <= 3) input.value = numeros;
        else if (numeros.length <= 6) input.value = `${numeros.slice(0, 3)}.${numeros.slice(3)}`;
        else if (numeros.length <= 9) input.value = `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6)}`;
        else input.value = `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6, 9)}-${numeros.slice(9)}`;
    });
}

// Validação de CPF (11 dígitos + dígitos verificadores).
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

// Buscar localidade pela API do ViaCEP
async function buscarCep(cep) {
    const apenasDigitos = String(cep || '').replace(/\D/g, '');
    if (apenasDigitos.length !== 8) return { erro: true };
    try {
        const res = await fetch(`https://viacep.com.br/ws/${apenasDigitos}/json/`);
        if (!res.ok) throw new Error('ViaCEP indisponível');
        const dados = await res.json();
        if (dados.erro) return { erro: true };
        return {
            erro: false,
            logradouro: dados.logradouro,
            bairro: dados.bairro,
            cidade: dados.localidade,
            estado: dados.uf
        };
    } catch (erro) {
        console.error('Falha ao consultar ViaCEP:', erro);
        return { erro: true };
    }
}