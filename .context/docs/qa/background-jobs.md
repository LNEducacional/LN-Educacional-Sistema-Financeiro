---
slug: background-jobs
category: operations
generatedAt: 2026-01-29T04:11:07.648Z
updatedAt: 2026-02-02
relevantFiles:
  - server/cmd/api/main.go
  - server/internal/modules/admin/service.go
  - server/internal/modules/orders/service.go
  - server/internal/modules/payment/service.go
  - server/internal/modules/users/repository.go
---

# How do background jobs work?

## Background Jobs

The system uses Go goroutines with `time.Ticker` for scheduled background tasks. All workers are started in `cmd/api/main.go` when the server boots.

### 1. Refresh Token Cleanup

- **Interval**: Every 1 hour
- **Purpose**: Deletes expired refresh tokens from the `refresh_tokens` table
- **Implementation**: `tokenRepo.DeleteExpired(ctx)`
- **Startup**: Runs on ticker only (no immediate run)

### 2. Delinquency Checker

- **Interval**: Every 24 hours
- **Purpose**: Checks for students with overdue orders past the 7-day grace period
- **Actions**:
  - Marks students as delinquent (`is_delinquent = true`)
  - Creates `delinquency_history` entries
  - Clears students who are no longer delinquent
- **Implementation**: `adminService.RunDelinquencyCheck(ctx)`
- **Startup**: Runs immediately on boot, then every 24 hours

### 3. Overdue Order Marker

- **Interval**: Every 1 hour
- **Purpose**: Marks orders past their due date with status `ATRASADO`
- **Implementation**: `orderService.MarkOverdue(ctx)`
- **Startup**: Runs on ticker only

### 4. Payout Processor

- **Interval**: Every 5 minutes
- **Purpose**: Processes pending withdrawal requests via ASAAS API
- **Actions**:
  - Finds withdrawal requests with status `PENDING`
  - Calls ASAAS transfer API for each
  - Updates status to `COMPLETED` on success
  - Deducts from collaborator's available balance
- **Implementation**: `paymentService.ProcessPendingPayouts(ctx)`
- **Startup**: Runs immediately on boot, then every 5 minutes
- **Guard**: Only starts if payment gateway is configured

### Event-Driven Side Effects

In addition to scheduled workers, the system uses an event dispatcher for real-time side effects:

| Event | Triggered By | Handler |
|-------|-------------|---------|
| OrderCreated | New order | Notifications |
| OrderStatusChanged | Status update | Notifications |
| DeliveryUploaded | File upload | Notifications |
| PaymentReleased | Order approved | Notifications |
| DisputeOpened | New dispute | Notifications |
| DisputeCommentAdded | Comment added | Notifications |
| DisputeResolved | Admin resolution | Notifications + Payment adjustment |
| EvidenceUploaded | Evidence file | Notifications |

The `DisputeResolved` event has two subscribers: the notifications service and the `DisputePaymentHandler` which processes financial adjustments.
