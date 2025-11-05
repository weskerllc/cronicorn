#!/bin/bash
# Setup script for configuring GitHub secrets for Dokploy deployments

set -e

echo "🚀 Cronicorn Deployment Setup"
echo "=============================="
echo ""
echo "This script will help you configure GitHub secrets for automated deployments."
echo ""

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed."
    echo "   Install it from: https://cli.github.com/"
    echo "   Or manually add secrets via GitHub web interface:"
    echo "   https://github.com/$(git config --get remote.origin.url | sed 's/.*://;s/.git$//')/settings/secrets/actions"
    exit 1
fi

# Check if user is authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub CLI."
    echo "   Run: gh auth login"
    exit 1
fi

echo "✅ GitHub CLI is installed and authenticated"
echo ""

# Function to set a secret
set_secret() {
    local name=$1
    local description=$2
    
    echo "📝 Setting up: $name"
    echo "   Description: $description"
    read -p "   Enter value (or press Enter to skip): " -s value
    echo ""
    
    if [ -n "$value" ]; then
        echo "$value" | gh secret set "$name"
        echo "   ✅ Secret $name has been set"
    else
        echo "   ⏭️  Skipped $name"
    fi
    echo ""
}

echo "Setting up deployment secrets..."
echo ""

# Staging webhook
set_secret "DOKPLOY_STAGING_WEBHOOK_URL" "Webhook URL from your Dokploy staging project"

# Production webhook
set_secret "DOKPLOY_PRODUCTION_WEBHOOK_URL" "Webhook URL from your Dokploy production project"

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Configure your Dokploy projects with the appropriate docker-compose files"
echo "2. Set environment variables in Dokploy (see .env.staging.example and .env.production.example)"
echo "3. Test staging deployment by creating a release"
echo "4. Test production deployment using GitHub Actions manual trigger"
echo ""
echo "See docs/DEPLOYMENT.md for detailed instructions."
