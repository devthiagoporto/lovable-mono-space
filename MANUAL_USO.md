# Manual de Uso - Sistema de Ingressos

## 📖 Guia Completo para Usuários

### 🏠 Página Inicial

A página inicial do sistema exibe **eventos públicos disponíveis** filtrados automaticamente por:
- **Região:** Baseada na sua localização atual (ou Brasil, caso não permita)
- **Data:** Apenas eventos futuros (a partir de hoje)

#### Como funciona:
1. Ao acessar, o sistema solicitará permissão para usar sua localização
2. Os eventos próximos a você serão listados primeiro
3. Clique em qualquer evento para ver detalhes completos

---

## 👥 Tipos de Usuário

### 1. **Visitante (Não autenticado)**
- ✅ Visualizar eventos públicos
- ✅ Ver detalhes de eventos, setores e ingressos
- ❌ Não pode comprar ingressos (precisa fazer login)

### 2. **Comprador (buyer)**
- ✅ Todas as permissões de visitante
- ✅ Comprar ingressos
- ✅ Ver histórico de pedidos
- ✅ Aplicar cupons de desconto

### 3. **Staff (organizer_staff)**
- ✅ Gerenciar eventos do seu organizador
- ✅ Criar e editar eventos
- ✅ Gerenciar cupons
- ✅ Ver analytics

### 4. **Admin (organizer_admin)**
- ✅ Todas as permissões de Staff
- ✅ Gerenciar operadores de check-in
- ✅ Configurações do organizador

### 5. **Operador de Check-in (checkin_operator)**
- ✅ Portal dedicado em `/checkin`
- ✅ Validar QR codes
- ✅ Registrar entradas

---

## 🎫 Fluxo de Compra (Em Desenvolvimento)

### Passo 1: Navegar Eventos
1. Acesse a página inicial
2. Navegue pelos eventos disponíveis
3. Clique no evento desejado

### Passo 2: Selecionar Ingressos
1. Na página do evento, veja os setores disponíveis
2. Escolha os tipos de ingresso
3. Veja os lotes e preços

### Passo 3: Adicionar ao Carrinho
1. Selecione quantidade (respeitando limites)
2. Aplique cupons de desconto (se houver)
3. Confirme o carrinho

### Passo 4: Checkout
1. Preencha dados pessoais
2. Escolha método de pagamento
3. Confirme o pedido

### Passo 5: Receber Ingressos
1. Após confirmação de pagamento
2. Ingressos enviados por e-mail
3. QR code disponível na conta

---

## 🎟️ Gestão de Eventos (Dashboard)

### Criar Evento
1. Acesse `/dashboard/events`
2. Clique em "Criar Evento"
3. Preencha:
   - Título, descrição e local
   - Data de início e fim
   - Capacidade total
   - Regras de limite por pedido

### Configurar Setores
1. Dentro do evento, clique em "Setores"
2. Adicione setores (ex: Pista, Camarote)
3. Defina capacidade de cada setor

### Criar Tipos de Ingresso
1. Em cada setor, adicione tipos
2. Exemplos: Inteira, Meia-entrada
3. Configure preços e taxas

### Configurar Lotes
1. Para cada tipo, crie lotes
2. Defina quantidade e período de venda
3. Configure preços progressivos

### Publicar Evento
1. Revise todas as configurações
2. Altere status de "Rascunho" para "Publicado"
3. Evento fica visível na página pública

---

## 🎁 Sistema de Cupons

### Tipos de Cupons

#### 1. **Percentual**
- Desconto em % sobre o total
- Ex: `BLACKFRIDAY20` → 20% de desconto

#### 2. **Valor Fixo**
- Desconto em R$ no total
- Ex: `DESC50` → R$ 50,00 de desconto

#### 3. **Cortesia**
- 100% de desconto (ingresso grátis)
- Ex: `IMPRENSA2024`

### Configurações de Cupons

#### Limites
- **Por CPF:** Quantas vezes um CPF pode usar
- **Total de Usos:** Limite global do cupom
- **Por Tipo:** Quais tipos de ingresso são elegíveis

#### Combinabilidade
- ✅ **Combinável:** Pode usar com outros cupons
- ❌ **Não Combinável:** Exclusivo (não aceita outros)

### Ordem de Aplicação
1. **Cortesias** (100% primeiro)
2. **Descontos em Valor** (R$ fixos)
3. **Descontos Percentuais** (% sobre restante)

### Analytics de Cupons
- Acessível em `/dashboard/events/:id/coupons/analytics`
- Veja: Total de usos, receita impactada, uso por tipo
- Exporte dados em CSV

---

## 🚪 Portal de Check-in

### Acesso
- Rota dedicada: `/checkin`
- Apenas para usuários com role `checkin_operator`

### Funcionalidades
1. **Validar QR Code**
   - Escaneie o código do ingresso
   - Sistema valida autenticidade
   - Previne duplicação

2. **Registrar Entrada**
   - Marca ingresso como usado
   - Registra operador e horário
   - Impossível reutilizar

3. **Modo Offline** (Futura implementação)
   - Validação local
   - Sincronização posterior

---

## 🔐 Segurança

### RLS (Row Level Security)
- Todos os dados são isolados por **tenant**
- Cada organizador vê apenas seus próprios eventos
- Compradores veem apenas seus pedidos

### Validações no Carrinho
A Edge Function `cart-validate` verifica:
1. ✅ Evento publicado e ativo
2. ✅ Tipos de ingresso ativos
3. ✅ Estoque disponível
4. ✅ Limites por pedido
5. ✅ Limites por CPF
6. ✅ Capacidade do setor
7. ✅ Cupons válidos e ativos
8. ✅ Elegibilidade do cupom
9. ✅ Combinabilidade de cupons

### Proteção de CPFs
- **Acesso Restrito:** Apenas donos e admins
- **Criptografia:** Dados sensíveis protegidos
- **Audit Log:** Todas as ações são registradas

---

## 🛠️ Solução de Problemas

### Não consigo ver eventos
- ✅ Verifique se há eventos **publicados**
- ✅ Eventos em "rascunho" não aparecem
- ✅ Permita acesso à localização no navegador

### Cupom não funciona
- ✅ Verifique se está ativo
- ✅ Confirme se não atingiu limite de usos
- ✅ Veja se o tipo de ingresso é elegível
- ✅ Confira se não está combinando cupons não combináveis

### Erro ao fazer check-in
- ✅ Verifique conexão com internet
- ✅ Confirme se tem role `checkin_operator`
- ✅ Veja se o ingresso já foi usado

### Permissão negada
- ✅ Faça login novamente
- ✅ Confirme seu role com o administrador
- ✅ Verifique se está no tenant correto

---

## 📱 Suporte

### Documentação Técnica
- **README.md** - Visão geral do sistema
- **SCHEMA_DATABASE.md** - Estrutura do banco
- **ETAPA4_README.md** - Sistema de cupons detalhado

### Contato
- Acesse o dashboard e use o suporte integrado
- E-mail: suporte@seuorganizador.com.br

---

## 🎯 Boas Práticas

### Para Organizadores
1. ✅ Teste o evento antes de publicar
2. ✅ Configure limites realistas
3. ✅ Crie lotes com preços progressivos
4. ✅ Use cupons estrategicamente
5. ✅ Monitore analytics regularmente

### Para Operadores
1. ✅ Valide cada QR code cuidadosamente
2. ✅ Informe problemas imediatamente
3. ✅ Mantenha dispositivo carregado
4. ✅ Tenha backup de internet móvel

### Para Compradores
1. ✅ Compre com antecedência (lotes baratos)
2. ✅ Use cupons quando disponíveis
3. ✅ Salve o QR code (screenshot ou e-mail)
4. ✅ Chegue cedo ao evento

---

**Sistema desenvolvido com ❤️ usando Lovable**
