# Deployment System Validation Checklist

Use this checklist to validate the deployment system after setup.

## Pre-Setup Validation

- [ ] Repository has existing release workflow (`.github/workflows/release.yml`)
- [ ] Docker images are being pushed to ghcr.io
- [ ] Semantic release is configured and working
- [ ] Images are tagged with both version AND `latest`

## Dokploy Setup - Staging

- [ ] Created Dokploy project named `cronicorn-staging`
- [ ] Uploaded `docker-compose.staging.yml` configuration
- [ ] Configured all environment variables from `.env.staging.example`
- [ ] Set `IMAGE_TAG=latest`
- [ ] Set `IMAGE_REGISTRY=ghcr.io/weskerllc/cronicorn`
- [ ] Generated webhook URL in Dokploy
- [ ] Tested manual deployment works
- [ ] All services start successfully
- [ ] Database migrations run successfully
- [ ] API responds at staging URL
- [ ] Web UI loads at staging URL

## Dokploy Setup - Production

- [ ] Created Dokploy project named `cronicorn-production`
- [ ] Uploaded `docker-compose.production.yml` configuration
- [ ] Configured all environment variables from `.env.production.example`
- [ ] Set `IMAGE_TAG=v1.6.1` (or current version)
- [ ] Set `IMAGE_REGISTRY=ghcr.io/weskerllc/cronicorn`
- [ ] Generated webhook URL in Dokploy
- [ ] Tested manual deployment works
- [ ] All services start successfully
- [ ] Database migrations run successfully
- [ ] API responds at production URL
- [ ] Web UI loads at production URL

## GitHub Secrets

- [ ] Added `DOKPLOY_STAGING_WEBHOOK_URL` to repository secrets
- [ ] Added `DOKPLOY_PRODUCTION_WEBHOOK_URL` to repository secrets
- [ ] Verified secrets are accessible (no typos in names)

## Staging Auto-Deploy Test

- [ ] Create a test branch
- [ ] Make a semantic commit (e.g., `feat: test deployment`)
- [ ] Merge to main
- [ ] Verify semantic release creates new tag
- [ ] Verify release workflow builds images
- [ ] Verify deploy workflow triggers automatically
- [ ] Check GitHub Actions logs for deploy workflow
- [ ] Verify webhook was called successfully
- [ ] Check Dokploy staging deployment logs
- [ ] Verify services pulled `latest` images
- [ ] Verify all services restarted
- [ ] Test staging application works
- [ ] Verify version is reflected in staging

## Production Manual Deploy Test

- [ ] Go to GitHub Actions
- [ ] Click "Deploy to Dokploy" workflow
- [ ] Click "Run workflow"
- [ ] Select environment: `production`
- [ ] Select version: `v1.6.1` (or current)
- [ ] Click "Run workflow"
- [ ] Wait for workflow to complete
- [ ] Check GitHub Actions logs
- [ ] Verify webhook was called with correct version
- [ ] Check Dokploy production deployment logs
- [ ] Verify services pulled version-specific images
- [ ] Verify all services restarted
- [ ] Test production application works
- [ ] Verify correct version is deployed

## Rollback Test

- [ ] Note current production version
- [ ] Deploy a different version using GitHub Actions
- [ ] Verify new version deploys successfully
- [ ] Roll back to previous version using GitHub Actions
- [ ] Verify rollback completes successfully
- [ ] Test application works after rollback
- [ ] Verify correct version is running

## Environment Isolation Validation

### Staging
- [ ] Using test/staging database
- [ ] Using staging OAuth app
- [ ] Using Stripe test mode
- [ ] Using staging domain names
- [ ] Not affecting production

### Production
- [ ] Using production database
- [ ] Using production OAuth app
- [ ] Using Stripe live mode
- [ ] Using production domain names
- [ ] Completely isolated from staging

## Security Validation

- [ ] No secrets committed to git
- [ ] Webhook URLs only in GitHub Secrets
- [ ] Environment variables only in Dokploy
- [ ] Different credentials for staging vs production
- [ ] Different OAuth apps for staging vs production
- [ ] Different Stripe accounts (test vs live)
- [ ] Database passwords are strong
- [ ] `BETTER_AUTH_SECRET` is strong and unique

## Documentation Validation

- [ ] Read `docs/DEPLOYMENT.md`
- [ ] Read `docs/DEPLOYMENT-QUICKSTART.md`
- [ ] Reviewed `docs/DEPLOYMENT-DIAGRAMS.md`
- [ ] Reviewed `.env.staging.example`
- [ ] Reviewed `.env.production.example`
- [ ] Understand the deployment flow
- [ ] Know how to rollback
- [ ] Know where to find logs

## Workflow Validation

- [ ] Staging deploys automatically on every release
- [ ] Production requires manual trigger
- [ ] Can select any version for production
- [ ] Deployment summary appears in GitHub Actions
- [ ] Webhook calls succeed
- [ ] No manual Dokploy interaction needed

## Error Handling

- [ ] Test webhook with invalid URL (should fail gracefully)
- [ ] Test deployment with missing secret (should error with message)
- [ ] Test with non-existent image tag (should fail in Dokploy)
- [ ] Verify error messages are clear
- [ ] Know how to debug failed deployments

## Monitoring Setup (Optional but Recommended)

- [ ] Set up monitoring for staging
- [ ] Set up monitoring for production
- [ ] Configure alerts for failed deployments
- [ ] Configure alerts for service health
- [ ] Set up log aggregation
- [ ] Configure uptime monitoring

## Performance Validation

- [ ] Measure deployment time to staging
- [ ] Measure deployment time to production
- [ ] Verify zero-downtime deployment (if configured)
- [ ] Check resource usage during deployment
- [ ] Verify database migrations complete quickly

## Final Validation

- [ ] Staging auto-deploys on every release ✅
- [ ] Production deploys on manual trigger ✅
- [ ] Can specify exact versions for production ✅
- [ ] Rollback works correctly ✅
- [ ] Environments are isolated ✅
- [ ] All documentation is accurate ✅
- [ ] Team understands the process ✅
- [ ] Backup/recovery procedures documented ✅

## Common Issues and Solutions

### Webhook not triggering
**Problem:** Deployment doesn't start after trigger
**Solution:** 
- Verify webhook URL is correct
- Check GitHub Actions logs
- Verify secret name matches exactly

### Images not pulling
**Problem:** Dokploy can't pull images
**Solution:**
- Verify IMAGE_TAG exists in registry
- Check ghcr.io is accessible
- Verify image names are correct

### Service won't start
**Problem:** Container keeps restarting
**Solution:**
- Check container logs in Dokploy
- Verify all environment variables are set
- Check database connectivity
- Verify migrations completed

### Database issues
**Problem:** Migration fails or database unreachable
**Solution:**
- Verify DATABASE_URL is correct
- Check database is healthy
- Verify credentials are correct
- Check network connectivity

## Success Criteria

✅ Staging deploys automatically on every release  
✅ Production deploys on manual trigger with version selection  
✅ Zero manual steps needed for staging  
✅ One-click deployment for production  
✅ Easy rollback capability  
✅ Clear deployment history  
✅ Well documented process  

## Post-Deployment

After successful validation:
- [ ] Document any project-specific configurations
- [ ] Train team on deployment process
- [ ] Set up monitoring and alerts
- [ ] Schedule regular testing of rollback procedures
- [ ] Keep documentation updated
