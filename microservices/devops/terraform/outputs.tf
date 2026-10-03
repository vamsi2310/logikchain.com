output "artifact_registry_url" {
  description = "Artifact registry docker repository URL"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.microservices_repo.repository_id}"
}

output "api_gateway_uri" {
  description = "Direct URI of deployed Cloud Run API Gateway"
  value       = google_cloud_run_v2_service.api_gateway.uri
}

output "cloud_sql_connection_name" {
  description = "Connection name for Cloud SQL instance"
  value       = google_sql_database_instance.postgres_instance.connection_name
}
