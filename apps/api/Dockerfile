FROM golang:1.26.4-alpine AS builder

WORKDIR /src

COPY go.work go.work.sum ./
COPY apps/api/go.mod apps/api/go.sum ./apps/api/
COPY packages/core/go.mod packages/core/go.sum ./packages/core/

RUN go mod download

COPY apps/api/ ./apps/api/
COPY packages/core/ ./packages/core/

RUN CGO_ENABLED=0 go build -trimpath -o /app/pigo-api ./apps/api/

FROM gcr.io/distroless/static-debian12:nonroot AS runner

WORKDIR /app
COPY --from=builder /app/pigo-api /app/pigo-api

EXPOSE 3001
USER nonroot:nonroot

CMD ["/app/pigo-api"]
