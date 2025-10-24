# Docker Build Workflow - Quick Reference

## Triggering Builds

### Automatic (Recommended)
Builds trigger automatically when you publish a GitHub release:

1. Go to Releases → Draft a new release
2. Create a new tag (e.g., `v1.2.3`)
3. Generate release notes or write custom notes
4. Click "Publish release"
5. Workflow starts automatically
6. Wait 3-5 minutes (with cache) or 12-15 minutes (first time)
7. Release notes are automatically updated with Docker image info

### Manual (Testing)
Trigger a build manually from the Actions tab:

1. Go to Actions → "Build and Publish Docker Images"
2. Click "Run workflow"
3. Enter the tag name (e.g., `v1.2.3`)
4. Click "Run workflow"
5. Monitor progress in the workflow run

## Pulling Images

After a successful build, pull images using the commands in the release notes:

### By Version Tag (Recommended for Production)
```bash
docker pull ghcr.io/bcanfield/mvpmvp/api:v1.2.3
docker pull ghcr.io/bcanfield/mvpmvp/scheduler:v1.2.3
docker pull ghcr.io/bcanfield/mvpmvp/ai-planner:v1.2.3
docker pull ghcr.io/bcanfield/mvpmvp/web:v1.2.3
```

### By Digest (Immutable, Highest Security)
```bash
docker pull ghcr.io/bcanfield/mvpmvp/api@sha256:abc123...
```

### By Latest (Development Only)
```bash
docker pull ghcr.io/bcanfield/mvpmvp/api:latest
```

## Monitoring Builds

### Check Build Status
1. Go to Actions → "Build and Publish Docker Images"
2. Click on the running/completed workflow
3. Review the workflow summary at the bottom
4. Check individual job logs if needed

### Verify Images Published
```bash
# Using GitHub CLI
gh api /users/bcanfield/packages/container/mvpmvp%2Fapi/versions

# Using Docker
docker manifest inspect ghcr.io/bcanfield/mvpmvp/api:v1.2.3
```

### Check Build Metadata
Download artifacts from the workflow run:
1. Go to the workflow run
2. Scroll to "Artifacts"
3. Download `build-metadata-[service]` files
4. View JSON metadata for each service

## Build Performance

### Expected Build Times

**First Build (Cold Cache):**
- Base layers: ~8 minutes
- Each service: ~2-3 minutes (parallel)
- Total: ~12-15 minutes

**Subsequent Builds (Warm Cache):**
- Base layers: ~1 minute
- Each service: ~30-60 seconds (parallel)
- Total: ~3-5 minutes

### Cache Hit Indicators

Check workflow logs for cache hits:
```
#8 importing cache manifest from ghcr.io/...
#8 DONE
```

If you see "CACHED" in the build steps, the cache is working!

## Troubleshooting

### Build Taking Too Long
**Possible causes:**
- Cache miss (first build after changes)
- Dependency updates in pnpm-lock.yaml
- Dockerfile modifications

**Solutions:**
- Wait for the build to complete (creates fresh cache)
- Check if this is the first build after changes
- Review recent commits for dependency updates

### Images Not Appearing in Release Notes
**Possible causes:**
- Workflow still running
- Permissions issue
- Update-release job failed

**Solutions:**
- Wait for the complete workflow to finish
- Check the `update-release` job logs
- Verify GITHUB_TOKEN has `contents: write` permission

### Docker Pull Fails
**Possible causes:**
- Not authenticated to GHCR
- Package visibility is private
- Wrong image name/tag

**Solutions:**
```bash
# Authenticate to GHCR
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Verify image exists
gh api /users/bcanfield/packages/container/mvpmvp%2Fapi/versions

# Check package visibility (should be public or you need access)
```

### Cache Not Working
**Symptoms:**
- Every build takes 15+ minutes
- No "importing cache manifest" in logs
- No "CACHED" indicators

**Solutions:**
1. Check cache storage usage:
   ```bash
   gh cache list
   ```

2. Verify registry cache images exist:
   ```bash
   # Should show cache images
   gh api /users/bcanfield/packages
   ```

3. If needed, clear and rebuild:
   ```bash
   # Clear GitHub Actions cache
   gh cache delete --all
   
   # Trigger new build
   # (will create fresh cache)
   ```

## Service Information

### API Service
- **Port:** 3000
- **Health Check:** `GET /health`
- **Entry Point:** `node dist/index.js`

### Scheduler Service
- **Port:** N/A (background worker)
- **Entry Point:** `node dist/index.js`

### AI Planner Service
- **Port:** N/A (background worker)
- **Entry Point:** `node dist/index.js`

### Web Service
- **Port:** 80 (nginx)
- **Entry Point:** nginx serving static files

## Security & Compliance

### Image Verification

Each image includes:
- **SBOM:** Software Bill of Materials
- **Provenance:** Build attestation
- **Signature:** Cryptographic verification

Verify an image:
```bash
# View attestations
gh attestation verify oci://ghcr.io/bcanfield/mvpmvp/api:v1.2.3 \
  --owner bcanfield

# Inspect SBOM
docker sbom ghcr.io/bcanfield/mvpmvp/api:v1.2.3
```

### Image Scanning

Scan images for vulnerabilities:
```bash
# Using Docker Scout
docker scout cves ghcr.io/bcanfield/mvpmvp/api:v1.2.3

# Using Trivy
trivy image ghcr.io/bcanfield/mvpmvp/api:v1.2.3
```

## Advanced Usage

### Multi-Platform Support

Images are built for:
- `linux/amd64` (x86_64)
- `linux/arm64` (ARM64/Apple Silicon)

Docker automatically pulls the right architecture.

### Cache Maintenance

**View cache usage:**
```bash
gh cache list
```

**Clean old caches:**
```bash
# Delete caches older than 7 days
gh cache delete --all --older-than 7d
```

**Monitor registry storage:**
```bash
# List all package versions
gh api /users/bcanfield/packages/container/mvpmvp%2Fapi/versions

# Delete old versions if needed
gh api -X DELETE /users/bcanfield/packages/container/mvpmvp%2Fapi/versions/[version_id]
```

### Custom Build Arguments

To add custom build arguments, edit `.github/workflows/release.yml`:

```yaml
build-args: |
  BUILDKIT_INLINE_CACHE=1
  NODE_ENV=production
  CUSTOM_ARG=value
```

## Best Practices

1. **Always use version tags** in production (not `latest`)
2. **Use digests** for highest security and reproducibility
3. **Monitor build times** and cache hit rates
4. **Clean old images** to save registry storage
5. **Review SBOM** for dependency vulnerabilities
6. **Test manual workflow** before relying on automatic releases

## Resources

- [Optimization Guide](./DOCKER_BUILD_OPTIMIZATION.md) - Full technical details
- [Before/After Comparison](./DOCKER_WORKFLOW_COMPARISON.md) - What changed and why
- [Dockerfile](../Dockerfile.monorepo-optimized) - Multi-stage build configuration
- [GitHub Actions Workflows](../.github/workflows/) - Workflow configurations

## Quick Commands Cheat Sheet

```bash
# Pull latest release
docker pull ghcr.io/bcanfield/mvpmvp/api:latest

# Pull specific version
docker pull ghcr.io/bcanfield/mvpmvp/api:v1.2.3

# View image history
docker history ghcr.io/bcanfield/mvpmvp/api:v1.2.3

# Inspect image
docker inspect ghcr.io/bcanfield/mvpmvp/api:v1.2.3

# Check cache status
gh cache list

# Trigger manual build (replace with your workflow filename if different)
gh workflow run release.yml -f tag=v1.2.3

# View workflow runs (replace with your workflow filename if different)
gh run list --workflow=release.yml

# View latest run (replace with your workflow filename if different)
gh run view --workflow=release.yml

# Download build artifacts
gh run download [run-id]
```
