<%
# Don't mess with this file -- it will auto compile to env.production.local
if [ "$TF_WORKSPACE" != "prod" ]; then
  UPLOAD_PREFIX="staging."
  GATEWAY_PREFIX="-staging"
  STORACHA_DID="staging.up.storacha.network"
  PRICING_TABLE_ID="prctbl_1R1egaF6A5ufQX5vyumO9QAf"
  PUBLISHABLE_KEY="pk_test_51LO87hF6A5ufQX5viNsPTbuErzfavdrEFoBuaJJPfoIhzQXdOUdefwL70YewaXA32ZrSRbK4U4fqebC7SVtyeNcz00qmgNgueC"
else
  UPLOAD_PREFIX=""
  GATEWAY_PREFIX=""
  STORACHA_DID="web3.storage"
  PRICING_TABLE_ID="prctbl_1R58oLF6A5ufQX5vozallJKX"
  PUBLISHABLE_KEY="pk_live_51LO87hF6A5ufQX5vQTO5BHyz8y9ybJp4kg1GsBjYuqwluuwtQTkbeZzkoQweFQDlv7JaGjuIdUWAyuwXp3tmCfsM005lJK9aS8"
fi
%>

# set these to your upload API service URL and the DID your service is using as its service DID
NEXT_PUBLIC_STORACHA_SERVICE_URL=https://<%= $UPLOAD_PREFIX %>up.storacha.network
NEXT_PUBLIC_STORACHA_RECEIPTS_URL=https://<%= $UPLOAD_PREFIX %>up.storacha.network/receipt/
NEXT_PUBLIC_STORACHA_SERVICE_DID=did:web:<%= $STORACHA_DID %>
NEXT_PUBLIC_STORACHA_PROVIDER=did:web:<%= $STORACHA_DID %>
NEXT_PUBLIC_IDENTITY_AUTHORITY=did:web:<%= $STORACHA_DID %>

# set these to your gateway service URL and DID 
NEXT_PUBLIC_STORACHA_GATEWAY_HOSTNAME=ipfs<%= $GATEWAY_PREFIX %>.w3s.link
NEXT_PUBLIC_STORACHA_GATEWAY_ID=did:web:ipfs<%= $GATEWAY_PREFIX %>.w3s.link

# Sentry
NEXT_PUBLIC_SENTRY_DSN=https://bf79c216fe3c72328219f04aabeebc99@o609598.ingest.us.sentry.io/4508456692940801
NEXT_PUBLIC_SENTRY_ORG=storacha-it
NEXT_PUBLIC_SENTRY_PROJECT=bluesky-backup
NEXT_PUBLIC_SENTRY_ENV=<%= $TF_WORKSPACE %>

NEXT_PUBLIC_TELEGRAM_API_ID=<%= $NEXT_PUBLIC_TELEGRAM_API_ID %>
NEXT_PUBLIC_TELEGRAM_API_HASH=<%= $NEXT_PUBLIC_TELEGRAM_API_HASH %>
NEXT_PUBLIC_POINTS_PER_BYTE=


# The identity of this service, and the private key associated with it. Note
# that other services will need to be able to resolve this DID, so a `did:key`
# works best in development.
#NEXT_PUBLIC_SERVER_DID='did:web:bskybackups.storacha.network'
#SERVER_IDENTITY_PRIVATE_KEY=[multiformatted private key]

# This one can be used in development. It's commented out here just in case
# these lines make their way into a deployment.
NEXT_PUBLIC_SERVER_DID='did:key:z6Mkk89bC3JrVqKie71YEcc5M1SMVxuCgNx6zLZ8SYJsxALi'
# Server did
NEXT_PUBLIC_SERVER_DID=<%= $TF_VAR_did %>