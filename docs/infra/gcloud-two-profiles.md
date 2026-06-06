# Using Two GCP Profiles Simultaneously

Research and setup for using two GCP profiles on the same machine (e.g. two repos, two companies) without logging out and back in when switching.

## Plan context

- **Goal:** One dedicated profile per repo/company; avoid repeated `gcloud auth login` when switching.
- **Use case:** Two repositories on the same machine, each using GCP for different companies (Company 1 and Company 2).

---

## 1. gcloud config configurations (research summary)

### Basics

- **Named configurations** are groups of gcloud properties (project, account, zone, etc.) stored under a config directory.
- **Commands:** `gcloud config configurations list | create <name> | activate <name> | describe <name> | delete <name>`.
- **Data location:** `$HOME/.config/gcloud` by default. Override with **`CLOUDSDK_CONFIG`** (e.g. `~/.config/gcloud-company1`).
- **Active configuration:** At most one configuration is active per gcloud process. It supplies property values for that process.

### Activating a configuration

- **Persistent (current shell):** `gcloud config configurations activate <name>`
- **Single invocation:** `gcloud --configuration=<name> ...` or **`CLOUDSDK_ACTIVE_CONFIG_NAME=<name>`** in the environment.

So you can run different gcloud commands in different terminals (or subshells) with different `CLOUDSDK_ACTIVE_CONFIG_NAME` without changing the “global” active config.

### Multiple accounts / projects

- Each **configuration** can have its own `core/account` and `core/project`.
- You can create one configuration per company (e.g. `company1`, `company2`), authenticate once per config, then switch by activating that config or setting `CLOUDSDK_ACTIVE_CONFIG_NAME`.

### Using configurations in parallel

- **Option A – Same config directory, different active config per process:**
  Use **`CLOUDSDK_ACTIVE_CONFIG_NAME`** (or `--configuration`) in each shell/repo so that each process uses a different named configuration from the same `~/.config/gcloud` (or same `CLOUDSDK_CONFIG`).
- **Option B – Separate config directories per profile:**
  Set **`CLOUDSDK_CONFIG`** to a different directory per repo (e.g. `~/.config/gcloud-company1`, `~/.config/gcloud-company2`). Each directory has its own set of configurations and its own credentials. No cross-talk between repos.

Option B is stronger isolation (separate credentials and configs); Option A is simpler if you’re fine sharing one config directory and only switching the active config per process.

---

## 2. GOOGLE_APPLICATION_CREDENTIALS and config path

- **`GOOGLE_APPLICATION_CREDENTIALS`** points to a **credential JSON file** (e.g. service account key). It is used by **Application Default Credentials (ADC)** and thus by **client libraries** and many tools that call GCP APIs (e.g. Nx GCS cache, Terraform with GCP provider).
- It is **independent** of gcloud’s “configurations”: gcloud uses `CLOUDSDK_*` and its config directory; application code uses ADC (including `GOOGLE_APPLICATION_CREDENTIALS`).
- **Per-repo usage:** Set `GOOGLE_APPLICATION_CREDENTIALS` in the environment for that repo (e.g. in `.env`, direnv, or a wrapper script) to a service account key path that has access only to that company’s project. Then SDK/app code in that repo automatically uses that key.
- **gcloud CLI** does not use `GOOGLE_APPLICATION_CREDENTIALS` for its own auth; it uses the account and credentials in the active gcloud configuration (or the config directory pointed to by `CLOUDSDK_CONFIG`).

So for “two profiles at once”:

- **gcloud CLI:** Use **configurations** (and optionally **`CLOUDSDK_CONFIG`**) so each shell/repo uses the right account/project.
- **Libraries / apps / Terraform / Nx GCS cache:** Use **`GOOGLE_APPLICATION_CREDENTIALS`** (or ADC file in a well-known path) per repo so each process uses the right credentials.

---

## 3. Profile setup: create and authenticate two profiles

Follow these steps once per machine to create two named configurations (e.g. `company1`, `company2`), authenticate each, and set project/account per configuration.

### 3.1 Create the configurations

Using the default config directory (`~/.config/gcloud`):

```bash
# Create first configuration (e.g. Company 1)
gcloud config configurations create company1

# Create second configuration (e.g. Company 2)
gcloud config configurations create company2
```

To use **separate config directories** (Option B) instead, set `CLOUDSDK_CONFIG` before creating configs so each company’s data lives in its own directory:

```bash
# Company 1 config directory
export CLOUDSDK_CONFIG=~/.config/gcloud-company1
gcloud config configurations create default   # or a named config, e.g. company1

# Company 2 config directory (new shell or unset/re-export)
export CLOUDSDK_CONFIG=~/.config/gcloud-company2
gcloud config configurations create default
```

The steps below assume one shared config directory and two named configs (`company1`, `company2`). If you use separate directories, run the same auth and set-project steps inside each directory (by setting `CLOUDSDK_CONFIG` and then running the commands).

### 3.2 Authenticate and set project/account for Company 1

```bash
# Activate the company1 configuration
gcloud config configurations activate company1

# Log in with the account that has access to Company 1’s GCP
gcloud auth login

# Set the default project for this configuration
gcloud config set project YOUR_COMPANY1_PROJECT_ID

# Optional: set default region/zone
gcloud config set compute/region us-central1
gcloud config set compute/zone us-central1-a
```

### 3.3 Authenticate and set project/account for Company 2

```bash
# Switch to the company2 configuration
gcloud config configurations activate company2

# Log in with the account for Company 2
gcloud auth login

# Set the default project for this configuration
gcloud config set project YOUR_COMPANY2_PROJECT_ID

# Optional: set default region/zone
gcloud config set compute/region us-west2
gcloud config set compute/zone us-west2-a
```

### 3.4 Application Default Credentials (for SDKs and tools)

If you use client libraries, Terraform, or tools like Nx GCS cache, they use Application Default Credentials (ADC), not gcloud’s config. For each account, run (with the corresponding config active):

```bash
gcloud config configurations activate company1
gcloud auth application-default login

gcloud config configurations activate company2
gcloud auth application-default login
```

This writes ADC tokens per configuration so that when you activate a config, the default ADC for that context is used. Alternatively, use service account keys and set `GOOGLE_APPLICATION_CREDENTIALS` per repo (e.g. in `.env` or direnv).

### 3.5 Verify

```bash
# List configurations and see which is active
gcloud config configurations list

# Show properties for current config
gcloud config list

# Show active account
gcloud auth list
```

Switch between configs and run the same commands to confirm each configuration has the correct account and project.

---

## 4. Per-repo activation

Once you have two named configurations (e.g. `company1`, `company2`) and ADC set up, you need to **activate the right profile when working in each repo**. Below are practical options; pick one per repo and use it consistently.

### Environment variables that control gcloud and ADC

- **`CLOUDSDK_ACTIVE_CONFIG_NAME`** – Which gcloud configuration is used for that process (e.g. `company1` or `company2`). Affects `gcloud` CLI and, when using ADC from gcloud, which account is used.
- **`GOOGLE_CLOUD_PROJECT`** – Overrides the default project for some client libraries and tools (optional; many tools use the project from the active gcloud config or ADC).
- **`GOOGLE_APPLICATION_CREDENTIALS`** – Path to a service account key JSON file. Used by Application Default Credentials for SDKs and tools (Nx GCS cache, Terraform, etc.). Set per repo if you use service account keys instead of `gcloud auth application-default login`.
- **`CLOUDSDK_CONFIG`** – Overrides the gcloud config directory (e.g. `~/.config/gcloud-company1`). Use this only if you chose Option B (separate config directory per company).

### Option A: `.env` file (manual load)

In each repo, add a `.env` file (and ensure it is in `.gitignore`) with the variables for that company:

```bash
# Repo for Company 1 – .env
CLOUDSDK_ACTIVE_CONFIG_NAME=company1
# Optional, if tools need it:
# GOOGLE_CLOUD_PROJECT=your-company1-project-id
# GOOGLE_APPLICATION_CREDENTIALS=/path/to/company1-sa-key.json
```

Then in that repo, before running gcloud or tools that use GCP:

```bash
set -a
source .env
set +a
```

Or use a tool that loads `.env` automatically (e.g. many Node scripts with `dotenv`). Downside: you must remember to load `.env` in each new shell or terminal.

### Option B: direnv (automatic per directory)

[direnv](https://direnv.net/) loads environment variables when you `cd` into a directory and unloads them when you leave. Install direnv, hook it into your shell, then in **each repo** create a `.envrc`:

```bash
# Repo for Company 1 – .envrc
export CLOUDSDK_ACTIVE_CONFIG_NAME=company1
# Optional:
# export GOOGLE_CLOUD_PROJECT=your-company1-project-id
# export GOOGLE_APPLICATION_CREDENTIALS=/path/to/company1-sa-key.json
```

Run `direnv allow` once in that repo. After that, entering the directory automatically sets the variables; leaving unsets them. Add `.envrc` to `.gitignore` if it contains paths or project IDs you don’t want to commit.

### Option C: Wrapper script that starts a shell

In each repo, add a small script (e.g. `env-company1.sh`) that sets the profile and starts a subshell so all commands in that shell use the right config:

```bash
#!/usr/bin/env bash
# env-company1.sh – use in repo for Company 1
export CLOUDSDK_ACTIVE_CONFIG_NAME=company1
exec "$SHELL"
```

Run `./env-company1.sh` (or `source env-company1.sh`) when you start work in that repo; all subsequent gcloud and tool invocations in that terminal use `company1`. Repeat for Company 2 with a script that sets `company2`.

### Option D: Separate config directory per repo (strong isolation)

If you use **Option B** from section 1 (separate `CLOUDSDK_CONFIG` per company), set that in the same way as above—in `.env`, `.envrc`, or a wrapper script—so that each repo points to its own gcloud config directory (e.g. `~/.config/gcloud-company1`). No need to set `CLOUDSDK_ACTIVE_CONFIG_NAME` if each directory has a single default config.

### Recommendation

- **direnv (Option B)** is the most convenient: one-time setup per repo, automatic on `cd`, no need to remember to source a file.
- **`.env` (Option A)** is simple and works well if your tooling already loads `.env` or you are used to `source .env` in each shell.
- **Wrapper script (Option C)** is explicit and doesn’t require direnv; good if you prefer not to add another tool.
- **Separate config directory (Option D)** is best when you want strict isolation between companies (separate credentials and configs on disk).

---

## 5. Testing the setup

Use two terminals (or two repos) to confirm each uses the intended profile.

### 5.1 Two terminals, same config directory (Option A)

1. **Terminal 1 (Company 1):**

   ```bash
   export CLOUDSDK_ACTIVE_CONFIG_NAME=company1
   gcloud config list
   gcloud auth list
   ```

   Confirm the account and project are Company 1’s.

2. **Terminal 2 (Company 2):**

   ```bash
   export CLOUDSDK_ACTIVE_CONFIG_NAME=company2
   gcloud config list
   gcloud auth list
   ```

   Confirm the account and project are Company 2’s.

3. In each terminal, run a read-only GCP command (e.g. `gcloud projects describe PROJECT_ID`) to ensure the active config is used.

### 5.2 Per-repo with direnv

1. In **Repo 1** (Company 1): add `.envrc` with `export CLOUDSDK_ACTIVE_CONFIG_NAME=company1`, run `direnv allow`, then `cd` out and back in. Run `gcloud config list` and confirm Company 1’s project/account.
2. In **Repo 2** (Company 2): add `.envrc` with `export CLOUDSDK_ACTIVE_CONFIG_NAME=company2`, run `direnv allow`, then `cd` out and back in. Run `gcloud config list` and confirm Company 2’s project/account.
3. Switch between the two repo directories and confirm the active config changes (e.g. `echo $CLOUDSDK_ACTIVE_CONFIG_NAME` and `gcloud config list`).

### 5.3 Separate config directories (Option B)

If you use separate `CLOUDSDK_CONFIG` directories, repeat the same checks with `CLOUDSDK_CONFIG` set (e.g. `export CLOUDSDK_CONFIG=~/.config/gcloud-company1` in one terminal and `~/.config/gcloud-company2` in the other). No need to set `CLOUDSDK_ACTIVE_CONFIG_NAME` if each directory has a single default config.

---

## 6. Short usage guide

| Goal                             | Action                                                                                                                      |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Create two profiles**          | `gcloud config configurations create company1` and `company2` (or use separate `CLOUDSDK_CONFIG` dirs).                     |
| **Auth per profile**             | `gcloud config configurations activate <name>`, then `gcloud auth login` and `gcloud auth application-default login`.       |
| **Use profile in current shell** | `export CLOUDSDK_ACTIVE_CONFIG_NAME=company1` (or use `.env` / direnv / wrapper script in the repo).                        |
| **One-off command**              | `CLOUDSDK_ACTIVE_CONFIG_NAME=company2 gcloud ...` or `gcloud --configuration=company2 ...`.                                 |
| **SDKs / tools (ADC)**           | Set `GOOGLE_APPLICATION_CREDENTIALS` per repo, or run `gcloud auth application-default login` with the right config active. |

**Recommended:** Use **direnv** in each repo with `.envrc` setting `CLOUDSDK_ACTIVE_CONFIG_NAME` (and optionally `GOOGLE_APPLICATION_CREDENTIALS`). Add `.envrc` to `.gitignore` if it contains secrets or project IDs.

---

## 7. References

- [gcloud config configurations](https://cloud.google.com/sdk/gcloud/reference/config/configurations) – list, create, activate, etc.
- [gcloud topic configurations](https://cloud.google.com/sdk/gcloud/reference/topic/configurations) – where configs are stored, `CLOUDSDK_CONFIG`, `CLOUDSDK_ACTIVE_CONFIG_NAME`, `--configuration`.
- [Application Default Credentials](https://cloud.google.com/docs/authentication/application-default-credentials) – search order: `GOOGLE_APPLICATION_CREDENTIALS`, gcloud ADC file, metadata server.
