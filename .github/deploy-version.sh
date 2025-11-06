#!/bin/bash
# Deploy a specific version to Dokploy production
# Usage: ./deploy-version.sh <version>
# Example: ./deploy-version.sh 1.7.1

set -e

# Check arguments
if [ $# -eq 0 ]; then
  echo "❌ Error: No version specified"
  echo ""
  echo "Usage: ./deploy-version.sh <version>"
  echo "Example: ./deploy-version.sh 1.7.1"
  exit 1
fi

VERSION=$1

# Load environment variables
if [ ! -f .env.test ]; then
  echo "❌ Error: .env.test file not found"
  echo ""
  echo "Create .env.test with:"
  echo "  DOKPLOY_URL=http://146.190.43.32:3000"
  echo "  DOKPLOY_TOKEN=your-token-here"
  echo "  DOKPLOY_COMPOSE_ID=wV9PpGge6tnVfPxfSjlhW"
  exit 1
fi

source .env.test

# Normalize URL (remove trailing slash)
DOKPLOY_URL="${DOKPLOY_URL%/}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Deploying Cronicorn to Production"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Target version: $VERSION"
echo "Compose ID: $DOKPLOY_COMPOSE_ID"
echo ""

# Step 1: Fetch current configuration
echo "📥 Step 1/4: Fetching current configuration..."
COMPOSE_DATA=$(curl -s -X GET \
  "$DOKPLOY_URL/api/compose.one?composeId=$DOKPLOY_COMPOSE_ID" \
  -H "x-api-key: $DOKPLOY_TOKEN")

if [ $? -ne 0 ]; then
  echo "❌ Failed to fetch compose configuration"
  exit 1
fi

# Check if we got valid JSON
if ! echo "$COMPOSE_DATA" | jq -e . >/dev/null 2>&1; then
  echo "❌ Invalid response from API"
  echo "Response: $COMPOSE_DATA"
  exit 1
fi

echo "✅ Configuration fetched"
echo ""

# Step 2: Extract and update env
echo "📝 Step 2/4: Updating IMAGE_TAG..."
CURRENT_ENV=$(echo "$COMPOSE_DATA" | jq -r '.env // ""')

# Show current IMAGE_TAG
CURRENT_TAG=$(echo "$CURRENT_ENV" | grep "^IMAGE_TAG=" | cut -d'=' -f2 | sed 's/ *#.*//')
echo "   Current: $CURRENT_TAG"
echo "   New:     $VERSION"
echo ""

# Update IMAGE_TAG
if echo "$CURRENT_ENV" | grep -q "^IMAGE_TAG="; then
  # Replace existing IMAGE_TAG line (preserving any comments)
  UPDATED_ENV=$(echo "$CURRENT_ENV" | sed "s/^IMAGE_TAG=.*/IMAGE_TAG=$VERSION  # Use specific version like v1.2.3 for production/")
else
  # Add IMAGE_TAG if it doesn't exist
  UPDATED_ENV="$CURRENT_ENV"$'\n'"IMAGE_TAG=$VERSION"
fi

echo "✅ Environment updated"
echo ""

# Step 3: Push updated environment to Dokploy
echo "⬆️  Step 3/4: Pushing updated environment to Dokploy..."

UPDATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "$DOKPLOY_URL/api/compose.update" \
  -H "x-api-key: $DOKPLOY_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg id "$DOKPLOY_COMPOSE_ID" --arg env "$UPDATED_ENV" '{composeId: $id, env: $env}')")

UPDATE_HTTP_CODE=$(echo "$UPDATE_RESPONSE" | tail -n1)
UPDATE_BODY=$(echo "$UPDATE_RESPONSE" | sed '$d')

if [ "$UPDATE_HTTP_CODE" = "200" ]; then
  echo "✅ Environment updated in Dokploy"
else
  echo "❌ Failed to update environment (HTTP $UPDATE_HTTP_CODE)"
  echo "Response: $UPDATE_BODY"
  exit 1
fi
echo ""

# Step 4: Trigger deployment
echo "🚢 Step 4/4: Triggering deployment..."

DEPLOY_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "$DOKPLOY_URL/api/compose.deploy" \
  -H "x-api-key: $DOKPLOY_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg id "$DOKPLOY_COMPOSE_ID" '{composeId: $id}')")

DEPLOY_HTTP_CODE=$(echo "$DEPLOY_RESPONSE" | tail -n1)
DEPLOY_BODY=$(echo "$DEPLOY_RESPONSE" | sed '$d')

if [ "$DEPLOY_HTTP_CODE" = "200" ]; then
  echo "✅ Deployment triggered successfully"
else
  echo "❌ Failed to trigger deployment (HTTP $DEPLOY_HTTP_CODE)"
  echo "Response: $DEPLOY_BODY"
  exit 1
fi
echo ""

# Extract deployment ID if available
DEPLOYMENT_ID=$(echo "$DEPLOY_BODY" | jq -r '.deploymentId // empty')

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Deployment Started!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Version: $VERSION"
if [ -n "$DEPLOYMENT_ID" ]; then
  echo "Deployment ID: $DEPLOYMENT_ID"
fi
echo ""
echo "Monitor progress at:"
echo "  → http://146.190.43.32:3000/dashboard/project/7aUknlp90GI4gnL6KIY_O/services/compose/$DOKPLOY_COMPOSE_ID"
echo ""
echo "Check live site at:"
echo "  → https://cronicorn.com"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
