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
function initRoleTabs() {
    const tabFreela = document.getElementById('tab-freelancer');
    const tabEmpresa = document.getElementById('tab-empresa');
    const linkCadastro = document.getElementById('link-cadastro');

    tabFreela.addEventListener('click', () => {
        tabFreela.classList.add('active');
        tabEmpresa.classList.remove('active');
        roleAtual = 'freelancers';
        linkCadastro.href = '/pages/05-cadastro-freelancer.html';
        linkCadastro.innerText = 'Cadastre-se como Freelancer';
        limparMensagem();
    });

    tabEmpresa.addEventListener('click', () => {
        tabEmpresa.classList.add('active');
        tabFreela.classList.remove('active');
        roleAtual = 'empresas';
        linkCadastro.href = '/pages/06-cadastro-empresa.html';
        linkCadastro.innerText = 'Cadastre-se como Empresa';
        limparMensagem();
    });
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
            const response = await fetch(`${API_BASE}/${roleAtual}?email=${encodeURIComponent(email)}`);
            
            if (!response.ok) {
                throw new Error('Falha ao conectar com o servidor.');
            }

            const usuarios = await response.json();

            // Valida se o usuário existe e se a senha confere
            const usuarioValido = usuarios.find(u => u.email === email && u.senha === senha);

            if (usuarioValido) {
                // Guarda os dados da sessão
                const sessao = {
                    id: usuarioValido.id,
                    nome: usuarioValido.nome || usuarioValido.razaoSocial,
                    email: usuarioValido.email,
                    tipo: roleAtual
                };

                sessionStorage.setItem('usuarioLogado', JSON.stringify(sessao));

                if (lembrar) {
                    localStorage.setItem('emailLembrado', email);
                } else {
                    localStorage.removeItem('emailLembrado');
                }

                mostrarMensagem('Login realizado com sucesso! Redirecionando...', 'success');

                // Redirecionamento baseado no perfil
                setTimeout(() => {
                    if (roleAtual === 'freelancers') {
                        window.location.href = '/pages/03-dashboard-freelancer.html';
                    } else {
                        window.location.href = '/pages/04-dashboard-empresa.html';
                    }
                }, 1200);

            } else {
                mostrarMensagem('E-mail ou senha incorretos.', 'error');
            }

        } catch (error) {
            console.error('Erro no login:', error);
            mostrarMensagem('Erro de conexão com a API. Verifique se o json-server está rodando.', 'error');
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
    }
}