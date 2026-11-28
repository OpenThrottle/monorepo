# 3.0.0 (2026-11-28)

### 🚀 Features

- **react-router-chat:** chat image follow-ups: vision for local models, header dialog, hardening ([#1037](https://github.com/OpenThrottle/monorepo/pull/1037))
- **react-router-chat:** finish chat restore: newest history, Load earlier, cross-tab prompts ([#1032](https://github.com/OpenThrottle/monorepo/pull/1032))
- **openthrottle-developer:** dock conversations beside the nav with pins and groups ([#1016](https://github.com/OpenThrottle/monorepo/pull/1016))

### 🩹 Fixes

- **react-router-chat:** restore a reopened conversation in full, including a running reply ([#1023](https://github.com/OpenThrottle/monorepo/pull/1023))

### 💅 Refactors

- **react-router-chat:** chat session drawer follow-ups ([#1031](https://github.com/OpenThrottle/monorepo/pull/1031))
- **monorepo:** drop the data. prefix from data/ file names ([#1007](https://github.com/OpenThrottle/monorepo/pull/1007))

### ❤️ Thank You

- Matthew Scholta @visormatt

# 2.0.0 (2026-11-24)

### 🚀 Features

- **monorepo:** fail the client build when a node builtin reaches it ([#476](https://github.com/OpenThrottle/monorepo/pull/476))
- **react-router-chat:** composer quick wins (drafts, recall, undo, fuzzy menus, context meter) ([#957](https://github.com/OpenThrottle/monorepo/pull/957))
- **react-router-auth:** return users to the page they asked for after login ([#899](https://github.com/OpenThrottle/monorepo/pull/899))

### 🩹 Fixes

- **monorepo:** render selected SelectValue labels in SSR markup ([#953](https://github.com/OpenThrottle/monorepo/pull/953))
- **react-router-utils:** remove dev hydration mismatches on 404 and appearance ([#910](https://github.com/OpenThrottle/monorepo/pull/910))

### 💅 Refactors

- **monorepo:** fix the 2026-11-22 rules-conformance findings ([#977](https://github.com/OpenThrottle/monorepo/pull/977))
- ⚠️ **monorepo:** rename the remaining agent backend vocabulary to driver ([#971](https://github.com/OpenThrottle/monorepo/pull/971))
- **nestjs-postgres:** unify pagination and sort-order primitives ([#948](https://github.com/OpenThrottle/monorepo/pull/948))
- **openthrottle-developer:** type GraphQL data with fragments ([#946](https://github.com/OpenThrottle/monorepo/pull/946))
- **react-router-ui-global:** adopt React ViewTransition ([#909](https://github.com/OpenThrottle/monorepo/pull/909))

### 🏡 Chore

- **monorepo:** dead-code sweep 2026-11-22 ([#975](https://github.com/OpenThrottle/monorepo/pull/975))
- **monorepo:** rules conformance sweep (deep imports, route R4, import type) ([#960](https://github.com/OpenThrottle/monorepo/pull/960))
- **monorepo:** phase 1 front-end package updates ([#905](https://github.com/OpenThrottle/monorepo/pull/905))

### ⚠️ Breaking Changes

- **monorepo:** rename the remaining agent backend vocabulary to driver ([#971](https://github.com/OpenThrottle/monorepo/pull/971))
  the GraphQL fields and arguments above are renamed with no
  deprecation window; discover_agent_clis returns driver instead of backend; the
  ot-telemetry report key byBackendModel is now byDriverModel.
  Plan-Id: 3b05db1a-0a98-4532-bb9c-d284d0452204
  Task-Id: 01a208cc-0552-7eb0-84df-314116603ea1
  Task-Id: 01a208cc-0553-757b-a3dc-6bcc2595c8c6
  Task-Id: 01a208cc-0553-79e7-9d67-aef1bbe8e48b"
  M applications/openthrottle-admin/app/routes/resources.chat-options.tsx.graphql
  M applications/openthrottle-developer/app/**generated**/gql.ts
  M applications/openthrottle-developer/app/**generated**/graphql.ts
  M applications/openthrottle-developer/app/**generated**/schemas.ts
  M applications/openthrottle-developer/app/routes/**tests**/plans.$planId._index.loader.test.ts
  M applications/openthrottle-developer/app/routes/**tests**/resources.agent-setup.action.test.ts
  M applications/openthrottle-developer/app/routes/**tests**/settings.agents.test.tsx
  M applications/openthrottle-developer/app/routes/**tests**/settings.preferences.test.tsx
  M applications/openthrottle-developer/app/routes/_index.tsx.graphql
  M applications/openthrottle-developer/app/routes/resources.agent-enabled.tsx
  M applications/openthrottle-developer/app/routes/resources.agent-model-enabled.tsx
  M applications/openthrottle-developer/app/routes/resources.agent-model-favorite.tsx
  M applications/openthrottle-developer/app/routes/resources.agent-models-enabled.tsx
  M applications/openthrottle-developer/app/routes/resources.agent-setup.tsx
  M applications/openthrottle-developer/app/routes/resources.agent-setup.tsx.graphql
  M applications/openthrottle-developer/app/routes/settings.agents.tsx.graphql
  M applications/openthrottle-developer/app/routes/settings.preferences.tsx.graphql
  M applications/openthrottle-developer/app/routing/home/hooks/**tests**/useHomeComposer.test.tsx
  M applications/openthrottle-developer/app/routing/home/utils/**tests**/models.server.test.ts
  M applications/openthrottle-developer/app/routing/home/utils/**tests**/seedComposerDefaultAgent.test.ts
  M applications/openthrottle-developer/app/routing/home/utils/models.server.ts
  M applications/openthrottle-developer/app/routing/home/utils/seedComposerDefaultAgent.ts
  M applications/openthrottle-developer/app/routing/plans/utils/**tests**/plan-run-default-agent.test.ts
  M applications/openthrottle-developer/app/routing/schedule/components/**tests**/ScheduleForm.test.tsx
  M applications/openthrottle-developer/app/routing/schedule/components/**tests**/ScheduleMcpWarning.test.tsx
  M applications/openthrottle-developer/app/routing/schedule/data/agent-cli-mcp.graphql
  M applications/openthrottle-developer/app/routing/schedule/data/data.driver-mcp.ts
  M applications/openthrottle-developer/app/routing/schedule/utils/resolveDriverMcpReachability.ts
  M applications/openthrottle-developer/app/routing/settings/actions/preferences.ts
  M applications/openthrottle-developer/app/routing/settings/components/SettingsAgentsAgentToggle.tsx
  M applications/openthrottle-developer/app/routing/settings/components/SettingsAgentsAuthWarnings.tsx
  M applications/openthrottle-developer/app/routing/settings/components/SettingsAgentsCliControls.tsx
  M applications/openthrottle-developer/app/routing/settings/components/SettingsAgentsModelBulkToggle.tsx
  M applications/openthrottle-developer/app/routing/settings/components/SettingsAgentsModelFavorite.tsx
  M applications/openthrottle-developer/app/routing/settings/components/SettingsAgentsModelRow.tsx
  M applications/openthrottle-developer/app/routing/settings/components/SettingsAgentsModelToggle.tsx
  M applications/openthrottle-developer/app/routing/settings/components/SettingsAgentsTable.tsx
  M applications/openthrottle-developer/app/routing/settings/components/SettingsAgentsTableRow.tsx
  M applications/openthrottle-developer/app/routing/settings/components/SettingsPreferencesAgentSection.tsx
  M applications/openthrottle-developer/app/routing/settings/components/**tests**/SettingsAgentsAgentToggle.test.tsx
  M applications/openthrottle-developer/app/routing/settings/components/**tests**/SettingsAgentsAuthWarnings.test.tsx
  M applications/openthrottle-developer/app/routing/settings/components/**tests**/SettingsAgentsCliControls.test.tsx
  M applications/openthrottle-developer/app/routing/settings/components/**tests**/SettingsAgentsModelBulkToggle.test.tsx
  M applications/openthrottle-developer/app/routing/settings/components/**tests**/SettingsAgentsModelFavorite.test.tsx
  M applications/openthrottle-developer/app/routing/settings/components/**tests**/SettingsAgentsModelRow.test.tsx
  M applications/openthrottle-developer/app/routing/settings/components/**tests**/SettingsAgentsModelToggle.test.tsx
  M applications/openthrottle-developer/app/routing/settings/components/**tests**/SettingsAgentsTable.test.tsx
  M applications/openthrottle-developer/app/routing/settings/components/**tests**/SettingsAgentsTableRow.test.tsx
  M applications/openthrottle-developer/app/routing/settings/components/**tests**/SettingsPreferencesAgentSection.test.tsx
  M applications/openthrottle-developer/app/routing/settings/data/**tests**/agent-cli-registry-parity.test.ts
  M applications/openthrottle-developer/app/routing/settings/data/data.agent-clis.ts
  M applications/openthrottle-developer/app/routing/settings/hooks/**tests**/useSettingsPreferencesAgentForm.test.tsx
  M applications/openthrottle-developer/app/routing/settings/hooks/useSettingsPreferencesAgentForm.tsx
  M applications/openthrottle-developer/app/routing/settings/utils/**tests**/agent-cli-statuses.test.ts
  M applications/openthrottle-developer/app/routing/settings/utils/**tests**/user-preferences.test.ts
  M applications/openthrottle-developer/app/routing/settings/utils/agent-cli-statuses.ts
  M applications/openthrottle-developer/app/routing/settings/utils/user-preferences.ts
  M applications/openthrottle-server/schema.gql
  M applications/openthrottle-server/src/**generated**/graphql.ts
  M applications/openthrottle-server/src/graphql/agent-discovery/agent-discovery.object.ts
  M applications/openthrottle-server/src/graphql/agent-discovery/agent-discovery.resolver.test.ts
  M applications/openthrottle-server/src/graphql/agent-discovery/agent-discovery.resolver.ts
  M applications/openthrottle-server/src/graphql/agent-discovery/agent-discovery.service.test.ts
  M applications/openthrottle-server/src/graphql/agent-discovery/agent-discovery.service.ts
  M applications/openthrottle-server/src/graphql/agent-setup/agent-setup.object.ts
  M applications/openthrottle-server/src/graphql/agent-setup/agent-setup.resolver.test.ts
  M applications/openthrottle-server/src/graphql/agent-setup/agent-setup.resolver.ts
  M applications/openthrottle-server/src/graphql/agent-setup/agent-setup.service.test.ts
  M applications/openthrottle-server/src/graphql/agent-setup/agent-setup.service.ts
  M applications/openthrottle-server/src/graphql/agent-setup/agent-setup.types.ts
  M applications/openthrottle-server/src/graphql/conversation-stream/conversation-stream.resolver.ts
  M applications/openthrottle-server/src/graphql/plans/enqueue-plan-run-tuning/enqueue-plan-run-tuning.utils.ts
  M applications/openthrottle-server/src/graphql/plans/plan-enqueue/plan-enqueue.service.ts
  M applications/openthrottle-server/src/graphql/plans/plan-enqueue/plan-enqueue.types.ts
  M applications/openthrottle-server/src/graphql/plans/plans.resolver.ts
  M applications/openthrottle-server/src/graphql/user-preferences/user-preferences.input.ts
  M applications/openthrottle-server/src/graphql/user-preferences/user-preferences.mapper.ts
  M applications/openthrottle-server/src/graphql/user-preferences/user-preferences.object.ts
  M applications/openthrottle-server/src/graphql/user-preferences/user-preferences.resolver.test.ts
  M applications/openthrottle-server/src/queues/job-run-hooks/job-run-hooks.utils.test.ts
  M applications/openthrottle-server/src/queues/job-run-hooks/job-run-hooks.utils.ts
  M applications/openthrottle-server/src/queues/ot-loop/orchestrator/orchestrator.service.test.ts
  M applications/openthrottle-server/src/queues/ot-loop/orchestrator/orchestrator.service.ts
  M applications/openthrottle-server/src/queues/plan-lifecycle-hooks/plan-lifecycle-hooks.utils.ts
  M applications/openthrottle-server/src/services/plan-creation/plan-creation.service.test.ts
  M applications/openthrottle-server/src/services/plan-creation/plan-creation.service.ts
  M applications/openthrottle-server/src/services/plan-creation/plan-creation.utils.ts
  M applications/openthrottle-server/src/services/plan-run-workspace-preflight/plan-run-workspace-preflight.service.test.ts
  M applications/openthrottle-server/src/services/plan-run-workspace-preflight/plan-run-workspace-preflight.service.ts
  M applications/openthrottle-server/src/services/plan-run-workspace-preflight/plan-run-workspace-preflight.types.ts
  M applications/openthrottle-server/src/services/plan-run-workspace/plan-run-workspace.service.ts
  M applications/openthrottle-website/app/**generated**/graphql.ts
  A databases/openthrottle/migrations/198_rename_user_preferences_default_agent_backend_to_driver.sql
  A databases/openthrottle/migrations/199_rename_user_disabled_agent_clis_backend_to_driver.sql
  A databases/openthrottle/migrations/200_rename_user_favorite_agent_models_backend_to_driver.sql
  M packages/nestjs-repositories-server/src/model-preference-map/model-preference-map.types.ts
  M packages/nestjs-repositories-server/src/model-preference-map/model-preference-map.utils.test.ts
  M packages/nestjs-repositories-server/src/model-preference-map/model-preference-map.utils.ts
  M packages/nestjs-repositories-server/src/modules/user-disabled-agent-clis/user-disabled-agent-cli.entity.ts
  M packages/nestjs-repositories-server/src/modules/user-disabled-agent-clis/user-disabled-agent-clis.factory.ts
  M packages/nestjs-repositories-server/src/modules/user-disabled-agent-clis/user-disabled-agent-clis.repository.test.ts
  M packages/nestjs-repositories-server/src/modules/user-disabled-agent-clis/user-disabled-agent-clis.repository.ts
  M packages/nestjs-repositories-server/src/modules/user-disabled-agent-clis/user-disabled-agent-clis.types.ts
  M packages/nestjs-repositories-server/src/modules/user-disabled-agent-clis/user-disabled-agent-clis.utils.test.ts
  M packages/nestjs-repositories-server/src/modules/user-disabled-agent-clis/user-disabled-agent-clis.utils.ts
  M packages/nestjs-repositories-server/src/modules/user-favorite-agent-models/user-favorite-agent-model.entity.ts
  M packages/nestjs-repositories-server/src/modules/user-favorite-agent-models/user-favorite-agent-models.factory.ts
  M packages/nestjs-repositories-server/src/modules/user-favorite-agent-models/user-favorite-agent-models.repository.test.ts
  M packages/nestjs-repositories-server/src/modules/user-favorite-agent-models/user-favorite-agent-models.repository.ts
  M packages/nestjs-repositories-server/src/modules/user-favorite-agent-models/user-favorite-agent-models.types.ts
  M packages/nestjs-repositories-server/src/modules/user-preferences/preferences-patch/preferences-patch.utils.test.ts
  M packages/nestjs-repositories-server/src/modules/user-preferences/preferences-patch/preferences-patch.utils.ts
  M packages/nestjs-repositories-server/src/modules/user-preferences/user-preferences.constants.ts
  M packages/nestjs-repositories-server/src/modules/user-preferences/user-preferences.entity.ts
  M packages/nestjs-repositories-server/src/modules/user-preferences/user-preferences.factory.ts
  M packages/nestjs-repositories-server/src/modules/user-preferences/user-preferences.repository.test.ts
  M packages/nestjs-repositories-server/src/modules/user-preferences/user-preferences.repository.ts
  M packages/nestjs-repositories-server/src/modules/user-preferences/user-preferences.types.ts
  M packages/openthrottle-agentic-utils/src/types/plan-run-settings.ts
  M packages/openthrottle-agentic-utils/src/utils/**tests**/plan-run-prompt-resolution.test.ts
  M packages/openthrottle-agentic-utils/src/utils/**tests**/runJobRunHookAgent.test.ts
  M packages/openthrottle-agentic-utils/src/utils/conversation-backend/**tests**/agent-discovery.test.ts
  M packages/openthrottle-agentic-utils/src/utils/conversation-backend/**tests**/agent-setup-executor.test.ts
  M packages/openthrottle-agentic-utils/src/utils/conversation-backend/agent-discovery.ts
  M packages/openthrottle-agentic-utils/src/utils/conversation-backend/agent-setup-executor.ts
  M packages/openthrottle-agentic-utils/src/utils/job-run-hooks-runner.ts
  M packages/openthrottle-agentic-utils/src/utils/runJobRunHookAgent.ts
  M packages/openthrottle-mcp/src/**generated**/gql.ts
  M packages/openthrottle-mcp/src/**generated**/graphql.ts
  M packages/openthrottle-mcp/src/**generated**/schemas.ts
  M packages/openthrottle-mcp/src/graphql/agent-discovery.graphql
  M packages/openthrottle-mcp/src/tools/**tests**/agent-discovery.test.ts
  M packages/openthrottle-mcp/src/tools/agent-discovery.ts
  M packages/react-router-chat-state/src/utils/**tests**/chat-discovery-options.test.ts
  M packages/react-router-chat-state/src/utils/chat-discovery-options.ts
  M tools/ot-telemetry/src/utils/metrics/models.ts
  M tools/ot-telemetry/src/utils/metrics/type-guards.ts
  M tools/ot-telemetry/src/utils/renderMarkdownReport.ts

### ❤️ Thank You

- Matthew Scholta @visormatt

## 1.1.0 (2026-11-16)

### 🩹 Fixes

- **react-router-graphql:** redirect server-rejected sessions to login ([#833](https://github.com/OpenThrottle/monorepo/pull/833))

### ❤️ Thank You

- Matthew Scholta @visormatt
