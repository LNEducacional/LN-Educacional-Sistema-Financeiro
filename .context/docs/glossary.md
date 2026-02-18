# Glossary

## Business Terms

### Collaborator (Colaborador)
A user who performs academic work for students. Collaborators receive a percentage of the service price upon order completion.

### Student (Aluno)
A user who creates orders for academic services. Students pay the full service price and approve/reject deliveries.

### Admin (Administrador)
A user with full system access. Admins manage services, collaborators, disputes, settings, and view reports.

### Financeiro
A user with access to financial reports, collaborator management, service configuration, and rankings. Shares some permissions with Admin.

### Order (Pedido)
A work request from a student to a collaborator. Contains service details, pricing, due date, and status.

### Service (Servico)
A configurable work type with name, area, price, and commission split percentages (collaborator % vs company %).

### Delivery (Entrega)
A file uploaded by a collaborator for a specific order. Students review deliveries before approval.

### Revision (Revisao)
A request from a student for changes to a delivery. Revisions return the order to "in progress" status and increment the revision counter.

### Escrow (Bloqueio)
The mechanism that holds funds until work is approved. Protects both students and collaborators.

### Wallet (Carteira)
A collaborator's financial account tracking available and locked balances. Each collaborator has one wallet.

### Withdrawal (Saque)
A request by a collaborator to transfer available funds to their bank account via PIX. Subject to configurable limits (min: R$50, max: R$10.000, daily: R$50.000).

### Delinquent (Inadimplente)
A student with overdue orders exceeding the grace period (default: 7 days).

### Dispute (Disputa)
A formal complaint opened by a student when there's an issue with an order. Includes evidence, comments, and admin resolution.

### GMV (Gross Merchandise Value)
The total value of all orders processed through the system.

### Margin (Margem)
Company profit percentage: (GMV - Total Payouts) / GMV x 100

## Status Values

### Order Status (Status do Pedido)

| Status | Portuguese | Description |
|--------|------------|-------------|
| NOVO | Novo Pedido | Just created, awaiting collaborator action |
| EM_ANDAMENTO | Em Andamento | Collaborator is working on it |
| ENTREGUE | Entregue | Delivery uploaded, awaiting student approval |
| CONCLUIDO | Concluido | Student approved, order complete |
| CANCELADO | Cancelado | Order cancelled |
| ATRASADO | Atrasado | Past due date (marked by hourly worker) |

### Payment Status (Status de Pagamento)

| Status | Description |
|--------|-------------|
| LOCKED | Funds held in escrow |
| RELEASED | Funds released to collaborator wallet |
| REFUNDED | Funds returned to student |

### Withdrawal Status (Status de Saque)

| Status | Description |
|--------|-------------|
| PENDING | Request submitted, awaiting processing |
| APPROVED | Admin approved, awaiting transfer |
| COMPLETED | Transfer completed via ASAAS/PIX |
| REJECTED | Request rejected by admin |

### Dispute Status (Status de Disputa)

| Status | Description |
|--------|-------------|
| OPEN | Dispute opened, awaiting resolution |
| UNDER_REVIEW | Admin reviewing the case |
| RESOLVED | Resolution applied (with payment adjustment) |
| CLOSED | Dispute closed |

## Technical Terms

### JWT (JSON Web Token)
Authentication token format used for API authorization. Contains user ID and role.

### Access Token
Short-lived JWT (15 minutes) used for API requests. Sent in `Authorization: Bearer` header.

### Refresh Token
Long-lived token (7 days) used to obtain new access tokens. Stored in database and cleaned up hourly.

### SSE (Server-Sent Events)
Technology used for real-time notifications from server to client.

### ASAAS
Brazilian payment gateway used for processing charges and PIX transfers. Config supports hot-reload from database.

### PIX
Brazilian instant payment system used for collaborator withdrawals.

### FSD (Feature-Sliced Design)
Frontend architecture pattern organizing code by features rather than technical layers.

### Clean Architecture
Backend architecture pattern with layers: Handler -> Service -> Repository.

### AsaasClientManager
Go struct that manages ASAAS API client with hot-reload support. Falls back to env vars if DB config is empty.

### Event Dispatcher
Pub/sub system in `platform/events` for decoupled side effects (notifications, payment processing).

## Service Areas (Areas de Atuacao)

| Area | Portuguese |
|------|------------|
| DIREITO | Law |
| PEDAGOGIA | Education |
| ENFERMAGEM | Nursing |
| ADMINISTRACAO | Business Administration |
| CONTABILIDADE | Accounting |
| PSICOLOGIA | Psychology |
| ENGENHARIA | Engineering |
| OUTROS | Others |

## Ranking Criteria (Criterios de Ranking)

| Criteria | Description | Calculation |
|----------|-------------|-------------|
| productivity | Orders completed | COUNT(completed orders) |
| revenue | Earnings | SUM(collab_value WHERE released) |
| punctuality | On-time rate | on_time_deliveries / total_deliveries x 100 |
| satisfaction | Rating average | AVG(rating scores) |
| quality | Quality score | (1-revision_rate)*0.5 + (1-refund_rate)*0.3 + (approval_rate)*0.2 |

## Ranking Periods (Periodos de Ranking)

| Period | Description |
|--------|-------------|
| this_month | Current calendar month |
| all_time | Since system inception |

## Database Tables

| Table | Purpose |
|-------|---------|
| users | All user accounts (ADMIN, STUDENT, COLLABORATOR, FINANCEIRO) |
| services | Service catalog with pricing |
| orders | Order records with status and payment info |
| order_revisions | Revision history |
| deliveries | Delivery files |
| wallets | Collaborator balances (locked/available) |
| transactions | Financial audit ledger |
| charges | ASAAS payment records |
| withdrawal_requests | Payout requests |
| disputes | Dispute records |
| dispute_comments | Dispute timeline |
| dispute_evidence | Dispute attachments |
| notifications | User notifications |
| ratings | Order ratings |
| delinquency_history | Overdue tracking |
| refresh_tokens | Auth tokens |
| settings | Dynamic system configuration (encrypted) |

## Background Workers

| Worker | Interval | Purpose |
|--------|----------|---------|
| Refresh Token Cleanup | Every 1 hour | Deletes expired refresh tokens |
| Delinquency Checker | Every 24 hours | Marks/clears delinquent students |
| Overdue Order Marker | Every 1 hour | Marks orders past due date as ATRASADO |
| Payout Processor | Every 5 minutes | Processes pending withdrawal requests via ASAAS |
