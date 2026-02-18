package bureau

import (
	"context"
	"fmt"
)

// Service handles bureau integration logic
type Service struct {
	config *BureauConfig
	// repo   *Repository // Uncomment when repository is implemented
}

// NewService creates a new bureau service
func NewService(config *BureauConfig) *Service {
	return &Service{
		config: config,
	}
}

// IsEnabled returns whether bureau integration is enabled
func (s *Service) IsEnabled() bool {
	return s.config != nil && s.config.Enabled
}

// Submit submits a delinquent user to a credit bureau
// This is a placeholder for future implementation
func (s *Service) Submit(ctx context.Context, req *SubmissionRequest) (*SubmissionResponse, error) {
	if !s.IsEnabled() {
		return nil, fmt.Errorf("bureau integration is not enabled")
	}

	// TODO: Implement when Serasa/SPC contract is in place
	// 1. Validate user has CPF
	// 2. Check if already submitted
	// 3. Build API request
	// 4. Call bureau API
	// 5. Store submission record
	// 6. Return result

	return &SubmissionResponse{
		Success: false,
		Message: "Bureau integration not yet implemented",
	}, nil
}

// GetStats returns bureau submission statistics
// This is a placeholder for future implementation
func (s *Service) GetStats(ctx context.Context) (*BureauStats, error) {
	// TODO: Implement when repository is created
	return &BureauStats{
		TotalPending:   0,
		TotalSubmitted: 0,
		TotalConfirmed: 0,
		TotalFailed:    0,
		TotalAmount:    0,
	}, nil
}

// ProcessQueue processes pending bureau submissions
// This is a placeholder for future implementation
func (s *Service) ProcessQueue(ctx context.Context) (int, error) {
	if !s.IsEnabled() {
		return 0, nil
	}

	// TODO: Implement when repository is created
	// 1. Get pending submissions
	// 2. For each, call Submit
	// 3. Update status
	// 4. Return count processed

	return 0, nil
}

// ValidateForSubmission checks if a user is eligible for bureau submission
func (s *Service) ValidateForSubmission(cpf string, totalOwed float64, daysOverdue int) error {
	if cpf == "" {
		return fmt.Errorf("CPF is required for bureau submission")
	}

	if len(cpf) != 11 {
		return fmt.Errorf("invalid CPF format: must be 11 digits")
	}

	if s.config != nil {
		if totalOwed < s.config.MinAmountOwed {
			return fmt.Errorf("amount owed (%.2f) is below minimum (%.2f)", totalOwed, s.config.MinAmountOwed)
		}

		if daysOverdue < s.config.MinDaysOverdue {
			return fmt.Errorf("days overdue (%d) is below minimum (%d)", daysOverdue, s.config.MinDaysOverdue)
		}
	}

	return nil
}
