# Sistema Financeiro - Documentation Index

This directory contains comprehensive documentation for the Sistema Financeiro project, a full-stack financial management platform for educational services.

## Quick Navigation

| Document | Description |
|----------|-------------|
| [Project Overview](./project-overview.md) | High-level system overview, goals, and user roles |
| [Architecture](./architecture.md) | System architecture, layers, and patterns |
| [Data Flow](./data-flow.md) | Data flow diagrams and integration points |
| [Development Workflow](./development-workflow.md) | Day-to-day engineering processes |
| [Security](./security.md) | Security policies and authentication |
| [Testing Strategy](./testing-strategy.md) | Test frameworks and quality gates |
| [Tooling](./tooling.md) | Scripts, IDE settings, and automation |
| [Glossary](./glossary.md) | Project terminology and domain concepts |

## System Overview

Sistema Financeiro is a platform that manages financial transactions between students seeking academic services and collaborators who provide those services. The system implements an escrow mechanism to protect both parties, with the company acting as intermediary.

### Key Capabilities

- **Escrow Payment System**: Funds are held securely until work is approved
- **Multi-role Access**: Admin, Student, Collaborator, and Financeiro interfaces
- **Gamification**: Ranking system based on productivity, quality, and punctuality
- **Delinquency Management**: Automated tracking of overdue payments
- **Real-time Notifications**: SSE-based notification system
- **Dispute Resolution**: Built-in dispute handling workflow
- **Payment Gateway**: ASAAS integration for PIX charges and withdrawals
- **Email Service**: SMTP-based password reset and notifications

### Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite 7, TypeScript 5.9, Tailwind CSS 4 |
| Backend | Go 1.24, chi/v5, pgx/v5 |
| Database | PostgreSQL 15 (Docker) |
| Authentication | JWT (access + refresh tokens) |
| Payments | ASAAS integration (PIX) |
| Email | SMTP (configurable) |

### Getting Started

```bash
# Start all services (Docker + Backend + Frontend)
make dev

# Frontend only
make run-web

# Backend only
make run-api
```

### Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@test.com | password123 |
| Student | student@test.com | password123 |
| Collaborator | collaborator@test.com | password123 |
| Financeiro | financeiro@test.com | password123 |
