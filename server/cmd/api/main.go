package main

import (
	"context"
	"encoding/json"
	"financial-system/internal/config"
	"financial-system/internal/modules/admin"
	"financial-system/internal/modules/collaborator"
	"financial-system/internal/modules/disputes"
	"financial-system/internal/modules/finance"
	"financial-system/internal/modules/notifications"
	"financial-system/internal/modules/orders"
	"financial-system/internal/modules/payment"
	"financial-system/internal/modules/production"
	"financial-system/internal/modules/ranking"
	"financial-system/internal/modules/services"
	"financial-system/internal/modules/settings"
	"financial-system/internal/modules/users"
	"financial-system/internal/platform"
	"financial-system/internal/platform/email"
	"financial-system/internal/platform/events"
	"financial-system/internal/platform/middleware"
	asaaspkg "financial-system/internal/platform/payment"
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5"
)

// UserInfoAdapter adapta o users.Repository para orders.UserInfoProvider
type UserInfoAdapter struct {
	userRepo *users.Repository
}

// GetUserEmailAndName implementa orders.UserInfoProvider
func (a *UserInfoAdapter) GetUserEmailAndName(ctx context.Context, userID string) (string, string, error) {
	user, err := a.userRepo.GetByID(ctx, userID)
	if err != nil {
		return "", "", err
	}
	return user.Email, user.Name, nil
}

// OrderRepoAdapter adapta orders.Repository para payment.OrderRepositoryForRefund
// Evita dependencia circular entre orders e payment
type OrderRepoAdapter struct {
	orderRepo *orders.Repository
}

// GetByIDForRefund implementa payment.OrderRepositoryForRefund
func (a *OrderRepoAdapter) GetByIDForRefund(ctx context.Context, tx pgx.Tx, id string) (*payment.OrderForRefund, error) {
	orderData, err := a.orderRepo.GetByIDForRefund(ctx, tx, id)
	if err != nil {
		return nil, err
	}
	return &payment.OrderForRefund{
		ID:             orderData.ID,
		CollaboratorID: orderData.CollaboratorID,
		CollabValue:    orderData.CollabValue,
		PaymentStatus:  orderData.PaymentStatus,
	}, nil
}

// UpdatePaymentStatusForRefund implementa payment.OrderRepositoryForRefund
func (a *OrderRepoAdapter) UpdatePaymentStatusForRefund(ctx context.Context, tx pgx.Tx, id string, status string) error {
	return a.orderRepo.UpdatePaymentStatusForRefund(ctx, tx, id, status)
}

func main() {
	cfg := config.Load()
	db := platform.NewDatabase(cfg.DBUrl)
	defer db.Close()

	r := chi.NewRouter()
	r.Use(chiMiddleware.Logger)
	r.Use(chiMiddleware.Recoverer)

	// CORS middleware with secure configuration
	corsConfig := &middleware.CORSConfig{
		AllowedOrigins:   cfg.CORSAllowedOrigins,
		AllowCredentials: cfg.CORSAllowCredentials,
		MaxAge:           "86400", // 24 hours
	}
	r.Use(middleware.CORSMiddleware(corsConfig))
	log.Printf("CORS configured for origins: %v", cfg.CORSAllowedOrigins)

	// Public routes
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})


	// Users module
	userRepo := users.NewRepository(db)
	tokenRepo := users.NewTokenRepository(db)
	userService := users.NewService(userRepo, tokenRepo, cfg.JWTSecret, cfg.AccessTokenDuration, cfg.RefreshTokenDuration)

	// Configure email service for password reset
	emailConfig := &email.Config{
		Host:     cfg.SMTPHost,
		Port:     cfg.SMTPPort,
		Username: cfg.SMTPUsername,
		Password: cfg.SMTPPassword,
		From:     cfg.SMTPFrom,
		FromName: cfg.SMTPFromName,
	}
	emailService := email.NewService(emailConfig)
	if emailService.IsConfigured() {
		userService.SetEmailService(emailService, cfg.AppBaseURL)
		log.Println("Email service configured for password reset")
	} else {
		log.Println("Warning: Email service not configured - password reset will be unavailable")
	}

	userHandler := users.NewHandler(userService)
	userHandler.RegisterRoutes(r)

	// Start refresh token cleanup worker (runs every hour)
	go func() {
		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()
		for range ticker.C {
			count, err := tokenRepo.DeleteExpired(context.Background())
			if err != nil {
				log.Printf("Error cleaning expired refresh tokens: %v", err)
			} else if count > 0 {
				log.Printf("Cleaned up %d expired refresh tokens", count)
			}
		}
	}()

	// Initialize shared repositories
	serviceRepo := services.NewRepository(db)
	financeRepo := finance.NewRepository(db)
	orderRepo := orders.NewRepository(db)

	// Initialize services
	// Initialize settings module early (needed by services and orders)
	settingsRepo := settings.NewRepository(db, cfg.JWTSecret)
	settingsService := settings.NewService(settingsRepo)

	serviceService := services.NewService(serviceRepo, settingsService)
	orderService := orders.NewService(db, orderRepo, serviceRepo, financeRepo, settingsService)

	// Initialize admin reports module
	adminRepo := admin.NewRepository(db)
	adminService := admin.NewService(adminRepo)

	// Initialize ranking module
	rankingRepo := ranking.NewRepository(db)
	rankingService := ranking.NewService(rankingRepo)
	rankingHandler := ranking.NewHandler(rankingService)

	// Initialize event dispatcher
	eventDispatcher := events.NewDispatcher()

	// Configure event dispatcher on orders service
	orderService.SetEventDispatcher(eventDispatcher)

	// Initialize notifications module
	notificationsRepo := notifications.NewRepository(db)
	notificationsService := notifications.NewServiceLayer(notificationsRepo)
	notificationsHandler := notifications.NewHandler(notificationsService)

	// Register notifications service as event handler for all event types
	eventDispatcher.Subscribe(events.EventOrderCreated, notificationsService)
	eventDispatcher.Subscribe(events.EventOrderStatusChanged, notificationsService)
	eventDispatcher.Subscribe(events.EventDeliveryUploaded, notificationsService)
	eventDispatcher.Subscribe(events.EventPaymentReleased, notificationsService)
	eventDispatcher.Subscribe(events.EventDisputeOpened, notificationsService)
	eventDispatcher.Subscribe(events.EventDisputeCommentAdded, notificationsService)
	eventDispatcher.Subscribe(events.EventDisputeResolved, notificationsService)
	eventDispatcher.Subscribe(events.EventEvidenceUploaded, notificationsService)

	// Initialize disputes module
	disputesRepo := disputes.NewRepository(db)
	disputesService := disputes.NewServiceLayer(disputesRepo, eventDispatcher)
	disputesHandler := disputes.NewHandler(disputesService)

	// Initialize dispute payment handler (processes dispute resolutions)
	disputePaymentHandler := disputes.NewDisputePaymentHandler(db, disputesRepo, orderRepo, financeRepo)
	eventDispatcher.Subscribe(events.EventDisputeResolved, disputePaymentHandler)

	// Initialize production module
	productionRepo := production.NewRepository(db)
	// Wrap userRepo to adapt to production.UserRepository interface
	productionUserRepo := &production.SimpleUserRepo{
		GetByIDFunc: func(ctx context.Context, id string) (bool, error) {
			user, err := userRepo.GetByID(ctx, id)
			if err != nil {
				return false, err
			}
			return user.IsDelinquent, nil
		},
	}
	productionService := production.NewService(productionRepo, financeRepo, productionUserRepo, db)
	productionHandler := production.NewHandler(productionService)

	// Initialize settings handler (settingsRepo and settingsService initialized earlier)
	settingsHandler := settings.NewHandler(settingsService)

	// Load ASAAS config from database (with fallback to env vars)
	dbAPIKey, dbWebhookToken, dbSandbox, err := settingsService.GetAsaasConfig(context.Background())
	if err != nil {
		log.Printf("Warning: Failed to load ASAAS config from database: %v", err)
		dbSandbox = true // Default sandbox se falhar
	}

	// Use database config if available, otherwise fall back to environment variables
	asaasAPIKey := dbAPIKey
	asaasWebhookToken := dbWebhookToken
	if asaasAPIKey == "" {
		asaasAPIKey = cfg.AsaasAPIKey
	}
	if asaasWebhookToken == "" {
		asaasWebhookToken = cfg.AsaasWebhookToken
	}

	// Initialize ASAAS payment gateway client with hot reload support
	asaasClientManager := asaaspkg.NewAsaasClientManager(asaaspkg.AsaasConfig{
		APIKey:       asaasAPIKey,
		APIURL:       settings.AsaasURLForMode(dbSandbox),
		Sandbox:      dbSandbox,
		WebhookToken: asaasWebhookToken,
	})

	// Connect settings service to ASAAS client manager for hot reload
	settingsService.SetAsaasRefresher(asaasClientManager)

	// Initialize payment module
	paymentRepo := payment.NewRepository(db)
	// Usar NewServiceWithDB para ter acesso ao banco e orderRepo (necessario para processar reembolsos)
	// OrderRepoAdapter converte orders.Repository para payment.OrderRepositoryForRefund
	orderRepoAdapter := &OrderRepoAdapter{orderRepo: orderRepo}
	paymentService := payment.NewServiceWithDB(db, paymentRepo, asaasClientManager, financeRepo, orderRepoAdapter, cfg)
	paymentHandler := payment.NewHandler(paymentService)
	paymentWebhookHandler := payment.NewWebhookHandler(paymentService, asaasClientManager.GetWebhookToken())

	// Log ASAAS configuration status
	if asaasClientManager.IsConfigured() {
		if dbSandbox {
			log.Println("ASAAS payment gateway configured (sandbox mode)")
		} else {
			log.Println("ASAAS payment gateway configured (production mode)")
		}
	} else {
		log.Println("Warning: ASAAS payment gateway NOT configured - configure via /admin/settings")
	}

	// Configure payment service on orders service
	userInfoAdapter := &UserInfoAdapter{userRepo: userRepo}
	orderService.SetPaymentService(paymentService, userInfoAdapter)

	// Register ASAAS webhook route (public, validated by token header)
	paymentWebhookHandler.RegisterPublicRoutes(r)

	// Start delinquency checker worker (runs daily at low-traffic hours)
	go func() {
		// Run once at startup
		result, err := adminService.RunDelinquencyCheck(context.Background())
		if err != nil {
			log.Printf("Initial delinquency check error: %v", err)
		} else {
			log.Printf("Initial delinquency check: %d checked, %d new delinquents, %d cleared",
				result.Checked, result.NewDelinquents, result.Cleared)
		}

		// Then run every 24 hours
		ticker := time.NewTicker(24 * time.Hour)
		defer ticker.Stop()
		for range ticker.C {
			result, err := adminService.RunDelinquencyCheck(context.Background())
			if err != nil {
				log.Printf("Delinquency check error: %v", err)
			} else if result.NewDelinquents > 0 || result.Cleared > 0 {
				log.Printf("Delinquency check: %d new delinquents, %d cleared",
					result.NewDelinquents, result.Cleared)
			}
		}
	}()

	// Start overdue orders worker
	go func() {
		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()
		for range ticker.C {
			count, err := orderService.MarkOverdue(context.Background())
			if err != nil {
				log.Printf("Error marking overdue orders: %v", err)
			} else if count > 0 {
				log.Printf("Marked %d orders as overdue", count)
			}
		}
	}()

	// Start payout processing worker (runs every 5 minutes)
	go func() {
		if !paymentService.IsConfigured() {
			log.Println("Payout worker not started - payment gateway not configured")
			return
		}

		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()

		// Run once at startup
		count, err := paymentService.ProcessPendingPayouts(context.Background())
		if err != nil {
			log.Printf("Initial payout processing error: %v", err)
		} else if count > 0 {
			log.Printf("Processed %d pending payouts on startup", count)
		}

		for range ticker.C {
			count, err := paymentService.ProcessPendingPayouts(context.Background())
			if err != nil {
				log.Printf("Payout processing error: %v", err)
			} else if count > 0 {
				log.Printf("Processed %d pending payouts", count)
			}
		}
	}()

	// Protected routes
	r.Group(func(r chi.Router) {
		r.Use(middleware.AuthMiddleware(cfg.JWTSecret))

		// Auth logout routes (require authentication)
		userHandler.RegisterProtectedRoutes(r)

		r.Get("/protected", func(w http.ResponseWriter, r *http.Request) {
			userID := r.Context().Value(middleware.UserIDKey).(string)
			userRole := r.Context().Value(middleware.UserRoleKey).(string)
			w.Write([]byte("Welcome to the protected area, user " + userID + " with role " + userRole))
		})

		// Orders module (authenticated users)
		orderHandler := orders.NewHandler(orderService)
		r.Route("/api/orders", orderHandler.RegisterRoutes)

		// Public services list (for students to create orders)
		r.Get("/api/services", func(w http.ResponseWriter, r *http.Request) {
			services, err := serviceService.ListActive(r.Context())
			if err != nil {
				http.Error(w, "Failed to fetch services", http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(services)
		})

		// Public collaborators list (for students to create orders)
		r.Get("/api/collaborators", func(w http.ResponseWriter, r *http.Request) {
			collaborators, err := adminService.ListCollaboratorsForSelection(r.Context())
			if err != nil {
				http.Error(w, "Failed to fetch collaborators", http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(collaborators)
		})

		// Ranking module (all authenticated users can view)
		r.Route("/api/ranking", rankingHandler.RegisterRoutes)

		// Notifications module (all authenticated users)
		r.Route("/api/notifications", notificationsHandler.RegisterRoutes)

		// Disputes module (all authenticated users)
		r.Route("/api/disputes", disputesHandler.RegisterRoutes)

		// Production module (all authenticated users)
		r.Route("/api/production", productionHandler.RegisterRoutes)

		// Payment module (authenticated users - charges and withdrawals)
		r.Route("/api/payment", paymentHandler.RegisterRoutes)

		// ADMIN only routes
		r.Group(func(r chi.Router) {
			r.Use(middleware.RoleGuard("ADMIN"))
			r.Get("/admin/only", func(w http.ResponseWriter, r *http.Request) {
				w.Write([]byte("Welcome to the admin area"))
			})

			// Settings module (Admin only)
			r.Route("/admin/settings", settingsHandler.RegisterRoutes)
		})

		// ADMIN + FINANCEIRO routes (financial access)
		r.Group(func(r chi.Router) {
			r.Use(middleware.RoleGuard("ADMIN", "FINANCEIRO"))

			// Services module (Admin + Financeiro)
			serviceHandler := services.NewHandler(serviceService)
			r.Route("/admin/services", serviceHandler.RegisterRoutes)

			// Admin Reports module
			adminHandler := admin.NewHandler(adminService)
			r.Route("/admin/reports", adminHandler.RegisterRoutes)

			// Collaborators management (view delinquents)
			r.Route("/admin/collaborators", adminHandler.RegisterCollaboratorRoutes)

			// Withdrawals management (approve/reject)
			r.Route("/admin/withdrawals", paymentHandler.RegisterAdminRoutes)
		})

		// Collaborator routes (COLLABORATOR only)
		r.Group(func(r chi.Router) {
			r.Use(middleware.RoleGuard("COLLABORATOR"))
			collabHandler := collaborator.NewHandler(db, financeRepo, orderRepo)
			r.Route("/api/collaborator", collabHandler.RegisterRoutes)
		})
	})

	log.Println("Server starting on port 8080")
	if err := http.ListenAndServe(":8080", r); err != nil {
		log.Fatalf("could not start server: %v", err)
	}
}
