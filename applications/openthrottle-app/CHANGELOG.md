# 2.0.0 (2026-11-21)

### 💅 Refactors

- **nestjs-repositories-server:** move the DataSource and retire nestjs-repositories ([#908](https://github.com/OpenThrottle/monorepo/pull/908))

### 🏡 Chore

- ⚠️ **monorepo:** move the runtime and @types/node to Node 26 ([#932](https://github.com/OpenThrottle/monorepo/pull/932))

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

## 1.1.0 (2026-11-16)

This was a version bump only for openthrottle-app to align it with other projects, there were no code changes.
