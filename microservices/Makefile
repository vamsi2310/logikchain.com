.PHONY: help up down build logs clean test db-start db-stop db-status db-connect db-init

help:
	@echo "Logikchain Microservices DevOps Commands:"
	@echo "  make build        Build all container images"
	@echo "  make up           Start all microservices, databases, and gateway"
	@echo "  make down         Stop all running containers"
	@echo "  make logs         Tail container logs"
	@echo "  make clean        Remove stopped containers and volumes"
	@echo "  make db-start     Start dev DB backend connector (K8s / Docker / CloudSQL)"
	@echo "  make db-status    Audit connectivity & health of all 13 databases"
	@echo "  make db-connect   Open interactive psql session to database"
	@echo "  make db-init      Execute init-databases.sql and outbox tables"
	@echo "  make db-stop      Stop dev DB background connector"
	@echo "  make deploy-gcp   Deploy containers to Google Cloud Run"

build:
	@bash devops/scripts/build-all.sh

up:
	docker compose up -d

down:
	docker compose down

db-start:
	@bash devops/scripts/connect-db-dev.sh start

db-stop:
	@bash devops/scripts/connect-db-dev.sh stop

db-status:
	@bash devops/scripts/connect-db-dev.sh status

db-connect:
	@bash devops/scripts/connect-db-dev.sh connect $(DB)

db-init:
	@bash devops/scripts/connect-db-dev.sh init

logs:
	docker compose logs -f

clean:
	docker compose down -v --remove-orphans

deploy-gcp:
	@bash devops/scripts/deploy-gcp.sh
