FROM golang:tip-alpine AS builder

WORKDIR /src

COPY go.work ./
COPY apps/api/go.mod apps/api/go.sum ./apps/api/
COPY packages/core/go.mod packages/core/go.sum ./packages/core/

RUN go mod download

COPY apps/api/ ./apps/api/
COPY packages/core/ ./packages/core/

RUN CGO_ENABLED=0 go build -o /app/pigo-api ./apps/api/

FROM gcr.io/distroless/base-debian12 AS runner

WORKDIR /app
COPY --from=builder /app/pigo-api /app/pigo-api

EXPOSE 3001

CMD ["/app/pigo-api"]
