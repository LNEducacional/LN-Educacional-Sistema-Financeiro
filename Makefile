.PHONY: up down run-api run-web migrate-up migrate-down dev stop

# Detect OS for cross-platform commands
ifeq ($(OS),Windows_NT)
    SLEEP_CMD = powershell -command "Start-Sleep -Seconds
    SLEEP_END = "
    BG_API = cmd /C "cd server && start /B go run cmd/api/main.go"
    KILL_API = powershell -command "Get-Process | Where-Object {$$_.CommandLine -like '*cmd/api/main.go*'} | Stop-Process -Force -ErrorAction SilentlyContinue"
    KILL_NODE = powershell -command "Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue"
else
    SLEEP_CMD = sleep
    SLEEP_END =
    BG_API = cd server && go run cmd/api/main.go &
    KILL_API = pkill -f "go run cmd/api/main.go" 2>/dev/null || true
    KILL_NODE = pkill -f "vite" 2>/dev/null || true
endif

# Inicia tudo: Docker + Backend + Frontend
dev:
	@echo "Starting all services..."
	@docker-compose up -d
	@echo "Waiting for PostgreSQL to be ready..."
	@$(SLEEP_CMD) 3$(SLEEP_END)
	@echo "Starting backend (background)..."
	@$(BG_API)
	@$(SLEEP_CMD) 2$(SLEEP_END)
	@echo "Installing frontend dependencies (if needed)..."
	@cd client && npm install
	@echo "Starting frontend..."
	@cd client && npm run dev

# Para todos os processos
stop:
	@echo "Stopping all services..."
	-@$(KILL_API)
	-@$(KILL_NODE)
	@docker-compose down
	@echo "All services stopped."

up:
	docker-compose up -d

down:
	docker-compose down

run-api:
	@echo "Running backend API..."
	cd server && go run cmd/api/main.go

run-web:
	@echo "Running frontend..."
	cd client && npm install && npm run dev

migrate-up:
	@echo "Running migrations..."
	@docker exec -i sistema-financeiro-postgres psql -U postgres -d financial_system < server/migrations/*.up.sql
	@echo "Migrations completed."

migrate-down:
	@echo "Rolling back migrations..."
	@docker exec -i sistema-financeiro-postgres psql -U postgres -d financial_system < server/migrations/*.down.sql
	@echo "Rollback completed."
