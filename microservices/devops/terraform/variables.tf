variable "project_id" {
  description = "GCP Project ID"
  type        = string
  default     = "logikchain-dev"
}

variable "region" {
  description = "GCP primary region"
  type        = string
  default     = "asia-south1"
}

variable "environment" {
  description = "Target deployment environment (dev, test, prod)"
  type        = string
  default     = "dev"
}

variable "db_tier" {
  description = "Cloud SQL tier"
  type        = string
  default     = "db-f1-micro"
}

variable "vpc_network_id" {
  description = "GCP VPC network ID for private Cloud SQL connection"
  type        = string
  default     = "projects/logikchain-dev/global/networks/default"
}
