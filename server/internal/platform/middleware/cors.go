package middleware

import (
	"net/http"
	"strings"
)

// CORSConfig holds CORS middleware configuration
type CORSConfig struct {
	// AllowedOrigins is a list of origins that are allowed to make requests
	// Use "*" only for development - never in production
	AllowedOrigins []string

	// AllowCredentials indicates whether the request can include user credentials
	AllowCredentials bool

	// MaxAge indicates how long (in seconds) the results of a preflight request can be cached
	MaxAge string
}

// DefaultCORSConfig returns a secure default CORS configuration
func DefaultCORSConfig() *CORSConfig {
	return &CORSConfig{
		AllowedOrigins:   []string{"http://localhost:8082"},
		AllowCredentials: true,
		MaxAge:           "86400", // 24 hours
	}
}

// CORSMiddleware creates a CORS middleware with the given configuration
func CORSMiddleware(config *CORSConfig) func(http.Handler) http.Handler {
	// Pre-compute origin lookup map for O(1) access
	originMap := make(map[string]bool)
	allowAll := false
	for _, origin := range config.AllowedOrigins {
		if origin == "*" {
			allowAll = true
			break
		}
		// Normalize origin (remove trailing slash)
		origin = strings.TrimSuffix(origin, "/")
		originMap[origin] = true
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")

			// Check if origin is allowed
			var allowedOrigin string
			if allowAll {
				// In development mode with "*", echo back the origin
				if origin != "" {
					allowedOrigin = origin
				} else {
					allowedOrigin = "*"
				}
			} else if origin != "" {
				// Normalize origin for comparison
				normalizedOrigin := strings.TrimSuffix(origin, "/")
				if originMap[normalizedOrigin] {
					allowedOrigin = origin
				}
			}

			// Always add Vary header for proper caching
			w.Header().Add("Vary", "Origin")

			// Handle preflight requests
			if r.Method == http.MethodOptions {
				// Set CORS headers for preflight
				if allowedOrigin != "" {
					w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)

					if config.AllowCredentials && allowedOrigin != "*" {
						w.Header().Set("Access-Control-Allow-Credentials", "true")
					}
				}

				// Allowed methods
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")

				// Allowed headers
				w.Header().Set("Access-Control-Allow-Headers", "Accept, Authorization, Content-Type, X-Request-ID")

				// Exposed headers
				w.Header().Set("Access-Control-Expose-Headers", "X-Request-ID")

				// Cache preflight response
				if config.MaxAge != "" {
					w.Header().Set("Access-Control-Max-Age", config.MaxAge)
				}

				w.WriteHeader(http.StatusNoContent)
				return
			}

			// Set CORS headers for actual requests
			if allowedOrigin != "" {
				w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)

				if config.AllowCredentials && allowedOrigin != "*" {
					w.Header().Set("Access-Control-Allow-Credentials", "true")
				}
			}

			next.ServeHTTP(w, r)
		})
	}
}

// ParseAllowedOrigins parses a comma-separated string of origins
func ParseAllowedOrigins(originsStr string) []string {
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
