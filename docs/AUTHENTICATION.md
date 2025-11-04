# Authentication Guide

Cronicorn supports multiple authentication methods to accommodate different deployment scenarios.

## Authentication Methods

### 1. Admin User (Email/Password)

**Recommended for**: Self-hosting, CI/CD environments, local development

The admin user method allows you to run Cronicorn instantly without setting up OAuth providers. This is ideal for testing, CI pipelines, and self-hosted deployments.

#### Setup

1. Add the following environment variables:

```bash
ADMIN_USER_EMAIL=admin@example.com
ADMIN_USER_PASSWORD=your-secure-password-min-8-chars
ADMIN_USER_NAME=Admin User  # Optional, defaults to "Admin User"
```

2. Start the application:

```bash
pnpm db:migrate  # Run migrations first
pnpm dev
```

3. The admin user is automatically created on startup. You'll see:

```
{"level":"info","message":"Admin user created","email":"admin@example.com"}
```

4. Login at `http://localhost:5173/login` using the email and password you configured.

#### Security Notes

- **Password Requirements**: Minimum 8 characters
- **Password Storage**: Passwords are hashed using Better Auth's secure hashing
- **Updates**: To change the admin password, update the environment variable and restart the app
- **Production**: Use a strong, randomly generated password

### 2. GitHub OAuth

**Recommended for**: Production deployments, public hosting

GitHub OAuth provides social authentication with automatic user profile import.

#### Setup

1. Create a GitHub OAuth App:
   - Go to https://github.com/settings/developers
   - Click "New OAuth App"
   - Set:
     - **Application name**: Cronicorn
     - **Homepage URL**: `http://localhost:5173` (or your domain)
     - **Authorization callback URL**: `http://localhost:3333/api/auth/callback/github`

2. Copy your credentials and add them to `.env`:

```bash
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

3. Users can now sign in with GitHub at `/login`

### 3. Using Both Methods

You can enable both admin user and GitHub OAuth simultaneously:

```bash
# Admin user for internal/CI access
ADMIN_USER_EMAIL=admin@example.com
ADMIN_USER_PASSWORD=secure-password

# GitHub OAuth for regular users
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

The login page will show both options.

## API Authentication

### Session Cookies

After logging in via the web UI, your session is stored in a cookie. This works automatically for browser-based API calls.

### Bearer Tokens (Device Flow)

For CLI tools, AI agents, and MCP servers:

1. Initiate device authorization
2. Complete authorization in the browser
3. Use the Bearer token for API requests

See [MCP Server documentation](../apps/mcp-server/README.md) for details.

### API Keys

For service-to-service authentication:

1. Generate an API key in the web UI
2. Send it in the `X-API-Key` header:

```bash
curl -H "X-API-Key: your-api-key" http://localhost:3333/api/jobs
```

## Environment Requirements

At least one authentication method must be configured:

- **Admin User**: Both `ADMIN_USER_EMAIL` and `ADMIN_USER_PASSWORD` must be set
- **GitHub OAuth**: Both `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` must be set

If neither is configured, the application will fail to start with an error message.

## CI/Testing Environments

For automated testing and CI pipelines:

```yaml
# GitHub Actions example
env:
  ADMIN_USER_EMAIL: ci-admin@example.com
  ADMIN_USER_PASSWORD: ${{ secrets.ADMIN_PASSWORD }}
  # ... other env vars
```

The admin user is automatically seeded on startup, making it perfect for ephemeral test environments.

## Troubleshooting

### Admin user not created

- Check that both `ADMIN_USER_EMAIL` and `ADMIN_USER_PASSWORD` are set
- Check application logs for errors
- Ensure database migrations have run: `pnpm db:migrate`

### "Failed to sign in"

- Verify the email and password match your `.env` configuration
- Check that the admin user was created (look for log message)
- Try restarting the application

### GitHub OAuth not working

- Verify your OAuth app callback URL matches `BETTER_AUTH_URL + /api/auth/callback/github`
- Check that `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are correct
- Ensure `BETTER_AUTH_URL` and `WEB_URL` are properly configured
