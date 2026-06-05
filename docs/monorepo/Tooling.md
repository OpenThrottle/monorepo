# Tooling

## Various Tools

### 🧩 TypeScript Execution (SWC)

This monorepo uses [SWC](https://swc.rs/) for faster TypeScript execution instead of ts-node. SWC is automatically enabled when the required packages are installed:

- **Packages**: `@swc-node/register@1.11.1` and `@swc/core@1.15.8` (installed as dev dependencies)
- **Configuration**: `NX_SWC="true"` is set in `.env.default`
- **Benefits**: SWC typically provides 2-5x faster TypeScript execution compared to ts-node

NX automatically detects and uses SWC when these packages are installed. No additional configuration is required beyond the environment variable. If you see "falling back to ts-node" warnings, ensure the SWC packages are installed and the environment variable is set.

### 🐍 Python Applications

```bash
# CD into the application

# Setup: Create a virtual environment
python3 -m venv .venv

# Activate the python env
source .venv/bin/activate

# pipenv shell

# Turn it off
deactivate
```

## ☁️ GCP Auth | gcloud CLI

- Good stuff in our [doc here](./docs/infra/gcloud-two-profiles.md)

```bash
# List configurations and see which is active
gcloud config configurations list

# Show properties for current config
gcloud config list

# Show active account
gcloud auth list
```
