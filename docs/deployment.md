# Vercel Deployment Guide

This guide covers deploying the AI Resume application to Vercel using Git integration.

## Table of Contents
- [Overview](#overview)
- [Environment Configuration](#environment-configuration)
- [Deployment Workflow](#deployment-workflow)
- [Custom Domain Setup](#custom-domain-setup)
- [Troubleshooting](#troubleshooting)

## Overview

### Deployment Strategy
- **Vercel Git Integration**: Automatic deployments on Git push
- **Preview Environment**: `develop` branch → `ai-resume-six-chi.vercel.app`
- **Production Environment**: `main` branch → `chatwithdan.chat`
- **No CI/CD Tools Required**: Vercel handles all builds and deployments

### Project Configuration
- **Vercel Project ID**: `prj_VAFdhl6fQIcOWBGeBhP3ptovZUzm`
- **Framework**: Next.js 15.0.3
- **Build Command**: `npm run build` (automatically used by Vercel)
- **Output Directory**: `.next` (automatically detected)

## Environment Configuration

### Required Environment Variables

All environment variables must be configured in the **Vercel Dashboard** under:
```
Project Settings → Environment Variables
```

#### 1. OpenAI Configuration

| Variable | Production | Preview | Development | Description |
|----------|-----------|---------|-------------|-------------|
| `OPENAI_API_KEY` | ✓ | ✓ | ✓ | Your OpenAI API key from platform.openai.com |
| `OPENAI_PROJECT_ID` | ✓ | ✓ | ✓ | Optional: OpenAI project ID for organization |
| `PRODUCTION_MODEL` | ✓ | ✗ | ✗ | Optional: Override default `gpt-5.1-2025-11-13` model |

**Notes:**
- Can use the same `OPENAI_API_KEY` for all environments, or separate keys for cost tracking
- `PRODUCTION_MODEL` defaults to `gpt-5.1-2025-11-13` if not set
- Preview and development automatically use `gpt-5-nano-2025-08-07` for cost efficiency

#### 2. Clerk Authentication

| Variable | Production | Preview | Development | Description |
|----------|-----------|---------|-------------|-------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✓ Prod Instance | ✓ Staging Instance | ✓ Dev Instance | Clerk publishable key (client-safe) |
| `CLERK_SECRET_KEY` | ✓ Prod Instance | ✓ Staging Instance | ✓ Dev Instance | Clerk secret key (server-only) |

**IMPORTANT:**
- **Must use separate Clerk instances** for production and preview/development
- Create a staging Clerk instance at [clerk.com/dashboard](https://clerk.com/dashboard)
- Configure authorized domains:
  - **Production instance**: `chatwithdan.chat`
  - **Staging instance**: `*.vercel.app`, `ai-resume-six-chi.vercel.app`

#### 3. Upstash Redis (Rate Limiting & Storage)

| Variable | Production | Preview | Development | Description |
|----------|-----------|---------|-------------|-------------|
| `UPSTASH_REDIS_REST_URL` | ✓ | ✓ | ✓ | Upstash Redis REST API URL |
| `UPSTASH_REDIS_REST_TOKEN` | ✓ | ✓ | ✓ | Upstash Redis REST API token |
| `KV_REST_API_URL` | ✓ | ✓ | ✓ | Same as `UPSTASH_REDIS_REST_URL` |
| `KV_REST_API_TOKEN` | ✓ | ✓ | ✓ | Same as `UPSTASH_REDIS_REST_TOKEN` |
| `KV_URL` | ✓ | ✓ | ✓ | Upstash Redis connection string |

**Recommendation:**
- **Option 1 (Simple)**: Use same Redis instance for all environments
- **Option 2 (Isolated)**: Create separate Redis databases for production vs preview
- Get credentials from [console.upstash.com](https://console.upstash.com/)

#### 4. E2E Testing (Preview/Development Only)

| Variable | Production | Preview | Development | Description |
|----------|-----------|---------|-------------|-------------|
| `E2E_CLERK_TEST_EMAIL` | ✗ | ✓ | ✓ | Test user email with `+clerk_test` suffix |

**Example:** `test+clerk_test@chatwithdan.com`

### Setting Environment Variables in Vercel

#### Step 1: Navigate to Environment Variables
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Click **Settings** → **Environment Variables**

#### Step 2: Add Variables with Environment Targeting

For each variable:

1. **Enter variable name** (e.g., `OPENAI_API_KEY`)
2. **Select environments** where it should be available:
   - ✓ **Production** - Applies to `main` branch deployments
   - ✓ **Preview** - Applies to all other branch deployments (including `develop`)
   - ✓ **Development** - Applies when running `vercel dev` locally
3. **Enter the value**
4. Click **Save**

#### Step 3: Branch-Specific Configuration (Optional)

For different values per branch (e.g., different Clerk instances):

1. When adding a variable for **Preview** environment
2. Click **"Add Git Branch"** under the value field
3. Enter `develop` as the branch name
4. This value will ONLY apply to the `develop` branch

**Example Configuration:**

```
Variable: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
Environment: Preview
Git Branch: develop
Value: pk_test_staging_instance_key

Variable: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
Environment: Production
Value: pk_live_production_instance_key
```

### Environment Variables Automatically Set by Vercel

These are automatically available - **do not add manually**:

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `VERCEL_ENV` | Current environment | `production`, `preview`, or `development` |
| `VERCEL_URL` | Deployment URL | `ai-resume-six-chi.vercel.app` |
| `VERCEL_GIT_COMMIT_REF` | Git branch name | `main`, `develop`, `feature-branch` |
| `NODE_ENV` | Node environment | `production` |

## Deployment Workflow

### Initial Setup

1. **Link GitHub Repository to Vercel:**
   - Already configured for this project
   - Vercel watches the repository for changes

2. **Configure Production Branch:**
   - In Vercel Dashboard → Settings → Git
   - Production Branch: `main`
   - All pushes to `main` deploy to production (chatwithdan.chat)

3. **Preview Deployments:**
   - All other branches automatically deploy to preview URLs
   - `develop` branch → ai-resume-six-chi.vercel.app

### Development Workflow

#### Feature Development
```bash
# 1. Create feature branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/new-feature

# 2. Develop locally
npm run dev
# Test locally at http://localhost:3000

# 3. Test production build locally
npm run build
npm start

# 4. Commit and push
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature

# 5. Create Pull Request to develop
# - Vercel automatically creates a preview deployment
# - Preview URL appears in GitHub PR comments
# - Test the preview deployment
```

#### Deploying to Preview (develop branch)
```bash
# After PR is approved and merged to develop
git checkout develop
git pull origin develop

# Vercel automatically deploys to ai-resume-six-chi.vercel.app
# Monitor deployment in Vercel Dashboard
```

#### Deploying to Production (main branch)
```bash
# 1. Create PR from develop to main
# Review all changes carefully

# 2. After approval, merge to main
git checkout main
git pull origin main
git merge develop
git push origin main

# 3. Vercel automatically deploys to production (chatwithdan.chat)
# Monitor deployment in Vercel Dashboard
```

### Deployment Verification Checklist

After each deployment, verify:

#### Automated Checks (Vercel)
- ✓ Build completes successfully
- ✓ No build errors or warnings
- ✓ Deployment is live

#### Manual Verification
- [ ] Homepage loads correctly
- [ ] Authentication works (sign in/out)
- [ ] Chat interface is responsive
- [ ] AI responses stream correctly
- [ ] Rate limiting functions properly
- [ ] No console errors
- [ ] Performance is acceptable (< 3s initial load)

#### Production-Specific Checks
- [ ] Custom domain resolves correctly (chatwithdan.chat)
- [ ] SSL certificate is valid
- [ ] OpenAI usage shows production model (gpt-5.1-2025-11-13)
- [ ] Clerk production instance is active

## Custom Domain Setup

### Configure chatwithdan.chat

Already configured for this project. For reference:

1. **Add Domain in Vercel:**
   - Project Settings → Domains
   - Add `chatwithdan.chat`
   - Assign to `main` branch (production)

2. **Update DNS Records:**
   - Add CNAME record pointing to Vercel:
     ```
     CNAME: chatwithdan.chat → cname.vercel-dns.com
     ```

3. **SSL Certificate:**
   - Automatically provisioned by Vercel
   - Renews automatically

### Preview Domain

The preview domain `ai-resume-six-chi.vercel.app` is automatically assigned by Vercel.

## Monitoring & Observability

### Vercel Dashboard

Access deployment logs and metrics:
```
Vercel Dashboard → Your Project → Deployments
```

**Key Metrics:**
- Build logs
- Function execution logs
- Real-time errors
- Performance metrics (Pro plan)

### OpenAI Platform

Monitor AI usage and costs:
```
https://platform.openai.com/usage
```

**Filter by:**
- Project ID: Use `OPENAI_PROJECT_ID` for organization
- Trace metadata: `environment`, `model` (set in agent-config.ts)

### Upstash Redis

Monitor rate limiting and storage:
```
https://console.upstash.com/
```

## Troubleshooting

### Build Failures

#### Issue: Module not found errors
**Solution:**
```bash
# Ensure dependencies are in dependencies, not devDependencies
npm install <package> --save

# Verify package.json
cat package.json
```

#### Issue: Type errors during build
**Solution:**
```bash
# Run type checking locally
npm run build

# Check for TypeScript errors
npx tsc --noEmit
```

### Environment Variable Issues

#### Issue: Variables not available in deployment
**Symptoms:**
- Application errors related to missing env vars
- `process.env.VARIABLE_NAME` is undefined

**Solution:**
1. Verify variable is set in Vercel Dashboard
2. Check environment targeting (Production/Preview/Development)
3. **Redeploy** after adding variables (Vercel doesn't auto-redeploy)
   - Go to Deployments → Click "..." → Redeploy

#### Issue: Client-side variables not working
**Symptoms:**
- Variables work on server but not in browser

**Solution:**
- Ensure client-accessible variables use `NEXT_PUBLIC_` prefix
- Example: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- Never expose secrets with `NEXT_PUBLIC_` prefix!

### API Route Timeouts

#### Issue: Functions timeout after 10 seconds
**Symptoms:**
- Error: "Function execution timed out"
- Affects long-running AI agent calls

**Solution (Hobby Plan - 10s limit):**
- Optimize AI agent calls
- Use streaming responses (already implemented)
- Consider caching common responses

**Solution (Pro Plan - 60s limit):**
- Upgrade to Vercel Pro plan
- Timeout automatically increased to 60 seconds

### Deployment Not Triggering

#### Issue: Push to branch doesn't trigger deployment
**Solution:**
1. Check GitHub integration status in Vercel Dashboard
2. Verify branch is not ignored in Git settings
3. Check Vercel deployment logs for errors
4. Manually trigger deployment:
   - Vercel Dashboard → Deployments → Redeploy

### Performance Issues

#### Issue: Slow cold starts
**Symptoms:**
- First request after idle period takes > 5s

**Solution:**
- Expected behavior on Vercel Hobby plan
- Upgrade to Pro plan for reduced cold starts
- Consider implementing warming strategy

#### Issue: Large bundle size
**Symptoms:**
- Slow page loads
- Large JavaScript bundles

**Solution:**
```bash
# Analyze bundle size
npm run build

# Check Next.js bundle analyzer output
# Look for large dependencies to code-split
```

### Clerk Authentication Issues

#### Issue: Users can't sign in on preview deployment
**Solution:**
1. Verify preview deployment uses staging Clerk instance
2. Check authorized domains in Clerk Dashboard include:
   - `*.vercel.app`
   - `ai-resume-six-chi.vercel.app`
3. Ensure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is correct for Preview environment

#### Issue: Sign-in works locally but not on Vercel
**Solution:**
- Check environment variables in Vercel Dashboard
- Verify both `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are set
- Ensure middleware is properly configured (src/middleware.ts)

### Database/Redis Connection Issues

#### Issue: Rate limiting not working
**Solution:**
1. Verify Upstash Redis credentials in Vercel
2. Check Upstash Console for connection logs
3. Test Redis connection:
   ```bash
   # View function logs in Vercel Dashboard
   # Look for Redis connection errors
   ```

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js 15 Documentation](https://nextjs.org/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [Upstash Redis Documentation](https://docs.upstash.com/)
- [OpenAI Platform Documentation](https://platform.openai.com/docs)

## Support

For deployment issues:
1. Check [Vercel Status Page](https://www.vercel-status.com/)
2. Review Vercel deployment logs
3. Check this troubleshooting guide
4. Contact Vercel support (if on paid plan)
