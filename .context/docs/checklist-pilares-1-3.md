# Checklist de Implementação — Pilares 1 e 3

> Gerado em: 2026-02-10
> Base: Análise de gaps documentada em `analise-pilares-1-3.md`

---

## Prioridade ALTA

### Página de Gestão de Saques (Pilar 1)

- [ ] **Backend**: Criar endpoints de aprovação/rejeição de saques (`PUT /admin/withdrawals/{id}/approve`, `PUT /admin/withdrawals/{id}/reject`)
- [ ] **Frontend**: Criar página `/admin/withdrawals` com listagem de saques pendentes
- [ ] **Frontend**: Tabela com: colaborador, valor, chave PIX, data do pedido, status
- [ ] **Frontend**: Botões de aprovar/rejeitar com modal de confirmação
- [ ] **Frontend**: Filtros por status (PENDING, APPROVED, COMPLETED, REJECTED)
- [ ] **Frontend**: Adicionar rota protegida com roles `['ADMIN', 'FINANCEIRO']`
- [ ] **Frontend**: Adicionar link "Saques" na sidebar do ADMIN e FINANCEIRO
- [ ] **Testes**: Cobrir fluxo de aprovação e rejeição

### Expandir Permissões do FINANCEIRO (Pilar 1 + 3)

#### Disputas
- [ ] **Backend**: Adicionar `FINANCEIRO` ao RoleGuard de `GET /api/disputes` (listagem)
- [ ] **Backend**: Adicionar `FINANCEIRO` ao RoleGuard de `GET /api/disputes/{id}` (detalhe)
- [ ] **Frontend**: Adicionar `FINANCEIRO` ao `allowedRoles` da rota `/disputes`
- [ ] **Frontend**: Adicionar link "Disputas" na sidebar do FINANCEIRO

#### Produção (leitura)
- [ ] **Backend**: Adicionar `FINANCEIRO` ao RoleGuard de `GET /api/production` (listagem)
- [ ] **Frontend**: Adicionar `FINANCEIRO` ao `allowedRoles` da rota `/admin/production`
- [ ] **Frontend**: Adicionar link "Produção" na sidebar do FINANCEIRO

#### Reclamações (leitura)
- [ ] **Backend**: Verificar se `/admin/reports/complaints` já aceita FINANCEIRO (provavelmente sim, está sob `/admin/reports`)
- [ ] **Frontend**: Adicionar `FINANCEIRO` ao `allowedRoles` da rota `/admin/complaints`
- [ ] **Frontend**: Adicionar link "Reclamações" na sidebar do FINANCEIRO

---

## Prioridade MÉDIA

### Adicionar STUDENT ao Ranking (Pilar 3)

- [ ] **Backend**: Adicionar `STUDENT` ao RoleGuard de `GET /api/ranking`
- [ ] **Frontend**: Adicionar `STUDENT` ao `allowedRoles` da rota `/ranking`
- [ ] **Frontend**: Adicionar link "Ranking" na sidebar do STUDENT
- [ ] **Frontend**: Considerar exibir ranking resumido na seleção de colaborador ao criar pedido

### Página de Faturas do Aluno (Pilar 1)

- [ ] **Backend**: Criar endpoint `GET /api/payment/my-charges` (listar cobranças do aluno logado)
- [ ] **Frontend**: Criar página `/student/payments` com listagem de faturas
- [ ] **Frontend**: Mostrar status da cobrança (PENDING, CONFIRMED, OVERDUE, etc.)
- [ ] **Frontend**: Link para QR Code PIX / boleto quando disponível
- [ ] **Frontend**: Adicionar rota protegida com role `['STUDENT']`
- [ ] **Frontend**: Adicionar link "Pagamentos" na sidebar do STUDENT

### Dashboard Otimizado do FINANCEIRO (Pilar 1)

- [ ] **Frontend**: Avaliar se o `ReportsDashboard` atual atende ou se precisa de dashboard dedicado
- [ ] **Frontend**: Se necessário, criar `/financeiro/dashboard` com foco em:
  - [ ] Saques pendentes (widget com contagem + link para `/admin/withdrawals`)
  - [ ] Cobranças em aberto
  - [ ] Resumo de inadimplência
  - [ ] KPIs financeiros filtrados

### Criação de Pedido pelo ADMIN (Pilar 3)

- [ ] **Frontend**: Adicionar fluxo de criação de pedido no cockpit de produção do admin
- [ ] **Frontend**: Formulário com seleção de: aluno, serviço, colaborador, prazo
- [ ] **Backend**: Verificar se `POST /api/orders` já aceita ADMIN (provavelmente sim)

---

## Prioridade BAIXA

### Página de Todas as Notificações (Pilar 3)

- [ ] **Frontend**: Criar página `/notifications` com listagem paginada
- [ ] **Frontend**: Filtros: todas, não lidas, por tipo
- [ ] **Frontend**: Marcar como lida individualmente e em massa
- [ ] **Frontend**: Adicionar rota protegida para todos os roles autenticados
- [ ] **Backend**: Endpoints já existem (`GET /api/notifications` com paginação)

### Exibir Limites de Saque ao Colaborador (Pilar 1)

- [ ] **Frontend**: No formulário de saque do dashboard do colaborador, exibir:
  - [ ] Valor mínimo: R$50
  - [ ] Valor máximo por transação: R$10.000
  - [ ] Limite diário: R$50.000
- [ ] **Frontend**: Validação client-side antes de submeter

### Ranking no Dashboard do Colaborador (Pilar 3)

- [ ] **Frontend**: Adicionar widget resumido de posição no ranking no `CollaboratorDashboardPage`
- [ ] **Frontend**: Mostrar posição atual nos 5 critérios com link para `/ranking`

### Métricas de Qualidade Explicadas (Pilar 3)

- [ ] **Frontend**: Na página de ranking, adicionar tooltip/info explicando cada critério
- [ ] **Frontend**: No dashboard do colaborador, mostrar dicas de como melhorar score
- [ ] **Frontend**: Fórmula de quality: `(1-revision_rate)×0.5 + (1-refund_rate)×0.3 + (approval_rate)×0.2`

### Verificar RefundsWidget (Pilar 1)

- [ ] **Frontend**: Validar se `RefundsWidget` no `ReportsDashboard` renderiza dados corretamente
- [ ] **Frontend**: Verificar se endpoint `/admin/reports/refunds` retorna dados esperados

### Integração Serasa — Preparação (Pilar 1)

- [ ] **Backend**: Campos `cpf`, `phone`, `serasa_*` já existem no banco
- [ ] **Backend**: Criar service stub para futura integração com bureau de crédito
- [ ] **Frontend**: Exibir campos de bureau na tela de inadimplentes quando preenchidos

---

## Correções Técnicas / Debt

### Sidebar do FINANCEIRO

- [ ] **Frontend**: Atualizar `Sidebar.tsx` para incluir links completos do FINANCEIRO:
  - [ ] Dashboard → `/admin/reports` (já existe)
  - [ ] Saques → `/admin/withdrawals` (novo)
  - [ ] Produção → `/admin/production` (adicionar acesso)
  - [ ] Colaboradores → `/admin/collaborators` (já existe)
  - [ ] Reclamações → `/admin/complaints` (adicionar acesso)
  - [ ] Disputas → `/disputes` (adicionar acesso)
  - [ ] Serviços → `/admin/services` (já existe)
  - [ ] Ranking → `/ranking` (já existe)

### Sidebar do STUDENT

- [ ] **Frontend**: Atualizar `Sidebar.tsx` para incluir links do STUDENT:
  - [ ] Meus Pedidos → `/student/orders` (já existe)
  - [ ] Pagamentos → `/student/payments` (novo)
  - [ ] Ranking → `/ranking` (adicionar acesso)

### Consistência de RBAC

- [ ] **Auditoria**: Garantir que todo `allowedRoles` no frontend tem RoleGuard correspondente no backend
- [ ] **Auditoria**: Verificar que nenhum endpoint sensível está sem RoleGuard
- [ ] **Testes**: Criar testes de permissão para cada role × endpoint

---

## Resumo de Contagem

| Prioridade | Total de Tasks |
|---|---|
| **ALTA** | 19 |
| **MÉDIA** | 15 |
| **BAIXA** | 16 |
| **Correções Técnicas** | 14 |
| **TOTAL** | **64** |
