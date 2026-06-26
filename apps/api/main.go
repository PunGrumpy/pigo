package main

import (
	"log"
	"net/http"
	"os"

	"github.com/PunGrumpy/pigo/apps/api/router"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "3001"
	}

	log.Printf("Pigo API listening on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, router.New()))
}
