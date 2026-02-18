package config

import (
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

// parseOrigins parses a comma-separated list of allowed origins
func parseOrigins(originsStr string) []string {
	if originsStr == "" {
		return []string{}
	}

	origins := strings.Split(originsStr, ",")
	result := make([]string, 0, len(origins))

	for _, origin := range origins {
		origin = strings.TrimSpace(origin)
		if origin != "" {
			// Remove trailing slash for consistency
			origin = strings.TrimSuffix(origin, "/")
			result = append(result, origin)
		}
	}

	return result
}

type Config struct {
	DBUrl                string
	JWTSecret            string
	AccessTokenDuration  time.Duration
	RefreshTokenDuration time.Duration

	// CORS Configuration
	CORSAllowedOrigins []string
	CORSAllowCredentials bool

	// SMTP Email Configuration
	SMTPHost     string
	SMTPPort     string
	SMTPUsername string
	SMTPPassword string
	SMTPFrom     string
	SMTPFromName string
	AppBaseURL   string

	// ASAAS Payment Gateway
	AsaasAPIKey          string
	AsaasAPIURL          string
	AsaasSandbox         bool
	AsaasWebhookToken    string
	WithdrawalMinAmount  float64
	WithdrawalMaxAmount  float64
	WithdrawalDailyLimit float64
}

func Load() *Config {
	err := godotenv.Load("../.env")
	if err != nil {
		log.Println("No .env file found, using environment variables")
	}

	dbURL := os.Getenv("DB_URL")
	if dbURL == "" {
		log.Panic("DB_URL is not set")
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Panic("JWT_SECRET is not set")
	}

	accessDuration := 15 * time.Minute
	if d := os.Getenv("ACCESS_TOKEN_DURATION"); d != "" {
		if parsed, err := time.ParseDuration(d); err == nil {
			accessDuration = parsed
		}
	}

	refreshDuration := 7 * 24 * time.Hour
	if d := os.Getenv("REFRESH_TOKEN_DURATION"); d != "" {
		if parsed, err := time.ParseDuration(d); err == nil {
			refreshDuration = parsed
		}
	}

	// CORS Configuration
	corsAllowedOrigins := parseOrigins(os.Getenv("CORS_ALLOWED_ORIGINS"))
	if len(corsAllowedOrigins) == 0 {
		// Default to localhost in development
		corsAllowedOrigins = []string{"http://localhost:8082"}
		log.Println("Warning: CORS_ALLOWED_ORIGINS not set, defaulting to http://localhost:8082")
	}
	corsAllowCredentials := os.Getenv("CORS_ALLOW_CREDENTIALS") != "false"

	// ASAAS Configuration
	asaasAPIKey := os.Getenv("ASAAS_API_KEY")
	asaasSandbox := os.Getenv("ASAAS_SANDBOX") == "true"
	asaasWebhookToken := os.Getenv("ASAAS_WEBHOOK_TOKEN")

	// Determine ASAAS API URL based on sandbox mode
	asaasAPIURL := "https://api.asaas.com/v3"
	if asaasSandbox {
		asaasAPIURL = "https://sandbox.asaas.com/api/v3"
	}
	if customURL := os.Getenv("ASAAS_API_URL"); customURL != "" {
		asaasAPIURL = customURL
	}

	// Withdrawal limits with defaults
	withdrawalMinAmount := 50.0
	if v := os.Getenv("WITHDRAWAL_MIN_AMOUNT"); v != "" {
		if parsed, err := strconv.ParseFloat(v, 64); err == nil {
			withdrawalMinAmount = parsed
		}
	}

	withdrawalMaxAmount := 10000.0
	if v := os.Getenv("WITHDRAWAL_MAX_AMOUNT"); v != "" {
		if parsed, err := strconv.ParseFloat(v, 64); err == nil {
			withdrawalMaxAmount = parsed
		}
	}

	withdrawalDailyLimit := 50000.0
	if v := os.Getenv("WITHDRAWAL_DAILY_LIMIT"); v != "" {
		if parsed, err := strconv.ParseFloat(v, 64); err == nil {
			withdrawalDailyLimit = parsed
		}
	}

	if asaasAPIKey == "" {
		log.Println("Warning: ASAAS_API_KEY not set - payment features will be disabled")
	}

	// SMTP Configuration
	smtpHost := os.Getenv("SMTP_HOST")
	smtpPort := os.Getenv("SMTP_PORT")
	smtpUsername := os.Getenv("SMTP_USERNAME")
	smtpPassword := os.Getenv("SMTP_PASSWORD")
	smtpFrom := os.Getenv("SMTP_FROM")
	smtpFromName := os.Getenv("SMTP_FROM_NAME")
	appBaseURL := os.Getenv("APP_BASE_URL")

	if smtpHost == "" {
		log.Println("Warning: SMTP_HOST not set - email features will be disabled")
	}

	if appBaseURL == "" {
		appBaseURL = "http://localhost:8082"
	}

	return &Config{
		DBUrl:                dbURL,
		JWTSecret:            jwtSecret,
		AccessTokenDuration:  accessDuration,
		RefreshTokenDuration: refreshDuration,

		// CORS
		CORSAllowedOrigins:   corsAllowedOrigins,
		CORSAllowCredentials: corsAllowCredentials,

		// SMTP
		SMTPHost:     smtpHost,
		SMTPPort:     smtpPort,
		SMTPUsername: smtpUsername,
		SMTPPassword: smtpPassword,
		SMTPFrom:     smtpFrom,
		SMTPFromName: smtpFromName,
		AppBaseURL:   appBaseURL,

		// ASAAS
		AsaasAPIKey:          asaasAPIKey,
		AsaasAPIURL:          asaasAPIURL,
		AsaasSandbox:         asaasSandbox,
		AsaasWebhookToken:    asaasWebhookToken,
		WithdrawalMinAmount:  withdrawalMinAmount,
		WithdrawalMaxAmount:  withdrawalMaxAmount,
		WithdrawalDailyLimit: withdrawalDailyLimit,
	}
}
