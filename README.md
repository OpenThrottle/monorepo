# 🤖 OpenThrottle | AI

[![Continuous Integration](https://github.com/OpenThrottle/monorepo/actions/workflows/continuous-integration.yml/badge.svg?branch=main)](https://github.com/OpenThrottle/monorepo/actions/workflows/continuous-integration.yml?query=branch%3Amain)
[![NX Release](https://github.com/OpenThrottle/monorepo/actions/workflows/nx-release.yml/badge.svg?branch=main)](https://github.com/OpenThrottle/monorepo/actions/workflows/nx-release.yml?query=branch%3Amain)

After years of development, I've refined my tech stack to focus on a core set of battle-tested tools, with TypeScript as the foundation. This monorepo represents the culmination of those learnings - a streamlined, production-ready setup that balances flexibility with maintainability.

**See also:** [docs/](./docs/) for detailed guides; [tools/](./tools/) for Nx plugins and templates; [CONTRIBUTING.md](./CONTRIBUTING.md) and [MONOREPO.md](./MONOREPO.md) for structure and contribution guidelines; [AGENTS.md](./AGENTS.md) for agent and automation guidelines.

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
  --prompt-file .cursor/skills/agents-ralph/SKILL.md
```

Or invoke the `agents-ralph` skill from your agent of choice:

```bash
cursor-agent -p /agents-ralph

claude /agents-ralph

opencode --prompt "skill({ name: "agents-ralph" })"
```

## 🏠 Architecture

While many [NX](https://nx.dev/) monorepo implementations specialize in either `task running` or `package publishing`, our setup leverages both capabilities. This dual approach enables external applications to seamlessly integrate with and utilize the packages we develop, manage, and publish from this monorepo.

```bash
├── .env.default           # Default environment variables (in VC)
├── applications           # NodeJS client and server applications
├── databases              # OpenThrottle Postgres schema, migrations, and local DB scripts
├── docs                   # Markdown documentation (see docs/)
├── infra                  # Infrastructure as code (e.g. GCP, Terraform)
├── packages               # Shared packages that can also be published
├── scripts                # Scripts to make life easier (Bash + TypeScript)
├── services               # Shared or standalone services
├── skills                 # Agent skills (Ralph, code review, generators, …)
└── tools                  # Nx plugins, templates, workflows (see tools/)
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

## 🛟 Troubleshooting

When issues arise, our goal is to provide straightforward solutions that allow you to quickly reset and restore your development environment to a working state.

**1. Build Issues?**

We can always re-run the setup script `./scripts/setup.sh`

- Ensures we have the latest NodeJS and NX versions
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
