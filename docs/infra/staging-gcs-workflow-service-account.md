# Staging GCS workflow service account (CI)

This describes how to issue a JSON key for the **staging** Google Cloud service account used by GitHub Actions to access the Nx remote cache bucket, without committing credentials to the repository or Terraform state.

## What Terraform manages

In `infra/environments/staging/`:

- **`google_service_account.gcs_workflow`** — account ID `staging-gcs-workflow` in project `openthrottle-staging` (email: `staging-gcs-workflow@openthrottle-staging.iam.gserviceaccount.com` after apply).
- **`google_storage_bucket_iam_member`** — `roles/storage.objectAdmin` on the Nx cache bucket only (`openthrottle-staging-nx-cache`), not on the Terraform state bucket.

Terraform **does not** create or store JSON keys. Managing keys with `google_service_account_key` would embed private key material in state; avoid that unless your team explicitly accepts keys in Terraform state.

## Create a key (operator, one-time or rotation)

Use `gcloud` as a user who can act as the service account or manage its keys (e.g. project Owner / Service Account Admin):

```bash
gcloud config set project openthrottle-staging

gcloud iam service-accounts keys create ./staging-gcs-workflow-key.json \
  --iam-account=staging-gcs-workflow@openthrottle-staging.iam.gserviceaccount.com
```

Keep the file **only on your machine** until you upload it to GitHub; then delete the local copy (or store it in a team-approved secrets manager if required).

To confirm the account after Terraform apply:

```bash
cd infra/environments/staging && terraform output -raw gcs_workflow_service_account_email
```

## Add the key to GitHub Actions

CI reads the **full JSON** via the repository secret used in `.github/workflows/continuous-integration.yml`:

| Secret                       | Purpose                                                      |
| ---------------------------- | ------------------------------------------------------------ |
| `GOOGLE_CREDENTIALS_STAGING` | JSON key for non-`main` workflows (staging bucket + project) |

Steps:

1. GitHub → **Settings** → **Secrets and variables** → **Actions**.
2. Under **Repository secrets**, create or update **`GOOGLE_CREDENTIALS_STAGING`**.
3. Paste the **entire contents** of the key file (single JSON object). The composite action passes this as `GOOGLE_APPLICATION_CREDENTIALS` / credentials JSON to GCP client libraries and Nx GCS cache.

For organization-level reuse across repos, use **Organization secrets** with the same name pattern if your policy allows.

## Rotation and revocation

1. Create a **new** key with `gcloud iam service-accounts keys create` (as above).
2. Update **`GOOGLE_CREDENTIALS_STAGING`** in GitHub with the new JSON.
3. Run a workflow to confirm Nx GCS cache and GCP steps succeed.
4. **Delete the old key**:

   ```bash
   gcloud iam service-accounts keys list \
     --iam-account=staging-gcs-workflow@openthrottle-staging.iam.gserviceaccount.com

   gcloud iam service-accounts keys delete KEY_ID \
     --iam-account=staging-gcs-workflow@openthrottle-staging.iam.gserviceaccount.com
   ```

Treat leaked keys like compromised passwords: revoke immediately, rotate the secret, and audit bucket access if needed.

## Hardening (optional)

Long-lived JSON keys are convenient but carry theft and rotation overhead. Google recommends **Workload Identity Federation** to let GitHub Actions authenticate to GCP without a downloaded key. See:

- [Best practices for managing service account keys](https://cloud.google.com/iam/docs/best-practices-for-managing-service-account-keys)
- [Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation)

## Related docs

- [Nx GCS cache setup](./nx-gcs-cache-setup.md) — Nx bucket and activation key (`NX_KEY`)
- [gcloud two profiles](./gcloud-two-profiles.md) — ADC vs `GOOGLE_APPLICATION_CREDENTIALS` for local tooling
