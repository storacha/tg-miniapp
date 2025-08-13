locals {
  is_production = terraform.workspace == "prod" || startswith(terraform.workspace, "prod-") || endswith(terraform.workspace, "-prod")
}