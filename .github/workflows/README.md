# GitHub Actions Workflows

## Overview

This repository uses GitHub Actions for CI/CD automation.

## Workflows

### ci.yml
Runs on every push to `main`:
- Quality checks (lint, type-check, tests)
- Semantic release (version bump, changelog, tag creation)

### release.yml
Triggers on tag push:
- Builds and publishes Docker images to GitHub Container Registry
- Creates multi-platform images (amd64, arm64)
- Generates attestations for security

### tag-test.yml
Simple test workflow to verify tag triggers work correctly.

## Important Setup Requirements

### PAT_TOKEN Secret

⚠️ **Critical**: The `release.yml` workflow will **not** trigger automatically when semantic-release creates a tag if using the default `GITHUB_TOKEN`.

**Why?** GitHub Actions has a security feature that prevents workflows triggered by `GITHUB_TOKEN` from triggering other workflows. This prevents infinite workflow loops.

**Solution**: Create a Personal Access Token (PAT) with `repo` scope and add it as a repository secret named `PAT_TOKEN`.

#### Steps to Create PAT:

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Name: `Workflow Trigger Token` (or similar)
4. Expiration: Choose an appropriate duration
5. Scopes: Select `repo` (full control of private repositories)
6. Click "Generate token" and copy the token
7. In your repository: Settings → Secrets and variables → Actions
8. Click "New repository secret"
9. Name: `PAT_TOKEN`
10. Value: Paste your PAT
11. Click "Add secret"

#### Alternative: GitHub App Token

For better security and more fine-grained control, consider using a GitHub App token instead of a PAT. See [GitHub's documentation](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/making-authenticated-api-requests-with-a-github-app-in-a-github-actions-workflow) for details.

## Workflow Sequence

```
Push to main
    ↓
ci.yml runs
    ↓
semantic-release creates tag (using PAT_TOKEN)
    ↓
release.yml triggers on tag push
    ↓
Docker images built and published
```

## Troubleshooting

### release.yml not triggering

1. Verify `PAT_TOKEN` secret exists and is valid
2. Check that the PAT has `repo` scope
3. Ensure semantic-release successfully created a tag (check Releases page)
4. Look for failed workflow runs in the Actions tab

### Docker build failures

1. Verify Dockerfile.monorepo-optimized exists and is correct
2. Check that all required build targets exist in the Dockerfile
3. Ensure all dependencies are properly installed during build

## References

- [GitHub Actions Security: Preventing pwn requests](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions#understanding-the-risk-of-script-injections)
- [Using secrets in GitHub Actions](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions)
- [Triggering a workflow from a workflow](https://docs.github.com/en/actions/using-workflows/triggering-a-workflow#triggering-a-workflow-from-a-workflow)
