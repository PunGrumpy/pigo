package router

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	cors "github.com/PunGrumpy/pigo/apps/api/middleware"
)

func New() http.Handler {
	r := chi.NewRouter()

	r.Use(cors.CORS)
	r.Use(middleware.Logger)
	r.Use(middleware.RequestID)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(55 * time.Second))

	registerRoutes(r)

	return r
}

func registerRoutes(r chi.Router) {
	r.Get("/health", HandleHealth)
	r.Post("/compress", HandleCompress)
}
