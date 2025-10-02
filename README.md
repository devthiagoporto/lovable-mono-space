# SaaS Multi-Tenant de Venda de Ingressos

Sistema de venda de ingressos multi-tenant desenvolvido com React, TypeScript, Vite e Lovable Cloud (Supabase).

## 🚀 Stack Tecnológica

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Lovable Cloud (PostgreSQL + Edge Functions)
- **UI**: shadcn/ui + Tailwind CSS
- **Testes**: Vitest + @testing-library/react
- **Qualidade**: ESLint + Prettier
- **Internacionalização**: pt-BR (datas em formato dd/MM/yyyy HH:mm)
- **Moeda**: BRL (Real Brasileiro)
- **Fuso Horário**: America/Sao_Paulo

## 📁 Estrutura do Projeto

```
/src
  /app                  # Rotas e páginas
  /components           # Componentes React reutilizáveis
  /features             # Features modulares (auth, events, coupons, checkout, checkin)
  /lib                  # Utilitários e configurações
    /utils              # Funções utilitárias (cpf, currency, date)
  /services             # Chamadas às Edge Functions
  /test                 # Configuração de testes
/supabase
  /functions            # Edge Functions (serverless)
    /health             # Health check endpoint
/tests                  # Testes unitários e de integração
```

## 🛠️ Setup do Projeto

### Pré-requisitos

- Node.js 18+ e npm
- Conta no Lovable (https://lovable.dev)

### Passo 1: Clone o Repositório

```bash
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
```

### Passo 2: Instalar Dependências

```bash
npm install
```

### Passo 3: Configurar Variáveis de Ambiente

O Lovable Cloud já configura automaticamente as variáveis de ambiente necessárias. O arquivo `.env` é gerado automaticamente e contém:

- `VITE_SUPABASE_URL`: URL do projeto Supabase
- `VITE_SUPABASE_ANON_KEY`: Chave pública do Supabase

**Nota**: Não é necessário criar ou editar o arquivo `.env` manualmente. Ele é gerenciado automaticamente pelo Lovable Cloud.

Se você quiser ver o formato das variáveis, consulte o arquivo `.env.example`:

```bash
cat .env.example
```

### Passo 4: Executar o Projeto

```bash
# Modo desenvolvimento
npm run dev

# Build de produção
npm run build

# Preview do build
npm run preview
```

O projeto estará disponível em `http://localhost:8080`

## 🧪 Testes

### Executar Testes

```bash
# Executar todos os testes
npm test

# Executar testes em modo watch
npm run test:watch

# Executar testes com UI
npm run test:ui
```

### Cobertura de Testes

Atualmente implementados:
- ✅ Testes de validação de CPF (`tests/cpf.spec.ts`)
- ✅ Testes de formatação de moeda BRL (`tests/formatBRL.spec.ts`)
- ✅ Testes de formatação de datas (`tests/date.spec.ts`)
- ✅ Teste de health check da API (`tests/health.spec.ts`)

## 📝 Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Inicia o servidor de desenvolvimento |
| `npm run build` | Cria build de produção |
| `npm run preview` | Preview do build de produção |
| `npm run lint` | Executa ESLint |
| `npm test` | Executa todos os testes |
| `npm run test:watch` | Executa testes em modo watch |
| `npm run test:ui` | Abre UI do Vitest |

## 🌐 Rotas Disponíveis

| Rota | Descrição | Status |
|------|-----------|--------|
| `/` | Landing page do SaaS | ✅ Placeholder |
| `/dashboard` | Painel administrativo (protegido) | ✅ Placeholder |
| `/checkin` | Portal de check-in de eventos | ✅ Placeholder |

## 🔧 Utilitários Disponíveis

### CPF Utils (`src/lib/utils/cpf.ts`)
```typescript
import { isValidCPF, formatCPF } from "@/lib/utils/cpf";

isValidCPF("12345678901");           // true/false
formatCPF("12345678901");            // "123.456.789-01"
```

### Currency Utils (`src/lib/utils/currency.ts`)
```typescript
import { formatBRL, parseBRL } from "@/lib/utils/currency";

formatBRL(1234.5);                   // "R$ 1.234,50"
parseBRL("R$ 1.234,50");             // 1234.5
```

### Date Utils (`src/lib/utils/date.ts`)
```typescript
import { formatDate, formatDateOnly, formatTimeOnly } from "@/lib/utils/date";

formatDate(new Date());              // "02/10/2025 14:30"
formatDateOnly(new Date());          // "02/10/2025"
formatTimeOnly(new Date());          // "14:30"
```

## 🔌 Edge Functions

### Health Check
Endpoint de verificação de saúde da API.

**Endpoint**: `POST /functions/v1/health`

**Resposta**:
```json
{
  "status": "ok"
}
```

**Uso no código**:
```typescript
import { healthCheck } from "@/services/api";

const result = await healthCheck();
console.log(result); // { status: "ok" }
```

## 🔐 Lovable Cloud (Backend)

Este projeto usa **Lovable Cloud**, que fornece:
- ✅ PostgreSQL database
- ✅ Autenticação integrada
- ✅ Edge Functions (serverless)
- ✅ File storage
- ✅ Row Level Security (RLS)

Para acessar o backend, abra o projeto no Lovable e clique em "Manage Cloud".

## 📦 Próximos Passos

Esta é a **Etapa 0** (scaffold). As próximas etapas incluirão:

1. **Schema do banco de dados** (tenants, events, sectors, tickets, etc.)
2. **Autenticação e autorização**
3. **CRUD de eventos e setores**
4. **Sistema de cupons**
5. **Checkout e pagamentos**
6. **Sistema de check-in**
7. **Relatórios e dashboards**

## 🤝 Contribuindo

1. Faça fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT.

## 📧 Suporte

Para suporte, abra uma issue no repositório ou entre em contato com a equipe de desenvolvimento.

---

**Desenvolvido com ❤️ usando Lovable**
