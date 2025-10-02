# 🚀 Guia de Setup e Execução Local

Este guia detalha como configurar e executar o projeto localmente fora do ambiente Lovable.

## ✅ Pré-requisitos

- **Node.js** 18+ e npm
- **Git** instalado
- Acesso ao projeto no Lovable (para obter credenciais)

## 📋 Passo a Passo

### 1. Clone o Repositório

```bash
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
```

### 2. Instale as Dependências

```bash
npm install
```

### 3. Configure Variáveis de Ambiente

#### Opção A: Copiar do .env.example

```bash
cp .env.example .env
```

#### Opção B: Obter credenciais do Lovable Cloud

1. Abra seu projeto no Lovable: https://lovable.dev
2. Clique em **"Manage Cloud"** (ícone do backend no canto superior)
3. Na aba de configurações, você verá:
   - **Project URL**: `https://uipwbatjrxfdnpxefmjj.supabase.co`
   - **Anon/Public Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

4. Edite o arquivo `.env`:

```bash
VITE_SUPABASE_URL=https://uipwbatjrxfdnpxefmjj.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **IMPORTANTE**: 
- Use `VITE_SUPABASE_PUBLISHABLE_KEY` (não `ANON_KEY`)
- Nunca commite o arquivo `.env` com credenciais reais
- Adicione `.env` ao `.gitignore` (já configurado)

### 4. Execute o Projeto

#### Desenvolvimento

```bash
npm run dev
```

Acesse: http://localhost:8080

#### Build de Produção

```bash
npm run build
npm run preview
```

### 5. Execute os Testes

```bash
# Executar todos os testes
npm test

# Modo watch (auto-reload)
npm run test:watch

# Interface visual
npm run test:ui
```

## 🔍 Verificação de Qualidade

Execute este checklist antes de commits:

```bash
# 1. Lint (sem erros críticos)
npm run lint

# 2. Testes (todos passando)
npm test

# 3. Build (sem erros)
npm run build
```

## 🐛 Troubleshooting

### Erro: "Cannot find module '@/integrations/supabase/client'"

**Causa**: Variáveis de ambiente não configuradas ou Supabase não inicializado.

**Solução**:
1. Verifique se o arquivo `.env` existe e está preenchido
2. Reinicie o servidor de desenvolvimento: `Ctrl+C` e `npm run dev`

### Erro: "Invalid Supabase URL"

**Causa**: URL do Supabase incorreta no `.env`.

**Solução**:
1. Verifique se a URL começa com `https://` e termina com `.supabase.co`
2. Copie novamente do Lovable Cloud

### Testes Falhando

**Causa**: Dependências não instaladas ou configuração incorreta.

**Solução**:
```bash
# Reinstalar dependências
rm -rf node_modules
npm install

# Limpar cache do Vitest
npm test -- --clearCache
```

### Build Falhando

**Causa**: Erros de TypeScript ou imports incorretos.

**Solução**:
```bash
# Verificar erros de tipo
npx tsc --noEmit

# Ver detalhes do erro
npm run build
```

## 📁 Estrutura de Arquivos Chave

```
.
├── .env                    ← Suas credenciais (NÃO commitar)
├── .env.example            ← Template de exemplo
├── vitest.config.ts        ← Configuração dos testes
├── vite.config.ts          ← Configuração do Vite
├── src/
│   ├── integrations/
│   │   └── supabase/
│   │       └── client.ts   ← Cliente Supabase (auto-gerado)
│   ├── lib/utils/          ← Utilitários (cpf, currency, date)
│   ├── services/           ← Chamadas às Edge Functions
│   └── pages/              ← Páginas React
├── tests/                  ← Testes unitários
└── supabase/
    └── functions/          ← Edge Functions
```

## 🔐 Segurança

### Boas Práticas

✅ **FAÇA**:
- Use `VITE_SUPABASE_PUBLISHABLE_KEY` (chave pública, segura para frontend)
- Mantenha `.env` no `.gitignore`
- Use `.env.example` como template (sem valores reais)

❌ **NÃO FAÇA**:
- Nunca commite `.env` com credenciais
- Não use `SERVICE_ROLE_KEY` no frontend (apenas em Edge Functions)
- Não exponha credenciais em logs ou código público

## 📚 Recursos Adicionais

- [Documentação Lovable](https://docs.lovable.dev/)
- [Lovable Cloud](https://docs.lovable.dev/features/cloud)
- [Supabase Docs](https://supabase.com/docs)

## 🆘 Precisa de Ajuda?

1. Consulte o [README.md](./README.md) principal
2. Verifique os logs no console do navegador
3. Abra uma issue no repositório
4. Entre em contato com a equipe

---

**Última atualização**: 02/10/2025
