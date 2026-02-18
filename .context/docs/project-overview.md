# Project Overview

## Purpose

Sistema Financeiro is a financial management platform designed for educational service providers. It facilitates transactions between students who need academic work completed and collaborators who perform the work, with the company acting as an intermediary and guarantor.

## Business Model

The platform operates on a commission-based model:
- Students pay the full service price
- Funds are held in escrow until work is approved
- Upon approval, collaborator receives their percentage (typically 60-70%)
- Company retains the remaining percentage (typically 30-40%)

## User Roles

### Admin
- Full system access and oversight
- Manages services, collaborators, and pricing
- Views financial reports and KPIs
- Handles disputes and delinquency
- Configures payment gateway (ASAAS) via settings panel
- Manages SMTP email configuration

### Student
- Creates orders for academic services
- Selects collaborators
- Reviews deliveries
- Approves/requests revisions
- Opens disputes if necessary

### Collaborator
- Views assigned work orders
- Uploads deliveries
- Tracks earnings (available vs locked)
- Requests withdrawals via PIX
- Participates in ranking system

### Financeiro
- Access to financial reports and KPIs
- Views and exports delinquent collaborators list
- Views collaborator details and earnings
- Views ranking of collaborators
- Manages services catalog alongside Admin

## Core Features

### 1. Order Management
- Order creation with service selection and collaborator assignment
- Status workflow: Novo -> Em Andamento -> Entregue -> Concluido
- Due date tracking with overdue alerts (hourly check)
- Revision request handling with counter

### 2. Escrow System
- Payment locked on order creation
- Released only upon student approval
- Automatic refund on cancellation
- Dispute-triggered hold

### 3. Financial Tracking
- Per-collaborator wallet (available/locked balance)
- Withdrawal requests with PIX integration (ASAAS)
- Configurable withdrawal limits (min: R$50, max: R$10.000, daily: R$50.000)
- Company revenue tracking
- Detailed transaction ledger

### 4. Gamification
- Multiple ranking criteria:
  - Productivity (orders completed)
  - Revenue (earnings)
  - Punctuality (on-time delivery %)
  - Satisfaction (student ratings)
  - Quality (revision/refund rates)
- Monthly and all-time periods
- Podium and table views

### 5. Delinquency Management
- Automatic overdue detection (7-day grace period)
- User flagging and history tracking
- CSV export for external collection
- Serasa integration preparation

### 6. Dispute Resolution
- Student-initiated disputes
- Evidence upload
- Timeline with comments
- Admin resolution with payment adjustments (split options)

### 7. Email Service
- SMTP-based email delivery
- Password reset flow with token-based links
- Configurable via environment variables

## Success Metrics

| Metric | Description |
|--------|-------------|
| GMV | Total order value processed |
| Escrow | Funds currently held |
| Payout | Total released to collaborators |
| Margin | (Revenue - Payouts) / Revenue |
| Revision Rate | Revisions / Orders |
| Delinquency Rate | Overdue orders / Total orders |

## Integration Points

- **ASAAS**: Payment processing, PIX charges, and withdrawals (hot-reload config from DB)
- **SMTP**: Email delivery for password reset and notifications
- **Future**: Serasa for debt collection
