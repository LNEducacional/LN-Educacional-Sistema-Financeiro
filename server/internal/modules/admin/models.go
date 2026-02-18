package admin

import "time"

// FinancialKPIs represents the key financial indicators
// All values are calculated via SQL aggregation for precision
type FinancialKPIs struct {
	// GMV: Gross Merchandise Volume - Total transacted value (sum of all order total_value)
	GMV float64 `json:"gmv"`
	// NetRevenue: Company's share from RELEASED orders only
	NetRevenue float64 `json:"net_revenue"`
	// Escrow: Money held on behalf of collaborators (sum of all balance_locked)
	Escrow float64 `json:"escrow"`
	// Transferred: Total already moved to collaborators (sum of all balance_available)
	Transferred float64 `json:"transferred"`
	// PendingOrders: Count of orders not yet completed
	PendingOrders int `json:"pending_orders"`
	// TotalOrders: Total number of orders
	TotalOrders int `json:"total_orders"`
}

// MonthlyFinancial represents income vs payouts for a specific month
type MonthlyFinancial struct {
	Month    string  `json:"month"`     // Format: "2025-01"
	Income   float64 `json:"income"`    // Company revenue received
	Payouts  float64 `json:"payouts"`   // Amount released to collaborators
	GMV      float64 `json:"gmv"`       // Total orders value for the month
}

// DelinquentUser represents a user with overdue unpaid orders
type DelinquentUser struct {
	ID             string    `json:"id"`
	Name           string    `json:"name"`
	Email          string    `json:"email"`
	TotalOwed      float64   `json:"total_owed"`       // Sum of unpaid order values
	OldestDueDate  time.Time `json:"oldest_due_date"`  // Oldest overdue order
	DaysOverdue    int       `json:"days_overdue"`     // Days since oldest due date
	OverdueOrders  int       `json:"overdue_orders"`   // Count of overdue orders
	DelinquentSince time.Time `json:"delinquent_since"` // When marked as delinquent
}

// DelinquencyConfig holds the grace period settings
type DelinquencyConfig struct {
	GracePeriodDays int `json:"grace_period_days"` // Days after due date before marking delinquent
}

// DelinquencyCheckResult holds the result of a delinquency check run
type DelinquencyCheckResult struct {
	Checked        int       `json:"checked"`
	NewDelinquents int       `json:"new_delinquents"`
	Cleared        int       `json:"cleared"`
	RunAt          time.Time `json:"run_at"`
}

// CollaboratorSummary represents a collaborator with aggregated metrics for listing
type CollaboratorSummary struct {
	ID                string   `json:"id"`
	Name              string   `json:"name"`
	Email             string   `json:"email"`
	Specialty         *string  `json:"specialty"`
	InternalRanking   float64  `json:"internal_ranking"`
	TotalJobs         int      `json:"total_jobs"`
	CompletedJobs     int      `json:"completed_jobs"`
	PendingJobs       int      `json:"pending_jobs"`
	DelayedJobs       int      `json:"delayed_jobs"`
	TotalEarnings     float64  `json:"total_earnings"`
	PendingEarnings   float64  `json:"pending_earnings"`
	AvgRating         float64  `json:"avg_rating"`
	TotalRatings      int      `json:"total_ratings"`
	OnTimeDeliveryPct float64  `json:"on_time_delivery_pct"`
}

// CollaboratorDetail represents detailed info about a single collaborator
type CollaboratorDetail struct {
	CollaboratorSummary
	PixKey              *string                `json:"pix_key"`
	BalanceAvailable    float64                `json:"balance_available"`
	BalanceLocked       float64                `json:"balance_locked"`
	CreatedAt           time.Time              `json:"created_at"`
	TotalRevisionsCount int                    `json:"total_revisions_count"`
	TotalRefundsCount   int                    `json:"total_refunds_count"`
	TotalRefundsAmount  float64                `json:"total_refunds_amount"`
	RecentJobs          []CollaboratorJob      `json:"recent_jobs"`
	RecentRevisions     []CollaboratorRevision `json:"recent_revisions"`
}

// CollaboratorJob represents a job assigned to a collaborator
type CollaboratorJob struct {
	ID            string    `json:"id"`
	StudentName   string    `json:"student_name"`
	ServiceName   string    `json:"service_name"`
	Status        string    `json:"status"`
	PaymentStatus string    `json:"payment_status"`
	TotalValue    float64   `json:"total_value"`
	CollabValue   float64   `json:"collab_value"`
	DueDate       time.Time `json:"due_date"`
	CreatedAt     time.Time `json:"created_at"`
}

// CollaboratorRevision represents a revision requested for a collaborator's job
type CollaboratorRevision struct {
	ID          string    `json:"id"`
	OrderID     string    `json:"order_id"`
	StudentName string    `json:"student_name"`
	Reason      string    `json:"reason"`
	CreatedAt   time.Time `json:"created_at"`
}

// ComplaintItem represents an order with revision or rejected status
type ComplaintItem struct {
	ID              string    `json:"id"`
	StudentName     string    `json:"student_name"`
	StudentEmail    string    `json:"student_email"`
	CollaboratorName string   `json:"collaborator_name"`
	ServiceName     string    `json:"service_name"`
	Status          string    `json:"status"`
	TotalValue      float64   `json:"total_value"`
	DueDate         time.Time `json:"due_date"`
	RevisionCount   int       `json:"revision_count"`
	LatestReason    *string   `json:"latest_reason"`
	LatestRevisionAt *time.Time `json:"latest_revision_at"`
}

// RefundItem represents a refunded transaction
type RefundItem struct {
	ID              string    `json:"id"`
	OrderID         string    `json:"order_id"`
	StudentName     string    `json:"student_name"`
	CollaboratorName string   `json:"collaborator_name"`
	Amount          float64   `json:"amount"`
	RefundedAt      time.Time `json:"refunded_at"`
}

// RefundReport represents refund summary with list
type RefundReport struct {
	TotalRefunded float64      `json:"total_refunded"`
	TotalCount    int          `json:"total_count"`
	Refunds       []RefundItem `json:"refunds"`
}

// WeeklyFinancial represents income vs payouts for a specific week
type WeeklyFinancial struct {
	Week    string  `json:"week"`     // Format: "2025-W01"
	Income  float64 `json:"income"`
	Payouts float64 `json:"payouts"`
	GMV     float64 `json:"gmv"`
}

// ReasonCount represents a revision reason with its count
type ReasonCount struct {
	Reason string `json:"reason"`
	Count  int    `json:"count"`
}

// RevisionSummary represents aggregated revision statistics
type RevisionSummary struct {
	TotalRevisions int           `json:"total_revisions"`
	AvgPerOrder    float64       `json:"avg_per_order"`
	ThisMonth      int           `json:"this_month"`
	LastMonth      int           `json:"last_month"`
	TopReasons     []ReasonCount `json:"top_reasons"`
}

// ActiveJob represents a job in progress for the admin view
type ActiveJob struct {
	ID               string    `json:"id"`
	StudentName      string    `json:"student_name"`
	CollaboratorName string    `json:"collaborator_name"`
	ServiceName      string    `json:"service_name"`
	Status           string    `json:"status"`
	PaymentStatus    string    `json:"payment_status"`
	DueDate          time.Time `json:"due_date"`
	DaysUntilDue     int       `json:"days_until_due"`
	TotalValue       float64   `json:"total_value"`
	CreatedAt        time.Time `json:"created_at"`
}

// ActiveJobsResponse represents paginated active jobs
type ActiveJobsResponse struct {
	Jobs       []ActiveJob `json:"jobs"`
	Total      int         `json:"total"`
	Page       int         `json:"page"`
	PageSize   int         `json:"page_size"`
	TotalPages int         `json:"total_pages"`
}

// AlertItem represents a single alert notification
type AlertItem struct {
	ID          string `json:"id"`
	Type        string `json:"type"`        // OVERDUE, DUE_TODAY, DUE_TOMORROW, COMPLAINT
	Title       string `json:"title"`
	Description string `json:"description"`
	Priority    string `json:"priority"`    // HIGH, MEDIUM, LOW
}

// AlertsResponse represents the alerts summary
type AlertsResponse struct {
	OverdueCount     int         `json:"overdue_count"`
	DueTodayCount    int         `json:"due_today_count"`
	DueTomorrowCount int         `json:"due_tomorrow_count"`
	ComplaintsCount  int         `json:"complaints_count"`
	TotalCount       int         `json:"total_count"`
	Items            []AlertItem `json:"items"`
}

// ProductivityStats represents aggregated productivity metrics
type ProductivityStats struct {
	TotalCollaborators  int     `json:"total_collaborators"`
	ActiveCollaborators int     `json:"active_collaborators"`
	AvgJobsPerCollab    float64 `json:"avg_jobs_per_collab"`
	AvgOnTimeDelivery   float64 `json:"avg_on_time_delivery"`
	TotalCompletedMonth int     `json:"total_completed_month"`
	AvgRating           float64 `json:"avg_rating"`
}

// RankingType represents the type of ranking
type RankingType string

const (
	RankingTypeProduction  RankingType = "production"   // Volume de producao
	RankingTypeRevenue     RankingType = "revenue"      // Faturamento total
	RankingTypePunctuality RankingType = "punctuality"  // Taxa de entrega no prazo
	RankingTypeSatisfaction RankingType = "satisfaction" // Media de avaliacoes
	RankingTypeQuality     RankingType = "quality"      // Nota interna
)

// RankingEntry represents a single entry in any ranking type
type RankingEntry struct {
	Position       int      `json:"position"`
	CollaboratorID string   `json:"collaborator_id"`
	Name           string   `json:"name"`
	Specialty      *string  `json:"specialty"`
	Value          float64  `json:"value"`          // The metric value (count, amount, percentage, rating)
	SecondaryValue *float64 `json:"secondary_value"` // Optional secondary metric
	Trend          string   `json:"trend"`          // UP, DOWN, STABLE (compared to last period)
}

// RankingResponse represents a complete ranking response
type RankingResponse struct {
	Type        RankingType    `json:"type"`
	Title       string         `json:"title"`
	Description string         `json:"description"`
	Unit        string         `json:"unit"`         // e.g., "trabalhos", "R$", "%", "estrelas"
	Entries     []RankingEntry `json:"entries"`
	UpdatedAt   time.Time      `json:"updated_at"`
}

// FullRankingResponse contains all 5 ranking types
type FullRankingResponse struct {
	Production   *RankingResponse `json:"production"`
	Revenue      *RankingResponse `json:"revenue"`
	Punctuality  *RankingResponse `json:"punctuality"`
	Satisfaction *RankingResponse `json:"satisfaction"`
	Quality      *RankingResponse `json:"quality"`
}

// UpdateCollaboratorRequest represents the request body for updating a collaborator
type UpdateCollaboratorRequest struct {
	Specialty       *string  `json:"specialty"`
	PixKey          *string  `json:"pix_key"`
	InternalRanking *float64 `json:"internal_ranking"`
}

// CreateCollaboratorRequest represents the request body for creating a new collaborator
type CreateCollaboratorRequest struct {
	Name            string   `json:"name"`
	Email           string   `json:"email"`
	Password        string   `json:"password"`
	Specialty       *string  `json:"specialty"`
	PixKey          *string  `json:"pix_key"`
	InternalRanking *float64 `json:"internal_ranking"`
}

// CollaboratorEarningPeriod represents earnings for a specific period
type CollaboratorEarningPeriod struct {
	Period   string  `json:"period"` // Format: "2025-01" or "2025-W01"
	Earned   float64 `json:"earned"`
	Refunded float64 `json:"refunded"`
	Jobs     int     `json:"jobs"`
}

// CollaboratorsListResponse represents paginated collaborators list
type CollaboratorsListResponse struct {
	Collaborators []CollaboratorSummary `json:"collaborators"`
	Total         int                   `json:"total"`
	Page          int                   `json:"page"`
	PageSize      int                   `json:"page_size"`
	TotalPages    int                   `json:"total_pages"`
}

// CollaboratorRevisionsResponse represents paginated revisions
type CollaboratorRevisionsResponse struct {
	Revisions  []CollaboratorRevision `json:"revisions"`
	Total      int                    `json:"total"`
	Page       int                    `json:"page"`
	PageSize   int                    `json:"page_size"`
	TotalPages int                    `json:"total_pages"`
}

// ComplaintWithSplit extends ComplaintItem with split values and priority
type ComplaintWithSplit struct {
	ID               string     `json:"id"`
	StudentName      string     `json:"student_name"`
	StudentEmail     string     `json:"student_email"`
	CollaboratorID   string     `json:"collaborator_id"`
	CollaboratorName string     `json:"collaborator_name"`
	ServiceName      string     `json:"service_name"`
	Status           string     `json:"status"`
	TotalValue       float64    `json:"total_value"`
	CollabValue      float64    `json:"collab_value"`
	CompanyValue     float64    `json:"company_value"`
	DueDate          time.Time  `json:"due_date"`
	RevisionCount    int        `json:"revision_count"`
	LatestReason     *string    `json:"latest_reason"`
	LatestRevisionAt *time.Time `json:"latest_revision_at"`
	DaysPending      int        `json:"days_pending"`
	Priority         string     `json:"priority"` // HIGH, MEDIUM, LOW
}

// ComplaintsListResponse represents paginated complaints with stats
type ComplaintsListResponse struct {
	Complaints []ComplaintWithSplit `json:"complaints"`
	Stats      ComplaintStats       `json:"stats"`
	Total      int                  `json:"total"`
	Page       int                  `json:"page"`
	PageSize   int                  `json:"page_size"`
	TotalPages int                  `json:"total_pages"`
}

// ComplaintStats represents aggregated complaint statistics
type ComplaintStats struct {
	TotalAguardandoRevisao int     `json:"total_aguardando_revisao"`
	TotalNaoAprovado       int     `json:"total_nao_aprovado"`
	TotalComplaints        int     `json:"total_complaints"`
	AvgDaysPending         float64 `json:"avg_days_pending"`
	ResolvedThisMonth      int     `json:"resolved_this_month"`
	ResolvedLastMonth      int     `json:"resolved_last_month"`
}

// JobHistoryEntry represents a single status change in job history
type JobHistoryEntry struct {
	ID             string    `json:"id"`
	PreviousStatus *string   `json:"previous_status"`
	NewStatus      string    `json:"new_status"`
	Comments       *string   `json:"comments"`
	ChangedByID    string    `json:"changed_by_id"`
	ChangedByName  string    `json:"changed_by_name"`
	ChangedByRole  string    `json:"changed_by_role"`
	CreatedAt      time.Time `json:"created_at"`
}

// UpdateJobStatusRequest represents the request body for updating a job's status
type UpdateJobStatusRequest struct {
	Status   string  `json:"status"`   // EM_ANDAMENTO, APROVADO, AGUARDANDO_REVISAO, NAO_APROVADO
	Comments *string `json:"comments"` // Optional reason for status change
}

// RankingPosition represents a collaborator's position in a specific ranking
type RankingPosition struct {
	Position int     `json:"position"` // 1-based position
	Value    float64 `json:"value"`    // The metric value
	Total    int     `json:"total"`    // Total participants in this ranking
}

// CollaboratorRankingPositions represents a collaborator's positions in all 5 rankings
type CollaboratorRankingPositions struct {
	CollaboratorID string           `json:"collaborator_id"`
	Production     *RankingPosition `json:"production"`
	Revenue        *RankingPosition `json:"revenue"`
	Punctuality    *RankingPosition `json:"punctuality"`
	Satisfaction   *RankingPosition `json:"satisfaction"`
	Quality        *RankingPosition `json:"quality"`
}

// CollaboratorDelinquent represents a delinquent student served by a collaborator
type CollaboratorDelinquent struct {
	StudentID     string    `json:"student_id"`
	StudentName   string    `json:"student_name"`
	StudentEmail  string    `json:"student_email"`
	TotalOwed     float64   `json:"total_owed"`
	DaysOverdue   int       `json:"days_overdue"`
	OverdueOrders int       `json:"overdue_orders"`
	OldestDueDate time.Time `json:"oldest_due_date"`
}

// CollaboratorDelinquentsResponse represents delinquent students for a collaborator
type CollaboratorDelinquentsResponse struct {
	Delinquents []CollaboratorDelinquent `json:"delinquents"`
	TotalCount  int                      `json:"total_count"`
	TotalOwed   float64                  `json:"total_owed"`
}

// CollaboratorForSelection represents a collaborator for dropdown/selection
type CollaboratorForSelection struct {
	ID        string  `json:"id"`
	Name      string  `json:"name"`
	Specialty *string `json:"specialty"`
	AvgRating float64 `json:"avg_rating"`
}

// StatusBreakdown represents count and amount by status
type StatusBreakdown struct {
	Count  int     `json:"count"`
	Amount float64 `json:"amount"`
}

// PendingFinancialsReport represents pending financial summary with breakdown
type PendingFinancialsReport struct {
	TotalPendingCount  int                        `json:"total_pending_count"`
	TotalPendingAmount float64                    `json:"total_pending_amount"`
	ByPaymentStatus    map[string]StatusBreakdown `json:"by_payment_status"`
	ByOrderStatus      map[string]StatusBreakdown `json:"by_order_status"`
}

// DelinquencyHistoryEntry represents a single period of delinquency
type DelinquencyHistoryEntry struct {
	ID                  string     `json:"id"`
	UserID              string     `json:"user_id"`
	StartedAt           time.Time  `json:"started_at"`
	EndedAt             *time.Time `json:"ended_at"`              // NULL if still delinquent
	TotalOwedAtStart    float64    `json:"total_owed_at_start"`
	TotalOwedAtEnd      *float64   `json:"total_owed_at_end"`
	TriggeringOrderIDs  []string   `json:"triggering_order_ids"`
	ResolutionType      *string    `json:"resolution_type"`       // PAID, CANCELLED, ADMIN_OVERRIDE
	Notes               *string    `json:"notes"`
	DurationDays        int        `json:"duration_days"`         // Calculated field
	CreatedAt           time.Time  `json:"created_at"`
}

// DelinquencyHistoryResponse represents the full delinquency history for a user
type DelinquencyHistoryResponse struct {
	UserID              string                    `json:"user_id"`
	UserName            string                    `json:"user_name"`
	UserEmail           string                    `json:"user_email"`
	IsCurrentlyDelinquent bool                    `json:"is_currently_delinquent"`
	TotalPeriods        int                       `json:"total_periods"`
	TotalDaysDelinquent int                       `json:"total_days_delinquent"`
	History             []DelinquencyHistoryEntry `json:"history"`
}

// DelinquencyResolutionType represents the resolution type constants
type DelinquencyResolutionType string

const (
	ResolutionTypePaid          DelinquencyResolutionType = "PAID"
	ResolutionTypeCancelled     DelinquencyResolutionType = "CANCELLED"
	ResolutionTypeAdminOverride DelinquencyResolutionType = "ADMIN_OVERRIDE"
)

// DelinquentUserWithHistory extends DelinquentUser with history count
type DelinquentUserWithHistory struct {
	DelinquentUser
	CPF              *string `json:"cpf"`
	Phone            *string `json:"phone"`
	PreviousPeriods  int     `json:"previous_periods"`   // Number of past delinquency periods
	TotalDaysEver    int     `json:"total_days_ever"`    // Total days ever delinquent
}

// PendingWithdrawalsSummary represents aggregated payout summary by status
type PendingWithdrawalsSummary struct {
	PendingCount    int     `json:"pending_count"`
	PendingAmount   float64 `json:"pending_amount"`
	ApprovedCount   int     `json:"approved_count"`
	ApprovedAmount  float64 `json:"approved_amount"`
	ProcessingCount int     `json:"processing_count"`
	ProcessingAmount float64 `json:"processing_amount"`
}

// OpenChargesSummary represents aggregated charge summary by status
type OpenChargesSummary struct {
	PendingCount    int     `json:"pending_count"`
	PendingAmount   float64 `json:"pending_amount"`
	OverdueCount    int     `json:"overdue_count"`
	OverdueAmount   float64 `json:"overdue_amount"`
	ConfirmedCount  int     `json:"confirmed_count"`
	ConfirmedAmount float64 `json:"confirmed_amount"`
	TotalOpenCount  int     `json:"total_open_count"`
	TotalOpenAmount float64 `json:"total_open_amount"`
}
