# Contributing to AI Resume

Thank you for your interest in contributing! This document outlines our development workflow and best practices.

## Branching Strategy

We use **Trunk-Based Development** with short-lived feature branches:

- `main` is the single source of truth and production branch
- All features branch from `main` and merge back to `main`
- Feature branches live maximum **2-3 days**
- Merging to `main` triggers automatic deployment to production

## Development Workflow

### 1. Create Feature Branch

Always branch from the latest `main`:

```bash
# Update main
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/your-feature-name
```

**Branch naming conventions:**

- `feature/` - New features or enhancements
- `fix/` - Bug fixes
- `chore/` - Maintenance tasks, dependency updates
- `docs/` - Documentation changes
- `spike/` - Experimental work (will not be merged)

### 2. Make Changes

- Commit frequently with clear, descriptive messages
- Follow existing code style (Prettier auto-formats on save)
- Write tests for new functionality
- Update documentation if needed

**Good commit messages:**

```
feat: Add user profile avatar upload
fix: Resolve race condition in booking availability
chore: Update OpenAI SDK to v2.1.0
```

### 3. Keep Branch Up-to-Date

Rebase from `main` daily to minimize conflicts:

```bash
# Fetch latest main
git fetch origin main

# Rebase your branch
git rebase origin/main

# If conflicts occur, resolve them and continue
git rebase --continue

# Force push (safe because it's your feature branch)
git push --force-with-lease
```

### 4. Create Pull Request

When your feature is ready:

```bash
# Push your branch
git push -u origin feature/your-feature-name

# Create PR via GitHub CLI
gh pr create --base main --title "feat: Your feature title"
```

**PR Guidelines:**

- Target `main` branch (not develop)
- Provide clear description of changes
- Link related issues
- Request review from team member
- Ensure all CI checks pass

### 5. Review and Test

- Vercel automatically creates a preview deployment for each PR
- Test your changes using the preview URL
- Address review feedback promptly
- Ensure status checks pass:
  - Code Quality & Tests
  - Vercel Build
  - SonarCloud (if applicable)

### 6. Merge and Deploy

After approval and passing checks:

- Click "Squash and merge" (preferred) or "Merge commit"
- Delete the feature branch (happens automatically)
- Deployment to production happens automatically
- Monitor production for any issues

## Code Quality Standards

### TypeScript

- Enable strict mode (already configured)
- No `any` types without justification
- Use proper type guards instead of `@ts-ignore`

### Code Style

- Prettier formats code automatically (run `npm run format`)
- ESLint enforces code quality (run `npm run lint`)
- SonarCloud checks for code smells and security issues

**Cognitive complexity limits:**

- Functions should have complexity ≤ 15
- Extract helper functions to reduce complexity
- See PR #15 for examples of refactoring

### Testing

- Run tests before pushing: `npm test`
- Add tests for new features
- Maintain or improve code coverage

## Environment Variables

Never commit secrets or API keys. Use environment variables:

1. Add to `.env.local` for local development
2. Document in `.env.example`
3. Add to Vercel project settings for production
4. Update README.md environment variables table

## Hotfixes

For urgent production fixes:

```bash
# Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b fix/urgent-issue

# Make minimal fix
# ... make changes ...

# Create PR targeting main
gh pr create --base main --title "fix: Urgent issue description"

# Request immediate review
# After merge, auto-deploys to production
```

## Release Process

We practice **continuous deployment** - every merge to `main` is a production release:

1. Feature is merged to `main`
2. Vercel automatically deploys to production
3. Auto-sync workflow creates PR to sync `develop` (during transition)
4. Monitor production logs and user feedback
5. Quick rollback available if needed (Vercel dashboard)

### Semantic Versioning

While we deploy continuously, we tag significant releases:

```bash
# After major feature merge
git tag -a v1.2.0 -m "Release 1.2.0: Cal.com Integration"
git push origin v1.2.0
```

## CI/CD Pipeline

Our automated workflows:

### On Pull Request

- **Code Quality & Tests** - ESLint, TypeScript, Vitest
- **Vercel Preview** - Deploy preview environment
- **SonarCloud** - Code quality and security analysis

### On Merge to Main

- **Vercel Production** - Deploy to production
- **Auto-Sync** - Create PR to sync develop (temporary)
- **Branch Cleanup** - Delete merged branch

### On PR Close

- **Branch Cleanup** - Delete feature branch if merged

## Best Practices

### ✅ Do

- Keep feature branches alive < 3 days
- Rebase from main daily
- Write clear commit messages
- Test using Vercel preview URLs
- Request code reviews
- Delete branches after merge
- Monitor production after deployment

### ❌ Don't

- Don't keep feature branches alive for weeks
- Don't merge without code review
- Don't bypass CI checks
- Don't commit secrets or API keys
- Don't force push to `main` or `develop`
- Don't work directly on `main`

## Getting Help

- **Questions?** Open a GitHub Discussion
- **Bugs?** Create an issue with reproduction steps
- **Security issues?** Email security@example.com (private)

## Additional Resources

- [README.md](README.md) - Project overview and setup
- [docs/architecture.md](docs/architecture.md) - System architecture
- [docs/CALCOM_INTEGRATION.md](docs/CALCOM_INTEGRATION.md) - Cal.com integration guide

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
