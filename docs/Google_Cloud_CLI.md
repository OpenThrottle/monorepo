# ☁️ Google Console CLI

```bash
# List available configurations
gcloud config configurations list

# Activate a configuration
gcloud config configurations activate openthrottle-staging

# ➕ Create a new configuration
gcloud config configurations create <NAME>
# gcloud config configurations create openthrottle-staging
# gcloud config configurations create openthrottle-production

# Set individual properties
gcloud config set project openthrottle-production
gcloud config set account matthew.scholta@gmail.com
gcloud config set compute/zone ZONE_NAME

# Remove a configuration
gcloud config configurations delete openthrottle

# Billing related
gcloud auth application-default set-quota-project openthrottle-staging
```

**Docs:**

- https://docs.cloud.google.com/sdk/docs/configurations
