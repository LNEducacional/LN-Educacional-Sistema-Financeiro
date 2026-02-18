package production

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"financial-system/internal/modules/finance"
)

// validTransitions defines the state machine for production job status
var validTransitions = map[ProductionJobStatus][]ProductionJobStatus{
	StatusNovo:                {StatusEmAndamento},
	StatusEmAndamento:         {StatusAguardandoRevisao},
	StatusAguardandoRevisao:   {StatusEnviadoVisualizacao},
	StatusEnviadoVisualizacao: {StatusAguardandoAprovacao},
	StatusAguardandoAprovacao: {StatusAprovado, StatusNaoAprovado},
	StatusNaoAprovado:         {StatusEmAndamento}, // Allows rework cycle
	StatusAprovado:            {StatusConcluido},
	StatusConcluido:           {}, // Final state
}

// UserRepository interface for user operations needed by production service
type UserRepository interface {
	GetByID(ctx context.Context, id string) (UserInfo, error)
}

// UserInfo represents the user data needed for delinquency check
type UserInfo struct {
	ID           string
	IsDelinquent bool
}

// UserRepoAdapter adapts users.Repository to UserRepository interface
type UserRepoAdapter struct {
	repo interface {
		GetByID(ctx context.Context, id string) (interface{ GetDelinquent() bool }, error)
	}
}

// SimpleUserRepo is a simple implementation that wraps users.Repository
type SimpleUserRepo struct {
	GetByIDFunc func(ctx context.Context, id string) (bool, error)
}

func (r *SimpleUserRepo) GetByID(ctx context.Context, id string) (UserInfo, error) {
	isDelinquent, err := r.GetByIDFunc(ctx, id)
	if err != nil {
		return UserInfo{}, err
	}
	return UserInfo{ID: id, IsDelinquent: isDelinquent}, nil
}

// Service handles production job business logic
type Service struct {
	repo        *Repository
	financeRepo *finance.Repository
	userRepo    UserRepository
	db          *pgxpool.Pool
}

// NewService creates a new production service
func NewService(repo *Repository, financeRepo *finance.Repository, userRepo UserRepository, db *pgxpool.Pool) *Service {
	return &Service{
		repo:        repo,
		financeRepo: financeRepo,
		userRepo:    userRepo,
		db:          db,
	}
}

// ChangeStatusInput contains the data needed to change a job status
type ChangeStatusInput struct {
	JobID     string
	NewStatus ProductionJobStatus
	UserID    string
	Comment   *string
}

// ChangeStatus transitions a job to a new status following workflow rules
func (s *Service) ChangeStatus(ctx context.Context, input ChangeStatusInput) error {
	// Get current job state
	job, err := s.repo.GetByID(ctx, input.JobID)
	if err != nil {
		return fmt.Errorf("get job: %w", err)
	}

	// Idempotency: if already at target status, return success
	if job.Status == input.NewStatus {
		return nil
	}

	// Validate transition is allowed
	if !isValidTransition(job.Status, input.NewStatus) {
		return fmt.Errorf("%w: cannot transition from %s to %s", ErrInvalidTransition, job.Status, input.NewStatus)
	}

	// Validate NAO_APROVADO requires comment
	if input.NewStatus == StatusNaoAprovado && (input.Comment == nil || *input.Comment == "") {
		return ErrCommentRequired
	}

	// Idempotency: if APROVADO and already has financial transaction, reject
	if input.NewStatus == StatusAprovado && job.FinancialTransactionID != nil {
		return ErrAlreadyProcessed
	}

	// Start transaction
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Lock the job row for update
	job, err = s.repo.GetByIDTx(ctx, tx, input.JobID)
	if err != nil {
		return fmt.Errorf("lock job: %w", err)
	}

	// Double-check status after lock (in case of concurrent update)
	if job.Status == input.NewStatus {
		return nil
	}

	// Update job status
	if err := s.repo.UpdateStatusTx(ctx, tx, input.JobID, input.NewStatus); err != nil {
		return fmt.Errorf("update status: %w", err)
	}

	// Trigger financial action on APROVADO
	if input.NewStatus == StatusAprovado {
		if err := s.triggerFinancialOnApproval(ctx, tx, job); err != nil {
			return fmt.Errorf("financial trigger: %w", err)
		}
	}

	// Trigger financial release on CONCLUIDO
	if input.NewStatus == StatusConcluido {
		if err := s.triggerFinancialOnCompletion(ctx, tx, job); err != nil {
			return fmt.Errorf("financial completion: %w", err)
		}
	}

	// Create history record
	history := &JobHistory{
		JobID:           input.JobID,
		PreviousStatus:  &job.Status,
		NewStatus:       input.NewStatus,
		ChangedByUserID: input.UserID,
		Comments:        input.Comment,
	}
	if err := s.repo.CreateHistoryTx(ctx, tx, history); err != nil {
		return fmt.Errorf("create history: %w", err)
	}

	// Commit transaction
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit transaction: %w", err)
	}

	return nil
}

// triggerFinancialOnApproval creates a locked balance entry when job is approved
func (s *Service) triggerFinancialOnApproval(ctx context.Context, tx pgx.Tx, job *ProductionJob) error {
	if job.CollaboratorID == nil {
		return ErrNoCollaboratorAssigned
	}

	// Get collaborator's wallet
	wallet, err := s.financeRepo.GetWalletByUserIDTx(ctx, tx, *job.CollaboratorID)
	if err != nil {
		return fmt.Errorf("get wallet: %w", err)
	}

	// Credit locked balance
	if err := s.financeRepo.CreditLocked(ctx, tx, *job.CollaboratorID, job.Price); err != nil {
		return fmt.Errorf("credit locked: %w", err)
	}

	// Create transaction record
	description := fmt.Sprintf("Production Job: %s", job.Title)
	txInput := finance.CreateTransactionInput{
		WalletID:    wallet.ID,
		OrderID:     nil, // Production jobs don't use order_id
		Amount:      job.Price,
		Type:        finance.TxTypeCredit,
		Status:      finance.TxStatusLocked,
		Description: &description,
	}
	txn, err := s.financeRepo.CreateTransaction(ctx, tx, txInput)
	if err != nil {
		return fmt.Errorf("create transaction: %w", err)
	}

	// Link transaction to job
	if err := s.repo.SetFinancialTransactionIDTx(ctx, tx, job.ID, txn.ID); err != nil {
		return fmt.Errorf("set financial tx id: %w", err)
	}

	return nil
}

// triggerFinancialOnCompletion releases locked balance when job is completed
func (s *Service) triggerFinancialOnCompletion(ctx context.Context, tx pgx.Tx, job *ProductionJob) error {
	if job.CollaboratorID == nil {
		return ErrNoCollaboratorAssigned
	}

	if job.FinancialTransactionID == nil {
		return ErrInsufficientData
	}

	// Release locked balance to available
	if err := s.financeRepo.ReleaseLocked(ctx, tx, *job.CollaboratorID, job.Price); err != nil {
		return fmt.Errorf("release locked: %w", err)
	}

	// Update transaction status
	if err := s.financeRepo.UpdateTransactionStatus(ctx, tx, *job.FinancialTransactionID, finance.TxStatusReleased); err != nil {
		return fmt.Errorf("update tx status: %w", err)
	}

	return nil
}

// CreateJob creates a new production job
func (s *Service) CreateJob(ctx context.Context, job *ProductionJob) error {
	job.Status = StatusNovo
	if err := s.repo.Create(ctx, job); err != nil {
		return fmt.Errorf("create job: %w", err)
	}

	// Create initial history record
	history := &JobHistory{
		JobID:           job.ID,
		PreviousStatus:  nil,
		NewStatus:       StatusNovo,
		ChangedByUserID: job.StudentID,
		Comments:        nil,
	}
	if err := s.repo.CreateHistory(ctx, history); err != nil {
		return fmt.Errorf("create initial history: %w", err)
	}

	return nil
}

// GetJob retrieves a job by ID
func (s *Service) GetJob(ctx context.Context, id string) (*ProductionJob, error) {
	return s.repo.GetByID(ctx, id)
}

// ListJobs retrieves jobs with optional filters
func (s *Service) ListJobs(ctx context.Context, filters ListFilters) ([]ProductionJob, error) {
	if filters.Limit == 0 {
		filters.Limit = 50
	}
	return s.repo.List(ctx, filters)
}

// ListJobsByStudent retrieves all jobs for a student
func (s *Service) ListJobsByStudent(ctx context.Context, studentID string) ([]ProductionJob, error) {
	return s.repo.ListByStudentID(ctx, studentID)
}

// ListJobsByCollaborator retrieves all jobs for a collaborator
func (s *Service) ListJobsByCollaborator(ctx context.Context, collaboratorID string) ([]ProductionJob, error) {
	return s.repo.ListByCollaboratorID(ctx, collaboratorID)
}

// GetJobHistory retrieves the history of a job
func (s *Service) GetJobHistory(ctx context.Context, jobID string) ([]JobHistory, error) {
	return s.repo.GetHistoryByJobID(ctx, jobID)
}

// AssignCollaborator assigns a collaborator to a job
func (s *Service) AssignCollaborator(ctx context.Context, jobID, collaboratorID, userID string) error {
	job, err := s.repo.GetByID(ctx, jobID)
	if err != nil {
		return err
	}

	if job.Status != StatusNovo {
		return fmt.Errorf("%w: can only assign collaborator to NOVO jobs", ErrInvalidTransition)
	}

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	if err := s.repo.AssignCollaboratorTx(ctx, tx, jobID, collaboratorID); err != nil {
		return fmt.Errorf("assign collaborator: %w", err)
	}

	// Create history record
	comment := fmt.Sprintf("Collaborator assigned: %s", collaboratorID)
	history := &JobHistory{
		JobID:           jobID,
		PreviousStatus:  &job.Status,
		NewStatus:       job.Status,
		ChangedByUserID: userID,
		Comments:        &comment,
	}
	if err := s.repo.CreateHistoryTx(ctx, tx, history); err != nil {
		return fmt.Errorf("create history: %w", err)
	}

	return tx.Commit(ctx)
}

// CollaboratorRankingResult contains ranking metrics for a collaborator
type CollaboratorRankingResult struct {
	CollaboratorID string  `json:"collaborator_id"`
	JobsCompleted  int     `json:"jobs_completed"`
	Delays         int     `json:"delays"`
	Complaints     int     `json:"complaints"`
	Score          float64 `json:"score"`
}

// GetCollaboratorRanking calculates ranking score for a collaborator
// Formula: Score = (Jobs Completed) - (Delays × Weight) - (Complaints)
func (s *Service) GetCollaboratorRanking(ctx context.Context, collaboratorID string) (*CollaboratorRankingResult, error) {
	const delayWeight = 2.0

	// Count completed jobs
	completed, err := s.repo.CountByCollaboratorAndStatus(ctx, collaboratorID, StatusConcluido)
	if err != nil {
		return nil, fmt.Errorf("count completed: %w", err)
	}

	// Count delayed deliveries
	delays, err := s.repo.CountDelayedDeliveries(ctx, collaboratorID)
	if err != nil {
		return nil, fmt.Errorf("count delays: %w", err)
	}

	// Count complaints (NAO_APROVADO jobs)
	complaints, err := s.repo.CountByCollaboratorAndStatus(ctx, collaboratorID, StatusNaoAprovado)
	if err != nil {
		return nil, fmt.Errorf("count complaints: %w", err)
	}

	score := float64(completed) - (float64(delays) * delayWeight) - float64(complaints)

	return &CollaboratorRankingResult{
		CollaboratorID: collaboratorID,
		JobsCompleted:  completed,
		Delays:         delays,
		Complaints:     complaints,
		Score:          score,
	}, nil
}

// CheckStudentDelinquency checks if a student is delinquent
func (s *Service) CheckStudentDelinquency(ctx context.Context, studentID string) (bool, error) {
	if s.userRepo == nil {
		return false, ErrInsufficientData
	}

	user, err := s.userRepo.GetByID(ctx, studentID)
	if err != nil {
		return false, fmt.Errorf("get user: %w", err)
	}

	return user.IsDelinquent, nil
}

// GetDelayedJobs retrieves all jobs past their deadline
func (s *Service) GetDelayedJobs(ctx context.Context) ([]ProductionJob, error) {
	return s.repo.GetDelayedJobs(ctx)
}

// isValidTransition checks if a status transition is allowed
func isValidTransition(from, to ProductionJobStatus) bool {
	allowed, exists := validTransitions[from]
	if !exists {
		return false
	}
	for _, status := range allowed {
		if status == to {
			return true
		}
	}
	return false
}
