#!/bin/bash
# Setup script for Docker BuildKit advanced caching

set -e

echo "🔧 Setting up Docker BuildKit for advanced caching..."

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check Docker version
DOCKER_VERSION=$(docker version --format '{{.Server.Version}}' 2>/dev/null || echo "unknown")
echo "📦 Docker version: $DOCKER_VERSION"

# Check if buildx is available
if ! docker buildx version >/dev/null 2>&1; then
    echo "❌ Docker Buildx is not available. Please update Docker to a newer version."
    exit 1
fi

BUILDX_VERSION=$(docker buildx version)
echo "🏗️  Buildx version: $BUILDX_VERSION"

# Create or update the builder
BUILDER_NAME="cronicorn-builder"
echo "🔨 Setting up buildx builder: $BUILDER_NAME"

# Remove existing builder if it exists
if docker buildx inspect $BUILDER_NAME >/dev/null 2>&1; then
    echo "♻️  Removing existing builder..."
    docker buildx rm $BUILDER_NAME
fi

# Create new builder with docker-container driver
echo "📦 Creating new builder..."
docker buildx create --name $BUILDER_NAME --driver docker-container --use

# Bootstrap the builder
echo "🚀 Bootstrapping builder..."
docker buildx inspect --bootstrap

echo "✅ Setup complete!"
echo ""
echo "📋 Available commands:"
echo "  pnpm docker:build         - Simple build (default driver)"
echo "  pnpm docker:build:advanced - Advanced build (buildx)"
echo "  pnpm docker:build:cache   - With local cache"
echo "  pnpm docker:build:registry - With registry cache"
echo ""
echo "💡 The builder '$BUILDER_NAME' is now ready for advanced caching!"