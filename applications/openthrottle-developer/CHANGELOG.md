# 2.0.0 (2026-11-21)

### 🚀 Features

- **openthrottle-developer:** paginate project plans server-side at 50 ([#941](https://github.com/OpenThrottle/monorepo/pull/941))
- **openthrottle-server:** make projects ordered, cross-repo initiatives ([#930](https://github.com/OpenThrottle/monorepo/pull/930))
- **openthrottle-server:** add webhook-triggered agent jobs and MCP scheduling ([#938](https://github.com/OpenThrottle/monorepo/pull/938))
- **react-router-auth:** return users to the page they asked for after login ([#899](https://github.com/OpenThrottle/monorepo/pull/899))
- **react-router-chat:** queue chat messages sent while a reply runs ([#880](https://github.com/OpenThrottle/monorepo/pull/880))
- **monorepo:** fetch the embedding model automatically on every server boot ([#876](https://github.com/OpenThrottle/monorepo/pull/876))

### 🩹 Fixes

- **openthrottle-developer:** stop double-decoding the queue job id ([#931](https://github.com/OpenThrottle/monorepo/pull/931))
- **openthrottle-server:** list every registered BullMQ queue on /queues ([#929](https://github.com/OpenThrottle/monorepo/pull/929))
- **openthrottle-server:** refuse service-account callers of the skill-tag vocabulary ([#927](https://github.com/OpenThrottle/monorepo/pull/927))
- **openthrottle-developer:** make the blog editor theme hydration-safe ([#916](https://github.com/OpenThrottle/monorepo/pull/916))
- **openthrottle-showroom:** leave soft-deleted rows out of the snapshot ([#915](https://github.com/OpenThrottle/monorepo/pull/915))
- **react-router-chat:** gate the conversation list on an authenticated user ([#914](https://github.com/OpenThrottle/monorepo/pull/914))
- **react-router-utils:** remove dev hydration mismatches on 404 and appearance ([#910](https://github.com/OpenThrottle/monorepo/pull/910))
- **openthrottle-server:** give duplicate skill tags a SKILL_TAG_CONFLICT code ([#912](https://github.com/OpenThrottle/monorepo/pull/912))
- **openthrottle-developer:** keep ?stats=open across navigations ([#882](https://github.com/OpenThrottle/monorepo/pull/882))

### 💅 Refactors

- **react-router-ui-global:** adopt React ViewTransition ([#909](https://github.com/OpenThrottle/monorepo/pull/909))
- **nestjs-repositories-server:** move the DataSource and retire nestjs-repositories ([#908](https://github.com/OpenThrottle/monorepo/pull/908))
- **nestjs-repositories-server:** move the batch 7 core planning tables ([#896](https://github.com/OpenThrottle/monorepo/pull/896))
- **nestjs-repositories-server:** move the batch 2 telemetry and code-index tables ([#891](https://github.com/OpenThrottle/monorepo/pull/891))

### 📖 Documentation

- **openthrottle-server:** describe deleteTagActionRule as a soft delete ([#911](https://github.com/OpenThrottle/monorepo/pull/911))

### 🏡 Chore

- ⚠️ **monorepo:** move the runtime and @types/node to Node 26 ([#932](https://github.com/OpenThrottle/monorepo/pull/932))
- **monorepo:** phase 2 server and node package updates ([#917](https://github.com/OpenThrottle/monorepo/pull/917))
- **monorepo:** phase 1 front-end package updates ([#905](https://github.com/OpenThrottle/monorepo/pull/905))

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

### 🚀 Features

- **openthrottle-developer:** group OT Loop run output by attempt ([#734](https://github.com/OpenThrottle/monorepo/pull/734))
- **openthrottle-server:** put the work ledger behind a forge interface ([#867](https://github.com/OpenThrottle/monorepo/pull/867))
- **openthrottle-developer:** collapse route stat cards behind a toolbar toggle ([#864](https://github.com/OpenThrottle/monorepo/pull/864))
- **openthrottle-server:** keep source code off hosted embedding providers unless opted in ([#863](https://github.com/OpenThrottle/monorepo/pull/863))
- **openthrottle-developer:** show background work progress in the sidebar ([#856](https://github.com/OpenThrottle/monorepo/pull/856))
- **openthrottle-developer:** polish /search and graduate it out of beta ([#852](https://github.com/OpenThrottle/monorepo/pull/852))
- **openthrottle-server:** record worktree removal audit on deregister ([#850](https://github.com/OpenThrottle/monorepo/pull/850))
- **openthrottle-developer:** keep /plans* routes live on status changes ([#851](https://github.com/OpenThrottle/monorepo/pull/851))
- **openthrottle-server:** rank semantic_search with hybrid RRF ([#847](https://github.com/OpenThrottle/monorepo/pull/847))
- **openthrottle-server:** move code embeddings onto the unified embedder ([#843](https://github.com/OpenThrottle/monorepo/pull/843))
- **dotfiles:** enforce openthrottle/no-screen in tests ([#840](https://github.com/OpenThrottle/monorepo/pull/840))
- **node-client:** add hosted OpenAI and Gemini embedding providers ([#839](https://github.com/OpenThrottle/monorepo/pull/839))
- **openthrottle-developer:** slim the plans list to title and task count ([#836](https://github.com/OpenThrottle/monorepo/pull/836))
- **openthrottle-server:** guaranteed embeddings with a local model, queue and reconciler ([#834](https://github.com/OpenThrottle/monorepo/pull/834))
- **openthrottle-server:** fill in ~/.openthrottle/.env on boot for zero-config telemetry ([#823](https://github.com/OpenThrottle/monorepo/pull/823))

### 🩹 Fixes

- **openthrottle-server:** make the forge layer safe for repos that aren't OpenThrottle ([#870](https://github.com/OpenThrottle/monorepo/pull/870))
- **openthrottle-developer:** make the plan title link fill the details cell ([#861](https://github.com/OpenThrottle/monorepo/pull/861))
- **openthrottle-server:** keep search responsive while embeddings backfill ([#854](https://github.com/OpenThrottle/monorepo/pull/854))
- **agentic-hooks:** keep a run alive across a turn that ends on a question ([#849](https://github.com/OpenThrottle/monorepo/pull/849))
- **openthrottle-cms:** polish the fragment editor's add-child picker ([#844](https://github.com/OpenThrottle/monorepo/pull/844))
- **monorepo:** close the 2026-08 security sweep findings ([#835](https://github.com/OpenThrottle/monorepo/pull/835))
- **react-router-graphql:** redirect server-rejected sessions to login ([#833](https://github.com/OpenThrottle/monorepo/pull/833))
- **openthrottle-developer:** fix pagination links and dropped filters ([#827](https://github.com/OpenThrottle/monorepo/pull/827))
- **nestjs-repositories-cms:** show unpublished cms layouts only to cms writers ([#825](https://github.com/OpenThrottle/monorepo/pull/825))

### ❤️ Thank You

- Matthew Scholta @visormatt
