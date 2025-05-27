data "aws_caller_identity" "current" {}

locals {
    domain_base = var.domain_base != "" ? var.domain_base : "${var.app}.storacha.network"
    domain_name = terraform.workspace == "prod" ? local.domain_base : "${terraform.workspace}.${local.domain_base}"
}

resource "aws_iam_role" "pipe" {
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = {
      Effect = "Allow"
      Action = "sts:AssumeRole"
      Principal = {
        Service = "pipes.amazonaws.com"
      }
      Condition = {
        StringEquals = {
          "aws:SourceAccount" = data.aws_caller_identity.current.account_id
        }
      }
    }
  })
}

resource "aws_iam_role_policy" "source" {
  role = aws_iam_role.pipe.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:ReceiveMessage",
        ],
        Resource = [
          module.app.queue["jobs"].arn
        ]
      },
    ]
  })
}

resource "aws_iam_role_policy" "target" {
  role = aws_iam_role.pipe.name
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect  = "Allow"
        Action = ["events:InvokeApiDestination"]
        Resource = [aws_cloudwatch_event_api_destination.handle_job.arn]
      },
    ]
  })
}

resource "aws_pipes_pipe" "pipe" {
  depends_on = [aws_iam_role_policy.source, aws_iam_role_policy.target]
  name       = "${terraform.workspace}-${var.app}-jobs-pipe"
  role_arn   = aws_iam_role.pipe.arn
  source     = module.app.queue["jobs"].arn
  target     = aws_cloudwatch_event_api_destination.handle_job.arn
  
}

resource "aws_cloudwatch_event_connection" "handle_job" {
  name               = "${terraform.workspace}-${var.app}-handle-job-connection"
  description        = "A connection description"
  authorization_type = "BASIC"

  auth_parameters {
    basic {
      username = "user"
      password = random_password.backup_password.result
    }
  }
}

resource "aws_cloudwatch_event_api_destination" "handle_job" {
  name = "${terraform.workspace}-${var.app}-handle-job-endpoint"
  description = "handle job endpoint"
  invocation_endpoint = "https://${local.domain_name}/api/jobs"
  http_method = "POST"
  invocation_rate_limit_per_second = 20
  connection_arn = aws_cloudwatch_event_connection.handle_job.arn
}
