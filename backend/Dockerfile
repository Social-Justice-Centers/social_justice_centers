FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy application code
COPY . .

# Build binary without CGO
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o backend_app .

# Runtime stage
FROM alpine:latest
WORKDIR /app

# Copy binary
COPY --from=builder /app/backend_app .

# Copy database (optional)
# COPY --from=builder /app/app.db .

EXPOSE 8080

CMD ["./backend_app"]
