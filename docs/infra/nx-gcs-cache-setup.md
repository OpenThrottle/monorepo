# Nx GCS Cache Setup

This document describes the setup and configuration of the Nx GCS (Google Cloud Storage) remote cache for the monorepo.

## Overview

The Nx GCS cache plugin (`@nx/gcs-cache`) enables remote caching of Nx task outputs in a Google Cloud Storage bucket. This allows:

- **Faster CI/CD builds**: Cache hits from previous builds reduce build times
- **Shared cache across PRs**: Different PRs can benefit from each other's cache entries
- **Local development**: Developers can benefit from CI cache when building locally

## Current Configuration

- **Buckets**:
  - **Production**: `monorepo-nx-cache-production`
  - **Staging** (PRs / non-`main`): `monorepo-nx-cache-staging`
- **Two-bucket model**: CI injects `NX_GCS_BUCKET` into `nx.json` at runtime to avoid cache poisoning of the production bucket (CREEP / CVE-2025-36852).
- **Local Mode**: `read-only` (prevents warnings when local credentials don't have write access; still allows reading from remote cache)

## Setup Steps

### 1. Create the GCS Bucket

Run the setup script to create the bucket with proper configuration:

```bash
./scripts/setup-gcs-nx-cache.sh
```

This script will:

- Create the bucket if it doesn't exist
- Configure uniform bucket-level access (required for IAM-based access)
- Set up lifecycle policy to auto-delete objects older than 90 days
- Display bucket information

### 2. Generate Activation Key

The Nx GCS cache plugin requires an activation key for registration. Generate it interactively:

```bash
pnpm exec nx g @nx/gcs-cache:init --bucket=monorepo-nx-cache-staging
```

This will:

- Guide you through registration (free)
- Save the activation key to `.nx/key/key.ini`
- Commit the key file to your repository (for private repos)

**For CI/CD**: If you prefer not to commit the key file, you can set it as a GitHub secret:

1. Go to repository Settings → Secrets and variables → Actions
2. Add a new secret named `NX_KEY` with the activation key value
3. The key will be automatically used in CI/CD workflows

### 3. Verify Setup

Run the verification script to ensure everything is configured correctly:

```bash
./scripts/verify-gcs-nx-cache.sh
```

### 4. Configure Service Account Permissions

The service account used in CI/CD needs the following IAM roles on the bucket:

- **Storage Object Admin** or **Storage Admin** (for read/write access)

To grant permissions:

```bash
# Get the service account email from GitHub Actions secrets
SERVICE_ACCOUNT_EMAIL="your-service-account@visormatt-monorepo.iam.gserviceaccount.com"

# Grant Storage Object Admin role
gsutil iam ch serviceAccount:$SERVICE_ACCOUNT_EMAIL:roles/storage.objectAdmin gs://monorepo-nx-cache-staging
```

### 5. Test Locally (Optional)

If you have GCP credentials configured locally, you can test the cache:

```bash
# Ensure you're authenticated
gcloud auth application-default login

# Run a build task (will use cache if available)
pnpm nx run-many -t build --skip-nx-cache=false

# Verify cache entries were created
gsutil ls gs://monorepo-nx-cache-staging
```

## CI/CD Integration

The cache is automatically used in CI/CD because:

1. **Authentication**: The `.github/actions/google-cloud` action sets up Application Default Credentials
2. **Configuration**: `nx.json` is already configured with the bucket name
3. **Activation Key**: The activation key is stored in `.nx/key/key.ini` (committed to repo) or set via `NX_KEY` GitHub secret

**Note**: This repo currently supplies `NX_KEY` via GitHub Actions variables; consider moving it to a secret if you want it treated as sensitive.

## Monitoring

### Check Cache Hit Rates

Monitor cache effectiveness by:

1. **In CI/CD logs**: Look for cache hit/miss messages in Nx output
2. **Bucket contents**: List objects in the bucket to see cache entries
3. **Build times**: Compare build times before/after cache implementation

### View Cache Entries

```bash
# List all cache entries
gsutil ls -r gs://monorepo-nx-cache-staging

# Count cache entries
gsutil ls -r gs://monorepo-nx-cache-staging | wc -l
```

## Troubleshooting

### Cache Not Working in CI/CD

1. **Verify bucket exists**: Run `gsutil ls -b gs://monorepo-nx-cache-staging`
2. **Check service account permissions**: Ensure the service account has Storage Object Admin role
3. **Verify authentication**: Check that the Google Cloud action is running before Nx commands
4. **Check activation key**: Ensure `NX_KEY` is set or `.nx/key/key.ini` exists

### Local Cache Warnings

If you see warnings about cache not being writable locally:

- This is expected if `localMode` is set to `read-only` in `nx.json`
- To enable local writes, configure GCP credentials: `gcloud auth application-default login`
- Or change `localMode` to `read-write` in `nx.json` (not recommended for most users)

### Bucket Not Found Errors

- Ensure the bucket exists: `gsutil ls -b gs://monorepo-nx-cache-staging`
- Verify the bucket name in `nx.json` matches the actual bucket name
- Check that the project is set correctly: `gcloud config get-value project`

## Lifecycle Management

The bucket is configured with a lifecycle policy that automatically deletes objects older than 90 days. This helps:

- Control storage costs
- Keep the cache fresh
- Remove stale cache entries

To modify the retention period, edit `scripts/setup-gcs-nx-cache.sh` and re-run it, or manually update the lifecycle policy:

```bash
# Update lifecycle policy
gsutil lifecycle set lifecycle.json gs://monorepo-nx-cache-staging
```

## References

- [Nx GCS Cache Documentation](https://nx.dev/nx-api/gcs-cache/documents/overview)
- [Google Cloud Storage Documentation](https://cloud.google.com/storage/docs)
- [Nx Remote Caching Guide](https://nx.dev/core-features/remote-cache)
