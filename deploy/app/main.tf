terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.86.0"
    }
    archive = {
      source = "hashicorp/archive"
    }
  }
  backend "s3" {
    bucket = "storacha-terraform-state"
    region = "us-west-2"
    encrypt = true
  }
}

provider "aws" {
  allowed_account_ids = [var.allowed_account_id]
  region = var.region
  default_tags {
    
    tags = {
      "Environment" = terraform.workspace
      "ManagedBy"   = "OpenTofu"
      Owner         = "storacha"
      Team          = "Storacha Engineering"
      Organization  = "Storacha"
      Project       = "${var.app}"
    }
  }
}

# CloudFront is a global service. Certs must be created in us-east-1, where the core ACM infra lives
provider "aws" {
  region = "us-east-1"
  alias = "acm"
}


resource "random_password" "backup_password" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "random_password" "session_password" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}


module "app" {
  source = "github.com/storacha/storoku//app?ref=v0.2.41"
  private_key = var.private_key
  private_key_env_var = "SERVER_IDENTITY_PRIVATE_KEY"
  httpport = 3000
  principal_mapping = var.principal_mapping
  did = var.did
  did_env_var = "NEXT_PUBLIC_SERVER_DID"
  app = var.app
  appState = var.app
  write_to_container = true
  environment = terraform.workspace
  # if there are any env vars you want available only to your container
  # in the vpc as opposed to set in the dockerfile, enter them here
  # NOTE: do not put sensitive data in env-vars. use secrets
  deployment_env_vars = []
  image_tag = var.image_tag
  create_db = true
  # enter secret values your app will use here -- these will be available
  # as env vars in the container at runtime
  secrets = { 
    "TELEGRAM_BOT_TOKEN" = var.telegram_bot_token
    "NEXT_PUBLIC_TELEGRAM_API_ID" = var.next_public_telegram_api_id
    "NEXT_PUBLIC_TELEGRAM_API_HASH" = var.next_public_telegram_api_hash
    "BACKUP_PASSWORD" = random_password.backup_password.result
    "SESSION_PASSWORD" = random_password.session_password.result
    "NEXT_PUBLIC_HUMANODE_AUTH_URL" = var.next_public_humanode_auth_url
    "NEXT_PUBLIC_HUMANODE_OAUTH_CALLBACK_URL" = var.next_public_humanode_oauth_callback_url
    "NEXT_PUBLIC_HUMANODE_CLIENT_ID" = var.next_public_humanode_client_id
  }
  # enter any sqs queues you want to create here
  queues = [
    {
      name = "jobs"
      fifo = false
    },
  ]
  caches = [  ]
  topics = [  ]
  tables = [
  ]
  buckets = []
  providers = {
    aws = aws
    aws.acm = aws.acm
  }
  env_files = var.env_files
  domain_base = var.domain_base
}