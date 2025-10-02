# Comandos de Testes - Autenticação e RBAC

## Executar Testes

### Todos os testes de autenticação
```bash
npm run test tests/auth
```

### Teste específico
```bash
# Auth Service (signIn/signOut/fetchMe)
npm run test tests/auth/auth-service.spec.ts

# Admin Service (createOperator/assignRole)
npm run test tests/auth/admin-service.spec.ts

# Guards (withAuth/withRole)
npm run test tests/auth/protected-route.spec.tsx

# Portal do Operador (UI)
npm run test tests/auth/checkin-portal.spec.tsx

# Isolamento Multi-Tenant
npm run test tests/auth/tenant-isolation.spec.ts
```

### Com cobertura
```bash
npm run test:coverage tests/auth
```

### Modo watch (desenvolvimento)
```bash
npm run test:watch tests/auth
```

## Cobertura Esperada

| Arquivo | Linhas | Funções | Branches | Statements |
|---------|--------|---------|----------|------------|
| `auth-service.spec.ts` | ≥80% | ≥80% | ≥70% | ≥80% |
| `admin-service.spec.ts` | ≥80% | ≥80% | ≥70% | ≥80% |
| `protected-route.spec.tsx` | ≥75% | ≥75% | ≥70% | ≥75% |
| `checkin-portal.spec.tsx` | ≥70% | ≥70% | ≥60% | ≥70% |
| `tenant-isolation.spec.ts` | ≥85% | ≥85% | ≥75% | ≥85% |

## Cenários Testados

### 1. Auth Básico (`auth-service.spec.ts`)
- ✅ `signIn(email, senha)` sucesso → recebe session
- ✅ `signIn()` com credenciais inválidas → erro
- ✅ `signOut()` limpa estado
- ✅ `signOut()` propaga erro se falhar
- ✅ `fetchMe()` retorna user + memberships
- ✅ `fetchMe()` retorna null para não autenticado
- ✅ `fetchMe()` propaga erro de database

### 2. Provisionamento (`admin-service.spec.ts`)
- ✅ `createOperator()` com organizer_admin → 200 + {userId, tempPassword}
- ✅ `createOperator()` sem token → 401
- ✅ `createOperator()` sem permissão → 403
- ✅ `createOperator()` campos faltando → 400
- ✅ `assignRole()` com roles válidas → 200
- ✅ `assignRole()` com admin_saas → 400/403
- ✅ `assignRole()` com role inválida → 400

### 3. Guards (`protected-route.spec.tsx`)
- ✅ `withAuth` redireciona anônimo para /login
- ✅ `withAuth` permite acesso autenticado
- ✅ `withRole('checkin_operator')` permite operador em /checkin
- ✅ `withRole('checkin_operator')` bloqueia buyer (403)
- ✅ Loading state durante verificação

### 4. UI do Portal (`checkin-portal.spec.tsx`)
- ✅ Renderiza "Check-in Portal OK" para operador
- ✅ Bloqueia buyer com mensagem 403
- ✅ Loading state enquanto verifica permissões

### 5. Isolamento Multi-Tenant (`tenant-isolation.spec.ts`)
- ✅ Usuário tenant B não vê dados tenant A (SELECT vazio)
- ✅ Usuário tenant A vê apenas dados tenant A
- ✅ INSERT em outro tenant falha (RLS)
- ✅ UPDATE em outro tenant falha (RLS)
- ✅ Leitura pública de eventos publicados (sem auth)
- ✅ Escrita em eventos falha para não autenticado

## Mocks Disponíveis

### Sessions
```typescript
import { 
  mockSession,           // Sessão genérica
  mockAdminSession,      // Sessão de admin
  mockOperatorSession,   // Sessão de operador
  mockBuyerSession       // Sessão de buyer
} from '../mocks/supabase';
```

### Memberships
```typescript
import {
  mockAdminMemberships,     // organizer_admin no tenant-a
  mockOperatorMemberships,  // checkin_operator no tenant-a
  mockBuyerMemberships,     // buyer no tenant-a
  mockTenantBMemberships    // buyer no tenant-b
} from '../mocks/supabase';
```

### Respostas de Edge Functions
```typescript
import {
  mockOperatorCreateSuccess,  // {userId, tempPassword}
  mockOperatorCreate401,       // Missing auth header
  mockOperatorCreate403,       // Insufficient permissions
  mockRoleAssignSuccess,       // {success: true}
  mockRoleAssign400            // Invalid role
} from '../mocks/supabase';
```

## Troubleshooting

### Testes falhando com "Cannot read property 'auth' of undefined"
- Verifique se o mock do Supabase está corretamente configurado
- Certifique-se de que `vi.mock('@/integrations/supabase/client')` está antes do `describe`

### Testes de componentes React não renderizam
- Verifique se `@testing-library/react` está instalado
- Certifique-se de que `BrowserRouter` envolve os componentes testados
- Verifique se `AuthProvider` está presente quando necessário

### Cobertura abaixo do esperado
- Execute `npm run test:coverage tests/auth` para ver relatório detalhado
- Verifique linhas não cobertas com `npm run test:ui`
- Adicione testes para edge cases não cobertos

## Próximos Passos

- [ ] Testes E2E com Playwright para fluxos completos
- [ ] Testes de performance para Edge Functions
- [ ] Testes de segurança com tentativas de bypass de RLS
- [ ] Testes de acessibilidade (a11y) nos componentes de auth
