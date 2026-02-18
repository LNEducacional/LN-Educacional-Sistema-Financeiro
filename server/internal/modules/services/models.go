package services

import "time"

type ServiceArea string

const (
	AreaDireito       ServiceArea = "DIREITO"
	AreaPedagogia     ServiceArea = "PEDAGOGIA"
	AreaContabilidade ServiceArea = "CONTABILIDADE"
	AreaEnfermagem    ServiceArea = "ENFERMAGEM"
	AreaOutros        ServiceArea = "OUTROS"
)

type Service struct {
	ID                  string      `json:"id"`
	Name                string      `json:"name"`
	Area                ServiceArea `json:"area"`
	WorkType            *string     `json:"work_type"`
	TotalValue          float64     `json:"total_value"`
	CompanyPercent      int         `json:"company_percent"`
	CollaboratorPercent int         `json:"collaborator_percent"`
	Active              bool        `json:"active"`
	CreatedAt           time.Time   `json:"created_at"`
	UpdatedAt           time.Time   `json:"updated_at"`
}

type ServiceWithUsage struct {
	Service
	OrdersCount int `json:"orders_count"`
}

type ServicesListResponse struct {
	Services   []ServiceWithUsage `json:"services"`
	Total      int                `json:"total"`
	Page       int                `json:"page"`
	PageSize   int                `json:"page_size"`
	TotalPages int                `json:"total_pages"`
}

type ServiceStats struct {
	TotalActive     int                     `json:"total_active"`
	TotalInactive   int                     `json:"total_inactive"`
	AvgValue        float64                 `json:"avg_value"`
	AvgCompanyPct   float64                 `json:"avg_company_pct"`
	AvgCollabPct    float64                 `json:"avg_collab_pct"`
	TotalOrders     int                     `json:"total_orders"`
	ByArea          []ServiceAreaCount      `json:"by_area"`
	TopUsed         []ServiceUsageRank      `json:"top_used"`
}

type ServiceAreaCount struct {
	Area  ServiceArea `json:"area"`
	Count int         `json:"count"`
}

type ServiceUsageRank struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	OrdersCount int     `json:"orders_count"`
	TotalValue  float64 `json:"total_value"`
}
