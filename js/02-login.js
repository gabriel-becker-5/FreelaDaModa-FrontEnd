let roleAtual = 'freelancers'; // 'freelancers' ou 'empresas'

document.addEventListener('DOMContentLoaded', () => {
    initRoleTabs();
    initPasswordToggle();
    initLoginForm();
    carregarEmailSalvo();
});

/* -------------------------------------------------------------------------- */
/* 1. SELEÇÃO DE PERFIL (FREELANCER / EMPRESA)                                */
/* -------------------------------------------------------------------------- */
function selecionarPerfil(role) {
    const tabFreela = document.getElementById('tab-freelancer');
    const tabEmpresa = document.getElementById('tab-empresa');
    const linkCadastro = document.getElementById('link-cadastro');

    roleAtual = role;
    tabFreela.classList.toggle('active', role === 'freelancers');
    tabEmpresa.classList.toggle('active', role === 'empresas');
    linkCadastro.href = role === 'empresas' ? '/pages/06-cadastro-empresa.html' : '/pages/05-cadastro-freelancer.html';
    linkCadastro.innerText = role === 'empresas' ? 'Cadastre-se como Empresa' : 'Cadastre-se como Freelancer';
    limparMensagem();
}

function initRoleTabs() {
    document.getElementById('tab-freelancer').addEventListener('click', () => selecionarPerfil('freelancers'));
    document.getElementById('tab-empresa').addEventListener('click', () => selecionarPerfil('empresas'));
}

/* -------------------------------------------------------------------------- */
/* 2. VISIBILIDADE DE SENHA                                                   */
/* -------------------------------------------------------------------------- */
function initPasswordToggle() {
    const toggle = document.getElementById('toggleSenha');
    const senhaInput = document.getElementById('senha');

    toggle.addEventListener('click', () => {
        if (senhaInput.type === 'password') {
            senhaInput.type = 'text';
            toggle.classList.replace('bi-eye', 'bi-eye-slash');
        } else {
            senhaInput.type = 'password';
            toggle.classList.replace('bi-eye-slash', 'bi-eye');
        }
    });
}

/* -------------------------------------------------------------------------- */
/* 3. AUTENTICAÇÃO / LOGIN                                                    */
/* -------------------------------------------------------------------------- */
function initLoginForm() {
    const form = document.getElementById('form-login');
    const btnEntrar = document.getElementById('btn-entrar');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        limparMensagem();

        const email = document.getElementById('email').value.trim();
        const senha = document.getElementById('senha').value;
        const lembrar = document.getElementById('lembrar-me').checked;

        if (!email || !senha) {
            mostrarMensagem('Preencha todos os campos.', 'error');
            return;
        }

        btnEntrar.disabled = true;
        btnEntrar.innerHTML = '<span class="spinner"></span> Verificando...';

        try {
            // Busca o usuário correspondente no json-server pelo e-mail
           const resultado = await api('/Authentication/login', {
                method: 'POST',
                body: { email, password: senha },
                semRedirect: true
            });

            // o token pode vir direto (texto) ou dentro de um objeto
            const token = typeof resultado === 'string'
                ? resultado
                : (resultado.token || resultado.accessToken || resultado.jwt);

            if (token) {
                const dadosJwt = decodificarJwt(token);

                const tipoConta = tipoDaConta(dadosJwt);

                if (!tipoConta) {
                    throw new Error('Este tipo de conta não tem acesso ao sistema ainda.');
                }

                if (tipoConta !== roleAtual) {
                    const nomeConta = tipoConta === 'empresas' ? 'Empresa' : 'Freelancer';
                    throw new Error(`Esta conta é de ${nomeConta}. Selecione a aba "Sou ${nomeConta}" e tente de novo.`);
                }

                // guarda o token primeiro, para o api() conseguir buscar o nome
                sessionStorage.setItem('usuarioLogado', JSON.stringify({ token }));

                const nome = await buscarNomeUsuario(tipoConta);

                const sessao = {
                   id: Number(dadosJwt.nameid || dadosJwt['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier']),
                    nome: nome,
                    email: dadosJwt.email || email,
                    tipo: roleAtual,
                    token: token
                };

                sessionStorage.setItem('usuarioLogado', JSON.stringify(sessao));

                if (lembrar) {
                    localStorage.setItem('emailLembrado', email);
                    localStorage.setItem('perfilLembrado', roleAtual);
                } else {
                    localStorage.removeItem('emailLembrado');
                    localStorage.removeItem('perfilLembrado');
                }

                mostrarMensagem('Login realizado com sucesso! Redirecionando...', 'success');

                // Redirecionamento baseado no perfil (ou para a página solicitada)
                const proxima = proximaPagina();

                setTimeout(() => {
                    if (proxima) {
                        window.location.href = proxima;
                        return;
                    }
                    if (roleAtual === 'freelancers') {
                        window.location.href = '/pages/03-dashboard-freelancer.html';
                    } else {
                        window.location.href = '/pages/04-dashboard-empresa.html';
                    }
                }, 1200);

             } else {
                mostrarMensagem('Não foi possível entrar. Tente novamente.', 'error');
            }

        } catch (error) {
            console.error('Erro no login:', error);
            sessionStorage.removeItem('usuarioLogado');

            if (error.status === 401) {
                mostrarMensagem('E-mail ou senha incorretos.', 'error');
            } else if (error.status === 429) {
                mostrarMensagem('Muitas tentativas. Aguarde 1 minuto e tente de novo.', 'error');
            } else if (error.status === 400) {
                mostrarMensagem(error.message || 'Dados inválidos. Confira e tente de novo.', 'error');
            } else if (error.status === 0) {
                mostrarMensagem('Não foi possível conectar ao servidor. Verifique se a API está rodando.', 'error');
            } else {
                mostrarMensagem(error.message || 'Erro ao entrar. Tente novamente.', 'error');
            }
        } finally {
            btnEntrar.disabled = false;
            btnEntrar.innerHTML = 'Entrar na plataforma <i class="bi bi-arrow-right"></i>';
        }
    });

    // Esqueci a senha (feedback simples)
    document.getElementById('link-esqueci-senha').addEventListener('click', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        if (!email) {
            mostrarMensagem('Digite o seu e-mail no campo acima para redefinir sua senha.', 'error');
        } else {
            mostrarMensagem(`Instruções de redefinição de senha enviadas para: ${email}`, 'success');
        }
    });
}

/* -------------------------------------------------------------------------- */
/* FUNÇÕES AUXILIARES                                                         */
/* -------------------------------------------------------------------------- */
function mostrarMensagem(texto, tipo) {
    const alertBox = document.getElementById('auth-alert');
    alertBox.textContent = texto;
    alertBox.className = `auth-message ${tipo}`;
}

function limparMensagem() {
    const alertBox = document.getElementById('auth-alert');
    alertBox.textContent = '';
    alertBox.className = 'auth-message';
}

function carregarEmailSalvo() {
    const emailSalvo = localStorage.getItem('emailLembrado');
    if (emailSalvo) {
        document.getElementById('email').value = emailSalvo;
        document.getElementById('lembrar-me').checked = true;
        if (localStorage.getItem('perfilLembrado') === 'empresas') {
            selecionarPerfil('empresas');
        }
    }
}

function proximaPagina() {
    const parametros = new URLSearchParams(window.location.search);
    const proxima = parametros.get('next');
    if (proxima && proxima.startsWith('/pages/')) return proxima;
    return null;
}
function decodificarJwt(token) {
    const parte = token.split('.')[1];
    const base64 = parte.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
        atob(base64)
            .split('')
            .map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
            .join('')
    );
    return JSON.parse(json);
}

// o token não traz o nome, então busca no perfil
async function buscarNomeUsuario(tipo) {
    const caminho = tipo === 'empresas' ? '/User/perfil/empresa' : '/User/perfil/freelancer';
    const perfil = await api(caminho, { semRedirect: true });
    if (tipo === 'empresas') {
        return perfil.companyName || perfil.legalResponsibleFullName || '';
    }
    return perfil.legalResponsibleFullName || perfil.nome || '';
}
// converte o claim "roles" do token no tipo usado pelas telas
function tipoDaConta(dadosJwt) {
    const bruto = dadosJwt.roles || dadosJwt.role ||
        dadosJwt['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
    const lista = Array.isArray(bruto) ? bruto : [bruto];

    if (lista.includes('Company')) return 'empresas';
    if (lista.includes('Freelancer')) return 'freelancers';
    return null; // Admin ou desconhecido: fora do MVP
}