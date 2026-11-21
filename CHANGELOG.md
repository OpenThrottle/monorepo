# 5.0.0 (2026-11-21)

### 🚀 Features

- **openthrottle-developer:** paginate project plans server-side at 50 ([#941](https://github.com/OpenThrottle/monorepo/pull/941))
- **monorepo:** scaffold nestjs-application and nestjs-repositories-server ([#884](https://github.com/OpenThrottle/monorepo/pull/884))
- **monorepo:** fetch the embedding model automatically on every server boot ([#876](https://github.com/OpenThrottle/monorepo/pull/876))

### 🔥 Performance

- **ci:** keep one Nx cache entry per job on an open PR ([#887](https://github.com/OpenThrottle/monorepo/pull/887))

### 💅 Refactors

- **nestjs-repositories-server:** move the DataSource and retire nestjs-repositories ([#908](https://github.com/OpenThrottle/monorepo/pull/908))

### 🏡 Chore

- ⚠️ **monorepo:** move the runtime and @types/node to Node 26 ([#932](https://github.com/OpenThrottle/monorepo/pull/932))

### 🤖 CI

- **monorepo:** carry the Nx cache across CI machines under Nx 24 ([#892](https://github.com/OpenThrottle/monorepo/pull/892))

### ⚠️ Breaking Changes

- **monorepo:** move the runtime and @types/node to Node 26 ([#932](https://github.com/OpenThrottle/monorepo/pull/932))
  installing the workspace now requires Node >= 26
  (`nvm install` reads .nvmrc), plus `npm install --global corepack` before
  `corepack enable`.
  Plan-Id: 290534e3-66a5-43d7-8228-f7bb9a871698
  Task-Id: 01a1f574-7a15-779a-9511-b8187f6e14b5
  Task-Id: 01a1f574-7a16-761a-90ff-9fdd582f2d9c
  Task-Id: 01a1f574-7a16-772d-818a-57693079b96b"
  M .agents/prompts/Job_ArchitectureDrift.md
  M .agents/prompts/Job_DatabaseHealth.md
  M .agents/prompts/Job_DeadCode.md
  M .agents/prompts/Job_DocDrift.md
  M .agents/prompts/Job_FeatureRegistryRefresh.md
  M .agents/prompts/Job_Issue_Reporting.md
  M .agents/prompts/Job_Performance.md
  M .agents/prompts/Job_ReplayDrift.md
  M .agents/prompts/Job_Roadmap.md
  M .agents/prompts/Job_RulesConformance.md
  M .agents/prompts/Job_Security.md
  M .agents/prompts/Job_TestHealth.md
  M .agents/prompts/Job_WorkInFlight.md
  M .env.default
  M .github/actions/node-setup/action.yml
  M .nvmrc
  M CLAUDE.md
  M Dockerfile.Migrations
  M Dockerfile.NestJS
  M Dockerfile.ReactRouter
  M THIRD-PARTY-LICENSES.md
  M applications/openthrottle-app/docs/architecture.md
  M applications/openthrottle-developer/app/docs-content/docs/architecture.md
  M applications/openthrottle-developer/app/docs-content/docs/docker-builds.md
  M applications/openthrottle-developer/app/docs-content/docs/getting-started.md
  M applications/openthrottle-developer/app/docs-content/docs/troubleshooting.md
  M applications/openthrottle-developer/app/docs-content/faq/pnpm-required.md
  M applications/openthrottle-server/src/queues/plans/plans.processor.test.ts
  M docker-compose.yml
  M docs/tools/templates/TROUBLESHOOTING.md
  M package.json
  M packages/openthrottle-mcp/esbuild.http.mjs
  M pnpm-lock.yaml
  M pnpm-workspace.yaml
  M scripts/**tests**/check-node-engine.test.ts
  M scripts/check-node-engine.mjs
  M scripts/setup.sh
  M scripts/utils/worktree-queue-keys.ts

### ❤️ Thank You

- Matthew Scholta @visormatt

## 4.6.0 (2026-11-16)

| Project                  | From  | To        |
| ------------------------ | ----- | --------- |
| `monorepo`               | 4.5.0 | **4.6.0** |
| `openthrottle-admin`     | 1.0.0 | **1.1.0** |
| `openthrottle-app`       | 1.0.0 | **1.1.0** |
| `openthrottle-cms`       | 1.0.0 | **1.1.0** |
| `openthrottle-developer` | 1.0.0 | **1.1.0** |
| `openthrottle-server`    | 1.3.0 | **1.4.0** |
| `openthrottle-website`   | 1.0.0 | **1.1.0** |

### 🚀 Features

- **openthrottle-server:** keep source code off hosted embedding providers unless opted in ([#863](https://github.com/OpenThrottle/monorepo/pull/863))
- **openthrottle-product:** restore the org profile stats card, drawn from live numbers ([#860](https://github.com/OpenThrottle/monorepo/pull/860))
- **openthrottle-product:** render the org profile with emoji and project status ([#859](https://github.com/OpenThrottle/monorepo/pull/859))
- **ci:** deploy a chosen app to Vercel from any branch on demand ([#855](https://github.com/OpenThrottle/monorepo/pull/855))
- **openthrottle-product:** build every product surface from one typed registry ([#853](https://github.com/OpenThrottle/monorepo/pull/853))
- **openthrottle-server:** move code embeddings onto the unified embedder ([#843](https://github.com/OpenThrottle/monorepo/pull/843))
- **node-client:** add hosted OpenAI and Gemini embedding providers ([#839](https://github.com/OpenThrottle/monorepo/pull/839))
- **openthrottle-server:** guaranteed embeddings with a local model, queue and reconciler ([#834](https://github.com/OpenThrottle/monorepo/pull/834))

### 🩹 Fixes

- **monorepo:** let release PRs through the merge-queue attribution guard ([#874](https://github.com/OpenThrottle/monorepo/pull/874))
- **monorepo:** push local baseline release tags that origin is missing ([#857](https://github.com/OpenThrottle/monorepo/pull/857))
- **openthrottle-server:** keep search responsive while embeddings backfill ([#854](https://github.com/OpenThrottle/monorepo/pull/854))
- **ci:** prune stale CodeQL caches and make node-setup saves opt-in ([#826](https://github.com/OpenThrottle/monorepo/pull/826))
- **ci:** stop Docker and plugin workflows saving duplicate Nx caches ([#824](https://github.com/OpenThrottle/monorepo/pull/824))

### 📖 Documentation

- **monorepo:** add the qa persona and index the agent personas ([#841](https://github.com/OpenThrottle/monorepo/pull/841))

### 🏡 Chore

- **monorepo:** stop committing the test-coverage baseline ([#814](https://github.com/OpenThrottle/monorepo/pull/814))
- **monorepo:** uninstall the vendored improve skill ([#822](https://github.com/OpenThrottle/monorepo/pull/822))
- **monorepo:** run subtree sync via TypeScript, pad CMS table, refresh vendored skills ([#821](https://github.com/OpenThrottle/monorepo/pull/821))

### ❤️ Thank You

- Matthew Scholta @visormatt
- Name
