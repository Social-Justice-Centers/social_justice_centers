FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install dependencies first for better caching
COPY go.mod go.sum ./
RUN go mod download

# Copy the rest of the application code
COPY . .

# Build the binary with CGO disabled since we use a pure-go SQLite driver
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o backend_app .

# Use a lightweight alpine image for the runtime
FROM alpine:latest
WORKDIR /app

# Copy the binary from the builder stage
COPY --from=builder /app/backend_app .

# (Optional) If you have a predefined database file, uncomment the line below
# COPY --from=builder /app/local_database.db .

EXPOSE 8080

CMD ["./backend_app"]
