# GitHub Actions Workflows

## Overview

This repository uses GitHub Actions for CI/CD automation.

## Workflows

### ci.yml
Runs on every push to `main`:
- Quality checks (lint, type-check, tests)
- Semantic release (version bump, changelog, tag creation)

### release.yml
Triggers when a GitHub release is published:
- Builds and publishes Docker images to GitHub Container Registry
- Creates multi-platform images (amd64, arm64)
- Generates attestations for security

### tag-test.yml
Simple test workflow to verify release triggers work correctly.

## How It Works

### Release Trigger Mechanism

The `release.yml` workflow triggers when semantic-release publishes a GitHub release (not on tag push). This is the correct approach because:

1. **Semantic-release creates releases via GitHub API** (not git push)
2. **API-created releases fire the `release.published` event**
3. **This event properly triggers workflows** regardless of which token is used

This is why we use `on: release: types: [published]` instead of `on: push: tags:`.

### Why PAT_TOKEN is Still Used

Even though the release trigger now works with the default `GITHUB_TOKEN`, we still use `PAT_TOKEN` in the CI workflow for semantic-release. This is optional but recommended because:
- It ensures semantic-release can create releases even if default token permissions change
- The `PAT_TOKEN || GITHUB_TOKEN` fallback means the workflow still works without PAT_TOKEN

## Workflow Sequence

```
Push to main
    ↓
ci.yml runs
    ↓
semantic-release creates GitHub release (with tag)
    ↓
release.yml triggers on release published event
    ↓
Docker images built and published
```

## Troubleshooting

### release.yml not triggering

1. Ensure semantic-release successfully created a GitHub release (check Releases page)
2. Verify the release is published (not draft)
3. Check for failed workflow runs in the Actions tab
4. Verify the workflow file syntax is correct

### Docker build failures

1. Verify Dockerfile.monorepo-optimized exists and is correct
2. Check that all required build targets exist in the Dockerfile
3. Ensure all dependencies are properly installed during build

## Common Pitfall: Tag Push vs Release Event

### ❌ Wrong Approach (Doesn't Work)
```yaml
on:
  push:
    tags:
      - "*"
```
**Why it fails:** semantic-release creates releases via GitHub API, not git push. API calls don't trigger `push` events.

### ✅ Correct Approach (Works)
```yaml
on:
  release:
    types: [published]
```
**Why it works:** The `@semantic-release/github` plugin publishes releases via API, which fires the `release.published` event that properly triggers workflows.

## References

- [GitHub Actions Security: Preventing pwn requests](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions#understanding-the-risk-of-script-injections)
- [Using secrets in GitHub Actions](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions)
- [Triggering a workflow from a workflow](https://docs.github.com/en/actions/using-workflows/triggering-a-workflow#triggering-a-workflow-from-a-workflow)
- [GitHub Release Events](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#release)
