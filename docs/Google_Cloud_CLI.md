# ☁️ Google Console CLI

```bash
# List available configurations
gcloud config configurations list

# Activate a configuration
gcloud config configurations activate <CONFIG_NAME>

# ➕ Create a new configuration
gcloud config configurations create <CONFIG_NAME>

# Set individual properties
gcloud config set project <PROJECT_NAME>
gcloud config set account <EMAIL_ADDRESS>
gcloud config set compute/zone <ZONE_NAME>

# Remove a configuration
gcloud config configurations delete <CONFIG_NAME>

# Billing related
gcloud auth application-default set-quota-project <PROJECT_NAME>
```

**Docs:**

- https://docs.cloud.google.com/sdk/docs/configurations
