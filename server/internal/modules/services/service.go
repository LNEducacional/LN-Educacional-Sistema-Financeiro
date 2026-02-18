package services

import (
	"context"
	"errors"
	"fmt"

	"financial-system/internal/modules/settings"
)

var (
	ErrInvalidSplit    = errors.New("company_percent + collaborator_percent must equal 100")
	ErrServiceNotFound = errors.New("service not found")
	ErrInvalidName     = errors.New("name is required")
	ErrInvalidValue    = errors.New("total_value must be positive")
	ErrBelowMinCharge  = errors.New("valor abaixo do minimo para cobranca")
)

type ServiceLayer struct {
	repo            *Repository
	settingsService *settings.Service
}

func NewService(repo *Repository, settingsService *settings.Service) *ServiceLayer {
	return &ServiceLayer{repo: repo, settingsService: settingsService}
}

type CreateServiceRequest struct {
	Name                string      `json:"name"`
	Area                ServiceArea `json:"area"`
	WorkType            *string     `json:"work_type"`
	TotalValue          float64     `json:"total_value"`
	CompanyPercent      int         `json:"company_percent"`
	CollaboratorPercent int         `json:"collaborator_percent"`
}

type UpdateServiceRequest struct {
	Name                string      `json:"name"`
	Area                ServiceArea `json:"area"`
	WorkType            *string     `json:"work_type"`
	TotalValue          float64     `json:"total_value"`
	CompanyPercent      int         `json:"company_percent"`
	CollaboratorPercent int         `json:"collaborator_percent"`
}

func (s *ServiceLayer) Create(ctx context.Context, req *CreateServiceRequest) (*Service, error) {
	if req.Name == "" {
		return nil, ErrInvalidName
	}
	if req.TotalValue < 0 {
		return nil, ErrInvalidValue
	}
	if req.CompanyPercent+req.CollaboratorPercent != 100 {
		return nil, ErrInvalidSplit
	}

	if err := s.validateChargeMinAmount(ctx, req.TotalValue); err != nil {
		return nil, err
	}

	service := &Service{
		Name:                req.Name,
		Area:                req.Area,
		WorkType:            req.WorkType,
		TotalValue:          req.TotalValue,
		CompanyPercent:      req.CompanyPercent,
		CollaboratorPercent: req.CollaboratorPercent,
		Active:              true,
	}

	err := s.repo.Create(ctx, service)
	if err != nil {
		return nil, err
	}

	return service, nil
}

func (s *ServiceLayer) List(ctx context.Context) ([]Service, error) {
	services, err := s.repo.List(ctx)
	if err != nil {
		return nil, err
	}
	if services == nil {
		return []Service{}, nil
	}
	return services, nil
}

func (s *ServiceLayer) GetByID(ctx context.Context, id string) (*Service, error) {
	service, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, ErrServiceNotFound
	}
	return service, nil
}

func (s *ServiceLayer) Update(ctx context.Context, id string, req *UpdateServiceRequest) (*Service, error) {
	if req.Name == "" {
		return nil, ErrInvalidName
	}
	if req.TotalValue < 0 {
		return nil, ErrInvalidValue
	}
	if req.CompanyPercent+req.CollaboratorPercent != 100 {
		return nil, ErrInvalidSplit
	}

	if err := s.validateChargeMinAmount(ctx, req.TotalValue); err != nil {
		return nil, err
	}

	service, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, ErrServiceNotFound
	}

	service.Name = req.Name
	service.Area = req.Area
	service.WorkType = req.WorkType
	service.TotalValue = req.TotalValue
	service.CompanyPercent = req.CompanyPercent
	service.CollaboratorPercent = req.CollaboratorPercent

	err = s.repo.Update(ctx, service)
	if err != nil {
		return nil, err
	}

	return service, nil
}

func (s *ServiceLayer) Delete(ctx context.Context, id string) error {
	_, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return ErrServiceNotFound
	}
	return s.repo.Delete(ctx, id)
}

func (s *ServiceLayer) ListPaginated(ctx context.Context, page, pageSize int, search, area string, includeInactive bool) (*ServicesListResponse, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	return s.repo.ListPaginated(ctx, page, pageSize, search, area, includeInactive)
}

func (s *ServiceLayer) GetStats(ctx context.Context) (*ServiceStats, error) {
	return s.repo.GetStats(ctx)
}

func (s *ServiceLayer) ToggleActive(ctx context.Context, id string) (*Service, error) {
	_, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, ErrServiceNotFound
	}
	return s.repo.ToggleActive(ctx, id)
}

// ListActive returns only active services (for public/student access)
func (s *ServiceLayer) ListActive(ctx context.Context) ([]Service, error) {
	return s.List(ctx)
}

// validateChargeMinAmount valida se o valor total atende ao minimo de cobranca configurado
func (s *ServiceLayer) validateChargeMinAmount(ctx context.Context, totalValue float64) error {
	if s.settingsService == nil {
		return nil
	}
	minAmount, err := s.settingsService.GetChargeMinAmount(ctx)
	if err != nil {
		return fmt.Errorf("erro ao buscar valor minimo de cobranca: %w", err)
	}
	if totalValue < minAmount {
		return fmt.Errorf("%w: valor minimo para cobranca e R$ %.2f", ErrBelowMinCharge, minAmount)
	}
	return nil
}
