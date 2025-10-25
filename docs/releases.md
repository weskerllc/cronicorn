# Release Notes

This project uses [semantic-release](https://github.com/semantic-release/semantic-release) for automated version management and package publishing.

## Commit Message Format

We follow the [Angular Commit Message Convention](https://github.com/angular/angular/blob/main/contributing-docs/commit-message-guidelines.md):

- `feat:` A new feature (minor version bump)
- `fix:` A bug fix (patch version bump)  
- `docs:` Documentation changes
- `style:` Formatting, missing semicolons, etc.
- `refactor:` A code change that neither fixes a bug nor adds a feature
- `perf:` A code change that improves performance
- `test:` Adding missing tests
- `chore:` Maintenance tasks

For breaking changes, add `BREAKING CHANGE:` in the commit footer to trigger a major version bump.

## Release Process

1. Push commits with conventional messages to `main` branch
2. GitHub Actions automatically runs semantic-release
3. If release-worthy commits are found, a new version is tagged and Docker images are built
4. Release notes are automatically generated from commit messages

## Manual Release (if needed)

```bash
pnpm release
```