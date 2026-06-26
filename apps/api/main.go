package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "3001"
	}

	log.Printf("Pigo API listening on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, newRouter()))
}

func newRouter() http.Handler {
	r := chi.NewRouter()
	r.Use(corsMiddleware)
	r.Use(middleware.Logger)
	r.Use(middleware.RequestID)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(55 * time.Second))

	r.Get("/health", handleHealth)
	r.Post("/compress", handleCompress)

	return r
}
