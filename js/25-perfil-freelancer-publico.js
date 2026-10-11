// Perfil público do Freelancer

const freelancerId = new URLSearchParams(window.location.search).get('id');

// profileImageUrl vem como caminho relativo (ex.: "/api/v1/User/{id}/imagem-perfil"),
// então para exibir a imagem é preciso prefixar a origem do back (API_BASE sem o /api/v1).
const ORIGEM_BACK = API_BASE.replace(/\/api\/v1\/?$/, '');

const loadingBar = document.querySelector('#perfil-loading');
const erroBar = document.querySelector('#perfil-erro');
const conteudoPerfil = document.querySelector('#perfil-conteudo');
const avatarFreelancer = document.querySelector('#avatar-freelancer');
const nomeFreelancer = document.querySelector('#nome-freelancer');
const localizacaoFreelancer = document.querySelector('#localizacao-freelancer');
const seloVerificado = document.querySelector('#selo-verificado');
const seloContainer = document.querySelector('#selo-container');
const descricaoFreelancer = document.querySelector('#descricao-freelancer');
const listaEspecialidades = document.querySelector('#lista-especialidades');
const listaMaquinas = document.querySelector('#lista-maquinas');
const infoExperiencia = document.querySelector('#info-experiencia');
const infoDisponibilidade = document.querySelector('#info-disponibilidade');

// Cabeçalho: público (Entrar) ou logado (saudação, sino e sair)
renderizarHeaderPublico(document.querySelector('#header-acoes'));

// Calcula iniciais do nome para o avatar (quando não há foto)
function calcularIniciais(nome) {
    const partesNome = String(nome || '').trim().split(' ');
    const primeiraLetraNome = partesNome[0] ? partesNome[0].charAt(0) : '';
    const primeiraLetraSobreNome = partesNome[partesNome.length - 1] ? partesNome[partesNome.length - 1].charAt(0) : '';
    return (primeiraLetraNome + primeiraLetraSobreNome).toUpperCase();
}

// Badges de especialidades/máquinas a partir dos nomes devolvidos pelo back
// (specialtyNames/ownMachineNames já vêm como texto legível).
function marcarBadges(container, valores) {
    container.innerHTML = '';
    (Array.isArray(valores) ? valores : []).forEach(function (valor) {
        const badge = document.createElement('span');
        badge.className = 'badge';
        badge.textContent = valor;
        container.appendChild(badge);
    });
}

// Preenche os campos com os dados devolvidos pelo perfil público
function preencherPerfil(dados) {
    // Foto de perfil (com fallback para iniciais)
    avatarFreelancer.innerHTML = '';
    const fotoUrl = dados.profileImageUrl ? `${ORIGEM_BACK}${dados.profileImageUrl}` : '';
    if (fotoUrl) {
        const img = document.createElement('img');
        img.src = fotoUrl;
        img.alt = `Foto de ${dados.legalResponsibleFullName || ''}`;
        img.onerror = function () {
            avatarFreelancer.textContent = calcularIniciais(dados.legalResponsibleFullName);
        };
        avatarFreelancer.appendChild(img);
    } else {
        avatarFreelancer.textContent = calcularIniciais(dados.legalResponsibleFullName);
    }

    // Selo verificado: direto do isVerified do back (sem container vazio quando não há selo).
    const verificado = dados.isVerified === true;
    if (seloVerificado) seloVerificado.hidden = !verificado;
    if (seloContainer) seloContainer.hidden = !verificado;

    nomeFreelancer.textContent = dados.legalResponsibleFullName || '';
    // Só cidade/UF, sem sobrar " - " quando um dos dois faltar.
    localizacaoFreelancer.textContent = [dados.city, dados.state].filter(Boolean).join(' - ');
    descricaoFreelancer.textContent = dados.publicProfileDescription || '';
    infoExperiencia.textContent = dados.experienceYearsName || '—';
    infoDisponibilidade.textContent = dados.availableTimeName || '—';
    marcarBadges(listaEspecialidades, dados.specialtyNames);
    marcarBadges(listaMaquinas, dados.ownMachineNames);
}

// Requisição API: carregar o perfil público do freelancer
async function carregarPerfil() {
    if (!freelancerId) {
        loadingBar.setAttribute('hidden', '');
        erroBar.textContent = 'Nenhum freelancer informado. Volte para o mural e clique em um perfil.';
        erroBar.removeAttribute('hidden');
        return;
    }

    try {
        loadingBar.removeAttribute('hidden');
        erroBar.setAttribute('hidden', '');
        conteudoPerfil.setAttribute('hidden', '');

        // Endpoint anônimo; semRedirect evita redirecionar um visitante sem sessão.
        const dados = await api(`/Freelancer/exibirPerfilPublicoFreelancer?userId=${encodeURIComponent(freelancerId)}`, { semRedirect: true });

        preencherPerfil(dados || {});

        loadingBar.setAttribute('hidden', '');
        conteudoPerfil.removeAttribute('hidden');
    } catch (erro) {
        console.error('Erro ao carregar perfil público:', erro);
        loadingBar.setAttribute('hidden', '');
        if (erro.status === 404) {
            erroBar.textContent = 'Perfil não encontrado.';
        } else {
            erroBar.textContent = erro.message || 'Não foi possível carregar este perfil. Tente novamente mais tarde.';
        }
        erroBar.removeAttribute('hidden');
    }
}

carregarPerfil();
