#!/usr/bin/env sh
set -e

################################################################################
#
#   This script sets up the GCS bucket for Nx remote caching.
#
################################################################################
PRODUCTION=false

BUCKET_PRODUCTION="monorepo-nx-cache-production"
BUCKET_STAGING="monorepo-nx-cache-staging"
PROJECT_ID_PRODUCTION="monorepo-production-473406"
PROJECT_ID_STAGING="monorepo-production-473406"
REGION="us-west2"  # Matching the region used in CI/CD

if [ "$PRODUCTION" = true ]; then
  BUCKET_NAME="$BUCKET_PRODUCTION"
  PROJECT_ID="$PROJECT_ID_PRODUCTION"
else
  BUCKET_NAME="$BUCKET_STAGING"
  PROJECT_ID="$PROJECT_ID_STAGING"
fi


echo ""
echo "🪣 Setting up GCS bucket for Nx cache"
echo ""
echo "Project: $PROJECT_ID"
echo "Bucket: $BUCKET_NAME"
echo "Region: $REGION"
echo ""

# Set the project
gcloud config set project "$PROJECT_ID"

# Check if bucket already exists
if gsutil ls -b "gs://$BUCKET_NAME" >/dev/null 2>&1; then
  echo "✅ Bucket $BUCKET_NAME already exists"
else
  echo "📦 Creating bucket $BUCKET_NAME..."
  gsutil mb -p "$PROJECT_ID" -c STANDARD -l "$REGION" "gs://$BUCKET_NAME"
  echo "✅ Bucket created successfully"
fi

# Configure bucket settings
echo ""
echo "⚙️  Configuring bucket settings..."

# Enable uniform bucket-level access (required for IAM-based access)
gsutil uniformbucketlevelaccess set on "gs://$BUCKET_NAME"

# Set lifecycle policy to auto-delete objects older than 90 days (optional, adjust as needed)
echo '{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 90}
      }
    ]
  }
}' > /tmp/lifecycle.json

gsutil lifecycle set /tmp/lifecycle.json "gs://$BUCKET_NAME"
rm /tmp/lifecycle.json

echo "✅ Bucket configuration complete"
echo ""

# Display bucket information
echo "📋 Bucket information:"
gsutil ls -L "gs://$BUCKET_NAME" | head -20
echo ""

echo "✅ GCS bucket setup complete!"
echo ""
echo "Next steps:"
echo "1. Ensure your service account has Storage Object Admin or Storage Admin role"
echo "2. Test the cache locally: nx run-many -t build --skip-nx-cache=false"
echo "3. Verify cache entries appear in the bucket: gsutil ls gs://$BUCKET_NAME"
echo ""
