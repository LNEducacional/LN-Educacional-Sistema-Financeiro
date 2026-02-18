package ranking

import "time"

type RankingCriteria string

const (
	CriteriaProductivity  RankingCriteria = "productivity"
	CriteriaRevenue       RankingCriteria = "revenue"
	CriteriaPunctuality   RankingCriteria = "punctuality"
	CriteriaSatisfaction  RankingCriteria = "satisfaction"
	CriteriaQuality       RankingCriteria = "quality"
)

type RankingPeriod string

const (
	PeriodThisMonth RankingPeriod = "this_month"
	PeriodAllTime   RankingPeriod = "all_time"
)

type RankingEntry struct {
	Position       int     `json:"position"`
	CollaboratorID string  `json:"collaborator_id"`
	Name           string  `json:"name"`
	AvatarURL      *string `json:"avatar_url,omitempty"`
	Value          float64 `json:"value"`
	OrdersCount    int     `json:"orders_count"`
}

type RankingResponse struct {
	Criteria    RankingCriteria `json:"criteria"`
	Period      RankingPeriod   `json:"period"`
	TopTen      []RankingEntry  `json:"top_ten"`
	CurrentUser *RankingEntry   `json:"current_user,omitempty"`
	TotalUsers  int             `json:"total_users"`
}

type Rating struct {
	ID             string    `json:"id"`
	OrderID        string    `json:"order_id"`
	StudentID      string    `json:"student_id"`
	CollaboratorID string    `json:"collaborator_id"`
	Score          int       `json:"score"`
	Comment        *string   `json:"comment,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
}

type CreateRatingInput struct {
	OrderID        string
	StudentID      string
	CollaboratorID string
	Score          int
	Comment        *string
}

// RankingSummaryEntry holds user's position in a single criterion
type RankingSummaryEntry struct {
	Criteria    RankingCriteria `json:"criteria"`
	Position    int             `json:"position"`
	Value       float64         `json:"value"`
	TotalUsers  int             `json:"total_users"`
	OrdersCount int             `json:"orders_count"`
}

// RankingSummaryResponse holds user's positions across all 5 criteria
type RankingSummaryResponse struct {
	Entries []RankingSummaryEntry `json:"entries"`
}
