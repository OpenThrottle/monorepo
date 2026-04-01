#!/usr/bin/env sh
set -e

################################################################################
#
#   This script verifies the GCS bucket setup for Nx remote caching.
#
################################################################################
PRODUCTION=false

PROJECT_ID_PRODUCTION="openthrottle-staging" # FIXME: Using staging only for now
PROJECT_ID_STAGING="openthrottle-staging"
REGION="us-central1"  # Matching the region used in CI/CD

if [ "$PRODUCTION" = true ]; then
  PROJECT_ID="$PROJECT_ID_PRODUCTION"
else
  PROJECT_ID="$PROJECT_ID_STAGING"
fi

echo ""
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo ""
echo "🐳 Uploading Docker images to GCS"
echo ""
