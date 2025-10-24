#!/bin/bash
# BuildKit-optimized Docker build script for pnpm monorepo
# Leverages cache mounts for maximum efficiency

set -e

# Enable BuildKit (if not already enabled)
export DOCKER_BUILDKIT=1

# Default values
CACHE_FROM=${CACHE_FROM:-""}
CACHE_TO=${CACHE_TO:-""}
REGISTRY=${REGISTRY:-"localhost:5000"}
TAG=${TAG:-"latest"}
PUSH=${PUSH:-"false"}

echo "🚀 Building optimized Docker images with BuildKit cache..."

# Check if buildx builder exists, create if not
BUILDER_NAME="cronicorn-builder"
if ! docker buildx inspect $BUILDER_NAME >/dev/null 2>&1; then
    echo "📦 Creating buildx builder: $BUILDER_NAME"
    docker buildx create --name $BUILDER_NAME --driver docker-container --use
else
    echo "📦 Using existing buildx builder: $BUILDER_NAME"
    docker buildx use $BUILDER_NAME
fi

# Common build flags
BUILD_FLAGS="--file Dockerfile.monorepo-optimized --builder $BUILDER_NAME"

# Add cache flags if provided
if [ -n "$CACHE_FROM" ]; then
    BUILD_FLAGS="$BUILD_FLAGS --cache-from $CACHE_FROM"
fi

if [ -n "$CACHE_TO" ]; then
    BUILD_FLAGS="$BUILD_FLAGS --cache-to $CACHE_TO"
fi

# Build individual services
echo "📦 Building API..."
docker buildx build $BUILD_FLAGS --target api --tag $REGISTRY/cronicorn-api:$TAG --load .

echo "📦 Building Scheduler..."
docker buildx build $BUILD_FLAGS --target scheduler --tag $REGISTRY/cronicorn-scheduler:$TAG --load .

echo "📦 Building AI Planner..."
docker buildx build $BUILD_FLAGS --target ai-planner --tag $REGISTRY/cronicorn-ai-planner:$TAG --load .

echo "📦 Building Web..."
docker buildx build $BUILD_FLAGS --target web --tag $REGISTRY/cronicorn-web:$TAG --load .

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
echo "📊 Cache efficiency tips:"
echo "  - Use registry cache: CACHE_FROM=type=registry,ref=$REGISTRY/cache CACHE_TO=type=registry,ref=$REGISTRY/cache,mode=max"
echo "  - Use local cache: CACHE_FROM=type=local,src=.cache CACHE_TO=type=local,dest=.cache,mode=max"
echo "  - On CI: Use gha cache: CACHE_FROM=type=gha CACHE_TO=type=gha,mode=max"