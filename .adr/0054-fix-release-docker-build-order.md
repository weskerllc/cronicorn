# Fix Release and Docker Build Order

**Date:** 2024-12-18
**Status:** Accepted

## Context

The current release workflow had a timing issue where the GitHub release notes included Docker image links before the Docker images were actually built. This created a race condition and misleading release notes.

### Previous Flow (Problematic)

1. **semantic-release runs** in CI workflow:
   - Creates git tag (e.g., `v1.16.1`)
   - Commits CHANGELOG.md and package.json
   - Creates GitHub release with Docker image links in the body
   - **Problem**: Images don't exist yet!

2. **release.yml workflow triggers** on `release.published`:
   - Builds Docker images with the release tag
   - Images are created but release notes were already published

### Industry Standard

There are two common approaches:

**Option A: Build-First** (Used by many CI/CD pipelines)
- Build artifacts with commit SHA or pre-release tag
- Create official release
- Re-tag artifacts with official version

**Option B: Release-First** (Simpler, chosen for this project)
- Create release/tag first
- Build artifacts from that tag
- **Update release notes after** artifacts are built

## Decision

We chose **Option B (Release-First)** with post-build release note updates:

1. **Remove Docker image links from semantic-release template** (`.releaserc`)
   - Semantic-release creates clean release notes without premature Docker links
   
2. **Enable `update-release` job in release.yml**
   - After all Docker images are built, collect metadata from each service
   - Update the GitHub release with actual Docker image information
   - Include image digests, pull commands, and registry links

This ensures:
- Release notes are accurate (images exist when links are added)
- No race conditions between release creation and image builds
- Clear separation of concerns: semantic-release handles versioning, Docker workflow handles artifacts

## Consequences

### Positive
- ✅ Release notes are always accurate
- ✅ No premature Docker image links
- ✅ Better separation of concerns
- ✅ Follows industry best practices for release-first workflows
- ✅ Easy to understand and maintain

### Negative
- ⚠️ Release notes update happens a few minutes after initial release creation
- ⚠️ Users who check the release immediately might not see Docker info yet (rare)

### Changes Made
- `.releaserc`: Removed `releaseBodyTemplate` with Docker image table
- `.github/workflows/release.yml`: 
  - Re-enabled metadata export and artifact upload in `build-services` job
  - Re-enabled `update-release` job to append Docker info after builds complete

## References

- GitHub issue: Release order investigation
- Related files:
  - `.releaserc` - semantic-release configuration
  - `.github/workflows/ci.yml` - Runs semantic-release
  - `.github/workflows/release.yml` - Builds Docker images
