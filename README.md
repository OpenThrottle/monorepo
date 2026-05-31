# 🤖 OpenThrottle | AI

[![Continuous Integration](https://github.com/visormatt/monorepo/actions/workflows/continuous-integration.yml/badge.svg?branch=main)](https://github.com/visormatt/monorepo/actions/workflows/continuous-integration.yml?query=branch%3Amain)
[![NX Release](https://github.com/visormatt/monorepo/actions/workflows/nx-release.yml/badge.svg?branch=main)](https://github.com/visormatt/monorepo/actions/workflows/nx-release.yml?query=branch%3Amain)

After years of development, I've refined my tech stack to focus on a core set of battle-tested tools, with TypeScript as the foundation. This monorepo represents the culmination of those learnings - a streamlined, production-ready setup that balances flexibility with maintainability.

**See also:** [docs/](./docs/) for detailed guides; [tools/](./tools/) for Nx plugins and templates; [CONTRIBUTING.md](./CONTRIBUTING.md) and [MONOREPO.md](./MONOREPO.md) for structure and contribution guidelines; [AGENTS.md](./AGENTS.md) for agent and automation guidelines.

- [🤖 OpenThrottle | AI](#-openthrottle--ai)
  - [🤖 Ralph Loops](#-ralph-loops)
  - [🏠 Architecture](#-architecture)
  - [⚙️ Installation](#️-installation)
  - [🧑‍💻 Development](#-development)
    - [Common Commands](#common-commands)
    - [TypeScript Execution (SWC)](#typescript-execution-swc)
    - [Python Applications](#python-applications)
  - [🌳 Reserved Worktrees](#-reserved-worktrees)
    - [Using Reserved Worktrees](#using-reserved-worktrees)
  - [☁️ GCP Auth | gcloud CLI](#️-gcp-auth--gcloud-cli)
  - [🛟 Troubleshooting](#-troubleshooting)

Specific Reads:

- [local-quickstart.md](./docs/openthrottle/local-quickstart.md) — env, migrate, bootstrap, server, MCP verify
- [first-time-onboarding.md](./docs/openthrottle/first-time-onboarding.md)
- [HTML vs Markdown for agents (Ralph research, WIP)](./docs/openthrottle/research/html-over-markdown-for-agents.md)

## 🤖 Ralph Loops

```bash
# From this repository root (adjust POSTGRES_URL if your local DB differs).
export POSTGRES_URL="postgresql://openthrottle_user:openthrottle_password@localhost:6010/openthrottle"

pnpm exec workflow-ralph \
  --plan b0e4bb13-0df3-4d7c-b165-7daf2fdf910e \
  --prompt-file .cursor/commands/agents/ralph.md
```

## 🏠 Architecture

While many [NX](https://nx.dev/) monorepo implementations specialize in either `task running` or `package publishing`, our setup leverages both capabilities. This dual approach enables external applications to seamlessly integrate with and utilize the packages we develop, manage, and publish from this monorepo.

```bash
├── .env.default           # Default environment variables (in VC)
├── applications           # NodeJS client and server applications
├── databases              # OpenThrottle Postgres schema, migrations, and local DB scripts
├── design                 # Reserved for design assets (future)
├── docs                   # Markdown documentation (see docs/)
├── infra                  # Infrastructure as code (e.g. GCP, Terraform)
├── learning               # Reserved for learning notes (future)
├── packages               # Shared packages that can also be published
├── scripts                # Scripts to make life easier (Bash + TypeScript)
├── services               # Shared or standalone services
├── tools                  # Nx plugins, templates, workflows (see tools/)
└──
```

## ⚙️ Installation

> [!IMPORTANT]
> The setup process is automated through an initialization script.
>
> You can run this script **`ANYTIME`** you need to **reset your environment** or resolve **setup-related issues**. See the Troubleshooting section below for common scenarios where running the setup script can help.

```bash
# ⚙️ Run our setup script
./scripts/setup.sh
```

## 🧑‍💻 Development

Monorepos streamline our development process by centralizing code management, enabling faster feedback cycles, and promoting code reuse. With shared tooling, consistent standards, and atomic commits, we can maintain high velocity while ensuring quality. The unified build system and dependency management reduce context switching and eliminate version conflicts, making the development experience both efficient and enjoyable.

```bash
# OpenThrottle local stack (full walkthrough: docs/openthrottle/local-quickstart.md)
pnpm run database:start
pnpm run database:migrate
pnpm nx run openthrottle-server:dev
pnpm nx run openthrottle-developer:dev

# Stop Postgres + Redis when finished
pnpm run database:stop

# Developer UI on the local network
pnpm nx run openthrottle-developer:dev -- --host
```

### Common Commands

```bash
# 📦 Adding a package to monorepo root
pnpm add <PROJECT_NAME> -w -S

# 📦 Adding a package to a specific project
pnpm add <PROJECT_NAME> --filter openthrottle-developer -S

# 🧪 Run only the changed tests and watch for changes
pnpm nx run @tools/generators:test --changed --watch
```

### TypeScript Execution (SWC)

This monorepo uses [SWC](https://swc.rs/) for faster TypeScript execution instead of ts-node. SWC is automatically enabled when the required packages are installed:

- **Packages**: `@swc-node/register@1.11.1` and `@swc/core@1.15.8` (installed as dev dependencies)
- **Configuration**: `NX_SWC="true"` is set in `.env.default`
- **Benefits**: SWC typically provides 2-5x faster TypeScript execution compared to ts-node

NX automatically detects and uses SWC when these packages are installed. No additional configuration is required beyond the environment variable. If you see "falling back to ts-node" warnings, ensure the SWC packages are installed and the environment variable is set.

### Python Applications

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

## 🌳 Reserved Worktrees

This monorepo uses Git worktrees to enable multiple branches to be checked out simultaneously. We maintain four reserved worktrees that are pre-configured and ready to use, avoiding the setup cost of creating new worktrees for each branch:

- `monorepo-worktree-one`, `monorepo-worktree-two`, `monorepo-worktree-three` - For feature branches and general development
- `monorepo-hotfix` - Reserved for hotfixes and urgent one-off fixes

### Using Reserved Worktrees

**Assign a branch to a worktree:**

```bash
# Checkout your branch in an available worktree
cd ../monorepo-worktree-one
git fetch origin
git checkout your-feature-branch
```

**For hotfixes:**

```bash
# Use the dedicated hotfix worktree
cd ../monorepo-hotfix
git fetch origin
git checkout your-hotfix-branch

# or create a new hotfix branch from main
git checkout -b hotfix/urgent-fix main
```

**Sync a branch with main:**

```bash
# From within the worktree
cd ../monorepo-worktree-one
# Always pull main first to ensure it's current
git fetch origin main
git pull origin main
# Then rebase your branch onto main
git rebase origin/main
```

**List all worktrees:**

```bash
git worktree list
```

**Note:** The main `monorepo` directory is reserved for the `main` branch. Each branch can only be checked out in one worktree at a time.

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

## 🛟 Troubleshooting

When issues arise, our goal is to provide straightforward solutions that allow you to quickly reset and restore your development environment to a working state.

**1. Build Issues?**

We can always re-run the setup script `./scripts/setup.sh`

- Ensures we have the latest NodeJS, NX, and Supabase CLI versions
- Then we can install the latest dependencies
- And we'll build/rebuild anything that needs to be built

**2. Database Issues?**

Try stopping and starting Postgres + Redis with the root pnpm scripts:

- `pnpm run database:stop`
- `pnpm run database:start`

See [databases/README.md](./databases/README.md) and [local-quickstart.md](./docs/openthrottle/local-quickstart.md).

**3. Version mismatches?**

To see what versions of a package are installed we can use `pnpm list`. From there we typically need to set a specific resolution in our package.json.

- e.g. `pnpm list react`

**4. Other issues?**

Let me know and we'll get to the bottom of things 🤷
