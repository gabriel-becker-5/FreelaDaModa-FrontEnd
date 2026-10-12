# Projeto Integrador Entra 21 - Turma C# - SENAC Blumenau
# Equipe: Karina Vicente, Lucas Baer, Charles Júnior e Gabriel Becker.

# Front-End Freela da Moda
É um Marketplace que conecta confecções (empresas) e profissionais têxteis (freelancers).

- **Stack**: HTML + JavaScript vanilla + `css/global.css` + Bootstrap Icons (CDN). Sem frameworks, sem build.
- **Back-end**: C# .NET 8 em repositório separado (API real, obrigatória para login e dados).

## Escopo do MVP
Telas que fazem parte da experiência:

**Público (sem login)**
- `01-homepage.html` — página inicial (entrada da banca)
- `02-login.html` — login
- `05-cadastro-freelancer.html` / `06-cadastro-empresa.html` — cadastros
- `07-vagas.html` — mural de vagas
- `18-vaga-detalhe.html` — detalhe da vaga
- `25-perfil-freelancer-publico.html` / `26-perfil-empresa-publico.html` — perfis públicos
- `27-mural-freelancers.html` — mural de freelancers
- `28-sobre-nos.html` — sobre nós

**Freelancer (logado)**
- `03-dashboard-freelancer.html` — dashboard
- `08-perfil-freelancer.html` — perfil (edição)
- `11-chat.html` — chat
- `20-minhas-candidaturas.html` — candidaturas
- `29-minhas-os.html` — ordens de serviço
- `19-ordem-servico-detalhe.html` — detalhe da OS
- `23-avaliacao-os.html` — avaliação pós-OS

**Empresa (logado)**
- `04-dashboard-empresa.html` — dashboard
- `09-perfil-empresa.html` — perfil (edição)
- `12-publicar-vaga.html` / `13-editar-vaga.html` — vagas
- `15-minhas-vagas.html` — vagas publicadas
- `16-ordens-servico.html` — ordens de serviço
- `17-candidatos-vaga.html` — candidatos da vaga
- `19-ordem-servico-detalhe.html` — detalhe da OS
- `23-avaliacao-os.html` — avaliação pós-OS

## Telas fora do MVP (preservadas, bloqueadas)
As telas abaixo têm as fontes preservadas no repositório, mas a experiência é negada:
o guard `PAGINAS_NEGADAS` (`js/nav.js`) redireciona o acesso para o dashboard do
usuário logado ou para a homepage:

- `10-impulsionamento.html` — Impulsionamento
- `14-editar-os.html` — Editar OS
- `21-assinatura.html` — Assinatura
- `22-admin.html` — Administração
- `24-suporte.html` — Suporte

O mapa interno de telas (`pages/index.html`) também fica bloqueado no modo banca:
`MODO_BANCA = true` em `js/config.js` (padrão). Para acesso interno de
desenvolvimento, definir `MODO_BANCA = false`.

## API
- Endereço configurado em `js/config.js` (`API_BASE`): `http://localhost:5104/api/v1`.
- As telas integradas autenticam via `Authorization: Bearer` com o token da sessão.
- Login, cadastro e dados vêm do back real (que deve estar no ar, com o banco
  populado pelo seed). Consulte o README do repositório do back-end.
- O json-server e o `db.json` não são mais usados nem necessários.

## Como rodar
Sem build: basta servir a raiz deste repositório de forma estática e abrir a
entrada da banca.

1. Suba o back-end (fora deste repositório) — `http://localhost:5104`.
2. Sirva a raiz do projeto:
   - **VS Code**: extensão Live Server e "Go Live" na raiz; ou
   - `python -m http.server` na raiz do projeto.
3. Acesse `/pages/01-homepage.html`.

> As páginas usam caminhos absolutos a partir da raiz (`/css/global.css`,
> `/js/...`, `/assets/...`); por isso o servidor deve apontar para a raiz do
> repositório, e não para `pages/`.