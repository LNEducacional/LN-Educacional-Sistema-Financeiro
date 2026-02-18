package ranking

import (
	"context"
	"errors"
)

var (
	ErrInvalidCriteria = errors.New("invalid ranking criteria")
	ErrInvalidPeriod   = errors.New("invalid ranking period")
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// GetRanking returns the ranking for a given criteria and period
func (s *Service) GetRanking(ctx context.Context, criteria RankingCriteria, period RankingPeriod, userID string) (*RankingResponse, error) {
	// Validate criteria
	if !isValidCriteria(criteria) {
		return nil, ErrInvalidCriteria
	}

	// Validate period
	if !isValidPeriod(period) {
		return nil, ErrInvalidPeriod
	}

	var entries []RankingEntry
	var err error

	switch criteria {
	case CriteriaProductivity:
		entries, err = s.repo.GetProductivityRanking(ctx, period, userID)
	case CriteriaRevenue:
		entries, err = s.repo.GetRevenueRanking(ctx, period, userID)
	case CriteriaPunctuality:
		entries, err = s.repo.GetPunctualityRanking(ctx, period, userID)
	case CriteriaSatisfaction:
		entries, err = s.repo.GetSatisfactionRanking(ctx, period, userID)
	case CriteriaQuality:
		entries, err = s.repo.GetQualityRanking(ctx, period, userID)
	default:
		return nil, ErrInvalidCriteria
	}

	if err != nil {
		return nil, err
	}

	// Separate top 10 from current user
	var topTen []RankingEntry
	var currentUser *RankingEntry

	for i := range entries {
		if entries[i].Position <= 10 {
			topTen = append(topTen, entries[i])
		}
		if entries[i].CollaboratorID == userID && entries[i].Position > 10 {
			entry := entries[i]
			currentUser = &entry
		}
	}

	totalUsers, _ := s.repo.CountCollaborators(ctx)

	return &RankingResponse{
		Criteria:    criteria,
		Period:      period,
		TopTen:      topTen,
		CurrentUser: currentUser,
		TotalUsers:  totalUsers,
	}, nil
}

// CreateRating creates a new rating for an order
func (s *Service) CreateRating(ctx context.Context, input CreateRatingInput) (*Rating, error) {
	return s.repo.CreateRating(ctx, input)
}

// GetRatingByOrderID returns the rating for a specific order
func (s *Service) GetRatingByOrderID(ctx context.Context, orderID string) (*Rating, error) {
	return s.repo.GetRatingByOrderID(ctx, orderID)
}

// GetRankingSummary returns the user's position across all 5 criteria for this_month period
func (s *Service) GetRankingSummary(ctx context.Context, userID string) (*RankingSummaryResponse, error) {
	allCriteria := []RankingCriteria{
		CriteriaProductivity,
		CriteriaRevenue,
		CriteriaPunctuality,
		CriteriaSatisfaction,
		CriteriaQuality,
	}

	totalUsers, _ := s.repo.CountCollaborators(ctx)

	var entries []RankingSummaryEntry
	for _, criteria := range allCriteria {
		var rankingEntries []RankingEntry
		var err error

		switch criteria {
		case CriteriaProductivity:
			rankingEntries, err = s.repo.GetProductivityRanking(ctx, PeriodThisMonth, userID)
		case CriteriaRevenue:
			rankingEntries, err = s.repo.GetRevenueRanking(ctx, PeriodThisMonth, userID)
		case CriteriaPunctuality:
			rankingEntries, err = s.repo.GetPunctualityRanking(ctx, PeriodThisMonth, userID)
		case CriteriaSatisfaction:
			rankingEntries, err = s.repo.GetSatisfactionRanking(ctx, PeriodThisMonth, userID)
		case CriteriaQuality:
			rankingEntries, err = s.repo.GetQualityRanking(ctx, PeriodThisMonth, userID)
		}

		if err != nil {
			// If one criteria fails, add zero entry rather than failing entire summary
			entries = append(entries, RankingSummaryEntry{
				Criteria:   criteria,
				Position:   0,
				Value:      0,
				TotalUsers: totalUsers,
			})
			continue
		}

		// Find user's entry in results
		found := false
		for _, e := range rankingEntries {
			if e.CollaboratorID == userID {
				entries = append(entries, RankingSummaryEntry{
					Criteria:    criteria,
					Position:    e.Position,
					Value:       e.Value,
					TotalUsers:  totalUsers,
					OrdersCount: e.OrdersCount,
				})
				found = true
				break
			}
		}
		if !found {
			entries = append(entries, RankingSummaryEntry{
				Criteria:   criteria,
				Position:   0,
				Value:      0,
				TotalUsers: totalUsers,
			})
		}
	}

	return &RankingSummaryResponse{Entries: entries}, nil
}

func isValidCriteria(c RankingCriteria) bool {
	switch c {
	case CriteriaProductivity, CriteriaRevenue, CriteriaPunctuality, CriteriaSatisfaction, CriteriaQuality:
		return true
	}
	return false
}

func isValidPeriod(p RankingPeriod) bool {
	switch p {
	case PeriodThisMonth, PeriodAllTime:
		return true
	}
	return false
}
