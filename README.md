# 🤖 OpenThrottle | AI

[Continuous Integration](https://github.com/OpenThrottle/monorepo/actions/workflows/continuous-integration.yml?query=branch%3Amain)
[NX Release](https://github.com/OpenThrottle/monorepo/actions/workflows/nx-release.yml?query=branch%3Amain)

**OpenThrottle** is an open-core, AI-native platform for planning and shipping software. At its core is a Postgres-backed knowledge base of **plans and tasks** with semantic search, exposed to your editor and agents over **MCP**, plus agentic execution (Ralph) and a developer dashboard that shows what's in progress and what shipped. The repo is an Nx + pnpm monorepo with TypeScript throughout.

**New here?** Start with the [documentation index](./docs/README.md), or jump straight to the [Quickstart](./docs/openthrottle/local-quickstart.md) (clone → running server → verified MCP) and [first-time onboarding](./docs/openthrottle/first-time-onboarding.md).

**See also:** [docs/](./docs/README.md) for guides; [tools/](./tools/) for Nx plugins and templates; [CONTRIBUTING.md](./CONTRIBUTING.md) and [MONOREPO.md](./MONOREPO.md) for structure and contribution guidelines; [AGENTS.md](./AGENTS.md) for agent and automation guidelines.

## 🏠 Architecture

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
> You can run this script `ANYTIME` you need to **reset your environment** or resolve **setup-related issues**. See the Troubleshooting section below for common scenarios where running the setup script can help.

```bash
# ⚙️ Run our setup script
./scripts/setup.sh
```

## 🚀 Get Started

OpenThrottle at its core is an AI Harness built within an NX monorepo. The local stack (full walkthrough: [local-quickstart.md](./docs/openthrottle/local-quickstart.md))

```bash
# OpenThrottle
pnpm run database:start
pnpm run database:migrate

# NestJS + GraphQL Server (API)
pnpm nx run openthrottle-server:start

# Server + Developer (UI)
pnpm nx run openthrottle-developer:start

# Import our skills into our DB
pnpm run database:import-agent-assets
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

## 🚦 Project status

OpenThrottle is open core and built in the open. The table below sets expectations before you dive into any one app — everything here is Apache-2.0, but not everything is finished.

| Application              | Status          | What it is                                                          |
| ------------------------ | --------------- | ------------------------------------------------------------------- |
| `openthrottle`           | ✅ Stable       | Quick-start / product landing (the `docker compose up` entrypoint). |
| `openthrottle-server`    | ✅ Stable       | NestJS code-first GraphQL API — the backbone of the platform.       |
| `openthrottle-developer` | ✅ Stable       | The flagship developer portal: plans, projects, notes, generators.  |
| `openthrottle-website`   | ✅ Stable       | Marketing site.                                                     |
| `openthrottle-admin`     | 🧭 Planned      | Corporate management layer. On the roadmap; not production-ready.   |
| `openthrottle-email`     | 🚧 Experimental | A web mail client we're prototyping. Expect rough edges.            |

> [!NOTE] 🧭 **Planned** and 🚧 **Experimental** apps ship as previews so you can see where OpenThrottle is headed. They build and pass CI, but aren't feature-complete — don't depend on them yet.

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

Open a [GitHub issue](https://github.com/OpenThrottle/monorepo/issues) with what you tried and the error output, and we'll help you get unstuck.

## 📄 License

OpenThrottle is **open core**: the core is licensed under the **Apache License, Version 2.0** (see `[LICENSE.md](./LICENSE.md)`), with commercial/enterprise modules reserved under a separate EULA. All current first-party code is Apache-2.0.

See [LICENSING.md](./LICENSING.md) for the open-core boundary — which directories are Apache-2.0 vs EULA, and how to tell.

The code is open source, but the **OpenThrottle name and logo are trademarks** — Apache-2.0 §6 grants no trademark rights. See [TRADEMARK.md](./TRADEMARK.md) for what you may and may not do with the marks.
