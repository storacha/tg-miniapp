variable "app" {
  description = "The name of the application"
  type        = string
}

variable "allowed_account_id" {
  description = "account id used for AWS"
  type = string
}

variable "region" {
  description = "aws region for all services"
  type        = string
}

variable "private_key" {
  description = "private_key for the peer for this deployment"
  type = string
}

variable "did" {
  description = "DID for this deployment (did:web:... for example)"
  type = string
}

variable "image_tag" {
  description = "ECR image tag to deploy with"
  type = string
}

variable "principal_mapping" {
  type        = string
  description = "JSON encoded mapping of did:web to did:key"
  default     = ""
}

variable "env_files" {
  description = "list of environment variable files to upload"
  type = list(string)
  default = []
}

variable "domain_base" {
  type = string
  default = ""
}

variable "telegram_bot_token" {
  description = "value for telegram_bot_token secret"
  type = string
}

variable "next_public_telegram_api_id" {
  description = "value for next_public_telegram_api_id secret"
  type = string
}

variable "next_public_telegram_api_hash" {
  description = "value for next_public_telegram_api_hash secret"
  type = string
}

variable "next_public_humanode_auth_url" {
  description = "value for next_public_humanode_auth_url secret"
  type = string
}

variable "next_public_humanode_oauth_callback_url" {
  description = "value for next_public_humanode_oauth_callback_url secret"
  type = string
}

variable "next_public_humanode_client_id" {
  description = "value for next_public_humanode_client_id secret"
  type = string
}

variable "sentry_auth_token" {
  description = "Sentry auth token for source map uploads"
  type = string
}
