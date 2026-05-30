.PHONY: all run stop build clean logs image-frontend image-backend

# Default target
all: run

# Build and start both containers in detached mode
run:
	docker compose -f docker/docker-compose.yml up -d
	@echo "\n🚀 Server started!"
	@echo "If running locally: http://localhost:3000"
	@echo "If running on VM:   http://$(SERVER_IP):3000"

# Stop and remove both containers
stop:
	docker compose -f docker/docker-compose.yml down

# Rebuild the docker images
build:
	docker compose -f docker/docker-compose.yml build

# Build just the frontend image
image-frontend:
	$(MAKE) -C frontend image

# Build just the backend image
image-backend:
	$(MAKE) -C backend image

# ==========================================
# Deployment Commands
# ==========================================
SERVER_USER ?= yoavfuchs
SERVER_IP ?= 10.10.32.55
PROJECT_DIR ?= ~/social_justice_centers

# Deploy updates to the virtual machine
deploy:
	@echo "Deploying to $(SERVER_USER)@$(SERVER_IP)..."
	ssh $(SERVER_USER)@$(SERVER_IP) "cd $(PROJECT_DIR) && git pull && make build && make run"
	@echo "Deployment complete!"

# View logs for both containers
logs:
	docker compose -f docker/docker-compose.yml logs -f

# Clean up system (stops containers, removes images and volumes related to this project)
clean: stop
	docker compose -f docker/docker-compose.yml rm -f
	docker rmi social-justice-backend social-justice-frontend 2>/dev/null || true
