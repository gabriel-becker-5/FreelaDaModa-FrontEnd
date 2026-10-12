// Perfil público da empresa

const empresaId = new URLSearchParams(window.location.search).get('id');

// profileImageUrl vem como caminho relativo (ex.: "/api/v1/User/{id}/imagem-perfil"),
// então para exibir a imagem é preciso prefixar a origem do back (API_BASE sem o /api/v1).
const ORIGEM_BACK = API_BASE.replace(/\/api\/v1\/?$/, '');

const loadingBar = document.querySelector('#perfil-loading');
const erroBar = document.querySelector('#perfil-erro');
const conteudoPerfil = document.querySelector('#perfil-conteudo');
const avatarEmpresa = document.querySelector('#avatar-empresa');
const nomeEmpresa = document.querySelector('#nome-empresa');
const localizacaoEmpresa = document.querySelector('#localizacao-empresa');
const seloVerificado = document.querySelector('#selo-verificado');
const seloIndisponivel = document.querySelector('#selo-indisponivel');
const descricaoEmpresa = document.querySelector('#descricao-empresa');
const ramoEmpresa = document.querySelector('#ramo-empresa');
const listaVagasAtivas = document.querySelector('#lista-vagas-ativas');

// especialidade/modalidade vêm do back como enum em texto, sem acento e com
// "_" no lugar do espaço (ex.: "Sob_Demanda"). Mesmo padrão de js/07-vagas.js.
const LABELS_MODALIDADE = {
    Presencial: 'Presencial',
    Hibrida: 'Híbrida',
    Remota: 'Remota',
    Sob_Demanda: 'Sob demanda'
};

function rotularModalidade(valor) {
    if (!valor) return '—';
    return LABELS_MODALIDADE[valor] || String(valor).replace(/_/g, ' ');
}

// Cabeçalho: público (Entrar) ou logado (saudação, sino e sair)
renderizarHeaderPublico(document.querySelector('#header-acoes'));

// Calcula iniciais do nome para o avatar (quando não há logo)
function calcularIniciais(nome) {
    const partesNomeEmpresa = String(nome || '').trim().split(' ');
    const primeiraParte = partesNomeEmpresa[0] ? partesNomeEmpresa[0].charAt(0) : '';
    const segundaParte = partesNomeEmpresa[partesNomeEmpresa.length - 1] ? partesNomeEmpresa[partesNomeEmpresa.length - 1].charAt(0) : '';
    return (primeiraParte + segundaParte).toUpperCase();
}

// Monta os cards para exibir até três vagas abertas da empresa
function exibirVagasAtivas(vagas) {
    const maximoVagas = 3;
    listaVagasAtivas.innerHTML = '';

    if (!vagas.length) {
        listaVagasAtivas.innerHTML = '<p>Não há vagas ativas no momento.</p>';
        return;
    }

    for (let index = 0; index < Math.min(vagas.length, maximoVagas); index++) {
        const vaga = vagas[index];

        const card = document.createElement('div');
        card.className = 'card';
        card.style.background = 'var(--surface-alt)';
        card.style.padding = '14px';

        const divClusterBetween = document.createElement('div');
        divClusterBetween.className = 'cluster-between';

        const apenasDIV = document.createElement('div');

        const tituloDaVaga = document.createElement('strong');
        tituloDaVaga.style.cssText = 'font-size: 14px;';
        tituloDaVaga.textContent = vaga.titulo;

        const detalheVaga = document.createElement('p');
        detalheVaga.textContent = `${formatarMoeda(vaga.valor)} · ${rotularModalidade(vaga.modalidade)}`;
        detalheVaga.style.cssText = 'font-size: 12px; margin: 2px 0;';

        const divCluster = document.createElement('div');
        divCluster.className = 'cluster';

        const linkVaga = document.createElement('a');
        linkVaga.textContent = 'Ver vaga';
        linkVaga.href = `/pages/18-vaga-detalhe.html?id=${encodeURIComponent(vaga.id)}`;
        linkVaga.className = 'btn';
        linkVaga.style.cssText = 'padding: 5px 10px; font-size: 12px;';

        apenasDIV.appendChild(tituloDaVaga);
        apenasDIV.appendChild(detalheVaga);
        divClusterBetween.appendChild(apenasDIV);

        divCluster.appendChild(linkVaga);
        divClusterBetween.appendChild(divCluster);

        card.appendChild(divClusterBetween);

        listaVagasAtivas.appendChild(card);
    }
}

// Preenche os campos com os dados devolvidos pelo perfil público
function preencherPerfil(dados) {
    // Logo da empresa (com fallback para iniciais)
    avatarEmpresa.innerHTML = '';
    const logoUrl = dados.profileImageUrl ? `${ORIGEM_BACK}${dados.profileImageUrl}` : '';
    if (logoUrl) {
        const img = document.createElement('img');
        img.src = logoUrl;
        img.alt = `Logo da ${dados.companyName || ''}`;
        img.onerror = function () {
            avatarEmpresa.textContent = calcularIniciais(dados.companyName);
        };
        avatarEmpresa.appendChild(img);
    } else {
        avatarEmpresa.textContent = calcularIniciais(dados.companyName);
    }

    // Selo verificado: direto do isVerified do back (nunca inferido de logo/perfil).
    // Sem selo, mostra o aviso de solicitação indisponível no MVP.
    const verificado = dados.isVerified === true;
    if (seloVerificado) seloVerificado.hidden = !verificado;
    if (seloIndisponivel) seloIndisponivel.hidden = verificado;

    nomeEmpresa.textContent = dados.companyName || '';
    // Só cidade/UF, sem sobrar " - " quando um dos dois faltar.
    localizacaoEmpresa.textContent = [dados.city, dados.state].filter(Boolean).join(' - ');
    descricaoEmpresa.textContent = dados.publicProfileDescription || '';
    ramoEmpresa.textContent = dados.coreBusiness || '—';
}

// Vagas abertas da empresa: busca separada da do perfil, para que uma falha
// aqui não impeça o resto do perfil de ser exibido.
async function carregarVagasAtivas() {
    try {
        const vagasBack = await api(`/vagas?empresaId=${encodeURIComponent(empresaId)}&status=Aberta`, { semRedirect: true });
        exibirVagasAtivas(mapVagas(vagasBack));
    } catch (erro) {
        console.error('Erro ao carregar vagas ativas:', erro);
        listaVagasAtivas.innerHTML = '<p class="text-muted">Não foi possível carregar as vagas.</p>';
    }
}

// Requisição API: carregar o perfil público da empresa
async function carregarPerfil() {
    if (!empresaId) {
        loadingBar.setAttribute('hidden', '');
        erroBar.textContent = 'Nenhuma empresa informada. Verifique o link e tente novamente.';
        erroBar.removeAttribute('hidden');
        return;
    }

    try {
        loadingBar.removeAttribute('hidden');
        erroBar.setAttribute('hidden', '');
        conteudoPerfil.setAttribute('hidden', '');

        // Endpoint anônimo; semRedirect evita redirecionar um visitante sem sessão.
        const dados = await api(`/Company/exibirPerfilPublicoEmpresa?userId=${encodeURIComponent(empresaId)}`, { semRedirect: true });

        preencherPerfil(dados || {});
        await carregarVagasAtivas();

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

// Botão "Ver vagas abertas" -> leva até a lista de vagas da empresa nesta mesma
// página. O freelancer se candidata pela vaga (fluxo correto), não por um
// botão genérico de contato direto com a empresa.
const botoesVerVagas = document.querySelectorAll('.btn-ver-vagas');

for (let index = 0; index < botoesVerVagas.length; index++) {
    botoesVerVagas[index].addEventListener('click', () => {
        listaVagasAtivas.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
}
