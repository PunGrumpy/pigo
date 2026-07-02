module github.com/PunGrumpy/pigo/apps/api

go 1.26.4

require (
	github.com/PunGrumpy/pigo/packages/core v0.0.0-00010101000000-000000000000
	github.com/go-chi/chi/v5 v5.3.0
)

require golang.org/x/image v0.43.0 // indirect

replace github.com/PunGrumpy/pigo/packages/core => ../../packages/core
