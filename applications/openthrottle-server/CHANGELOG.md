# 2.0.0 (2026-11-21)

### 🚀 Features

- **openthrottle-developer:** paginate project plans server-side at 50 ([#941](https://github.com/OpenThrottle/monorepo/pull/941))
- **openthrottle-server:** make projects ordered, cross-repo initiatives ([#930](https://github.com/OpenThrottle/monorepo/pull/930))
- **openthrottle-server:** add webhook-triggered agent jobs and MCP scheduling ([#938](https://github.com/OpenThrottle/monorepo/pull/938))
- **nestjs-repositories-server:** hash ot_sa_ secrets with SHA-256 instead of bcrypt ([#940](https://github.com/OpenThrottle/monorepo/pull/940))
- **openthrottle-server:** refuse deleted or disabled users as cms writers ([#936](https://github.com/OpenThrottle/monorepo/pull/936))
- **openthrottle-server:** database health fixes from the 2026-08-23 sweep ([#888](https://github.com/OpenThrottle/monorepo/pull/888))
- **react-router-chat:** queue chat messages sent while a reply runs ([#880](https://github.com/OpenThrottle/monorepo/pull/880))
- **monorepo:** fetch the embedding model automatically on every server boot ([#876](https://github.com/OpenThrottle/monorepo/pull/876))

### 🩹 Fixes

- **openthrottle-server:** list every registered BullMQ queue on /queues ([#929](https://github.com/OpenThrottle/monorepo/pull/929))
- **openthrottle-server:** refuse service-account callers of the skill-tag vocabulary ([#927](https://github.com/OpenThrottle/monorepo/pull/927))
- **openthrottle-server:** degrade a non-UUID anonymousId in evaluateFeatureFlags ([#926](https://github.com/OpenThrottle/monorepo/pull/926))
- **openthrottle-server:** serve skillAvailability to service-account callers without seeding ([#925](https://github.com/OpenThrottle/monorepo/pull/925))
- **nestjs-graphql:** stop masked errors leaking originalError in production ([#922](https://github.com/OpenThrottle/monorepo/pull/922))
- **openthrottle-showroom:** leave soft-deleted rows out of the snapshot ([#915](https://github.com/OpenThrottle/monorepo/pull/915))
- **openthrottle-server:** give duplicate skill tags a SKILL_TAG_CONFLICT code ([#912](https://github.com/OpenThrottle/monorepo/pull/912))

### 💅 Refactors

- **openthrottle-server:** narrow server modules to the table modules they read ([#913](https://github.com/OpenThrottle/monorepo/pull/913))
- **nestjs-repositories-server:** move the DataSource and retire nestjs-repositories ([#908](https://github.com/OpenThrottle/monorepo/pull/908))
- **nestjs-repositories-server:** move agent trajectories and eval tables ([#907](https://github.com/OpenThrottle/monorepo/pull/907))
- **nestjs-repositories-server:** move agent conversations and token usage ([#906](https://github.com/OpenThrottle/monorepo/pull/906))
- **nestjs-repositories-server:** move tags, skills, rules and prompts tables ([#904](https://github.com/OpenThrottle/monorepo/pull/904))
- **nestjs-repositories-server:** move repositories, scheduled jobs and settings tables ([#903](https://github.com/OpenThrottle/monorepo/pull/903))
- **nestjs-repositories-server:** move agent accounts, skill tags and subscriptions ([#902](https://github.com/OpenThrottle/monorepo/pull/902))
- **nestjs-repositories-server:** move plan runs and plan messages ([#901](https://github.com/OpenThrottle/monorepo/pull/901))
- **nestjs-repositories-server:** move the batch 6 identity tables ([#900](https://github.com/OpenThrottle/monorepo/pull/900))
- **nestjs-repositories-server:** move the batch 5 work-ledger tables ([#898](https://github.com/OpenThrottle/monorepo/pull/898))
- **nestjs-repositories-server:** move the batch 7 core planning tables ([#896](https://github.com/OpenThrottle/monorepo/pull/896))
- **nestjs-repositories-server:** move the batch 4 blog tables ([#894](https://github.com/OpenThrottle/monorepo/pull/894))
- **nestjs-repositories-server:** move the batch 3 per-user agent settings tables ([#893](https://github.com/OpenThrottle/monorepo/pull/893))
- **nestjs-repositories-server:** move the batch 2 telemetry and code-index tables ([#891](https://github.com/OpenThrottle/monorepo/pull/891))
- **nestjs-repositories-server:** move notes into the new repositories package ([#886](https://github.com/OpenThrottle/monorepo/pull/886))

### 📖 Documentation

- **openthrottle-server:** describe deleteTagActionRule as a soft delete ([#911](https://github.com/OpenThrottle/monorepo/pull/911))

### 🏡 Chore

- ⚠️ **monorepo:** move the runtime and @types/node to Node 26 ([#932](https://github.com/OpenThrottle/monorepo/pull/932))
- **monorepo:** upgrade typeorm to 1.1.3 ([#923](https://github.com/OpenThrottle/monorepo/pull/923))
- **monorepo:** phase 3 server and node package updates ([#921](https://github.com/OpenThrottle/monorepo/pull/921))
- **monorepo:** phase 2 server and node package updates ([#917](https://github.com/OpenThrottle/monorepo/pull/917))

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

## 1.4.0 (2026-11-16)

### 🚀 Features

- **openthrottle-developer:** group OT Loop run output by attempt ([#734](https://github.com/OpenThrottle/monorepo/pull/734))
- **openthrottle-server:** put the work ledger behind a forge interface ([#867](https://github.com/OpenThrottle/monorepo/pull/867))
- **openthrottle-server:** keep source code off hosted embedding providers unless opted in ([#863](https://github.com/OpenThrottle/monorepo/pull/863))
- **openthrottle-developer:** show background work progress in the sidebar ([#856](https://github.com/OpenThrottle/monorepo/pull/856))
- **openthrottle-developer:** polish /search and graduate it out of beta ([#852](https://github.com/OpenThrottle/monorepo/pull/852))
- **openthrottle-server:** record worktree removal audit on deregister ([#850](https://github.com/OpenThrottle/monorepo/pull/850))
- **openthrottle-developer:** keep /plans* routes live on status changes ([#851](https://github.com/OpenThrottle/monorepo/pull/851))
- **openthrottle-server:** rank semantic_search with hybrid RRF ([#847](https://github.com/OpenThrottle/monorepo/pull/847))
- **openthrottle-server:** move code embeddings onto the unified embedder ([#843](https://github.com/OpenThrottle/monorepo/pull/843))
- **monorepo:** audit worktree removals and catch orphaned worktree servers ([#845](https://github.com/OpenThrottle/monorepo/pull/845))
- **node-client:** add hosted OpenAI and Gemini embedding providers ([#839](https://github.com/OpenThrottle/monorepo/pull/839))
- **openthrottle-server:** guaranteed embeddings with a local model, queue and reconciler ([#834](https://github.com/OpenThrottle/monorepo/pull/834))
- **openthrottle-server:** fill in ~/.openthrottle/.env on boot for zero-config telemetry ([#823](https://github.com/OpenThrottle/monorepo/pull/823))
- **openthrottle-agentic-loop:** deliver plan inbox messages to headless workers mid-attempt ([#816](https://github.com/OpenThrottle/monorepo/pull/816))

### 🩹 Fixes

- **openthrottle-server:** make the forge layer safe for repos that aren't OpenThrottle ([#870](https://github.com/OpenThrottle/monorepo/pull/870))
- **openthrottle-server:** keep search responsive while embeddings backfill ([#854](https://github.com/OpenThrottle/monorepo/pull/854))
- **agentic-hooks:** keep a run alive across a turn that ends on a question ([#849](https://github.com/OpenThrottle/monorepo/pull/849))
- **openthrottle-cms:** polish the fragment editor's add-child picker ([#844](https://github.com/OpenThrottle/monorepo/pull/844))
- **monorepo:** close the 2026-08 security sweep findings ([#835](https://github.com/OpenThrottle/monorepo/pull/835))
- **monorepo:** refuse to remove a worktree an unsettled plan run is using ([#830](https://github.com/OpenThrottle/monorepo/pull/830))
- **nestjs-repositories-cms:** show unpublished cms layouts only to cms writers ([#825](https://github.com/OpenThrottle/monorepo/pull/825))
- **openthrottle-agentic-utils:** render grok 1.x tool cards and explain cancelled turns ([#820](https://github.com/OpenThrottle/monorepo/pull/820))

### ❤️ Thank You

- Matthew Scholta @visormatt
