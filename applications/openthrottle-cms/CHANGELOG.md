# 3.0.0 (2026-11-28)

### 🚀 Features

- ⚠️ **dotfiles:** enforce one canonical as-const enum shape ([#993](https://github.com/OpenThrottle/monorepo/pull/993))

### 💅 Refactors

- **react-router-graphql:** share a GraphQL error-code reader ([#1030](https://github.com/OpenThrottle/monorepo/pull/1030))
- **monorepo:** drop the data. prefix from data/ file names ([#1007](https://github.com/OpenThrottle/monorepo/pull/1007))
- **monorepo:** consolidate shared helpers into @openthrottle/nodejs-utils ([#994](https://github.com/OpenThrottle/monorepo/pull/994))

### ⚠️ Breaking Changes

- **dotfiles:** enforce one canonical as-const enum shape ([#993](https://github.com/OpenThrottle/monorepo/pull/993))
  an exported enum-like as-const object that is not ALL_CAPS
  with its canonical Key/Value types now fails lint.
  Plan-Id: 86f8330c-24e4-4046-985e-e9747a417bac
  Task-Id: 01a21070-13d3-7816-91a9-1ccab4b548ab
  Task-Id: 01a21070-13d7-713d-beb6-85eabb42d381
  Task-Id: 01a21070-13d7-7a0e-8cbb-117eeb484ae2
  Task-Id: 01a21070-13d7-7c1e-82cc-3def61acd680
  Task-Id: 01a21070-13d7-7e30-a972-5c44bc989b1e
  Task-Id: 01a21070-13d7-7f9d-9b13-8a6a15cda2aa
  Task-Id: 01a21070-13d8-7039-9df7-a4b256a25be0"
  M AGENTS.md
  M applications/openthrottle-admin/app/global/data/data.navigation.ts
  M applications/openthrottle-app/src/bridge/data/data.shell-channels.ts
  M applications/openthrottle-app/src/main/data/data.server-env.ts
  M applications/openthrottle-cms/app/global/data/data.global-table.ts
  M applications/openthrottle-cms/app/routing/auth/data/data.routes.ts
  M applications/openthrottle-cms/app/routing/components/utils/readComponentUpdateForm.ts
  M applications/openthrottle-cms/app/routing/fragments/data/data.children.ts
  M applications/openthrottle-cms/app/routing/fragments/data/data.intents.ts
  M applications/openthrottle-cms/app/routing/fragments/data/data.preview.ts
  M applications/openthrottle-cms/app/routing/fragments/types/fragment-action.ts
  M applications/openthrottle-cms/app/routing/fragments/utils/runFragmentAction.server.ts
  M applications/openthrottle-cms/app/routing/fragments/utils/to-cms-records.ts
  M applications/openthrottle-developer/app/global/config/permissions.ts
  M applications/openthrottle-developer/app/global/data/data.appearance-config.ts
  M applications/openthrottle-developer/app/global/utils/appearance-config.ts
  M applications/openthrottle-developer/app/global/utils/utils.permissions.server.ts
  M applications/openthrottle-developer/app/global/utils/utils.permissions.ts
  M applications/openthrottle-developer/app/routes/**tests**/_index.test.tsx
  M applications/openthrottle-developer/app/routing/blog/config/defaults.ts
  M applications/openthrottle-developer/app/routing/calendar/components/CalendarMonth.tsx
  M applications/openthrottle-developer/app/routing/calendar/data/data.calendar-demo.ts
  M applications/openthrottle-developer/app/routing/dashboard/data/data.get-started-steps.ts
  M applications/openthrottle-developer/app/routing/dashboard/utils/onboarding-steps.ts
  M applications/openthrottle-developer/app/routing/evals/config/defaults.ts
  M applications/openthrottle-developer/app/routing/home/data/data.voice.ts
  M applications/openthrottle-developer/app/routing/home/hooks/useHomeComposer.tsx
  M applications/openthrottle-developer/app/routing/home/hooks/useVoiceInput.tsx
  M applications/openthrottle-developer/app/routing/home/utils/**tests**/resolveMicState.test.ts
  M applications/openthrottle-developer/app/routing/home/utils/**tests**/seedComposerDefaultAgent.test.ts
  M applications/openthrottle-developer/app/routing/home/utils/resolveMicState.ts
  M applications/openthrottle-developer/app/routing/ide/utils/toSemanticStatus.ts
  M applications/openthrottle-developer/app/routing/oauth/data/data.copy.ts
  M applications/openthrottle-developer/app/routing/plans/data/data.plan-inbox.ts
  M applications/openthrottle-developer/app/routing/plans/data/data.plan-lifecycle-events.ts
  M applications/openthrottle-developer/app/routing/plans/data/data.plan-run-history.ts
  M applications/openthrottle-developer/app/routing/plans/utils/linked-artifact-payload.ts
  M applications/openthrottle-developer/app/routing/plans/utils/plan-run-model-effort.ts
  M applications/openthrottle-developer/app/routing/plans/utils/plan-run-sections.ts
  M applications/openthrottle-developer/app/routing/plans/utils/plan-schedule-conflict.ts
  M applications/openthrottle-developer/app/routing/prompts/hooks/usePromptCreateForm.ts
  M applications/openthrottle-developer/app/routing/prompts/utils/prompt-type-guards.ts
  M applications/openthrottle-developer/app/routing/schedule/components/ScheduleKindFields.tsx
  M applications/openthrottle-developer/app/routing/schedule/data/data.driver-mcp.ts
  M applications/openthrottle-developer/app/routing/schedule/data/data.schedule-kind.ts
  M applications/openthrottle-developer/app/routing/schedule/data/data.webhook.ts
  M applications/openthrottle-developer/app/routing/schedule/utils/resolveDriverMcpReachability.ts
  M applications/openthrottle-developer/app/routing/settings/actions/preferences.ts
  M applications/openthrottle-developer/app/routing/settings/data/data.agent-clis.ts
  M applications/openthrottle-developer/app/routing/settings/data/data.appearance.ts
  M applications/openthrottle-developer/app/routing/settings/data/data.preferences.ts
  M applications/openthrottle-developer/app/routing/settings/repositories/utils/discovery-problems.ts
  M applications/openthrottle-developer/app/routing/settings/repositories/utils/worktree-badges.ts
  M applications/openthrottle-developer/app/routing/skills/actions/project-skill-tags.ts
  M applications/openthrottle-developer/app/routing/skills/components/SkillCreateDestinationField.tsx
  M applications/openthrottle-developer/app/routing/skills/components/**tests**/SkillCreateDestinationField.test.tsx
  M applications/openthrottle-developer/app/routing/skills/components/**tests**/SkillCreateForm.test.tsx
  M applications/openthrottle-developer/app/routing/skills/config/skill-create.ts
  M applications/openthrottle-developer/app/routing/skills/data/data.copy.ts
  M applications/openthrottle-developer/app/routing/skills/hooks/useSkillCreateForm.tsx
  M applications/openthrottle-developer/app/routing/skills/utils/createSkillFile.server.ts
  M applications/openthrottle-developer/app/routing/timeline/components/TimelineControls.tsx
  M applications/openthrottle-developer/app/routing/timeline/components/TimelineScreen.tsx
  M applications/openthrottle-developer/app/routing/timeline/config/defaults.ts
  M applications/openthrottle-developer/app/routing/timeline/utils/parsers.ts
  M applications/openthrottle-developer/app/routing/timeline/utils/search-params.ts
  M applications/openthrottle-developer/app/routing/usage/data/data.skill-usage-copy.ts
  M applications/openthrottle-developer/app/routing/usage/data/data.telemetry-coverage-copy.ts
  M applications/openthrottle-developer/app/routing/usage/data/data.token-usage-copy.ts
  M applications/openthrottle-server/src/config/config.constants.ts
  M applications/openthrottle-server/src/graphql/blog/blog-reference-entity.enum.ts
  M applications/openthrottle-server/src/graphql/blog/blog-reference-not-found-error.object.ts
  M applications/openthrottle-server/src/graphql/code-search/code-search.constants.ts
  M applications/openthrottle-server/src/graphql/conversation-stream/conversation-stream.resolver.ts
  M applications/openthrottle-server/src/graphql/conversation-stream/conversation-stream.types.ts
  M applications/openthrottle-server/src/graphql/conversation-stream/conversation-stream.utils.ts
  M applications/openthrottle-server/src/graphql/editor-presence/editor-presence-state.enum.ts
  M applications/openthrottle-server/src/graphql/editor-presence/editor-presence.object.ts
  M applications/openthrottle-server/src/graphql/id-refs/id-refs.enum.ts
  M applications/openthrottle-server/src/graphql/id-refs/id-refs.object.ts
  M applications/openthrottle-server/src/graphql/metrics/container-metrics.object.ts
  M applications/openthrottle-server/src/graphql/metrics/metric-scope.enum.ts
  M applications/openthrottle-server/src/graphql/metrics/psi-cpu-metrics.object.ts
  M applications/openthrottle-server/src/graphql/metrics/system-cpu-metrics.object.ts
  M applications/openthrottle-server/src/graphql/metrics/system-metrics-snapshot.object.ts
  M applications/openthrottle-server/src/graphql/metrics/wall-clock-metrics.object.ts
  M applications/openthrottle-server/src/graphql/plans/plan-enqueue/plan-enqueue.constants.ts
  M applications/openthrottle-server/src/graphql/plans/plan-status/plan-status.constants.ts
  M applications/openthrottle-server/src/graphql/plans/plan.input.ts
  M applications/openthrottle-server/src/graphql/plans/plans.resolver.test.ts
  M applications/openthrottle-server/src/graphql/plans/plans.resolver.ts
  M applications/openthrottle-server/src/graphql/prompts/agent-asset-search.input.ts
  M applications/openthrottle-server/src/graphql/prompts/agent-asset-search.object.ts
  M applications/openthrottle-server/src/graphql/prompts/agent-asset-search/agent-asset-search.resolver.test.ts
  M applications/openthrottle-server/src/graphql/prompts/agent-asset-search/agent-asset-search.resolver.ts
  M applications/openthrottle-server/src/graphql/prompts/custom-prompt.input.ts
  M applications/openthrottle-server/src/graphql/prompts/custom-prompt.object.ts
  M applications/openthrottle-server/src/graphql/prompts/prompts.resolver.test.ts
  M applications/openthrottle-server/src/graphql/queues/queues.utils.ts
  M applications/openthrottle-server/src/graphql/scheduled-agent-jobs/scheduled-agent-jobs.constants.ts
  M applications/openthrottle-server/src/graphql/telemetry-coverage/telemetry-coverage.constants.ts
  M applications/openthrottle-server/src/graphql/timeline/timeline.enum.ts
  M applications/openthrottle-server/src/graphql/timeline/timeline.input.ts
  M applications/openthrottle-server/src/graphql/timeline/timeline.object.ts
  M applications/openthrottle-server/src/graphql/timeline/timeline.resolver.test.ts
  M applications/openthrottle-server/src/graphql/timeline/timeline.resolver.ts
  M applications/openthrottle-server/src/graphql/timeline/timeline.utils.test.ts
  M applications/openthrottle-server/src/graphql/timeline/timeline.utils.ts
  M applications/openthrottle-server/src/graphql/token-usage/token-usage-batch.mapper.ts
  M applications/openthrottle-server/src/graphql/user-preferences/user-preferences.input.ts
  M applications/openthrottle-server/src/graphql/user-preferences/user-preferences.object.ts
  M applications/openthrottle-server/src/graphql/user-preferences/user-preferences.resolver.test.ts
  M applications/openthrottle-server/src/graphql/work-ledger/artifact-type-registry/artifact-type-registry.constants.ts
  M applications/openthrottle-server/src/graphql/workspace-settings/discovered-worktree/discovered-worktree.resolver.test.ts
  M applications/openthrottle-server/src/graphql/workspace-settings/discovered-worktrees.object.ts
  M applications/openthrottle-server/src/graphql/workspace-settings/prune-worktree-checkouts.object.ts
  M applications/openthrottle-server/src/graphql/workspace-settings/user-workspace-profile-validation/user-workspace-profile-validation.utils.test.ts
  M applications/openthrottle-server/src/graphql/workspace-settings/user-workspace-profile-validation/user-workspace-profile-validation.utils.ts
  M applications/openthrottle-server/src/graphql/workspace-settings/user-workspace-profile.mapper.test.ts
  M applications/openthrottle-server/src/graphql/workspace-settings/user-workspace-profile.mapper.ts
  M applications/openthrottle-server/src/graphql/workspace-settings/user-workspace-profile.object.ts
  M applications/openthrottle-server/src/graphql/workspace-settings/workspace-editor-config-application.object.ts
  M applications/openthrottle-server/src/graphql/workspace-settings/workspace-editor-id.enum.ts
  M applications/openthrottle-server/src/graphql/workspace-settings/workspace-folders.object.ts
  M applications/openthrottle-server/src/graphql/workspace-settings/workspace-folders/workspace-folders.service.ts
  M applications/openthrottle-server/src/graphql/workspace-settings/workspace-settings.input.ts
  M applications/openthrottle-server/src/graphql/workspace-settings/workspace-settings.resolver.test.ts
  M applications/openthrottle-server/src/notifications/notifications.service.ts
  M applications/openthrottle-server/src/queues/bullmq-keyed-run-logging/bullmq-keyed-run-logging.constants.ts
  M applications/openthrottle-server/src/queues/ot-loop/orchestrator/orchestrator.service.ts
  M applications/openthrottle-server/src/queues/ot-loop/ot-loop-client.factory.ts
  M applications/openthrottle-server/src/queues/ot-loop/ot-loop.types.ts
  M applications/openthrottle-server/src/queues/ot-loop/ot-loop.utils.ts
  M applications/openthrottle-server/src/queues/plan-rules/action-executor-registry/action-executor-registry.service.ts
  M applications/openthrottle-server/src/queues/plan-rules/action-executor-registry/action-executor-registry.types.ts
  M applications/openthrottle-server/src/queues/plan-rules/plan-rules.constants.ts
  M applications/openthrottle-server/src/queues/scheduled-agent-jobs/failure-notifier/failure-notifier.service.ts
  M applications/openthrottle-server/src/queues/scheduled-agent-jobs/failure-notifier/failure-notifier.types.ts
  M applications/openthrottle-server/src/queues/scheduled-agent-jobs/failure-notifier/failure-notifier.utils.ts
  M applications/openthrottle-server/src/queues/scheduled-agent-jobs/scheduled-agent-jobs.processor.ts
  M applications/openthrottle-server/src/queues/tagging/tagging.constants.ts
  M applications/openthrottle-server/src/services/background-activity-registry/background-activity-registry.constants.ts
  M applications/openthrottle-server/src/services/foreign-skill-injection/worktree-skill-overlay/worktree-skill-overlay.constants.ts
  M applications/openthrottle-server/src/services/ot-worktree-script/ot-worktree-script.constants.ts
  M applications/openthrottle-server/src/services/plan-project-membership/plan-project-membership.constants.ts
  M applications/openthrottle-server/src/services/plan-run-worktree-cleanup/plan-run-worktree-cleanup.constants.ts
  M applications/openthrottle-server/src/services/plan-run-worktree-reaper/plan-run-worktree-reaper.constants.ts
  M applications/openthrottle-server/src/services/plan-run-worktree-teardown/plan-run-worktree-teardown.constants.ts
  M applications/openthrottle-server/src/services/source-control/source-control.constants.ts
  M applications/openthrottle-server/src/services/tag-action-rule-preview/tag-action-rule-preview.types.ts
  M applications/openthrottle-server/src/services/tag-action-rules/tag-action-rules.utils.ts
  M applications/openthrottle-server/src/services/worktree-activity/worktree-activity.constants.ts
  M applications/openthrottle-server/src/services/worktree-checkout-prune/worktree-checkout-prune.constants.ts
  M applications/openthrottle-server/src/services/worktree-discovery/worktree-discovery.constants.ts
  M applications/openthrottle-server/src/services/worktree-root/worktree-root.constants.ts
  M docs/monorepo/code-style.md
  M packages/agentic-evals/src/types/eval-run.ts
  M packages/agentic-hooks/src/adapters/claude/doctor-checks.ts
  M packages/agentic-hooks/src/adapters/claude/doctor-fix-run.ts
  M packages/agentic-replay-testing/src/config/config.backends.ts
  M packages/agentic-replay-testing/src/types/scenario.ts
  M packages/agentic-replay-testing/src/types/transcript.ts
  M packages/agentic-replay-testing/src/utils/drift/compareTranscripts.ts
  M packages/agentic-replay-testing/src/utils/drift/index.ts
  M packages/agentic-replay-testing/src/utils/replay/prepareReplay.ts
  M packages/agentic-replay-testing/src/utils/transcript/transcript.ts
  M packages/nestjs-logging/src/config/config.constants.ts
  M packages/nestjs-postgres/src/postgres-profiling/postgres-profiling.constants.ts
  M packages/nestjs-postgres/src/sort-order/sort-order.constants.ts
  M packages/nestjs-rbac/src/roles/roles.constants.ts
  M packages/nestjs-repositories-cms/src/config/config.constants.ts
  M packages/nestjs-repositories-server/src/capture-health/capture-health.constants.ts
  M packages/nestjs-repositories-server/src/modules/agent-accounts/agent-accounts.constants.ts
  M packages/nestjs-repositories-server/src/modules/agent-conversation-messages/agent-conversation-messages.constants.ts
  M packages/nestjs-repositories-server/src/modules/agent-conversations/agent-conversations.constants.ts
  M packages/nestjs-repositories-server/src/modules/agent-token-usage/agent-token-usage.constants.ts
  M packages/nestjs-repositories-server/src/modules/agent-trajectories/agent-trajectories.constants.ts
  M packages/nestjs-repositories-server/src/modules/blog-posts/blog-posts.constants.ts
  M packages/nestjs-repositories-server/src/modules/blog-posts/visibility/visibility.constants.ts
  M packages/nestjs-repositories-server/src/modules/blog-posts/write-result/write-result.constants.ts
  M packages/nestjs-repositories-server/src/modules/eval-datasets/eval-datasets.constants.ts
  M packages/nestjs-repositories-server/src/modules/eval-grades/eval-grades.constants.ts
  M packages/nestjs-repositories-server/src/modules/eval-human-labels/eval-human-labels.constants.ts
  M packages/nestjs-repositories-server/src/modules/eval-judge-calibrations/eval-judge-calibrations.constants.ts
  M packages/nestjs-repositories-server/src/modules/eval-runs/eval-runs.constants.ts
  M packages/nestjs-repositories-server/src/modules/eval-trials/eval-trials.constants.ts
  M packages/nestjs-repositories-server/src/modules/oauth/oauth.constants.ts
  M packages/nestjs-repositories-server/src/modules/plan-messages/plan-messages.constants.ts
  M packages/nestjs-repositories-server/src/modules/plan-output-stream/plan-output-stream.constants.ts
  M packages/nestjs-repositories-server/src/modules/plan-runs/plan-runs.constants.ts
  M packages/nestjs-repositories-server/src/modules/plan-tags/tag-source/tag-source.constants.ts
  M packages/nestjs-repositories-server/src/modules/rule-applications/rule-applications.constants.ts
  M packages/nestjs-repositories-server/src/modules/scheduled-agent-job-webhook-triggers/scheduled-agent-job-webhook-triggers.constants.ts
  M packages/nestjs-repositories-server/src/modules/skill-tags/skill-tags.constants.ts
  M packages/nestjs-repositories-server/src/modules/skill-usage-events/skill-usage-events.constants.ts
  M packages/nestjs-repositories-server/src/modules/skill-usage-outcomes/skill-usage-outcomes.constants.ts
  M packages/nestjs-repositories-server/src/modules/tag-action-rules/tag-action-rule.entity.ts
  M packages/nestjs-repositories-server/src/modules/tasks/tasks.constants.ts
  M packages/nestjs-repositories-server/src/modules/telemetry-heartbeats/telemetry-heartbeats.constants.ts
  M packages/nestjs-repositories-server/src/modules/user-preferences/user-preferences.constants.ts
  M packages/nestjs-repositories-server/src/modules/user-workspace-settings/user-workspace-settings.constants.ts
  M packages/nestjs-repositories-server/src/modules/work-artifacts/work-artifacts.constants.ts
  M packages/nestjs-repositories-server/src/modules/work-sessions/work-sessions.constants.ts
  M packages/nestjs-repositories-server/src/plan-task-status/plan-task-status.constants.ts
  M packages/nestjs-rollout/src/modules/rollout-flags/rollout-flags.constants.ts
  M packages/openthrottle-agentic-loop/src/contract/loop-contract.ts
  M packages/openthrottle-agentic-loop/src/data/data.ansi.ts
  M packages/openthrottle-agentic-loop/src/data/data.git.ts
  M packages/openthrottle-agentic-loop/src/utils/**tests**/loop-fakes.ts
  M packages/openthrottle-agentic-loop/src/utils/plan-run-pr-draft.ts
  M packages/openthrottle-agentic-utils/src/config/index.ts
  M packages/openthrottle-agentic-utils/src/data/artwork.ts
  M packages/openthrottle-agentic-utils/src/utils/agent-config-trust.ts
  M packages/openthrottle-agentic-utils/src/utils/conversation-backend/**tests**/control-honoring.guard.test.ts
  M packages/openthrottle-agentic-utils/src/utils/conversation-backend/**tests**/types.test.ts
  M packages/openthrottle-agentic-utils/src/utils/conversation-backend/acp/**tests**/agent-specs.test.ts
  M packages/openthrottle-agentic-utils/src/utils/conversation-backend/acp/agent-specs.ts
  M packages/openthrottle-agentic-utils/src/utils/conversation-backend/acp/events.ts
  M packages/openthrottle-agentic-utils/src/utils/conversation-backend/acp/permissions.ts
  M packages/openthrottle-agentic-utils/src/utils/conversation-backend/agent-account/parse.ts
  M packages/openthrottle-agentic-utils/src/utils/conversation-backend/agent-account/types.ts
  M packages/openthrottle-agentic-utils/src/utils/conversation-backend/agent-discovery.ts
  M packages/openthrottle-agentic-utils/src/utils/conversation-backend/antigravity/argv.ts
  M packages/openthrottle-agentic-utils/src/utils/conversation-backend/claude/argv.ts
  M packages/openthrottle-agentic-utils/src/utils/conversation-backend/claude/auth-status.ts
  M packages/openthrottle-agentic-utils/src/utils/conversation-backend/claude/index.ts
  M packages/openthrottle-agentic-utils/src/utils/conversation-backend/codex/argv.ts
  M packages/openthrottle-agentic-utils/src/utils/conversation-backend/cursor-agent/argv.ts
  M packages/openthrottle-agentic-utils/src/utils/conversation-backend/cursor-agent/errors.ts
  M packages/openthrottle-agentic-utils/src/utils/conversation-backend/grok/argv.ts
  M packages/openthrottle-agentic-utils/src/utils/conversation-backend/opencode/mcp-config.ts
  M packages/openthrottle-agentic-utils/src/utils/conversation-backend/types.ts
  M packages/openthrottle-agentic-utils/src/utils/foreign-skill-injection/git-exclude.ts
  M packages/openthrottle-agentic-utils/src/utils/foreign-skill-injection/index.ts
  M packages/openthrottle-agentic-utils/src/utils/foreign-skill-injection/ledger.ts
  M packages/openthrottle-agentic-utils/src/utils/foreign-skill-injection/materialize.ts
  M packages/openthrottle-agentic-utils/src/utils/foreign-skill-injection/types.ts
  M packages/openthrottle-agentic-utils/src/utils/run-identity-env.ts
  M packages/openthrottle-agentic-utils/src/utils/runJobRunHookAgent.ts
  M packages/openthrottle-agentic-utils/src/utils/structured-output/withStructuredOutput.ts
  M packages/openthrottle-agentic-utils/src/utils/workflow.ts
  M packages/openthrottle-desktop-bridge/src/data/data.desktop-bridge.ts
  M packages/openthrottle-drivers/src/data/data.tool-argument.ts
  M packages/openthrottle-drivers/src/drivers/index.ts
  M packages/openthrottle-drivers/src/registry/index.ts
  M packages/openthrottle-drivers/src/run-agent-prompt/index.ts
  M packages/openthrottle-drivers/src/types/index.ts
  M packages/openthrottle-drivers/src/utils/account-error.ts
  M packages/openthrottle-drivers/src/utils/formatToolLine.ts
  M packages/openthrottle-drivers/src/utils/output-format.ts
  M packages/openthrottle-drivers/src/utils/reasoning-effort.ts
  M packages/openthrottle-mcp-evals/src/code-search/eval-case.ts
  M packages/openthrottle-mcp-evals/src/search-ranking/eval-case.ts
  M packages/openthrottle-mcp-evals/src/search-ranking/scoring.ts
  M packages/openthrottle-mcp-evals/src/tool-selection/eval-case.ts
  M packages/openthrottle-notifications/src/**tests**/events.test.ts
  M packages/openthrottle-notifications/src/events.ts
  M packages/openthrottle-notifications/src/index.ts
  M packages/openthrottle-plan-config/src/plan-run-config-snapshot.types.ts
  M packages/openthrottle-plan-config/src/plan-run-config-storage.types.ts
  M packages/openthrottle-product/src/data/data.statsGraphic.ts
  M packages/openthrottle-showroom/src/episodes/derived.ts
  M packages/openthrottle-showroom/src/episodes/types.ts
  M packages/openthrottle-showroom/src/fixtures/demo-content.ts
  M packages/openthrottle-showroom/src/index.ts
  M packages/openthrottle-showroom/src/narrate/selectRenderMode.ts
  M packages/openthrottle-showroom/src/narrate/types.ts
  M packages/openthrottle-showroom/src/snapshot/manifest.ts
  M packages/openthrottle-skills/src/**tests**/explainTagActionRuleMatch.test.ts
  M packages/openthrottle-skills/src/explainTagActionRuleMatch.ts
  M packages/openthrottle-skills/src/index.ts
  M packages/openthrottle-skills/src/rankMatchedTagActions.ts
  M packages/openthrottle-skills/src/skill-discovery.ts
  M packages/openthrottle-skills/src/tag-actions.ts
  M packages/react-router-chat-state/src/config/chat-capabilities.ts
  M packages/react-router-chat-state/src/data/**tests**/data.atom.chat-toolbar.test.ts
  M packages/react-router-chat-state/src/data/data.chat-toolbar-state.ts
  M packages/react-router-chat-state/src/hooks/**tests**/useSessionPermissionDecay.test.ts
  M packages/react-router-chat-state/src/hooks/useHeaderChatController.tsx
  M packages/react-router-chat-state/src/utils/**tests**/chat-model-option.test.ts
  M packages/react-router-chat-state/src/utils/**tests**/decayElevatedPermissionModes.test.ts
  M packages/react-router-chat-state/src/utils/**tests**/reconcileChatToolbarState.test.ts
  M packages/react-router-chat-state/src/utils/**tests**/writeChatToolbarBackendPref.test.ts
  M packages/react-router-chat-state/src/utils/buildChatTurnFields.ts
  M packages/react-router-chat-state/src/utils/chat-discovery-options.ts
  M packages/react-router-chat-state/src/utils/decayElevatedPermissionModes.ts
  M packages/react-router-chat-state/src/utils/normalizeChatToolbarState.ts
  M packages/react-router-chat/src/**tests**/run-phase.test.ts
  M packages/react-router-chat/src/components/ChatCheckoutSelectorRow.tsx
  M packages/react-router-chat/src/components/ChatComposerMicControl.tsx
  M packages/react-router-chat/src/components/ChatComposerToolbar.tsx
  M packages/react-router-chat/src/components/ChatPermissionModeControl.tsx
  M packages/react-router-chat/src/components/ChatReasoningTierControl.tsx
  M packages/react-router-chat/src/components/ChatToolCall.tsx
  M packages/react-router-chat/src/components/RunningIndicator.tsx
  M packages/react-router-chat/src/components/**tests**/ChatComposerMicControl.test.tsx
  M packages/react-router-chat/src/components/**tests**/ChatComposerToolbar.test.tsx
  M packages/react-router-chat/src/components/**tests**/ChatDialog.test.tsx
  M packages/react-router-chat/src/components/**tests**/ChatPermissionModeControl.test.tsx
  M packages/react-router-chat/src/components/**tests**/ChatReasoningTierControl.test.tsx
  M packages/react-router-chat/src/components/**tests**/RunningIndicator.test.tsx
  M packages/react-router-chat/src/conversation-stream.ts
  M packages/react-router-chat/src/data/data.chat-context-meter.classes.ts
  M packages/react-router-chat/src/data/data.chat-permission-mode-meta.ts
  M packages/react-router-chat/src/data/data.chat-reasoning-tier-labels.ts
  M packages/react-router-chat/src/data/data.chat-run-phase-copy.ts
  M packages/react-router-chat/src/data/data.chat-tool-call-status-config.ts
  M packages/react-router-chat/src/data/data.checkout-row.ts
  M packages/react-router-chat/src/run-phase.ts
  M packages/react-router-chat/src/turn-events.ts
  M packages/react-router-chat/src/turn-tool-groups.ts
  M packages/react-router-chat/src/types.ts
  M packages/react-router-chat/src/utils/chat-context-window.ts
  M packages/react-router-chat/src/utils/checkout-display.ts
  M packages/react-router-chat/src/utils/checkout-groups.ts
  M packages/react-router-chat/src/utils/getChatComposerMicLabel.ts
  M packages/react-router-chat/src/utils/resolveRunningIndicatorCopy.ts
  M packages/react-router-cms-core/src/components/**tests**/CorePreviewFrame.test.tsx
  M packages/react-router-cms-core/src/components/**tests**/CoreRendererDevelopment.test.tsx
  M packages/react-router-cms-core/src/config/cms-device.ts
  M packages/react-router-cms-core/src/config/cms-status.ts
  M packages/react-router-cms-core/src/data/data.atom.settings.ts
  M packages/react-router-cms-core/src/data/data.preview.ts
  M packages/react-router-cms-core/src/types/cms-records.ts
  M packages/react-router-cms-ui/src/data/data.button.ts
  M packages/react-router-docs/src/data/data.copy.ts
  M packages/react-router-docs/src/utils/buildDocsManifest.ts
  M packages/react-router-docs/src/utils/buildDocsNav.ts
  M packages/react-router-editor/src/components/EditorNewFileForm.tsx
  M packages/react-router-editor/src/config/index.ts
  M packages/react-router-editor/src/data/data.atom.editor.ts
  M packages/react-router-editor/src/hooks/useEditor.tsx
  M packages/react-router-editor/src/utils/index.ts
  M packages/react-router-ide/src/data/data.view-models.ts
  M packages/react-router-notifications/src/components/NotificationsStoreProvider.tsx
  M packages/react-router-notifications/src/data/data.notifications-store.context.ts
  M packages/react-router-notifications/src/types.ts
  M packages/react-router-notifications/src/utils/system-notification.ts
  M packages/react-router-notifications/src/utils/toStorePayload.ts
  M packages/react-router-rollout/src/config/index.ts
  M packages/react-router-rollout/src/config/rollout-flag-kind.ts
  M packages/react-router-rollout/src/index.ts
  M packages/react-router-rollout/src/types.ts
  M packages/react-router-rollout/src/utils/assertRolloutFlagCatalog.ts
  M packages/react-router-rollout/src/utils/defaultsFromCatalog.ts
  M packages/react-router-rollout/src/utils/mergeRolloutEvaluations.ts
  M packages/react-router-rollout/src/utils/parseRolloutValueJson.ts
  M packages/react-router-scheduling/src/components/CalendarLayout.tsx
  M packages/react-router-scheduling/src/components/**tests**/Calendar.test.tsx
  M packages/react-router-scheduling/src/components/**tests**/CalendarLayout.test.tsx
  M packages/react-router-scheduling/src/config/defaults.ts
  M packages/react-router-scheduling/src/hooks/**tests**/useCalendar.test.ts
  M packages/react-router-scheduling/src/hooks/**tests**/useSchedule.test.ts
  M packages/react-router-scheduling/src/hooks/useCalendar.ts
  M packages/react-router-scheduling/src/types.ts
  M packages/react-router-scheduling/src/utils/**tests**/recurrence.test.ts
  M packages/react-router-scheduling/src/utils/**tests**/shiftDate.test.ts
  M packages/react-router-scheduling/src/utils/**tests**/views.test.ts
  M packages/react-router-scheduling/src/utils/recurrence.ts
  M packages/react-router-scheduling/src/utils/shiftDate.ts
  M packages/react-router-scheduling/src/utils/views.ts
  M packages/react-router-ui-global/src/config/index.ts
  M packages/react-router-ui-global/src/data/data.route-stats.ts
  M packages/react-router-ui/src/components/OpenThrottleWebsocketDebugger.tsx
  M packages/react-router-ui/src/components/**tests**/OpenThrottleWebsocketDebugger.test.tsx
  M packages/react-router-ui/src/components/websocket-debugger/event-options.ts
  M packages/react-router-ui/src/components/websocket-debugger/types.ts
  M packages/react-router-ui/src/config/pagination.ts
  M packages/react-router-ui/src/data/data.commander.ts
  M packages/react-router-ui/src/hooks/**tests**/useOpenThrottleWebsocketDebugger.test.ts
  M packages/react-router-ui/src/hooks/**tests**/useWebsocketDebuggerSocketSubscription.test.ts
  M packages/react-router-ui/src/hooks/useOpenThrottleWebsocketDebugger.ts
  M packages/react-router-ui/src/hooks/useWebsocketDebuggerLog.ts
  M packages/react-router-ui/src/hooks/useWebsocketDebuggerSocketSubscription.ts
  M packages/react-router-ui/src/utils/filterWebsocketDebuggerEntries.ts
  M packages/react-router-ui/src/utils/isNotificationEventName.ts
  M packages/react-router-utils/src/utils/id-fragment.ts
  M scripts/check-side-effects.ts
  M scripts/check-skill-outcome-reporting.ts
  M scripts/codemod-file-name-casing.ts
  M scripts/setup_worktree.ts
  M scripts/utils/logger.ts
  M scripts/utils/worktree-ports.ts
  M tools/dotfiles/src/index.ts
  M tools/dotfiles/src/lint-sources.ts
  A tools/dotfiles/src/rules/**tests**/asConstEnumShape.test.ts
  M tools/dotfiles/src/rules/**tests**/nestjsFileExports.test.ts
  A tools/dotfiles/src/rules/asConstEnumShape.ts
  M tools/dotfiles/src/rules/nestjsFileExports.ts
  M tools/ot-telemetry/src/config/index.ts

### ❤️ Thank You

- Matthew Scholta @visormatt

# 2.0.0 (2026-11-24)

### 🚀 Features

- **monorepo:** fail the client build when a node builtin reaches it ([#476](https://github.com/OpenThrottle/monorepo/pull/476))
- **dotfiles:** add prefer-graphql-fragment lint rule ([#944](https://github.com/OpenThrottle/monorepo/pull/944))
- **react-router-auth:** return users to the page they asked for after login ([#899](https://github.com/OpenThrottle/monorepo/pull/899))

### 🩹 Fixes

- **monorepo:** render selected SelectValue labels in SSR markup ([#953](https://github.com/OpenThrottle/monorepo/pull/953))
- **react-router-utils:** remove dev hydration mismatches on 404 and appearance ([#910](https://github.com/OpenThrottle/monorepo/pull/910))

### 💅 Refactors

- **monorepo:** fix the 2026-11-22 rules-conformance findings ([#977](https://github.com/OpenThrottle/monorepo/pull/977))
- **nestjs-postgres:** unify pagination and sort-order primitives ([#948](https://github.com/OpenThrottle/monorepo/pull/948))
- **monorepo:** clear prefer-graphql-fragment violations in four projects ([#945](https://github.com/OpenThrottle/monorepo/pull/945))

### 🏡 Chore

- **monorepo:** dead-code sweep 2026-11-22 ([#975](https://github.com/OpenThrottle/monorepo/pull/975))
- **monorepo:** rules conformance sweep (deep imports, route R4, import type) ([#960](https://github.com/OpenThrottle/monorepo/pull/960))
- **monorepo:** phase 1 front-end package updates ([#905](https://github.com/OpenThrottle/monorepo/pull/905))

### ❤️ Thank You

- Matthew Scholta @visormatt

## 1.1.0 (2026-11-16)

### 🩹 Fixes

- **openthrottle-cms:** polish the fragment editor's add-child picker ([#844](https://github.com/OpenThrottle/monorepo/pull/844))
- **nestjs-repositories-cms:** show unpublished cms layouts only to cms writers ([#825](https://github.com/OpenThrottle/monorepo/pull/825))

### 🏡 Chore

- **monorepo:** run subtree sync via TypeScript, pad CMS table, refresh vendored skills ([#821](https://github.com/OpenThrottle/monorepo/pull/821))

### ❤️ Thank You

- Matthew Scholta @visormatt
