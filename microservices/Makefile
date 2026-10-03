.PHONY: help up down build logs clean test

help:
	@echo "Logikchain Microservices DevOps Commands:"
	@echo "  make build        Build all container images"
	@echo "  make up           Start all microservices, databases, and gateway"
	@echo "  make down         Stop all running containers"
	@echo "  make logs         Tail container logs"
	@echo "  make clean        Remove stopped containers and volumes"
	@echo "  make deploy-gcp   Deploy containers to Google Cloud Run"

build:
	@bash devops/scripts/build-all.sh

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

clean:
	docker compose down -v --remove-orphans

deploy-gcp:
	@bash devops/scripts/deploy-gcp.sh
