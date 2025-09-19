# copy to .env.terraform and set missing vars
TF_WORKSPACE= #your name here
TF_VAR_app=telegram
TF_VAR_did= # did for your env
TF_VAR_private_key= # private_key or your env -- do not commit to repo!
TF_VAR_allowed_account_id=505595374361
TF_VAR_region=us-west-2
TF_VAR_cloudflare_zone_id=37783d6f032b78cd97ce37ab6fd42848
CLOUDFLARE_API_TOKEN= # enter a cloudflare api token
TF_VAR_telegram_bot_token= # enter a value for TELEGRAM_BOT_TOKEN secret
TF_VAR_next_public_telegram_api_id= # enter a value for NEXT_PUBLIC_TELEGRAM_API_ID secret
TF_VAR_next_public_telegram_api_hash= # enter a value for NEXT_PUBLIC_TELEGRAM_API_HASH secret
TF_VAR_next_public_humanode_auth_url= # enter a value for NEXT_PUBLIC_HUMANODE_AUTH_URL secret
TF_VAR_next_public_humanode_oauth_callback_url= # enter a value for NEXT_PUBLIC_HUMANODE_OAUTH_CALLBACK_URL secret
TF_VAR_next_public_humanode_client_id= # enter a value for NEXT_PUBLIC_HUMANODE_CLIENT_ID secret
TF_VAR_sentry_auth_token= # enter Sentry auth token for source map uploads