# Deployment Documentation

This directory contains complete documentation for deploying Cronicorn to staging and production environments.

## 📚 Documentation Guide

### For First-Time Setup

**Start here:** [DEPLOYMENT-QUICKSTART.md](DEPLOYMENT-QUICKSTART.md)
- 5-minute setup guide
- Step-by-step instructions
- Checklists for staging and production
- Quick command reference

### For Complete Information

**Full guide:** [DEPLOYMENT.md](DEPLOYMENT.md)
- Comprehensive deployment guide
- Detailed setup instructions
- Environment variable reference
- Troubleshooting guide
- Best practices
- Security considerations

### For Understanding the Architecture

**Visual guide:** [DEPLOYMENT-DIAGRAMS.md](DEPLOYMENT-DIAGRAMS.md)
- Sequence diagrams showing deployment flows
- Infrastructure architecture diagrams
- Workflow trigger diagrams
- Environment comparison tables

**System overview:** [DEPLOYMENT-SUMMARY.md](DEPLOYMENT-SUMMARY.md)
- Complete system overview
- Architecture explanation
- Benefits and trade-offs
- File-by-file breakdown

### For Testing and Validation

**Validation checklist:** [DEPLOYMENT-VALIDATION.md](DEPLOYMENT-VALIDATION.md)
- Pre-setup validation
- Dokploy setup checklist
- Deployment testing procedures
- Rollback testing
- Security validation
- Common issues and solutions

## 🚀 Quick Navigation

| I want to... | Go to... |
|--------------|----------|
| Set up deployments quickly | [DEPLOYMENT-QUICKSTART.md](DEPLOYMENT-QUICKSTART.md) |
| Understand how it all works | [DEPLOYMENT-SUMMARY.md](DEPLOYMENT-SUMMARY.md) |
| See visual diagrams | [DEPLOYMENT-DIAGRAMS.md](DEPLOYMENT-DIAGRAMS.md) |
| Get complete details | [DEPLOYMENT.md](DEPLOYMENT.md) |
| Test my deployment setup | [DEPLOYMENT-VALIDATION.md](DEPLOYMENT-VALIDATION.md) |
| Troubleshoot issues | [DEPLOYMENT.md](DEPLOYMENT.md#troubleshooting) |

## 🎯 What This System Provides

### Staging Environment
- ✅ Automatic deployment on every release
- ✅ Always uses `latest` tag
- ✅ Zero manual steps required
- ✅ Perfect for continuous testing

### Production Environment
- ✅ Manual deployment via GitHub Actions
- ✅ Version-specific deployments
- ✅ One-click process
- ✅ Easy rollback capability

## 📋 Prerequisites

Before you begin, make sure you have:

- [ ] Dokploy account and access
- [ ] GitHub repository admin access
- [ ] Docker images being built (already configured via release workflow)
- [ ] Basic understanding of Docker and environment variables

## 🛠️ Setup Overview

1. **Create Dokploy projects** for staging and production
2. **Configure docker-compose** files in each project
3. **Set environment variables** using provided templates
4. **Generate webhooks** in Dokploy
5. **Add GitHub secrets** for webhook URLs
6. **Test deployments** to verify everything works

Detailed instructions in [DEPLOYMENT-QUICKSTART.md](DEPLOYMENT-QUICKSTART.md)

## 🔧 Configuration Files

### Workflow
- `.github/workflows/deploy.yml` - Automated deployment workflow

### Docker Compose
- `docker-compose.staging.yml` - Staging environment configuration
- `docker-compose.production.yml` - Production environment configuration

### Environment Templates
- `.env.staging.example` - Staging environment variables template
- `.env.production.example` - Production environment variables template

### Scripts
- `scripts/setup-deployment.sh` - Automated GitHub secret setup

### Architecture Decision
- `.adr/0047-automated-deployment-pipeline.md` - Architecture decision record

## 🎓 Learning Path

**If you're new to deployments:**
1. Read [DEPLOYMENT-SUMMARY.md](DEPLOYMENT-SUMMARY.md) to understand the big picture
2. Review [DEPLOYMENT-DIAGRAMS.md](DEPLOYMENT-DIAGRAMS.md) to see how it works visually
3. Follow [DEPLOYMENT-QUICKSTART.md](DEPLOYMENT-QUICKSTART.md) to set it up
4. Use [DEPLOYMENT-VALIDATION.md](DEPLOYMENT-VALIDATION.md) to verify it works

**If you're experienced with CI/CD:**
1. Skim [DEPLOYMENT-SUMMARY.md](DEPLOYMENT-SUMMARY.md) for the architecture
2. Follow [DEPLOYMENT-QUICKSTART.md](DEPLOYMENT-QUICKSTART.md) for setup
3. Refer to [DEPLOYMENT.md](DEPLOYMENT.md) as needed

## 💡 Key Concepts

### Automatic Staging
Every time you merge a semantic commit to main:
1. Semantic release creates a new version tag
2. Docker images are built and pushed with version + `latest` tags
3. Staging automatically deploys the `latest` images
4. No manual intervention needed

### Manual Production
When you're ready to deploy to production:
1. Go to GitHub Actions
2. Run "Deploy to Dokploy" workflow
3. Select production environment and version
4. Click run
5. Production deploys the selected version

### Easy Rollback
If something goes wrong:
1. Run the deployment workflow again
2. Select a previous version
3. Click run
4. System rolls back to that version

## 🔒 Security Notes

- Never commit secrets to git
- Use separate credentials for staging and production
- Use test Stripe keys in staging, live keys in production
- Use separate GitHub OAuth apps for each environment
- Keep webhook URLs in GitHub Secrets only

## 🆘 Getting Help

If you run into issues:

1. Check [DEPLOYMENT.md](DEPLOYMENT.md#troubleshooting) troubleshooting section
2. Review [DEPLOYMENT-VALIDATION.md](DEPLOYMENT-VALIDATION.md) common issues
3. Check GitHub Actions logs for deployment errors
4. Check Dokploy logs for container errors
5. Verify all environment variables are set correctly

## 📝 Contributing

If you improve the deployment process:
- Update the relevant documentation files
- Add new entries to validation checklist if needed
- Update diagrams if architecture changes
- Keep ADR updated with decisions

## 🎉 Success Criteria

You'll know the deployment system is working when:

- ✅ Staging deploys automatically on every release
- ✅ Production deploys on manual trigger
- ✅ All services start successfully
- ✅ Applications are accessible at their URLs
- ✅ Rollback works correctly
- ✅ No manual Dokploy interaction needed

See [DEPLOYMENT-VALIDATION.md](DEPLOYMENT-VALIDATION.md) for complete checklist.

## 📞 Support

For deployment-related questions:
- Check documentation in this directory
- Review GitHub Actions logs
- Check Dokploy deployment logs
- Verify configuration against examples

For application issues:
- See main repository documentation
- Check application logs
- Review service-specific documentation
