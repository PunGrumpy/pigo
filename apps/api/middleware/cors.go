package middleware

import (
	"net/http"
	"os"
	"strings"
)

const compressionExposeHeaders = "X-Original-Size, X-Compressed-Size, X-Elapsed-Ms, X-Output-Format, X-Width, X-Height"

func CORS(next http.Handler) http.Handler {
	allowedOrigins := parseAllowedOrigins()

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" && isOriginAllowed(origin, allowedOrigins) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Expose-Headers", compressionExposeHeaders)
			w.Header().Add("Vary", "Origin")
		}

		if r.Method == http.MethodOptions {
			if origin != "" && isOriginAllowed(origin, allowedOrigins) {
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
				w.Header().Set("Access-Control-Max-Age", "86400")
			}
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func parseAllowedOrigins() []string {
	raw := strings.TrimSpace(os.Getenv("CORS_ALLOWED_ORIGINS"))
	if raw == "" {
		return []string{
			"http://localhost:3000",
			"http://127.0.0.1:3000",
			"https://pigo-web.vercel.app",
		}
	}

	parts := strings.Split(raw, ",")
	origins := make([]string, 0, len(parts))
	for _, part := range parts {
		if origin := strings.TrimSpace(part); origin != "" {
			origins = append(origins, origin)
		}
	}
	return origins
}

func isOriginAllowed(origin string, allowedOrigins []string) bool {
	for _, allowed := range allowedOrigins {
		if origin == allowed {
			return true
		}
	}

	// Vercel preview deployments for the web app (e.g. pigo-web-git-main-user.vercel.app).
	if strings.HasPrefix(origin, "https://pigo-web") && strings.HasSuffix(origin, ".vercel.app") {
		return true
	}

	return false
}
