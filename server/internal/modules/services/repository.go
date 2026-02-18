package services

import (
	"context"
	"strconv"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(ctx context.Context, service *Service) error {
	query := `
		INSERT INTO services (name, area, work_type, total_value, company_percent, collaborator_percent, active)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at, updated_at
	`
	err := r.db.QueryRow(ctx, query,
		service.Name,
		service.Area,
		service.WorkType,
		service.TotalValue,
		service.CompanyPercent,
		service.CollaboratorPercent,
		true,
	).Scan(&service.ID, &service.CreatedAt, &service.UpdatedAt)
	return err
}

func (r *Repository) List(ctx context.Context) ([]Service, error) {
	query := `
		SELECT id, name, area, work_type, total_value, company_percent, collaborator_percent, active, created_at, updated_at
		FROM services
		WHERE active = true
		ORDER BY created_at DESC
	`
	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var services []Service
	for rows.Next() {
		var s Service
		err := rows.Scan(
			&s.ID, &s.Name, &s.Area, &s.WorkType, &s.TotalValue,
			&s.CompanyPercent, &s.CollaboratorPercent, &s.Active,
			&s.CreatedAt, &s.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		services = append(services, s)
	}
	return services, nil
}

func (r *Repository) GetByID(ctx context.Context, id string) (*Service, error) {
	query := `
		SELECT id, name, area, work_type, total_value, company_percent, collaborator_percent, active, created_at, updated_at
		FROM services
		WHERE id = $1
	`
	var s Service
	err := r.db.QueryRow(ctx, query, id).Scan(
		&s.ID, &s.Name, &s.Area, &s.WorkType, &s.TotalValue,
		&s.CompanyPercent, &s.CollaboratorPercent, &s.Active,
		&s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *Repository) Update(ctx context.Context, service *Service) error {
	query := `
		UPDATE services
		SET name = $1, area = $2, work_type = $3, total_value = $4,
		    company_percent = $5, collaborator_percent = $6, updated_at = NOW()
		WHERE id = $7
		RETURNING updated_at
	`
	err := r.db.QueryRow(ctx, query,
		service.Name,
		service.Area,
		service.WorkType,
		service.TotalValue,
		service.CompanyPercent,
		service.CollaboratorPercent,
		service.ID,
	).Scan(&service.UpdatedAt)
	return err
}

func (r *Repository) Delete(ctx context.Context, id string) error {
	query := `UPDATE services SET active = false, updated_at = NOW() WHERE id = $1`
	_, err := r.db.Exec(ctx, query, id)
	return err
}

func (r *Repository) ListPaginated(ctx context.Context, page, pageSize int, search, area string, includeInactive bool) (*ServicesListResponse, error) {
	offset := (page - 1) * pageSize

	// Build WHERE clause
	whereClause := "WHERE 1=1"
	args := []interface{}{}
	argIndex := 1

	if !includeInactive {
		whereClause += " AND s.active = true"
	}

	if search != "" {
		whereClause += " AND (s.name ILIKE $" + strconv.Itoa(argIndex) + " OR s.work_type ILIKE $" + strconv.Itoa(argIndex) + ")"
		args = append(args, "%"+search+"%")
		argIndex++
	}

	if area != "" {
		whereClause += " AND s.area = $" + strconv.Itoa(argIndex)
		args = append(args, area)
		argIndex++
	}

	// Count total
	countQuery := `SELECT COUNT(*) FROM services s ` + whereClause
	var total int
	err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, err
	}

	// Get services with usage count
	query := `
		SELECT s.id, s.name, s.area, s.work_type, s.total_value,
		       s.company_percent, s.collaborator_percent, s.active,
		       s.created_at, s.updated_at,
		       COALESCE(COUNT(o.id), 0) as orders_count
		FROM services s
		LEFT JOIN orders o ON o.service_id = s.id
		` + whereClause + `
		GROUP BY s.id
		ORDER BY s.created_at DESC
		LIMIT $` + strconv.Itoa(argIndex) + ` OFFSET $` + strconv.Itoa(argIndex+1)

	args = append(args, pageSize, offset)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var services []ServiceWithUsage
	for rows.Next() {
		var s ServiceWithUsage
		err := rows.Scan(
			&s.ID, &s.Name, &s.Area, &s.WorkType, &s.TotalValue,
			&s.CompanyPercent, &s.CollaboratorPercent, &s.Active,
			&s.CreatedAt, &s.UpdatedAt, &s.OrdersCount,
		)
		if err != nil {
			return nil, err
		}
		services = append(services, s)
	}

	if services == nil {
		services = []ServiceWithUsage{}
	}

	totalPages := (total + pageSize - 1) / pageSize

	return &ServicesListResponse{
		Services:   services,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	}, nil
}

func (r *Repository) GetStats(ctx context.Context) (*ServiceStats, error) {
	stats := &ServiceStats{}

	// Get counts and averages
	countQuery := `
		SELECT
			COUNT(*) FILTER (WHERE active = true) as total_active,
			COUNT(*) FILTER (WHERE active = false) as total_inactive,
			COALESCE(AVG(total_value) FILTER (WHERE active = true), 0) as avg_value,
			COALESCE(AVG(company_percent) FILTER (WHERE active = true), 0) as avg_company_pct,
			COALESCE(AVG(collaborator_percent) FILTER (WHERE active = true), 0) as avg_collab_pct
		FROM services
	`
	err := r.db.QueryRow(ctx, countQuery).Scan(
		&stats.TotalActive, &stats.TotalInactive,
		&stats.AvgValue, &stats.AvgCompanyPct, &stats.AvgCollabPct,
	)
	if err != nil {
		return nil, err
	}

	// Get total orders
	orderCountQuery := `SELECT COUNT(*) FROM orders`
	err = r.db.QueryRow(ctx, orderCountQuery).Scan(&stats.TotalOrders)
	if err != nil {
		return nil, err
	}

	// Get by area
	areaQuery := `
		SELECT area, COUNT(*) as count
		FROM services
		WHERE active = true
		GROUP BY area
		ORDER BY count DESC
	`
	areaRows, err := r.db.Query(ctx, areaQuery)
	if err != nil {
		return nil, err
	}
	defer areaRows.Close()

	for areaRows.Next() {
		var ac ServiceAreaCount
		err := areaRows.Scan(&ac.Area, &ac.Count)
		if err != nil {
			return nil, err
		}
		stats.ByArea = append(stats.ByArea, ac)
	}

	if stats.ByArea == nil {
		stats.ByArea = []ServiceAreaCount{}
	}

	// Get top used services
	topQuery := `
		SELECT s.id, s.name, COUNT(o.id) as orders_count, s.total_value
		FROM services s
		LEFT JOIN orders o ON o.service_id = s.id
		WHERE s.active = true
		GROUP BY s.id
		HAVING COUNT(o.id) > 0
		ORDER BY orders_count DESC
		LIMIT 5
	`
	topRows, err := r.db.Query(ctx, topQuery)
	if err != nil {
		return nil, err
	}
	defer topRows.Close()

	for topRows.Next() {
		var sr ServiceUsageRank
		err := topRows.Scan(&sr.ID, &sr.Name, &sr.OrdersCount, &sr.TotalValue)
		if err != nil {
			return nil, err
		}
		stats.TopUsed = append(stats.TopUsed, sr)
	}

	if stats.TopUsed == nil {
		stats.TopUsed = []ServiceUsageRank{}
	}

	return stats, nil
}

func (r *Repository) ToggleActive(ctx context.Context, id string) (*Service, error) {
	query := `
		UPDATE services
		SET active = NOT active, updated_at = NOW()
		WHERE id = $1
		RETURNING id, name, area, work_type, total_value, company_percent, collaborator_percent, active, created_at, updated_at
	`
	var s Service
	err := r.db.QueryRow(ctx, query, id).Scan(
		&s.ID, &s.Name, &s.Area, &s.WorkType, &s.TotalValue,
		&s.CompanyPercent, &s.CollaboratorPercent, &s.Active,
		&s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &s, nil
}
