package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestIsOriginAllowed(t *testing.T) {
	defaultOrigins := []string{
		"http://localhost:3000",
		"http://127.0.0.1:3000",
		"https://pigo-web.vercel.app",
	}
	wildcardOrigins := []string{"https://*.example.com"}

	tests := []struct {
		name           string
		origin         string
		allowedOrigins []string
		want           bool
	}{
		{
			name:           "exact allowed origin",
			origin:         "https://pigo-web.vercel.app",
			allowedOrigins: defaultOrigins,
			want:           true,
		},
		{
			name:           "prefix-spoofed vercel project is rejected",
			origin:         "https://pigo-web-evil.vercel.app",
			allowedOrigins: defaultOrigins,
			want:           false,
		},
		{
			name:           "wildcard matches single subdomain label",
			origin:         "https://a.example.com",
			allowedOrigins: wildcardOrigins,
			want:           true,
		},
		{
			name:           "wildcard does not match two subdomain labels",
			origin:         "https://a.b.example.com",
			allowedOrigins: wildcardOrigins,
			want:           false,
		},
		{
			name:           "wildcard does not match a lookalike suffix without a dot",
			origin:         "https://aexample.com",
			allowedOrigins: wildcardOrigins,
			want:           false,
		},
		{
			name:           "wildcard does not match a non-https scheme",
			origin:         "http://a.example.com",
			allowedOrigins: wildcardOrigins,
			want:           false,
		},
		{
			name:           "empty origin",
			origin:         "",
			allowedOrigins: defaultOrigins,
			want:           false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := isOriginAllowed(tt.origin, tt.allowedOrigins); got != tt.want {
				t.Fatalf("isOriginAllowed(%q, %v) = %v, want %v", tt.origin, tt.allowedOrigins, got, tt.want)
			}
		})
	}
}

func TestCORSMiddleware(t *testing.T) {
	t.Setenv("CORS_ALLOWED_ORIGINS", "https://pigo-web.vercel.app")

	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	handler := CORS(next)

	t.Run("disallowed origin gets Vary but no Allow-Origin", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/health", nil)
		req.Header.Set("Origin", "https://pigo-web-evil.vercel.app")
		rec := httptest.NewRecorder()

		handler.ServeHTTP(rec, req)

		if got := rec.Header().Get("Vary"); got != "Origin" {
			t.Errorf("got Vary %q, want %q", got, "Origin")
		}
		if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "" {
			t.Errorf("got Access-Control-Allow-Origin %q, want empty", got)
		}
	})

	t.Run("allowed origin gets Vary and Allow-Origin", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/health", nil)
		req.Header.Set("Origin", "https://pigo-web.vercel.app")
		rec := httptest.NewRecorder()

		handler.ServeHTTP(rec, req)

		if got := rec.Header().Get("Vary"); got != "Origin" {
			t.Errorf("got Vary %q, want %q", got, "Origin")
		}
		if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "https://pigo-web.vercel.app" {
			t.Errorf("got Access-Control-Allow-Origin %q, want %q", got, "https://pigo-web.vercel.app")
		}
	})
}
