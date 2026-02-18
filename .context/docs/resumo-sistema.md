# Sistema Financeiro — Resumo

É uma **plataforma de intermediação de serviços acadêmicos** que conecta três pontas:

**Alunos** contratam trabalhos acadêmicos (TCC, artigos, monografias etc.) em áreas como Direito, Pedagogia, Enfermagem, Contabilidade, entre outras.

**Colaboradores** são os profissionais que executam os trabalhos e recebem uma porcentagem do valor (60-70%).

**A empresa** atua como intermediária, retém a outra parte (30-40%) e garante o processo via escrow.

---

## Fluxo Principal

1. Aluno cria um pedido escolhendo serviço + colaborador
2. Pagamento fica **travado em escrow** (LOCKED)
3. Colaborador executa e faz upload da entrega
4. Aluno aprova → dinheiro é **liberado** para a wallet do colaborador
5. Aluno reprova → volta para revisão (ciclo repete)
6. Colaborador saca via **PIX** (integração ASAAS)

---

## Os 4 Roles do Sistema

| Role | O que faz |
|---|---|
| **Admin** | Gerencia tudo: serviços, produção, colaboradores, disputas, configurações |
| **Financeiro** | Foco em relatórios financeiros, KPIs, inadimplência, colaboradores |
| **Colaborador** | Recebe pedidos, entrega trabalhos, acompanha ganhos, saca dinheiro |
| **Aluno** | Cria pedidos, paga, aprova/reprova entregas, abre disputas |

---

## Funcionalidades-Chave

- **Escrow** — dinheiro seguro até aprovação
- **Wallet + Saques PIX** — colaborador tem carteira própria
- **Ranking gamificado** — 5 critérios (produtividade, receita, pontualidade, satisfação, qualidade)
- **Controle de inadimplência** — detecção automática + export CSV
- **Disputas** — sistema completo com evidências e resolução
- **Notificações real-time** — via SSE
- **Dashboard financeiro** — KPIs, gráficos, alertas

---

## Stack Técnica

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + Vite + TypeScript + Tailwind CSS |
| Backend | Go + chi/v5 (Clean Architecture) |
| Banco de Dados | PostgreSQL 15 (Docker) |
| Autenticação | JWT (access + refresh tokens) |
| Pagamentos | ASAAS (PIX) |
| Lint/Format | BiomeJS (frontend) |
| Notificações | Server-Sent Events (SSE) |

---

## Portas dos Serviços

| Serviço | Porta |
|---|---|
| Frontend | http://localhost:8082 |
| Backend | http://localhost:8080 |
| PostgreSQL | localhost:5435 |

---

## Credenciais de Teste

| Role | Email | Senha |
|---|---|---|
| Admin | admin@test.com | password123 |
| Student | student@test.com | password123 |
| Collaborator | collaborator@test.com | password123 |
| Financeiro | financeiro@test.com | password123 |
