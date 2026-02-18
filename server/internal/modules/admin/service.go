package admin

import (
	"context"
	"fmt"
	"time"

	"golang.org/x/crypto/bcrypt"
)

const (
	// DefaultGracePeriodDays is the default number of days after due date
	// before a user is marked as delinquent
	DefaultGracePeriodDays = 7
	// DefaultMonthsForChart is the default number of months for financial chart
	DefaultMonthsForChart = 6
)

type Service struct {
	repo            *Repository
	gracePeriodDays int
}

func NewService(repo *Repository) *Service {
	return &Service{
		repo:            repo,
		gracePeriodDays: DefaultGracePeriodDays,
	}
}

// now returns the current time (can be overridden for testing)
func (s *Service) now() time.Time {
	return time.Now()
}

// SetGracePeriod configures the grace period for delinquency checks
func (s *Service) SetGracePeriod(days int) {
	if days >= 0 {
		s.gracePeriodDays = days
	}
}

// GetFinancialKPIs returns the key financial performance indicators
func (s *Service) GetFinancialKPIs(ctx context.Context) (*FinancialKPIs, error) {
	return s.repo.GetFinancialKPIs(ctx)
}

// GetMonthlyFinancials returns income vs payouts for the last N months
func (s *Service) GetMonthlyFinancials(ctx context.Context, months int) ([]MonthlyFinancial, error) {
	if months <= 0 {
		months = DefaultMonthsForChart
	}
	if months > 24 {
		months = 24 // Cap at 2 years
	}
	return s.repo.GetMonthlyFinancials(ctx, months)
}

// GetDelinquentUsers returns all users currently marked as delinquent
func (s *Service) GetDelinquentUsers(ctx context.Context) ([]DelinquentUser, error) {
	return s.repo.GetDelinquentUsers(ctx)
}

// RunDelinquencyCheck executes the delinquency worker logic
// Scans all orders and marks/clears delinquent status based on grace period
func (s *Service) RunDelinquencyCheck(ctx context.Context) (*DelinquencyCheckResult, error) {
	return s.repo.CheckAndMarkDelinquents(ctx, s.gracePeriodDays)
}

// StreamDelinquentUsersCSV streams delinquent users for CSV export
func (s *Service) StreamDelinquentUsersCSV(ctx context.Context, fn func(DelinquentUser) error) error {
	return s.repo.StreamDelinquentUsersCSV(ctx, fn)
}

// GetDelinquencyConfig returns the current delinquency configuration
func (s *Service) GetDelinquencyConfig() DelinquencyConfig {
	return DelinquencyConfig{
		GracePeriodDays: s.gracePeriodDays,
	}
}

// ListCollaborators returns all collaborators with their metrics
func (s *Service) ListCollaborators(ctx context.Context) ([]CollaboratorSummary, error) {
	collaborators, err := s.repo.ListCollaborators(ctx)
	if err != nil {
		return nil, err
	}
	if collaborators == nil {
		return []CollaboratorSummary{}, nil
	}
	return collaborators, nil
}

// GetCollaboratorByID returns detailed info for a single collaborator
func (s *Service) GetCollaboratorByID(ctx context.Context, id string) (*CollaboratorDetail, error) {
	return s.repo.GetCollaboratorByID(ctx, id)
}

// GetComplaints returns orders with revisions or rejected status
func (s *Service) GetComplaints(ctx context.Context) ([]ComplaintItem, error) {
	complaints, err := s.repo.GetComplaints(ctx)
	if err != nil {
		return nil, err
	}
	if complaints == nil {
		return []ComplaintItem{}, nil
	}
	return complaints, nil
}

// GetRefunds returns refund report with summary and list
func (s *Service) GetRefunds(ctx context.Context) (*RefundReport, error) {
	return s.repo.GetRefunds(ctx)
}

// GetWeeklyFinancials returns income vs payouts for the last N weeks
func (s *Service) GetWeeklyFinancials(ctx context.Context, weeks int) ([]WeeklyFinancial, error) {
	if weeks <= 0 {
		weeks = 8 // Default to 8 weeks
	}
	if weeks > 52 {
		weeks = 52 // Cap at 1 year
	}
	return s.repo.GetWeeklyFinancials(ctx, weeks)
}

// GetRevisionSummary returns aggregated revision statistics
func (s *Service) GetRevisionSummary(ctx context.Context) (*RevisionSummary, error) {
	return s.repo.GetRevisionSummary(ctx)
}

// GetActiveJobs returns paginated list of active jobs with optional filters and sorting
func (s *Service) GetActiveJobs(ctx context.Context, page, pageSize int, status, collaboratorID, sortBy, sortDir string) (*ActiveJobsResponse, error) {
	return s.repo.GetActiveJobs(ctx, page, pageSize, status, collaboratorID, sortBy, sortDir)
}

// GetAlerts returns alert items for overdue, due today, due tomorrow and complaints
func (s *Service) GetAlerts(ctx context.Context) (*AlertsResponse, error) {
	return s.repo.GetAlerts(ctx)
}

// GetProductivityStats returns aggregated productivity metrics
func (s *Service) GetProductivityStats(ctx context.Context) (*ProductivityStats, error) {
	return s.repo.GetProductivityStats(ctx)
}

// GetRanking returns a specific ranking type
func (s *Service) GetRanking(ctx context.Context, rankingType RankingType, limit int) (*RankingResponse, error) {
	if limit <= 0 {
		limit = 10
	}
	if limit > 50 {
		limit = 50
	}

	var entries []RankingEntry
	var err error
	var title, description, unit string

	switch rankingType {
	case RankingTypeProduction:
		entries, err = s.repo.GetRankingByProduction(ctx, limit)
		title = "Ranking de Producao"
		description = "Colaboradores com mais trabalhos concluidos"
		unit = "trabalhos"
	case RankingTypeRevenue:
		entries, err = s.repo.GetRankingByRevenue(ctx, limit)
		title = "Ranking de Faturamento"
		description = "Colaboradores com maior faturamento total"
		unit = "R$"
	case RankingTypePunctuality:
		entries, err = s.repo.GetRankingByPunctuality(ctx, limit)
		title = "Ranking de Pontualidade"
		description = "Colaboradores com melhor taxa de entrega no prazo"
		unit = "%"
	case RankingTypeSatisfaction:
		entries, err = s.repo.GetRankingBySatisfaction(ctx, limit)
		title = "Ranking de Satisfacao"
		description = "Colaboradores com melhores avaliacoes"
		unit = "estrelas"
	case RankingTypeQuality:
		entries, err = s.repo.GetRankingByQuality(ctx, limit)
		title = "Ranking de Qualidade"
		description = "Colaboradores com melhor nota interna"
		unit = "nota"
	default:
		entries, err = s.repo.GetRankingByProduction(ctx, limit)
		title = "Ranking de Producao"
		description = "Colaboradores com mais trabalhos concluidos"
		unit = "trabalhos"
	}

	if err != nil {
		return nil, err
	}

	return &RankingResponse{
		Type:        rankingType,
		Title:       title,
		Description: description,
		Unit:        unit,
		Entries:     entries,
		UpdatedAt:   s.now(),
	}, nil
}

// GetFullRanking returns all 5 ranking types in a single response
func (s *Service) GetFullRanking(ctx context.Context, limit int) (*FullRankingResponse, error) {
	if limit <= 0 {
		limit = 10
	}

	production, err := s.GetRanking(ctx, RankingTypeProduction, limit)
	if err != nil {
		return nil, err
	}

	revenue, err := s.GetRanking(ctx, RankingTypeRevenue, limit)
	if err != nil {
		return nil, err
	}

	punctuality, err := s.GetRanking(ctx, RankingTypePunctuality, limit)
	if err != nil {
		return nil, err
	}

	satisfaction, err := s.GetRanking(ctx, RankingTypeSatisfaction, limit)
	if err != nil {
		return nil, err
	}

	quality, err := s.GetRanking(ctx, RankingTypeQuality, limit)
	if err != nil {
		return nil, err
	}

	return &FullRankingResponse{
		Production:   production,
		Revenue:      revenue,
		Punctuality:  punctuality,
		Satisfaction: satisfaction,
		Quality:      quality,
	}, nil
}

// UpdateCollaborator updates a collaborator's profile
func (s *Service) UpdateCollaborator(ctx context.Context, collabID string, req *UpdateCollaboratorRequest) error {
	return s.repo.UpdateCollaborator(ctx, collabID, req)
}

// CreateCollaborator creates a new collaborator with hashed password
func (s *Service) CreateCollaborator(ctx context.Context, req *CreateCollaboratorRequest) (string, error) {
	// Validate required fields
	if req.Name == "" {
		return "", fmt.Errorf("name is required")
	}
	if req.Email == "" {
		return "", fmt.Errorf("email is required")
	}
	if req.Password == "" {
		return "", fmt.Errorf("password is required")
	}
	if len(req.Password) < 6 {
		return "", fmt.Errorf("password must be at least 6 characters")
	}

	// Check if email already exists
	exists, err := s.repo.EmailExists(ctx, req.Email)
	if err != nil {
		return "", fmt.Errorf("check email: %w", err)
	}
	if exists {
		return "", fmt.Errorf("email already registered")
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("hash password: %w", err)
	}

	// Validate internal_ranking if provided
	if req.InternalRanking != nil && (*req.InternalRanking < 0 || *req.InternalRanking > 5) {
		return "", fmt.Errorf("internal_ranking must be between 0 and 5")
	}

	return s.repo.CreateCollaborator(ctx, req.Name, req.Email, string(hashedPassword), req.Specialty, req.PixKey, req.InternalRanking)
}

// ListCollaboratorsPaginated returns paginated list of collaborators with optional filters
func (s *Service) ListCollaboratorsPaginated(ctx context.Context, page, pageSize int, specialty string, minRating float64) (*CollaboratorsListResponse, error) {
	return s.repo.ListCollaboratorsPaginated(ctx, page, pageSize, specialty, minRating)
}

// GetCollaboratorEarnings returns earnings grouped by period for a collaborator
func (s *Service) GetCollaboratorEarnings(ctx context.Context, collabID string, months int) ([]CollaboratorEarningPeriod, error) {
	if months <= 0 {
		months = 6
	}
	if months > 24 {
		months = 24
	}
	return s.repo.GetCollaboratorEarningsPeriodic(ctx, collabID, months)
}

// GetCollaboratorRevisions returns paginated revisions for a collaborator
func (s *Service) GetCollaboratorRevisions(ctx context.Context, collabID string, page, pageSize int) (*CollaboratorRevisionsResponse, error) {
	return s.repo.GetCollaboratorRevisionsPaginated(ctx, collabID, page, pageSize)
}

// GetComplaintsPaginated returns paginated complaints with split values and filters
func (s *Service) GetComplaintsPaginated(ctx context.Context, page, pageSize int, status, collaboratorID, search string) (*ComplaintsListResponse, error) {
	return s.repo.GetComplaintsPaginated(ctx, page, pageSize, status, collaboratorID, search)
}

// GetComplaintStats returns aggregated complaint statistics
func (s *Service) GetComplaintStats(ctx context.Context) (*ComplaintStats, error) {
	return s.repo.GetComplaintStats(ctx)
}

// GetJobHistory returns the complete status history for a job
func (s *Service) GetJobHistory(ctx context.Context, jobID string) ([]JobHistoryEntry, error) {
	history, err := s.repo.GetJobHistory(ctx, jobID)
	if err != nil {
		return nil, err
	}
	if history == nil {
		return []JobHistoryEntry{}, nil
	}
	return history, nil
}

// UpdateJobStatus changes the status of a job
func (s *Service) UpdateJobStatus(ctx context.Context, jobID, userID string, req *UpdateJobStatusRequest) error {
	// Validate status
	validStatuses := map[string]bool{
		"NOVO":                 true,
		"EM_ANDAMENTO":         true,
		"AGUARDANDO_REVISAO":   true,
		"ENVIADO_VISUALIZACAO": true,
		"AGUARDANDO_APROVACAO": true,
		"APROVADO":             true,
		"NAO_APROVADO":         true,
		"CONCLUIDO":            true,
	}

	if !validStatuses[req.Status] {
		return fmt.Errorf("invalid status: %s", req.Status)
	}

	return s.repo.UpdateJobStatus(ctx, jobID, userID, req)
}

// GetCollaboratorRankingPositions returns a collaborator's position in all 5 rankings
func (s *Service) GetCollaboratorRankingPositions(ctx context.Context, collabID string) (*CollaboratorRankingPositions, error) {
	return s.repo.GetCollaboratorRankingPositions(ctx, collabID)
}

// GetDelinquentsByCollaborator returns delinquent students who have orders with this collaborator
func (s *Service) GetDelinquentsByCollaborator(ctx context.Context, collabID string) (*CollaboratorDelinquentsResponse, error) {
	return s.repo.GetDelinquentsByCollaborator(ctx, collabID)
}

// ListCollaboratorsForSelection returns a simplified list of collaborators for dropdown selection
func (s *Service) ListCollaboratorsForSelection(ctx context.Context) ([]CollaboratorForSelection, error) {
	collaborators, err := s.repo.ListCollaboratorsForSelection(ctx)
	if err != nil {
		return nil, err
	}
	if collaborators == nil {
		return []CollaboratorForSelection{}, nil
	}
	return collaborators, nil
}

// GetPendingFinancials returns pending financial summary with breakdown by status
func (s *Service) GetPendingFinancials(ctx context.Context) (*PendingFinancialsReport, error) {
	return s.repo.GetPendingFinancials(ctx)
}

// GetDelinquencyHistory returns the complete delinquency history for a user
func (s *Service) GetDelinquencyHistory(ctx context.Context, userID string) (*DelinquencyHistoryResponse, error) {
	return s.repo.GetDelinquencyHistory(ctx, userID)
}

// StreamDelinquentUsersWithHistory streams delinquent users with CPF and history count for enhanced CSV export
func (s *Service) StreamDelinquentUsersWithHistory(ctx context.Context, fn func(DelinquentUserWithHistory) error) error {
	return s.repo.StreamDelinquentUsersWithHistory(ctx, fn)
}

// GetPendingWithdrawalsSummary returns aggregated payout summary by status
func (s *Service) GetPendingWithdrawalsSummary(ctx context.Context) (*PendingWithdrawalsSummary, error) {
	return s.repo.GetPendingWithdrawalsSummary(ctx)
}

// GetOpenChargesSummary returns aggregated charge summary by status
func (s *Service) GetOpenChargesSummary(ctx context.Context) (*OpenChargesSummary, error) {
	return s.repo.GetOpenChargesSummary(ctx)
}
