#!/usr/bin/env sh
set -e

################################################################################
#
#   This script verifies the GCS bucket setup for Nx remote caching.
#
################################################################################
PRODUCTION=false

BUCKET_PRODUCTION="openthrottle-staging-nx-cache"
BUCKET_STAGING="openthrottle-staging-nx-cache"
PROJECT_ID_PRODUCTION="monorepo-staging"
PROJECT_ID_STAGING="monorepo-staging"
REGION="us-central1"  # Matching the region used in CI/CD

if [ "$PRODUCTION" = true ]; then
  BUCKET_NAME="$BUCKET_PRODUCTION"
  PROJECT_ID="$PROJECT_ID_PRODUCTION"
else
  BUCKET_NAME="$BUCKET_STAGING"
  PROJECT_ID="$PROJECT_ID_STAGING"
fi

echo ""
echo "Project: $PROJECT_ID"
echo "Bucket: $BUCKET_NAME"
echo "Region: $REGION"
echo ""
echo "🔍 Verifying GCS bucket setup for Nx cache"
echo ""

# Set the project
gcloud config set project "$PROJECT_ID" >/dev/null 2>&1 || {
  echo "❌ Error: Could not set GCP project. Make sure gcloud is authenticated."
  exit 1
}

# Check if bucket exists
if gsutil ls -b "gs://$BUCKET_NAME" >/dev/null 2>&1; then
  echo "✅ Bucket $BUCKET_NAME exists"
else
  echo "❌ Bucket $BUCKET_NAME does not exist"
  echo "   Run: ./scripts/setup-gcs-nx-cache.sh to create it"
  exit 1
fi

# Check bucket permissions
echo ""
echo "📋 Checking bucket permissions..."
CURRENT_SA=$(gcloud config get-value account 2>/dev/null || echo "unknown")
echo "Current account: $CURRENT_SA"

# Test write access
TEST_FILE="/tmp/nx-cache-test-$(date +%s).txt"
echo "test" > "$TEST_FILE"
if gsutil cp "$TEST_FILE" "gs://$BUCKET_NAME/test/" >/dev/null 2>&1; then
  echo "✅ Write access confirmed"
  gsutil rm "gs://$BUCKET_NAME/test/$(basename $TEST_FILE)" >/dev/null 2>&1
else
  echo "⚠️  Write access test failed (this is OK if using read-only mode locally)"
fi
rm -f "$TEST_FILE"

# Test read access
if gsutil ls "gs://$BUCKET_NAME" >/dev/null 2>&1; then
  echo "✅ Read access confirmed"
else
  echo "❌ Read access failed"
  exit 1
fi

# Check nx.json configuration
echo ""
echo "📋 Checking nx.json configuration..."
NX_JSON_BUCKET=$(grep '"bucket":' nx.json | sed -E 's/.*"bucket": "([^"]+)".*/\1/')
if [ "$NX_JSON_BUCKET" = "$BUCKET_NAME" ]; then
  echo "✅ nx.json is configured correctly (bucket: $NX_JSON_BUCKET)"
else
  echo "❌ nx.json bucket configuration mismatch"
  echo "   Expected: $BUCKET_NAME"
  echo "   Found:    $NX_JSON_BUCKET"
  exit 1
fi

# Check for activation key
echo ""
echo "📋 Checking activation key..."
if [ -f ".nx/key/key.ini" ]; then
  echo "✅ Activation key found at .nx/key/key.ini"
elif [ -n "$NX_KEY" ]; then
  echo "✅ Activation key found in NX_KEY environment variable"
else
  echo "⚠️  No activation key found (may need to run: nx add @nx/gcs-cache)"
fi

echo ""
echo "✅ Verification complete!"
echo ""
