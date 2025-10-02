# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [0.1.0] - 2025-10-02

### ✨ Adicionado (Etapa 0 - Scaffold)

#### Estrutura Base
- Configuração inicial do projeto com React + Vite + TypeScript
- Integração com Lovable Cloud (Supabase)
- Sistema de rotas com React Router (/, /dashboard, /checkin)
- Configuração de testes com Vitest + @testing-library/react

#### Qualidade de Código
- ESLint configurado com regras do TypeScript
- Prettier configurado para formatação consistente
- Integração ESLint + Prettier (eslint-config-prettier)

#### Utilitários
- **CPF Utils** (`src/lib/utils/cpf.ts`)
  - `isValidCPF()`: Validação de CPF (stub inicial)
  - `formatCPF()`: Formatação de CPF (123.456.789-01)
  
- **Currency Utils** (`src/lib/utils/currency.ts`)
  - `formatBRL()`: Formatação em Real Brasileiro (R$ 1.234,50)
  - `parseBRL()`: Parse de string BRL para número

- **Date Utils** (`src/lib/utils/date.ts`)
  - `formatDate()`: Formatação pt-BR (dd/MM/yyyy HH:mm)
  - `formatDateOnly()`: Apenas data (dd/MM/yyyy)
  - `formatTimeOnly()`: Apenas hora (HH:mm)
  - Suporte a timezone America/Sao_Paulo

#### Backend (Edge Functions)
- **Health Check** (`supabase/functions/health`)
  - Endpoint de verificação de saúde da API
  - Retorna `{"status": "ok"}`
  - Suporte a CORS

#### Testes
- `tests/cpf.spec.ts`: Testes de validação e formatação de CPF
- `tests/formatBRL.spec.ts`: Testes de formatação de moeda
- `tests/date.spec.ts`: Testes de formatação de datas
- `tests/health.spec.ts`: Teste de health check da API

#### Páginas
- Landing page (`/`) com links para dashboard e check-in
- Dashboard placeholder (`/dashboard`)
- Portal de check-in placeholder (`/checkin`)
- Página 404 customizada

#### Configurações
- `.env.example`: Template de variáveis de ambiente
- `.prettierrc`: Configuração do Prettier
- `vitest.config.ts`: Configuração dos testes
- `.eslintrc.json`: Configuração do ESLint (adicionado)

#### Documentação
- **README.md**: Documentação principal do projeto
- **SETUP.md**: Guia detalhado de setup local
- **CHANGELOG.md**: Este arquivo

### 🔧 Configurado

- Scripts npm: `dev`, `build`, `preview`, `lint`, `test`, `test:watch`, `test:ui`
- Suporte a i18n pt-BR (datas e moeda)
- Estrutura de pastas modular (/features, /lib, /services)
- TypeScript strict mode
- Path alias `@/` apontando para `/src`

### 🐛 Corrigido

- Corrigido nome da variável de ambiente de `VITE_SUPABASE_ANON_KEY` para `VITE_SUPABASE_PUBLISHABLE_KEY`
- Adicionado tratamento de erros TypeScript nas Edge Functions
- Configuração do ESLint para compatibilidade com Prettier

### 📝 Documentação

- README completo com instruções de setup
- SETUP.md detalhado com troubleshooting
- Comentários JSDoc nos utilitários
- Documentação inline nas Edge Functions

## Próximas Versões Planejadas

### [0.2.0] - Schema do Banco de Dados
- [ ] Tabelas: tenants, events, sectors, ticket_types, batches, tickets
- [ ] RLS policies
- [ ] Seeds iniciais
- [ ] Migrations

### [0.3.0] - Autenticação
- [ ] Sistema de login/logout
- [ ] Proteção de rotas
- [ ] Perfis de usuário
- [ ] Roles (admin, organizer, user)

### [0.4.0] - CRUD de Eventos
- [ ] Listagem de eventos
- [ ] Criação de eventos
- [ ] Edição e exclusão
- [ ] Gestão de setores e lotes

### [0.5.0] - Sistema de Cupons
- [ ] Criação de cupons
- [ ] Validação de cupons
- [ ] Tipos de desconto (%, R$, 2x1)

### [0.6.0] - Checkout
- [ ] Carrinho de compras
- [ ] Integração com gateway de pagamento
- [ ] Confirmação de compra

### [0.7.0] - Check-in
- [ ] QR Code scanner
- [ ] Validação de ingressos
- [ ] Histórico de check-ins

---

## Convenções

### Tipos de Mudanças
- **Adicionado**: para novas funcionalidades
- **Modificado**: para mudanças em funcionalidades existentes
- **Descontinuado**: para funcionalidades que serão removidas
- **Removido**: para funcionalidades removidas
- **Corrigido**: para correção de bugs
- **Segurança**: para vulnerabilidades corrigidas

### Formato de Commits
Usamos [Conventional Commits](https://www.conventionalcommits.org/pt-br/):
- `feat:` nova funcionalidade
- `fix:` correção de bug
- `docs:` documentação
- `style:` formatação (não afeta código)
- `refactor:` refatoração
- `test:` testes
- `chore:` tarefas de manutenção
