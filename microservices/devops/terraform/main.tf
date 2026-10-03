terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Artifact Registry for Microservices Docker Images
resource "google_artifact_registry_repository" "microservices_repo" {
  location      = var.region
  repository_id = "logikchain-microservices"
  description   = "Docker container images for Logikchain microservices"
  format        = "DOCKER"
}

# Cloud SQL PostgreSQL Instance (Database-Per-Service host)
resource "google_sql_database_instance" "postgres_instance" {
  name             = "logikchain-postgres-${var.environment}"
  database_version = "POSTGRES_16"
  region           = var.region

  settings {
    tier = var.db_tier
    ip_configuration {
      ipv4_enabled    = false
      private_network = var.vpc_network_id
    }
    backup_configuration {
      enabled = true
    }
  }
  deletion_protection = var.environment == "prod" ? true : false
}

# Cloud Run Service: API Gateway
resource "google_cloud_run_v2_service" "api_gateway" {
  name     = "api-gateway-${var.environment}"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    scaling {
      min_instance_count = var.environment == "prod" ? 2 : 0
      max_instance_count = 20
    }
    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.microservices_repo.repository_id}/gateway:latest"
      resources {
        limits = {
          cpu    = "1000m"
          memory = "512Mi"
        }
      }
      env {
        name  = "NODE_ENV"
        value = var.environment
      }
      env {
        name  = "ENFORCE_APP_CHECK"
        value = "true"
      }
    }
  }
}

# IAM: Allow public invocation on API Gateway
resource "google_cloud_run_service_iam_member" "public_access" {
  location = google_cloud_run_v2_service.api_gateway.location
  service  = google_cloud_run_v2_service.api_gateway.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
