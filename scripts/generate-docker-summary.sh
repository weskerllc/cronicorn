#!/bin/bash
set -e

VERSION="$1"
REGISTRY="ghcr.io/weskerllc/cronicorn"

if [ -z "$VERSION" ]; then
  echo "Usage: $0 <version>"
  exit 1
fi

cat > /tmp/docker-images.md << EOF
## 🐳 Docker Images

The following Docker images have been published for this release:

### 📦 API
\`\`\`bash
# Pull by version tag
docker pull ${REGISTRY}/api:${VERSION}
\`\`\`

### 📦 Scheduler  
\`\`\`bash
# Pull by version tag
docker pull ${REGISTRY}/scheduler:${VERSION}
\`\`\`

### 📦 AI Planner
\`\`\`bash
# Pull by version tag
docker pull ${REGISTRY}/ai-planner:${VERSION}
\`\`\`

### 📦 Web
\`\`\`bash
# Pull by version tag
docker pull ${REGISTRY}/web:${VERSION}
\`\`\`

---

**Registry:** \`${REGISTRY}\`  
**Version:** \`${VERSION}\`  
**Build Time:** $(date -u +'%Y-%m-%d %H:%M:%S UTC')

> 📝 **Note:** These images are built automatically on release and cached for fast deployment.
EOF

echo "Docker images summary generated at /tmp/docker-images.md"