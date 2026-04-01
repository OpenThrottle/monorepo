# Notes

- [Terraform Basics](https://www.youtube.com/watch?v=_45W3Z8XWL4)
- [Terraform on GCP](https://registry.terraform.io/providers/hashicorp/google/latest/docs/guides/getting_started)

```bash
monorepo-production
monorepo-staging
```

```bash
gcloud auth application-default login

# Core Operations
terraform init
terraform plan
terraform apply
terraform destroy

# Describe things
terraform show

# Formatting
terraform fmt
terraform validate
```

```bash
terraform state list
terraform state show google_storage_bucket.mattscholta_terraform_state
```

## Learning

### Datasources

- Read Only Resources
- Query Googles API - retrieve a list of VM's - get the settings

### Functions

- https://developer.hashicorp.com/terraform/language/functions

Interpolation allows us to use a wealth of TF functions

### Outputs

- Retrieve a property of a resources
- Write it out when using plan or apply

## Variables

## Modules

- container for bundling terraform configuration
- we keep them in a single directory
- root modules: default module containing all `.tf` files in main working directory
- child modules: a separate external module referenced from a `.tf` file

## Organization

- tbd..

## Resources

- https://terratest.gruntwork.io
- https://terragrunt.gruntwork.io
- https://www.pulumi.com/gads/terragrunt

## 1Password CLI

- https://developer.1password.com/docs/cli/get-started/

```bash
op --version
op vault list
```
