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
		w.Header().Add("Vary", "Origin")
		if origin != "" && isOriginAllowed(origin, allowedOrigins) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Expose-Headers", compressionExposeHeaders)
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
		if allowed == origin {
			return true
		}
		if suffix, ok := strings.CutPrefix(allowed, "https://*."); ok {
			host, hostOK := strings.CutPrefix(origin, "https://")
			if hostOK && strings.HasSuffix(host, "."+suffix) &&
				!strings.Contains(strings.TrimSuffix(host, "."+suffix), ".") {
				return true
			}
		}
	}
	return false
}
