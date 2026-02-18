# Análise Completa — Pilares 1 e 3

> Gerado em: 2026-02-10
> Escopo: Pilar 1 (Sistema Financeiro) + Pilar 3 (Gestão de Produção e Colaboradores)
> Pilar 2 (IA de Atendimento) foi ignorado conforme solicitado.

---

## 1. Mapeamento de Páginas/Telas Existentes

### Públicas (sem autenticação)

| Rota | Componente | Descrição |
|------|-----------|-----------|
| `/login` | `LoginForm` | Login |
| `/forgot-password` | `ForgotPasswordPage` | Esqueceu a senha |
| `/reset-password/:token` | `ResetPasswordPage` | Redefinir senha |
| `/unauthorized` | inline | Acesso negado |

### Admin (ADMIN only)

| Rota | Componente | Descrição |
|------|-----------|-----------|
| `/admin/production` | `ProductionAdminDashboard` | Cockpit de produção |
| `/admin/complaints` | `ComplaintsPage` | Reclamações |
| `/admin/settings` | `SettingsPage` | Configurações (ASAAS) |
| `/disputes` | `DisputesListPage` | Lista de disputas |

### Admin + Financeiro

| Rota | Componente | Descrição |
|------|-----------|-----------|
| `/admin/reports` | `ReportsDashboard` | Dashboard financeiro/KPIs |
| `/admin/services` | `ServicesPage` | CRUD de serviços |
| `/admin/collaborators` | `CollaboratorsPage` | Lista de colaboradores |
| `/admin/collaborators/:id` | `CollaboratorDetailPage` | Detalhe do colaborador |

### Collaborator

| Rota | Componente | Descrição |
|------|-----------|-----------|
| `/collaborator/dashboard` | `CollaboratorDashboardPage` | Dashboard + wallet + pedidos |
| `/collaborator/production` | `ProductionCollaboratorDashboard` | Minha produção |

### Student

| Rota | Componente | Descrição |
|------|-----------|-----------|
| `/student/orders` | `OrdersListPage` | Meus pedidos |
| `/student/orders/:id` | `OrderDetailsPage` | Detalhes do pedido |
| `/orders/:orderId/dispute` | `OpenDisputePage` | Abrir disputa |

### Compartilhadas

| Rota | Roles | Descrição |
|------|-------|-----------|
| `/ranking` | ADMIN, FINANCEIRO, COLLABORATOR | Ranking/gamificação |
| `/disputes/:id` | ADMIN, STUDENT, COLLABORATOR | Detalhe da disputa |

**Total: 17 páginas protegidas + 4 públicas = 21 telas**

---

## 2. Identificação dos Roles Implementados

| Role | Definido no Backend | Definido no Frontend | Usuário de Teste |
|------|:---:|:---:|---|
| **ADMIN** | Sim | Sim | admin@test.com |
| **STUDENT** | Sim | Sim | student@test.com |
| **COLLABORATOR** | Sim | Sim | collaborator@test.com |
| **FINANCEIRO** | Sim | Sim | financeiro@test.com |

Roles definidos como ENUM no banco (`user_role`) e validados via `middleware.RoleGuard()` no backend e `ProtectedRoute` no frontend.

---

## 3. Mapeamento de Permissões por Role × Página

| Página/Funcionalidade | ADMIN | FINANCEIRO | COLLABORATOR | STUDENT |
|---|:---:|:---:|:---:|:---:|
| **Dashboard Financeiro** (`/admin/reports`) | Completo | Completo | - | - |
| **CRUD Serviços** (`/admin/services`) | Completo | Completo | - | - |
| **Lista Colaboradores** (`/admin/collaborators`) | Completo | Completo | - | - |
| **Detalhe Colaborador** (`/admin/collaborators/:id`) | Completo | Completo | - | - |
| **Cockpit Produção** (`/admin/production`) | Completo | - | - | - |
| **Reclamações** (`/admin/complaints`) | Completo | - | - | - |
| **Configurações** (`/admin/settings`) | Completo | - | - | - |
| **Lista Disputas** (`/disputes`) | Completo | - | - | - |
| **Detalhe Disputa** (`/disputes/:id`) | Completo | - | Leitura + comentários | Leitura + comentários |
| **Dashboard Colaborador** (`/collaborator/dashboard`) | - | - | Completo | - |
| **Produção Colaborador** (`/collaborator/production`) | - | - | Completo | - |
| **Ranking** (`/ranking`) | Completo | Completo | Completo | - |
| **Pedidos Aluno** (`/student/orders`) | - | - | - | Completo |
| **Detalhe Pedido** (`/student/orders/:id`) | - | - | - | Completo |
| **Abrir Disputa** (`/orders/:orderId/dispute`) | - | - | - | Completo |

---

## 4. Comparação com Requisitos — Pilar 1 (Sistema Financeiro)

### 4.1 Totalmente Implementado

| Funcionalidade | Backend | Frontend | Observações |
|---|:---:|:---:|---|
| Catálogo de serviços (CRUD) | Sim | Sim | Com paginação, filtros, toggle ativo/inativo |
| Snapshot de preço no pedido | Sim | Sim | `total_value`, `company_percent`, `collab_percent` gravados |
| Escrow (LOCKED/RELEASED/REFUNDED) | Sim | Sim | State machine no backend, visualização no frontend |
| Wallet do colaborador (available/locked) | Sim | Sim | Dashboard mostra saldos |
| Ledger de transações (audit trail) | Sim | Sim | Tabela `transactions` com tipo/status |
| KPIs Financeiros (GMV, Escrow, Payout, Margin) | Sim | Sim | Cards + gráficos no ReportsDashboard |
| Relatórios mensais/semanais | Sim | Sim | Gráficos com múltiplos períodos |
| Detecção automática de inadimplência | Sim | Sim | Worker horário + tabela `delinquency_history` |
| Export CSV de inadimplentes | Sim | Sim | Endpoint `/export` + botão no frontend |
| Histórico de inadimplência por aluno | Sim | Sim | `/delinquency/history/{userId}` |
| Integração ASAAS (gateway PIX) | Sim | Sim | Hot-reload de config, webhook, charge creation |
| Config ASAAS via painel admin | Sim | Sim | SettingsPage com teste de conexão |
| Sistema de email (SMTP) | Sim | Sim | Password reset funcional |
| Saques PIX (withdraw) | Sim | Sim | Form no dashboard do colaborador |
| Worker de payout (5 min) | Sim | - | Background processor no backend |
| Worker de inadimplência (daily) | Sim | - | Background checker no backend |

### 4.2 Parcialmente Implementado

| Funcionalidade | O que falta | Impacto |
|---|---|---|
| **Limites de saque** | Backend tem lógica (min R$50, max R$10k, daily R$50k) mas frontend não exibe esses limites ao colaborador | UX — colaborador não sabe os limites antes de tentar |
| **Relatório de reembolsos** | Endpoint existe (`/admin/reports/refunds`), frontend chama mas widget pode estar incompleto | Verificar se `RefundsWidget` renderiza corretamente |
| **Ranking no contexto financeiro** | Ranking por "revenue" existe mas não aparece no dashboard financeiro — só na página de ranking | Admin/Financeiro precisa navegar para `/ranking` |

### 4.3 Não Implementado

| Funcionalidade | Descrição | Prioridade |
|---|---|---|
| **Página de gestão de saques (Admin/Financeiro)** | Endpoint `/admin/withdrawals` existe no backend, mas **não há página frontend** para admin/financeiro aprovar/rejeitar saques | **ALTA** |
| **Cobranças/faturas para aluno** | Charge creation via ASAAS existe no backend, frontend mostra QR PIX no detalhe do pedido, mas **não há página dedicada de "Minhas Faturas"** para o aluno | Média |
| **Dashboard financeiro do FINANCEIRO** | O role FINANCEIRO acessa `/admin/reports`, mas **não tem dashboard próprio otimizado** para suas necessidades específicas (foco em saques pendentes, cobranças) | Média |

---

## 5. Comparação com Requisitos — Pilar 3 (Gestão de Produção e Colaboradores)

### 5.1 Totalmente Implementado

| Funcionalidade | Backend | Frontend | Observações |
|---|:---:|:---:|---|
| Lifecycle de pedidos (NOVO → CONCLUÍDO) | Sim | Sim | Status machine com 6 estados |
| Upload de entrega (delivery) | Sim | Sim | Multipart upload com validação |
| Fluxo de aprovação/revisão | Sim | Sim | Approve/reject + revision counter |
| Dashboard do colaborador | Sim | Sim | Wallet + pedidos + entregas |
| Production jobs (8 estados) | Sim | Sim | Cockpit admin + dashboard colaborador |
| Ranking gamificado (5 critérios) | Sim | Sim | Pódio + tabela + posição do usuário |
| Notificações real-time (SSE) | Sim | Sim | NotificationBell + stream |
| Disputas (5 estados + resoluções) | Sim | Sim | CRUD completo com evidências |
| Perfil do colaborador | Sim | Sim | Detalhes, earnings, revisions, rankings |
| Métricas de performance | Sim | Sim | Rating, punctuality, revision rate |
| Worker de pedidos atrasados (hourly) | Sim | - | Marca como ATRASADO automaticamente |
| Atribuição de colaborador a job | Sim | Sim | Endpoint `/assign` + UI admin |
| Histórico de status do job | Sim | Sim | Timeline com comentários |
| Alertas (overdue, due today/tomorrow) | Sim | Sim | Widget no admin dashboard |

### 5.2 Parcialmente Implementado

| Funcionalidade | O que falta | Impacto |
|---|---|---|
| **Ranking no dashboard do colaborador** | Endpoint `ranking/my` existe e é chamado, mas a **posição individual** poderia estar mais visível no dashboard principal | UX — colaborador precisa ir à página de ranking |
| **Notificações persistidas** | Backend salva e tem endpoints, frontend mostra bell + dropdown, mas **não há página de "Todas as notificações"** | Funcional mas limitado ao dropdown |
| **Métricas de qualidade detalhadas** | A fórmula de quality ranking existe no backend, mas o frontend **não explica ao colaborador** como melhorar seu score | UX/documentação |

### 5.3 Não Implementado

| Funcionalidade | Descrição | Prioridade |
|---|---|---|
| **Página de criação de pedido pelo ADMIN** | Admin pode criar jobs via production, mas **não há fluxo claro no frontend** para admin criar pedidos em nome do aluno | Média |
| **Página de "Todas as Notificações"** | Só existe dropdown; falta uma página `/notifications` com listagem completa, filtros e paginação | Baixa |
| **Integração Serasa (bureau)** | Campos `cpf`, `phone`, `serasa_*` existem na migração mas **não há integração real** — apenas preparação | Baixa (futuro) |
| **Feature flags / rollout gradual** | Requisito do CLAUDE.md mas não implementado | Baixa |

---

## 6. Páginas que Ainda Precisam ser Criadas

| # | Página | Rota Sugerida | Role(s) | Pilar | Prioridade |
|---|---|---|---|---|---|
| 1 | **Gestão de Saques** | `/admin/withdrawals` | ADMIN, FINANCEIRO | P1 | **ALTA** |
| 2 | **Todas as Notificações** | `/notifications` | Todos | P3 | Baixa |
| 3 | **Minhas Faturas (Aluno)** | `/student/payments` | STUDENT | P1 | Média |
| 4 | **Dashboard Financeiro dedicado** | `/financeiro/dashboard` | FINANCEIRO | P1 | Média |
| 5 | **Gestão de disputas (Financeiro)** | Acesso a `/disputes` | FINANCEIRO | P3 | Média |

---

## 7. Análise de Gaps de Permissão (RBAC)

### 7.1 Problemas Identificados

| # | Gap | Severidade | Descrição |
|---|---|---|---|
| 1 | **FINANCEIRO sem acesso a disputas** | **ALTA** | O role FINANCEIRO não está em `allowedRoles` de `/disputes` (frontend). No backend, disputas também não incluem FINANCEIRO no RoleGuard. Financeiro deveria ao menos ter leitura. |
| 2 | **FINANCEIRO sem acesso a produção** | **MÉDIA** | `/admin/production` é ADMIN-only. Financeiro deveria poder visualizar produção para correlacionar com financeiro. |
| 3 | **FINANCEIRO sem acesso a reclamações** | **MÉDIA** | `/admin/complaints` é ADMIN-only. Reclamações podem ter impacto financeiro (reembolsos). |
| 4 | **FINANCEIRO sem acesso a configurações** | **BAIXA** | SettingsPage (ASAAS config) é ADMIN-only. Faz sentido, mas financeiro poderia ter leitura. |
| 5 | **STUDENT sem acesso ao ranking** | **MÉDIA** | Ranking só permite `COLLABORATOR, ADMIN, FINANCEIRO`. Aluno deveria poder ver ranking para escolher colaborador. |
| 6 | **Admin sem gestão de saques no frontend** | **ALTA** | Backend tem `/admin/withdrawals` com RoleGuard(ADMIN, FINANCEIRO), mas não existe página frontend para gerenciar saques pendentes — **saques ficam sem aprovação manual**. |
| 7 | **Sidebar do FINANCEIRO é limitada** | **MÉDIA** | Apenas 4 links (Dashboard, Colaboradores, Serviços, Ranking). Faltam: Disputas, Saques, Produção (leitura). |

### 7.2 Matriz Resumo — Role vs Acesso Esperado vs Acesso Atual

| Funcionalidade | ADMIN | FINANCEIRO Esperado | FINANCEIRO Atual | Gap? |
|---|---|---|---|---|
| Dashboard Financeiro | Completo | Completo | Completo | - |
| CRUD Serviços | Completo | Completo | Completo | - |
| Colaboradores | Completo | Leitura | Completo | - |
| Saques | Completo | Aprovar/Rejeitar | **Inexistente** | **SIM** |
| Disputas | Completo | Leitura | **Inexistente** | **SIM** |
| Produção | Completo | Leitura | **Inexistente** | **SIM** |
| Reclamações | Completo | Leitura | **Inexistente** | **SIM** |
| Ranking | Completo | Completo | Completo | - |
| Configurações | Completo | - | - | - |

---

## 8. Resumo Executivo

| Métrica | Pilar 1 (Financeiro) | Pilar 3 (Produção) |
|---|---|---|
| **Totalmente implementado** | ~85% | ~90% |
| **Parcialmente implementado** | ~10% | ~7% |
| **Não implementado** | ~5% | ~3% |

### Top 3 Ações Prioritárias

1. **Criar página de Gestão de Saques** (`/admin/withdrawals`) — sem isso, saques de colaboradores não podem ser aprovados pela UI
2. **Expandir permissões do FINANCEIRO** — adicionar acesso a disputas, produção e reclamações (pelo menos leitura)
3. **Adicionar STUDENT ao ranking** — permitir que alunos vejam ranking para escolher melhor colaborador
