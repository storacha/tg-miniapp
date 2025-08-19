# set these to your upload API service URL and the DID your service is using as its service DID
NEXT_PUBLIC_STORACHA_SERVICE_URL=https://up.storacha.network
NEXT_PUBLIC_STORACHA_RECEIPTS_URL=https://up.storacha.network/receipt/
NEXT_PUBLIC_STORACHA_SERVICE_DID=did:web:web3.storage
NEXT_PUBLIC_STORACHA_PROVIDER=did:web:web3.storage

# set this to your gateway URL
NEXT_PUBLIC_STORACHA_GATEWAY_URL=https://w3s.link
NEXT_PUBLIC_STORACHA_GATEWAY_ID=did:web:w3s.link

# Sentry
NEXT_PUBLIC_SENTRY_DSN=https://66656c7520b40c734dc0b5bd84b92a4d@o609598.ingest.us.sentry.io/4509561976455168
NEXT_PUBLIC_SENTRY_ORG=storacha-it
NEXT_PUBLIC_SENTRY_PROJECT=tg-miniapp
NEXT_PUBLIC_SENTRY_ENV=development

NEXT_PUBLIC_POINTS_PER_BYTE=10
NEXT_PUBLIC_TELEGRAM_API_ID=
NEXT_PUBLIC_TELEGRAM_API_HASH=
NEXT_PUBLIC_POINTS_PER_BYTE=

NEXT_PUBLIC_IDENTITY_AUTHORITY=did:web:up.storacha.network

# The identity of this service, and the private key associated with it. Note
# that other services will need to be able to resolve this DID, so a `did:key`
# works best in development.
#NEXT_PUBLIC_SERVER_DID='did:web:bskybackups.storacha.network'
#SERVER_IDENTITY_PRIVATE_KEY=[multiformatted private key]

# This one can be used in development. It's commented out here just in case
# these lines make their way into a deployment.
#NEXT_PUBLIC_SERVER_DID='did:key:z6Mkk89bC3JrVqKie71YEcc5M1SMVxuCgNx6zLZ8SYJsxALi'
#SERVER_IDENTITY_PRIVATE_KEY=MgCZT5vOnYZoVAeyjnzuJIVY9J4LNtJ+f8Js0cTPuKUpFne0BVEDJjEu6quFIU8yp91/TY/+MYK8GvlKoTDnqOCovCVM=
TELEGRAM_BOT_TOKEN=
PGHOST=localhost
PGPORT=5432
PGDATABASE=tg_backups_dev
PGUSERNAME=admin
PGPASSWORD=tarjay

SESSION_COOKIE_NAME=tg-backups-dev
SESSION_PASSWORD=changethistosomethingsecretandatleast32characterslong

LOCAL_URL=http://localhost:3000

# set this to enable Humanode identity auth as a way to pick plans
NEXT_PUBLIC_HUMANODE_AUTH_URL=https://auth.demo-storacha-2025-03-31.oauth2.humanode.io/oauth2/auth
NEXT_PUBLIC_HUMANODE_CLIENT_ID=e9756297-b2d1-4bbe-a139-a9ad1cdc43ee
NEXT_PUBLIC_HUMANODE_OAUTH_CALLBACK_URL=https://staging.up.web3.storage/oauth/humanode/callback

NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID=prctbl_1RjOGxF6A5ufQX5vx64EJkEz
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51LO87hF6A5ufQX5viNsPTbuErzfavdrEFoBuaJJPfoIhzQXdOUdefwL70YewaXA32ZrSRbK4U4fqebC7SVtyeNcz00qmgNgueC
