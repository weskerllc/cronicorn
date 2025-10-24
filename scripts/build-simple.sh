#!/bin/bash
# Simple Docker build script for pnpm monorepo (default driver compatible)
# Uses BuildKit cache mounts but no cache export/import

set -e

# Enable BuildKit
export DOCKER_BUILDKIT=1

# Default values
REGISTRY=${REGISTRY:-"localhost:5000"}
TAG=${TAG:-"latest"}
PUSH=${PUSH:-"false"}

echo "🚀 Building Docker images with BuildKit cache mounts..."

# Build individual services using default docker build
echo "📦 Building API..."
docker build --file Dockerfile.monorepo-optimized --target api --tag $REGISTRY/cronicorn-api:$TAG .

echo "📦 Building Scheduler..."
docker build --file Dockerfile.monorepo-optimized --target scheduler --tag $REGISTRY/cronicorn-scheduler:$TAG .

echo "📦 Building AI Planner..."
docker build --file Dockerfile.monorepo-optimized --target ai-planner --tag $REGISTRY/cronicorn-ai-planner:$TAG .

echo "📦 Building Web..."
docker build --file Dockerfile.monorepo-optimized --target web --tag $REGISTRY/cronicorn-web:$TAG .

# Push if requested
if [ "$PUSH" = "true" ]; then
    echo "🚀 Pushing images..."
    docker push $REGISTRY/cronicorn-api:$TAG
    docker push $REGISTRY/cronicorn-scheduler:$TAG
    docker push $REGISTRY/cronicorn-ai-planner:$TAG
    docker push $REGISTRY/cronicorn-web:$TAG
fi

echo "✅ Build complete!"
echo ""
echo "💡 This uses BuildKit cache mounts for dependency caching."
echo "   For advanced cache export/import, use scripts/build-optimized.sh"