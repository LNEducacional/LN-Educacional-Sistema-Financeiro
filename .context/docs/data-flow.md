# Data Flow

## Order Lifecycle

### 1. Order Creation Flow

```
Student                     Frontend                    Backend                     Database
   │                           │                           │                           │
   ├──[Select Service]────────►│                           │                           │
   │                           ├──[GET /api/services]─────►│                           │
   │                           │◄─────[Services List]──────┤                           │
   │                           │                           │                           │
   ├──[Select Collaborator]───►│                           │                           │
   │                           ├──[GET /api/collaborators]►│                           │
   │                           │◄────[Collaborators List]──┤                           │
   │                           │                           │                           │
   ├──[Submit Order]──────────►│                           │                           │
   │                           ├──[POST /api/orders]──────►│                           │
   │                           │                           ├──[BEGIN TRANSACTION]─────►│
   │                           │                           ├──[INSERT orders]─────────►│
   │                           │                           ├──[INSERT transactions]───►│
   │                           │                           ├──[UPDATE wallets]────────►│
   │                           │                           │   (balance_locked += X)   │
   │                           │                           ├──[COMMIT]────────────────►│
   │                           │◄─────[Order Created]──────┤                           │
   │◄─────[Success Message]────┤                           │                           │
```

### 2. Delivery and Approval Flow

```
Collaborator               Frontend                    Backend                     Database
   │                           │                           │                           │
   ├──[Upload Delivery]───────►│                           │                           │
   │                           ├──[POST /api/orders/:id/deliver]─►│                   │
   │                           │                           ├──[Save file to disk]      │
   │                           │                           ├──[INSERT deliveries]─────►│
   │                           │                           ├──[UPDATE orders]─────────►│
   │                           │                           │   (status = ENTREGUE)     │
   │                           │◄─────[Delivery Saved]─────┤                           │
   │                           │                           │                           │
   │                           │     [Event: DeliveryUploaded]                         │
   │                           │                           ├──[CREATE notification]───►│
```

```
Student                     Frontend                    Backend                     Database
   │                           │                           │                           │
   ├──[Approve Order]─────────►│                           │                           │
   │                           ├──[POST /api/orders/:id/approve]─►│                   │
   │                           │                           ├──[BEGIN TRANSACTION]─────►│
   │                           │                           ├──[UPDATE orders]─────────►│
   │                           │                           │   (status = CONCLUIDO,    │
   │                           │                           │    payment = RELEASED)    │
   │                           │                           ├──[UPDATE wallets]────────►│
   │                           │                           │   (locked -= X,           │
   │                           │                           │    available += X)        │
   │                           │                           ├──[UPDATE transactions]───►│
   │                           │                           ├──[COMMIT]────────────────►│
   │                           │◄─────[Order Approved]─────┤                           │
```

### 3. Revision Request Flow

```
Student                     Frontend                    Backend                     Database
   │                           │                           │                           │
   ├──[Request Revision]──────►│                           │                           │
   │                           ├──[POST /api/orders/:id/revision]►│                   │
   │                           │                           ├──[INSERT order_revisions]►│
   │                           │                           ├──[UPDATE orders]─────────►│
   │                           │                           │   (status = EM_ANDAMENTO, │
   │                           │                           │    revision_count += 1)   │
   │                           │◄─────[Revision Created]───┤                           │
   │                           │                           │                           │
   │                           │     [Payment stays LOCKED - no wallet change]         │
```

## Payment Flow (ASAAS Integration)

### Withdrawal Request

```
Collaborator               Frontend                    Backend                    ASAAS API
   │                           │                           │                           │
   ├──[Request Withdrawal]────►│                           │                           │
   │                           ├──[POST /api/payment/withdraw]─►│                      │
   │                           │                           ├──[Validate balance]       │
   │                           │                           ├──[INSERT withdrawal_req]  │
   │                           │                           │   (status = PENDING)      │
   │                           │◄─────[Request Created]────┤                           │
   │                           │                           │                           │
   │                           │     [Background Worker - every 5 min]                 │
   │                           │                           ├──[POST /v3/transfers]────►│
   │                           │                           │◄────[Transfer ID]─────────┤
   │                           │                           ├──[UPDATE withdrawal_req]  │
   │                           │                           │   (status = COMPLETED)    │
   │                           │                           ├──[UPDATE wallets]         │
   │                           │                           │   (available -= X)        │
```

## Notification Flow (SSE)

```
Backend                                              Frontend
   │                                                    │
   ├──[Event occurs (e.g., DeliveryUploaded)]          │
   │                                                    │
   ├──[EventDispatcher.Publish()]                      │
   │                                                    │
   ├──[NotificationsService.Handle()]                  │
   │   - Create notification in DB                     │
   │                                                    │
   │                   [SSE Connection]                │
   ├──────────────────────────────────────────────────►│
   │   GET /api/notifications/stream                   │
   │                                                    │
   ├──[New notification created]                       │
   │                                                    │
   ├──────────[SSE: data: {notification}]─────────────►│
   │                                                    ├──[Update UI]
   │                                                    ├──[Show toast]
```

## Ranking Calculation Flow

```
Request                     Backend                     Database
   │                           │                           │
   ├──[GET /api/ranking]──────►│                           │
   │   ?criteria=productivity  │                           │
   │   &period=this_month      │                           │
   │                           │                           │
   │                           ├──[Calculate based on criteria]
   │                           │                           │
   │   [PRODUCTIVITY]          │                           │
   │                           ├──[COUNT orders by collab]►│
   │                           │   WHERE status=CONCLUIDO  │
   │                           │   AND period filter       │
   │                           │                           │
   │   [REVENUE]               │                           │
   │                           ├──[SUM collab_value]──────►│
   │                           │   WHERE payment=RELEASED  │
   │                           │                           │
   │   [PUNCTUALITY]           │                           │
   │                           ├──[% on-time deliveries]──►│
   │                           │   delivery_date<=due_date │
   │                           │                           │
   │   [SATISFACTION]          │                           │
   │                           ├──[AVG ratings.score]─────►│
   │                           │                           │
   │   [QUALITY]               │                           │
   │                           ├──[Complex formula]───────►│
   │                           │   (1-revision_rate)*0.5 + │
   │                           │   (1-refund_rate)*0.3 +   │
   │                           │   (approval_rate)*0.2     │
   │                           │                           │
   │◄─────[Ranking Results]────┤                           │
```

## Delinquency Check Flow

```
Background Worker           Backend                     Database
   │                           │                           │
   ├──[Trigger daily check]───►│                           │
   │                           │                           │
   │                           ├──[Find overdue orders]───►│
   │                           │   WHERE due_date < NOW()  │
   │                           │     - 7 days (grace)      │
   │                           │   AND status NOT IN       │
   │                           │     (CONCLUIDO,CANCELADO) │
   │                           │                           │
   │                           ├──[Group by student]       │
   │                           │                           │
   │                           ├──[For each delinquent:]   │
   │                           │   UPDATE users            │
   │                           │     is_delinquent=true    │
   │                           │     delinquent_since=now  │
   │                           │                           │
   │                           │   INSERT delinquency_     │
   │                           │     history               │
   │                           │                           │
   │                           ├──[For each cleared:]      │
   │                           │   UPDATE users            │
   │                           │     is_delinquent=false   │
   │                           │                           │
   │                           │   UPDATE delinquency_     │
   │                           │     history (close)       │
   │                           │                           │
   │◄─────[Check Result]───────┤                           │
```

## State Transitions

### Order Status State Machine

```
    ┌─────────┐
    │  NOVO   │
    └────┬────┘
         │ start_work
         ▼
┌────────────────┐
│  EM_ANDAMENTO  │◄──────┐
└───────┬────────┘       │
        │ deliver        │ revision_requested
        ▼                │
   ┌─────────┐           │
   │ENTREGUE │───────────┘
   └────┬────┘
        │ approve
        ▼
  ┌──────────┐
  │CONCLUIDO │
  └──────────┘

  ┌──────────┐
  │CANCELADO │ (can transition from any state)
  └──────────┘
```

### Payment Status State Machine

```
   ┌────────┐
   │ LOCKED │
   └───┬────┘
       │
       ├──[order approved]──► RELEASED
       │
       └──[order cancelled]─► REFUNDED
```
