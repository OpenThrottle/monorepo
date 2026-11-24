# 5.0.0 (2026-11-24)

### 🚀 Features

- **openthrottle-showroom:** record season 1 end to end — snapshot, flows, narration, docs ([#964](https://github.com/OpenThrottle/monorepo/pull/964))
- **monorepo:** fail the client build when a node builtin reaches it ([#476](https://github.com/OpenThrottle/monorepo/pull/476))
- **openthrottle-mcp:** protect the public MCP domain with OAuth 2.1 ([#869](https://github.com/OpenThrottle/monorepo/pull/869))
- **openthrottle-server:** report container cgroup limits and throttling next to host metrics ([#866](https://github.com/OpenThrottle/monorepo/pull/866))
- **openthrottle-developer:** paginate project plans server-side at 50 ([#941](https://github.com/OpenThrottle/monorepo/pull/941))
- **monorepo:** scaffold nestjs-application and nestjs-repositories-server ([#884](https://github.com/OpenThrottle/monorepo/pull/884))
- **monorepo:** fetch the embedding model automatically on every server boot ([#876](https://github.com/OpenThrottle/monorepo/pull/876))

### 🔥 Performance

- **ci:** keep one Nx cache entry per job on an open PR ([#887](https://github.com/OpenThrottle/monorepo/pull/887))

### 💅 Refactors

- ⚠️ **monorepo:** retire the Ralph runner and consolidate plan runs on OT Loop ([#969](https://github.com/OpenThrottle/monorepo/pull/969))
- **nestjs-repositories-server:** move the DataSource and retire nestjs-repositories ([#908](https://github.com/OpenThrottle/monorepo/pull/908))

### 📖 Documentation

- **monorepo:** fix stale and contradictory skills, and raise the skill review bar ([#974](https://github.com/OpenThrottle/monorepo/pull/974))

### 🏡 Chore

- **monorepo:** make check:local run every check CI's gates job runs ([#959](https://github.com/OpenThrottle/monorepo/pull/959))
- **openthrottle-mcp:** cache measure-tool-surface now that codegen is committed ([#954](https://github.com/OpenThrottle/monorepo/pull/954))
- ⚠️ **monorepo:** move the runtime and @types/node to Node 26 ([#932](https://github.com/OpenThrottle/monorepo/pull/932))

### 🤖 CI

- **monorepo:** carry the Nx cache across CI machines under Nx 24 ([#892](https://github.com/OpenThrottle/monorepo/pull/892))

### ⚠️ Breaking Changes

- **monorepo:** retire the Ralph runner and consolidate plan runs on OT Loop ([#969](https://github.com/OpenThrottle/monorepo/pull/969))
  the old GraphQL mutation, input and field names are removed
  with no deprecation window, so openthrottle-server and openthrottle-mcp must
  be deployed together. Drain Plans jobs named Agentic Ralph before deploying,
  rename local WORKFLOW_RALPH_* env vars, then run database:migrate and
  database:bootstrap-service-accounts.
  Plan-Id: 624a1036-e0bd-4a07-b45b-679d801c852e
  Task-Id: 01a204ec-b04a-72a0-825c-78ba4dbbae99
  Task-Id: 01a204ec-b04b-7e33-b509-fc16c99cf328
  Task-Id: 01a204ec-b04c-733b-ac47-8e102c4d8b8a
  Task-Id: 01a204ec-b04c-76bb-a258-e1fd78ad25a8
  Task-Id: 01a204ec-b04c-79ab-9c6b-d34cb319bd58
  Task-Id: 01a20512-be5a-7d65-9657-3f0cb32c9fb7
  Task-Id: 01a204ec-b04d-7902-94b0-c0e365f1b7f9
  Task-Id: 01a204ec-b04e-7204-b65f-c8636778cd39
  Task-Id: 01a204ec-b04e-7d89-a929-efe924187365
  Task-Id: 01a204ec-b04f-767a-bcff-0fe2ab5be366
  Task-Id: 01a204ec-b04f-7aa8-9bc9-864d16cb93be
  Task-Id: 01a204ec-b04f-7f4d-a044-dc2cbecf1a3f
  Task-Id: 01a204ec-b050-7367-92ba-2c3edf45b0a6
  Task-Id: 01a204ec-b050-77e1-8d82-3e420d313bbc
  Task-Id: 01a204ec-b050-79ab-9f83-0292448fb6be"
  M .agents/personas/README.md
  M .agents/personas/architect.md
  M .agents/personas/growth.md
  M .agents/personas/legal.md
  M .agents/personas/product.md
  M .agents/prompts/Job_ArchitectureDrift.md
  M .agents/prompts/Job_ReplayDrift.md
  M .agents/prompts/Job_Roadmap.md
  M .agents/prompts/Job_WorkInFlight.md
  M .env.default
  M .github/workflows/continuous-integration.yml
  M .github/workflows/openthrottle-docker.yml
  M AGENTS.md
  M LICENSING.md
  M MONOREPO.md
  M README.md
  M THIRD-PARTY-LICENSES.md
  M applications/openthrottle-app/docs/standalone-install/server-in-electron.md
  M applications/openthrottle-developer/app/**generated**/gql.ts
  M applications/openthrottle-developer/app/**generated**/graphql.ts
  M applications/openthrottle-developer/app/**generated**/schemas.ts
  M applications/openthrottle-developer/app/docs-content/docs/agentic-workflows.md
  M applications/openthrottle-developer/app/docs-content/docs/architecture.md
  M applications/openthrottle-developer/app/docs-content/docs/docker-builds.md
  M applications/openthrottle-developer/app/docs-content/docs/index.md
  M applications/openthrottle-developer/app/docs-content/faq/plan-loop.md
  A applications/openthrottle-developer/app/docs-content/faq/what-is-ot-loop.md
  D applications/openthrottle-developer/app/docs-content/faq/what-is-ralph.md
  M applications/openthrottle-developer/app/routes/**tests**/plans.$planId._index.action.test.ts
  M applications/openthrottle-developer/app/routes/**tests**/plans.$planId._index.loader.test.ts
  M applications/openthrottle-developer/app/routes/**tests**/plans.$planId._index.run-config.test.tsx
  M applications/openthrottle-developer/app/routes/**tests**/plans.temp.action.test.ts
  M applications/openthrottle-developer/app/routes/**tests**/queues.$queueId.$jobId.test.tsx
  M applications/openthrottle-developer/app/routes/**tests**/skills.availability.loader.test.ts
  M applications/openthrottle-developer/app/routes/plans.$planId._index.tsx.graphql
  M applications/openthrottle-developer/app/routes/plans.temp.tsx
  M applications/openthrottle-developer/app/routes/plans.temp.tsx.graphql
  M applications/openthrottle-developer/app/routes/queues.$queueId.$jobId.tsx.graphql
  M applications/openthrottle-developer/app/routes/timeline._index.tsx
  M applications/openthrottle-developer/app/routes/timeline._index.tsx.graphql
  M applications/openthrottle-developer/app/routing/agents/data/data.repo-skills-registry.ts
  M applications/openthrottle-developer/app/routing/agents/utils/**tests**/repo-skills-registry.test.ts
  M applications/openthrottle-developer/app/routing/home/utils/seedComposerDefaultAgent.ts
  M applications/openthrottle-developer/app/routing/personas/components/PersonasIntroduction.tsx
  M applications/openthrottle-developer/app/routing/personas/components/**tests**/PersonasIntroduction.test.tsx
  M applications/openthrottle-developer/app/routing/plans/actions/planId.ts
  M applications/openthrottle-developer/app/routing/plans/components/KillPlanRunButton.tsx
  M applications/openthrottle-developer/app/routing/plans/components/PlanDetailRoute.tsx
  M applications/openthrottle-developer/app/routing/plans/components/PlanRunConfigStoreProvider.tsx
  M applications/openthrottle-developer/app/routing/plans/components/PlanRunDialog.tsx
  M applications/openthrottle-developer/app/routing/plans/components/PlanRunDialogSettings.tsx
  M applications/openthrottle-developer/app/routing/plans/components/PlanRunEffortControl.tsx
  M applications/openthrottle-developer/app/routing/plans/components/PlanRunMetaList.tsx
  M applications/openthrottle-developer/app/routing/plans/components/PlanRunModelPicker.tsx
  M applications/openthrottle-developer/app/routing/plans/components/PlanRunOtLoopFields.tsx
  D applications/openthrottle-developer/app/routing/plans/components/PlanRunRunnerField.tsx
  M applications/openthrottle-developer/app/routing/plans/components/PlanTabConfiguration.tsx
  M applications/openthrottle-developer/app/routing/plans/components/PlanTabConfigurationValidation.tsx
  M applications/openthrottle-developer/app/routing/plans/components/PlanTabDetails.tsx
  M applications/openthrottle-developer/app/routing/plans/components/PlanTabOutput.tsx
  M applications/openthrottle-developer/app/routing/plans/components/PlanToolbar.tsx
  M applications/openthrottle-developer/app/routing/plans/components/PlanToolbarRunActions.tsx
  M applications/openthrottle-developer/app/routing/plans/components/PlanToolbarRunSplitButton.tsx
  D applications/openthrottle-developer/app/routing/plans/components/PlanWorkflowCommand.tsx
  A applications/openthrottle-developer/app/routing/plans/components/PlanWorkflowConfigActions.tsx
  M applications/openthrottle-developer/app/routing/plans/components/PlanWorkflowConfigExecution.tsx
  M applications/openthrottle-developer/app/routing/plans/components/PlanWorkflowConfigHookRowPrompt.tsx
  M applications/openthrottle-developer/app/routing/plans/components/PlanWorkflowConfigHooks.tsx
  M applications/openthrottle-developer/app/routing/plans/components/PlanWorkflowConfigHooksEmpty.tsx
  M applications/openthrottle-developer/app/routing/plans/components/PlanWorkflowConfigModelEffort.tsx
  D applications/openthrottle-developer/app/routing/plans/components/PlanWorkflowConfigPrompt.tsx
  M applications/openthrottle-developer/app/routing/plans/components/PlanWorkflowConfigTarget.tsx
  M applications/openthrottle-developer/app/routing/plans/components/PlanWorkflowConfigTuning.tsx
  R062 applications/openthrottle-developer/app/routing/plans/components/PlanWorkflowConfigRunner.tsx applications/openthrottle-developer/app/routing/plans/components/PlanWorkflowConfigValidation.tsx
  M applications/openthrottle-developer/app/routing/plans/components/PlanWorkflowConfigWorkspace.tsx
  M applications/openthrottle-developer/app/routing/plans/components/PlanWorkflowConfigWorktree.tsx
  M applications/openthrottle-developer/app/routing/plans/components/PlanWorkflowConfigWorktreeCleanup.tsx
  D applications/openthrottle-developer/app/routing/plans/components/PlanWorkflowConfigWorktreeCursorFields.tsx
  M applications/openthrottle-developer/app/routing/plans/components/PlanWorkflowRunHistoryDetail.tsx
  M applications/openthrottle-developer/app/routing/plans/components/PlanWorkflowRunHistoryRow.tsx
  M applications/openthrottle-developer/app/routing/plans/components/PlanWorkflowRunHistoryRowActions.tsx
  M applications/openthrottle-developer/app/routing/plans/components/PlanWorkflowRunLatest.tsx
  M applications/openthrottle-developer/app/routing/plans/components/PlanWorkflowRunTransparency.tsx
  M applications/openthrottle-developer/app/routing/plans/components/PlanWorkflowRunTransparencyAuditTable.tsx
  R061 applications/openthrottle-developer/app/routing/plans/components/PlanWorkflowRunCliDebug.tsx applications/openthrottle-developer/app/routing/plans/components/PlanWorkflowRunTuningSummary.tsx
  M applications/openthrottle-developer/app/routing/plans/components/PlanWorkflowRunUpcoming.tsx
  M applications/openthrottle-developer/app/routing/plans/components/PlansIntroduction.tsx
  M applications/openthrottle-developer/app/routing/plans/components/**tests**/KillPlanRunButton.test.tsx
  M applications/openthrottle-developer/app/routing/plans/components/**tests**/OutputStream.test.tsx
  M applications/openthrottle-developer/app/routing/plans/components/**tests**/PlanDetailRoute.test.tsx
  M applications/openthrottle-developer/app/routing/plans/components/**tests**/PlanRunConfigStoreProvider.test.tsx
  M applications/openthrottle-developer/app/routing/plans/components/**tests**/PlanRunDialog.test.tsx
  M applications/openthrottle-developer/app/routing/plans/components/**tests**/PlanRunDialogSettings.test.tsx
  M applications/openthrottle-developer/app/routing/plans/components/**tests**/PlanRunEffortControl.test.tsx
  M applications/openthrottle-developer/app/routing/plans/components/**tests**/PlanRunModelPicker.test.tsx
  M applications/openthrottle-developer/app/routing/plans/components/**tests**/PlanRunOtLoopFields.test.tsx
  D applications/openthrottle-developer/app/routing/plans/components/**tests**/PlanRunRunnerField.test.tsx
  M applications/openthrottle-developer/app/routing/plans/components/**tests**/PlanScheduledRunsCard.test.tsx
  M applications/openthrottle-developer/app/routing/plans/components/**tests**/PlanTabConfiguration.test.tsx
  M applications/openthrottle-developer/app/routing/plans/components/**tests**/PlanTabConfigurationValidation.test.tsx
  M applications/openthrottle-developer/app/routing/plans/components/**tests**/PlanToolbar.test.tsx
  M applications/openthrottle-developer/app/routing/plans/components/**tests**/PlanToolbarRunActions.test.tsx
  M applications/openthrottle-developer/app/routing/plans/components/**tests**/PlanToolbarRunSplitButton.test.tsx
  D applications/openthrottle-developer/app/routing/plans/components/**tests**/PlanWorkflowCommand.test.tsx
  A applications/openthrottle-developer/app/routing/plans/components/**tests**/PlanWorkflowConfigActions.test.tsx
  M applications/openthrottle-developer/app/routing/plans/components/**tests**/PlanWorkflowConfigExecution.test.tsx
  M applications/openthrottle-developer/app/routing/plans/components/**tests**/PlanWorkflowConfigHookRowPrompt.test.tsx
  M applications/openthrottle-developer/app/routing/plans/components/**tests**/PlanWorkflowConfigModelEffort.test.tsx
  D applications/openthrottle-developer/app/routing/plans/components/**tests**/PlanWorkflowConfigPrompt.test.tsx
  M applications/openthrottle-developer/app/routing/plans/components/**tests**/PlanWorkflowConfigTarget.test.tsx
  M applications/openthrottle-developer/app/routing/plans/components/**tests**/PlanWorkflowConfigTuning.test.tsx
  R058 applications/openthrottle-developer/app/routing/plans/components/**tests**/PlanWorkflowConfigRunner.test.tsx applications/openthrottle-developer/app/routing/plans/components/**tests**/PlanWorkflowConfigValidation.test.tsx
  M applications/openthrottle-developer/app/routing/plans/components/**tests**/PlanWorkflowConfigWorktree.test.tsx
  M applications/openthrottle-developer/app/routing/plans/components/**tests**/PlanWorkflowConfigWorktreeCleanup.test.tsx
  D applications/openthrottle-developer/app/routing/plans/components/**tests**/PlanWorkflowConfigWorktreeCursorFields.test.tsx
  M applications/openthrottle-developer/app/routing/plans/components/**tests**/PlanWorkflowRunLatest.test.tsx
  M applications/openthrottle-developer/app/routing/plans/components/**tests**/PlanWorkflowRunTransparency.test.tsx
  M applications/openthrottle-developer/app/routing/plans/components/**tests**/PlanWorkflowRunTransparencyAuditTable.test.tsx
  M applications/openthrottle-developer/app/routing/plans/components/**tests**/PlanWorkflowRunUpcoming.test.tsx
  M applications/openthrottle-developer/app/routing/plans/data/**tests**/data.atom-plan.test.ts
  M applications/openthrottle-developer/app/routing/plans/data/data.atom-plan.ts
  M applications/openthrottle-developer/app/routing/plans/data/data.copy.ts
  M applications/openthrottle-developer/app/routing/plans/data/data.plan-run-history.ts
  M applications/openthrottle-developer/app/routing/plans/data/data.plan-run-transparency-skeleton.ts
  M applications/openthrottle-developer/app/routing/plans/data/mock.plan-run-models.ts
  M applications/openthrottle-developer/app/routing/plans/hooks/**tests**/usePlanDefaultAgent.test.tsx
  M applications/openthrottle-developer/app/routing/plans/hooks/**tests**/usePlanRunDialog.test.tsx
  M applications/openthrottle-developer/app/routing/plans/hooks/**tests**/usePlanRunNowConfirm.test.tsx
  M applications/openthrottle-developer/app/routing/plans/hooks/**tests**/usePlanToolbarRunDialog.test.tsx
  M applications/openthrottle-developer/app/routing/plans/hooks/usePlanDetailRoute.ts
  M applications/openthrottle-developer/app/routing/plans/hooks/usePlanRunConfigEditor.ts
  M applications/openthrottle-developer/app/routing/plans/hooks/usePlanRunDialog.tsx
  M applications/openthrottle-developer/app/routing/plans/hooks/usePlanToolbar.ts
  M applications/openthrottle-developer/app/routing/plans/hooks/usePlanToolbarRunDialog.tsx
  M applications/openthrottle-developer/app/routing/plans/hooks/usePlanWorkflowConfigHookRow.ts
  M applications/openthrottle-developer/app/routing/plans/testing/buildPlanRunConfigJson.ts
  M applications/openthrottle-developer/app/routing/plans/types.ts
  D applications/openthrottle-developer/app/routing/plans/utils/**tests**/applyPromptLayerChange.test.ts
  D applications/openthrottle-developer/app/routing/plans/utils/**tests**/build-workflow-ralph-argv.test.ts
  A applications/openthrottle-developer/app/routing/plans/utils/**tests**/buildPlanRunTuningDiffLabels.test.ts
  A applications/openthrottle-developer/app/routing/plans/utils/**tests**/buildPlanRunTuningInput.test.ts
  M applications/openthrottle-developer/app/routing/plans/utils/**tests**/buildPlanToolbarRunFields.test.ts
  D applications/openthrottle-developer/app/routing/plans/utils/**tests**/buildWorkflowRalphTuningDiffLabels.test.ts
  M applications/openthrottle-developer/app/routing/plans/utils/**tests**/describeCancelPlanRunResult.test.ts
  M applications/openthrottle-developer/app/routing/plans/utils/**tests**/job-run-hooks-draft.test.ts
  M applications/openthrottle-developer/app/routing/plans/utils/**tests**/job-run-hooks-ui.test.ts
  M applications/openthrottle-developer/app/routing/plans/utils/**tests**/joinPlanRunJobMetrics.test.ts
  M applications/openthrottle-developer/app/routing/plans/utils/**tests**/output-stream-attempts.test.ts
  M applications/openthrottle-developer/app/routing/plans/utils/**tests**/plan-run-config-snapshot-ui.test.ts
  M applications/openthrottle-developer/app/routing/plans/utils/**tests**/plan-run-config-ui.test.ts
  M applications/openthrottle-developer/app/routing/plans/utils/**tests**/plan-run-default-agent.test.ts
  M applications/openthrottle-developer/app/routing/plans/utils/**tests**/plan-run-dialog.test.ts
  M applications/openthrottle-developer/app/routing/plans/utils/**tests**/plan-run-form.test.ts
  M applications/openthrottle-developer/app/routing/plans/utils/**tests**/plan-run-model-effort.test.ts
  R050 applications/openthrottle-developer/app/routing/plans/utils/**tests**/workflow-ralph-config.test.ts applications/openthrottle-developer/app/routing/plans/utils/**tests**/plan-run-options.test.ts
  M applications/openthrottle-developer/app/routing/plans/utils/**tests**/plan-run-ot-loop.test.ts
  M applications/openthrottle-developer/app/routing/plans/utils/**tests**/plan-run-sections.test.ts
  M applications/openthrottle-developer/app/routing/plans/utils/**tests**/plan-workflow-config-execution.test.ts
  A applications/openthrottle-developer/app/routing/plans/utils/**tests**/validatePlanRunOptionsState.test.ts
  D applications/openthrottle-developer/app/routing/plans/utils/**tests**/validateWorkflowRalphRunOptionsState.test.ts
  D applications/openthrottle-developer/app/routing/plans/utils/**tests**/workflow-ralph-argv-builder.test.ts
  D applications/openthrottle-developer/app/routing/plans/utils/**tests**/workflow-ralph-tuning.test.ts
  D applications/openthrottle-developer/app/routing/plans/utils/applyPromptLayerChange.ts
  D applications/openthrottle-developer/app/routing/plans/utils/build-workflow-ralph-argv.ts
  A applications/openthrottle-developer/app/routing/plans/utils/buildPlanRunTuningDiffLabels.ts
  A applications/openthrottle-developer/app/routing/plans/utils/buildPlanRunTuningInput.ts
  M applications/openthrottle-developer/app/routing/plans/utils/buildPlanToolbarRunFields.ts
  D applications/openthrottle-developer/app/routing/plans/utils/buildWorkflowRalphTuningDiffLabels.ts
  M applications/openthrottle-developer/app/routing/plans/utils/describeCancelPlanRunResult.ts
  M applications/openthrottle-developer/app/routing/plans/utils/job-run-hooks-ui.ts
  M applications/openthrottle-developer/app/routing/plans/utils/output-stream-attempts.ts
  M applications/openthrottle-developer/app/routing/plans/utils/output-stream-chunks.ts
  M applications/openthrottle-developer/app/routing/plans/utils/plan-run-config-snapshot-ui.ts
  M applications/openthrottle-developer/app/routing/plans/utils/plan-run-config-ui.ts
  M applications/openthrottle-developer/app/routing/plans/utils/plan-run-default-agent.ts
  M applications/openthrottle-developer/app/routing/plans/utils/plan-run-dialog.ts
  M applications/openthrottle-developer/app/routing/plans/utils/plan-run-form.ts
  M applications/openthrottle-developer/app/routing/plans/utils/plan-run-model-effort.ts
  A applications/openthrottle-developer/app/routing/plans/utils/plan-run-options.ts
  M applications/openthrottle-developer/app/routing/plans/utils/plan-run-ot-loop.ts
  M applications/openthrottle-developer/app/routing/plans/utils/plan-run-sections.ts
  M applications/openthrottle-developer/app/routing/plans/utils/plan-workflow-config-execution.ts
  M applications/openthrottle-developer/app/routing/plans/utils/utils.plans.ts
  A applications/openthrottle-developer/app/routing/plans/utils/validatePlanRunOptionsState.ts
  D applications/openthrottle-developer/app/routing/plans/utils/validateWorkflowRalphRunOptionsState.ts
  D applications/openthrottle-developer/app/routing/plans/utils/workflow-ralph-argv-builder.ts
  D applications/openthrottle-developer/app/routing/plans/utils/workflow-ralph-config.ts
  D applications/openthrottle-developer/app/routing/plans/utils/workflow-ralph-tuning.ts
  M applications/openthrottle-developer/app/routing/plans/utils/workflow-run-atom-state.ts
  M applications/openthrottle-developer/app/routing/projects/data/mock.projects.ts
  M applications/openthrottle-developer/app/routing/prompts/data/data.copy.ts
  M applications/openthrottle-developer/app/routing/queues/components/QueueCorrelationAndSupport.tsx
  M applications/openthrottle-developer/app/routing/queues/components/QueueJobPayload.tsx
  M applications/openthrottle-developer/app/routing/queues/components/**tests**/QueueCorrelationAndSupport.test.tsx
  M applications/openthrottle-developer/app/routing/queues/components/**tests**/QueueJobDetail.test.tsx
  M applications/openthrottle-developer/app/routing/queues/components/**tests**/QueueJobMetrics.test.tsx
  M applications/openthrottle-developer/app/routing/queues/components/**tests**/QueueJobPayload.test.tsx
  M applications/openthrottle-developer/app/routing/queues/components/**tests**/QueueJobResults.test.tsx
  M applications/openthrottle-developer/app/routing/queues/components/**tests**/QueueJobTimestamps.test.tsx
  M applications/openthrottle-developer/app/routing/queues/components/**tests**/QueueJobsTable.test.tsx
  M applications/openthrottle-developer/app/routing/queues/utils/**tests**/queue-jobs-table-columns.test.tsx
  M applications/openthrottle-developer/app/routing/queues/utils/**tests**/queueJobDetailPath.test.ts
  M applications/openthrottle-developer/app/routing/rules/components/RuleForm.tsx
  M applications/openthrottle-developer/app/routing/rules/components/RuleFormMatchSection.tsx
  M applications/openthrottle-developer/app/routing/rules/components/RulePreviewEnvironmentSelect.tsx
  M applications/openthrottle-developer/app/routing/rules/components/**tests**/RulePreviewEnvironmentSelect.test.tsx
  M applications/openthrottle-developer/app/routing/rules/data/data.copy.ts
  M applications/openthrottle-developer/app/routing/rules/data/data.rule-form-options.ts
  M applications/openthrottle-developer/app/routing/rules/utils/**tests**/rule-preview-params.test.ts
  M applications/openthrottle-developer/app/routing/rules/utils/formatters.ts
  M applications/openthrottle-developer/app/routing/schedule/utils/**tests**/ScheduleFormSchema.test.ts
  M applications/openthrottle-developer/app/routing/settings/components/SettingsKeysTableEmpty.tsx
  M applications/openthrottle-developer/app/routing/settings/components/SettingsLogsServerStreams.tsx
  M applications/openthrottle-developer/app/routing/settings/components/SettingsPreferencesAgentSection.tsx
  M applications/openthrottle-developer/app/routing/settings/components/**tests**/SettingsKeysToolbar.test.tsx
  M applications/openthrottle-developer/app/routing/settings/components/**tests**/SettingsLogsServerStreams.test.tsx
  M applications/openthrottle-developer/app/routing/settings/config/defaults.ts
  M applications/openthrottle-developer/app/routing/settings/data/data.copy.ts
  M applications/openthrottle-developer/app/routing/settings/hooks/**tests**/useSettingsPreferencesAgentForm.test.tsx
  M applications/openthrottle-developer/app/routing/settings/hooks/useSettingsPreferencesAgentForm.tsx
  M applications/openthrottle-developer/app/routing/settings/utils/**tests**/user-preferences.test.ts
  M applications/openthrottle-developer/app/routing/settings/utils/settings.support.ts
  M applications/openthrottle-developer/app/routing/settings/utils/user-preferences.ts
  M applications/openthrottle-developer/app/routing/skills/components/**tests**/SkillAvailabilityRulesEditor.test.tsx
  M applications/openthrottle-developer/app/routing/skills/components/**tests**/SkillsTable.test.tsx
  M applications/openthrottle-developer/app/routing/skills/hooks/**tests**/useSkillAvailabilityRuleForm.test.tsx
  M applications/openthrottle-developer/app/routing/skills/utils/**tests**/filterSkillsBySource.test.ts
  M applications/openthrottle-developer/app/routing/skills/utils/**tests**/skill-availability-action.test.ts
  M applications/openthrottle-developer/app/routing/skills/utils/**tests**/skill-availability.test.ts
  M applications/openthrottle-developer/app/routing/skills/utils/skill-availability.ts
  M applications/openthrottle-developer/app/routing/timeline/components/TimelineSpanDetail.tsx
  M applications/openthrottle-developer/app/routing/timeline/components/**tests**/TimelineControls.test.tsx
  M applications/openthrottle-developer/app/routing/timeline/components/**tests**/TimelineSpanBar.test.tsx
  M applications/openthrottle-developer/app/routing/timeline/config/defaults.ts
  M applications/openthrottle-developer/app/routing/timeline/data/data.copy.ts
  M applications/openthrottle-developer/app/routing/timeline/data/data.fixtures.ts
  M applications/openthrottle-developer/app/routing/timeline/utils/**tests**/lanes.test.ts
  M applications/openthrottle-developer/app/routing/timeline/utils/**tests**/search-params.test.ts
  M applications/openthrottle-developer/app/routing/timeline/utils/**tests**/span-geometry.test.ts
  M applications/openthrottle-developer/app/routing/usage/components/UsageOverview.tsx
  M applications/openthrottle-developer/app/routing/usage/data/data.daily-stats-series-glossary.ts
  M applications/openthrottle-developer/docs/repo-skills-discovery-design.md
  M applications/openthrottle-developer/docs/routing-modules-debug-harness.md
  M applications/openthrottle-developer/docs/settings-logs-tab-spec.md
  M applications/openthrottle-developer/tests/e2e/config.yaml
  M applications/openthrottle-server/.env.default
  M applications/openthrottle-server/.gitignore
  M applications/openthrottle-server/AGENTS.md
  A applications/openthrottle-server/codegen.ts
  M applications/openthrottle-server/docs/agent-conversations-design.md
  M applications/openthrottle-server/docs/log-tail-api-design.md
  M applications/openthrottle-server/docs/workspace-onboarding-repository-model-design.md
  M applications/openthrottle-server/docs/workspace-settings-graphql-design.md
  M applications/openthrottle-server/package.json
  M applications/openthrottle-server/schema.gql
  A applications/openthrottle-server/src/**generated**/gql.ts
  R094 packages/openthrottle-agentic-ralph/src/**generated**/graphql.ts applications/openthrottle-server/src/**generated**/graphql.ts
  R100 packages/openthrottle-agentic-ralph/src/**generated**/index.ts applications/openthrottle-server/src/**generated**/index.ts
  M applications/openthrottle-server/src/bootstrap.ts
  M applications/openthrottle-server/src/config/config.utils.ts
  M applications/openthrottle-server/src/graphql/agents/mcp-router/golden-prompts/golden-prompts.constants.ts
  M applications/openthrottle-server/src/graphql/agents/mcp-router/mcp-router.service.ts
  M applications/openthrottle-server/src/graphql/health/embeddings-health/embeddings-health.resolver.ts
  M applications/openthrottle-server/src/graphql/metrics/child-process-metrics.object.ts
  M applications/openthrottle-server/src/graphql/metrics/metrics.resolver.test.ts
  M applications/openthrottle-server/src/graphql/metrics/metrics.resolver.ts
  M applications/openthrottle-server/src/graphql/metrics/plan-run-metrics-entry.object.ts
  M applications/openthrottle-server/src/graphql/metrics/system-cpu-metrics.object.ts
  M applications/openthrottle-server/src/graphql/metrics/task-run-metrics.object.ts
  M applications/openthrottle-server/src/graphql/metrics/wall-clock-metrics.object.ts
  M applications/openthrottle-server/src/graphql/plans/cancel-plan-run-jobs/cancel-plan-run-jobs.utils.test.ts
  M applications/openthrottle-server/src/graphql/plans/cancel-plan-run-jobs/cancel-plan-run-jobs.utils.ts
  M applications/openthrottle-server/src/graphql/plans/enqueue-plan-job-run-hooks/enqueue-plan-job-run-hooks.utils.test.ts
  M applications/openthrottle-server/src/graphql/plans/enqueue-plan-job-run-hooks/enqueue-plan-job-run-hooks.utils.ts
  M applications/openthrottle-server/src/graphql/plans/enqueue-plan-run-config-snapshot/enqueue-plan-run-config-snapshot.utils.test.ts
  M applications/openthrottle-server/src/graphql/plans/enqueue-plan-run-config-snapshot/enqueue-plan-run-config-snapshot.utils.ts
  M applications/openthrottle-server/src/graphql/plans/enqueue-plan-run-defaults/enqueue-plan-run-defaults.utils.ts
  R057 applications/openthrottle-server/src/graphql/plans/enqueue-plan-ralph-tuning/enqueue-plan-ralph-tuning.utils.test.ts applications/openthrottle-server/src/graphql/plans/enqueue-plan-run-tuning/enqueue-plan-run-tuning.utils.test.ts
  R057 applications/openthrottle-server/src/graphql/plans/enqueue-plan-ralph-tuning/enqueue-plan-ralph-tuning.utils.ts applications/openthrottle-server/src/graphql/plans/enqueue-plan-run-tuning/enqueue-plan-run-tuning.utils.ts
  M applications/openthrottle-server/src/graphql/plans/plan-enqueue/plan-enqueue.service.test.ts
  M applications/openthrottle-server/src/graphql/plans/plan-enqueue/plan-enqueue.service.ts
  M applications/openthrottle-server/src/graphql/plans/plan-enqueue/plan-enqueue.types.ts
  M applications/openthrottle-server/src/graphql/plans/plan-enqueue/plan-enqueue.utils.test.ts
  M applications/openthrottle-server/src/graphql/plans/plan-enqueue/plan-enqueue.utils.ts
  M applications/openthrottle-server/src/graphql/plans/plan-status/plan-status.service.test.ts
  M applications/openthrottle-server/src/graphql/plans/plan-status/plan-status.service.ts
  M applications/openthrottle-server/src/graphql/plans/plan.input.ts
  M applications/openthrottle-server/src/graphql/plans/plan.object.ts
  M applications/openthrottle-server/src/graphql/plans/plans.module.ts
  M applications/openthrottle-server/src/graphql/plans/plans.resolver.test.ts
  M applications/openthrottle-server/src/graphql/plans/plans.resolver.ts
  M applications/openthrottle-server/src/graphql/project-skills/project-skills.resolver.test.ts
  M applications/openthrottle-server/src/graphql/prompts/agent-asset-search/agent-asset-search.resolver.test.ts
  M applications/openthrottle-server/src/graphql/prompts/prompts.utils.test.ts
  M applications/openthrottle-server/src/graphql/queue-job-logs/publisher/publisher.utils.test.ts
  M applications/openthrottle-server/src/graphql/queue-job-logs/queue-job-log-event.mapper.test.ts
  M applications/openthrottle-server/src/graphql/queue-job-logs/queue-job-log-event.object.ts
  M applications/openthrottle-server/src/graphql/queue-job-logs/queue-job-logs.service.test.ts
  M applications/openthrottle-server/src/graphql/queues/job.object.ts
  M applications/openthrottle-server/src/graphql/queues/queues-service/queues-service.service.test.ts
  M applications/openthrottle-server/src/graphql/queues/queues-service/queues-service.service.ts
  M applications/openthrottle-server/src/graphql/queues/queues.resolver.test.ts
  M applications/openthrottle-server/src/graphql/queues/queues.resolver.ts
  M applications/openthrottle-server/src/graphql/service-accounts/service-account.object.ts
  M applications/openthrottle-server/src/graphql/skill-availability/skill-availability-resolution/skill-availability-resolution.resolver.test.ts
  M applications/openthrottle-server/src/graphql/skill-availability/skill-availability-resolution/skill-availability-resolution.resolver.ts
  M applications/openthrottle-server/src/graphql/skill-availability/skill-availability.input.ts
  M applications/openthrottle-server/src/graphql/skill-availability/skill-availability.object.ts
  M applications/openthrottle-server/src/graphql/skill-availability/skill-availability.resolver.test.ts
  M applications/openthrottle-server/src/graphql/tag-action-rules/tag-action-rule.object.ts
  M applications/openthrottle-server/src/graphql/tag-action-rules/tag-action-rules.input.ts
  M applications/openthrottle-server/src/graphql/tag-action-rules/tag-action-rules.resolver.ts
  M applications/openthrottle-server/src/graphql/timeline/timeline.enum.ts
  M applications/openthrottle-server/src/graphql/timeline/timeline.input.ts
  M applications/openthrottle-server/src/graphql/timeline/timeline.object.ts
  M applications/openthrottle-server/src/graphql/timeline/timeline.resolver.test.ts
  M applications/openthrottle-server/src/graphql/timeline/timeline.resolver.ts
  M applications/openthrottle-server/src/graphql/timeline/timeline.types.ts
  M applications/openthrottle-server/src/graphql/timeline/timeline.utils.test.ts
  M applications/openthrottle-server/src/graphql/timeline/timeline.utils.ts
  M applications/openthrottle-server/src/graphql/work-ledger/settle-run-ledger/settle-run-ledger.service.test.ts
  M applications/openthrottle-server/src/graphql/work-ledger/settle-run-ledger/settle-run-ledger.service.ts
  M applications/openthrottle-server/src/graphql/work-ledger/work-ledger.input.ts
  M applications/openthrottle-server/src/graphql/work-ledger/work-ledger.resolver.ts
  M applications/openthrottle-server/src/graphql/workspace-settings/workspace-local-repository-validation/workspace-local-repository-validation.utils.ts
  M applications/openthrottle-server/src/metrics/metrics.controller.ts
  M applications/openthrottle-server/src/metrics/process-metrics/process-metrics.service.ts
  M applications/openthrottle-server/src/metrics/process-metrics/process-metrics.types.ts
  M applications/openthrottle-server/src/metrics/process-metrics/process-metrics.utils.ts
  M applications/openthrottle-server/src/metrics/system-metrics/system-metrics.service.ts
  M applications/openthrottle-server/src/metrics/system-metrics/system-metrics.types.ts
  D applications/openthrottle-server/src/queues/agentic-ralph/README.md
  D applications/openthrottle-server/src/queues/agentic-ralph/agentic-ralph-orchestrator-deps.factory.ts
  D applications/openthrottle-server/src/queues/agentic-ralph/agentic-ralph.constants.ts
  D applications/openthrottle-server/src/queues/agentic-ralph/agentic-ralph.module.ts
  D applications/openthrottle-server/src/queues/agentic-ralph/agentic-ralph.types.ts
  D applications/openthrottle-server/src/queues/agentic-ralph/agentic-ralph.utils.test.ts
  D applications/openthrottle-server/src/queues/agentic-ralph/agentic-ralph.utils.ts
  D applications/openthrottle-server/src/queues/agentic-ralph/orchestrator/orchestrator.service.test.ts
  D applications/openthrottle-server/src/queues/agentic-ralph/orchestrator/orchestrator.service.ts
  M applications/openthrottle-server/src/queues/bullmq-keyed-run-logging/bullmq-keyed-run-logging.constants.ts
  M applications/openthrottle-server/src/queues/bullmq-keyed-run-logging/bullmq-keyed-run-logging.utils.test.ts
  M applications/openthrottle-server/src/queues/bullmq-keyed-run-logging/bullmq-keyed-run-logging.utils.ts
  M applications/openthrottle-server/src/queues/bullmq-run-output/bullmq-run-output-writer.token.ts
  M applications/openthrottle-server/src/queues/data-retention/policies/plan-output-stream.policy.ts
  M applications/openthrottle-server/src/queues/data-retention/policies/work-ledger.policy.ts
  M applications/openthrottle-server/src/queues/job-run-hooks/job-run-hooks.types.ts
  M applications/openthrottle-server/src/queues/job-run-hooks/job-run-hooks.utils.test.ts
  M applications/openthrottle-server/src/queues/job-run-hooks/job-run-hooks.utils.ts
  M applications/openthrottle-server/src/queues/ot-loop/orchestrator/orchestrator.service.test.ts
  M applications/openthrottle-server/src/queues/ot-loop/orchestrator/orchestrator.service.ts
  M applications/openthrottle-server/src/queues/ot-loop/orchestrator/orchestrator.types.ts
  M applications/openthrottle-server/src/queues/ot-loop/ot-loop-client.factory.test.ts
  M applications/openthrottle-server/src/queues/ot-loop/ot-loop-client.factory.ts
  A applications/openthrottle-server/src/queues/ot-loop/ot-loop-execute-graphql.factory.test.ts
  A applications/openthrottle-server/src/queues/ot-loop/ot-loop-execute-graphql.factory.ts
  M applications/openthrottle-server/src/queues/ot-loop/ot-loop-execute-graphql.provider.ts
  A applications/openthrottle-server/src/queues/ot-loop/ot-loop-finalize-port.factory.test.ts
  A applications/openthrottle-server/src/queues/ot-loop/ot-loop-finalize-port.factory.ts
  M applications/openthrottle-server/src/queues/ot-loop/ot-loop.constants.ts
  M applications/openthrottle-server/src/queues/ot-loop/ot-loop.module.ts
  M applications/openthrottle-server/src/queues/ot-loop/ot-loop.types.ts
  M applications/openthrottle-server/src/queues/ot-loop/ot-loop.utils.test.ts
  M applications/openthrottle-server/src/queues/ot-loop/ot-loop.utils.ts
  M applications/openthrottle-server/src/queues/ot-loop/plan-output-writer.factory.test.ts
  M applications/openthrottle-server/src/queues/ot-loop/plan-output-writer.factory.ts
  M applications/openthrottle-server/src/queues/plan-lifecycle-hooks/plan-lifecycle-hooks.types.ts
  M applications/openthrottle-server/src/queues/plan-lifecycle-hooks/plan-lifecycle-hooks.utils.ts
  M applications/openthrottle-server/src/queues/plan-lifecycle-hooks/workflow-lifecycle-dispatcher/workflow-lifecycle-dispatcher.service.test.ts
  M applications/openthrottle-server/src/queues/plan-lifecycle-hooks/workflow-lifecycle-dispatcher/workflow-lifecycle-dispatcher.service.ts
  M applications/openthrottle-server/src/queues/plan-lifecycle-hooks/workflow-lifecycle-dispatcher/workflow-lifecycle-dispatcher.types.ts
  M applications/openthrottle-server/src/queues/plan-rules/evaluation/evaluation.service.test.ts
  M applications/openthrottle-server/src/queues/plan-rules/evaluation/evaluation.service.ts
  M applications/openthrottle-server/src/queues/plan-rules/plan-rules.processor.test.ts
  M applications/openthrottle-server/src/queues/plan-rules/plan-rules.processor.ts
  M applications/openthrottle-server/src/queues/plan-rules/plan-rules.types.ts
  M applications/openthrottle-server/src/queues/plan-rules/plan-rules.utils.ts
  M applications/openthrottle-server/src/queues/plans/plans.constants.ts
  M applications/openthrottle-server/src/queues/plans/plans.module.ts
  M applications/openthrottle-server/src/queues/plans/plans.processor.test.ts
  M applications/openthrottle-server/src/queues/plans/plans.processor.ts
  M applications/openthrottle-server/src/queues/plans/plans.types.ts
  M applications/openthrottle-server/src/queues/plans/plans.utils.ts
  M applications/openthrottle-server/src/queues/plans/run-cancellation/run-cancellation.service.ts
  M applications/openthrottle-server/src/queues/plans/scheduled-plan-run/scheduled-plan-run.service.ts
  M applications/openthrottle-server/src/queues/plans/usage-limit-resume/usage-limit-resume.service.ts
  M applications/openthrottle-server/src/queues/plans/work-ledger-run/work-ledger-run.service.test.ts
  M applications/openthrottle-server/src/queues/plans/work-ledger-run/work-ledger-run.service.ts
  M applications/openthrottle-server/src/queues/plans/work-ledger-run/work-ledger-run.types.ts
  M applications/openthrottle-server/src/queues/scheduled-agent-jobs/scheduled-agent-jobs.processor.ts
  M applications/openthrottle-server/src/queues/scheduled-agent-jobs/scheduled-agent-jobs.utils.ts
  M applications/openthrottle-server/src/services/foreign-skill-injection/materialization/materialization.service.ts
  M applications/openthrottle-server/src/services/ot-worktree-script/ot-worktree-script.utils.test.ts
  M applications/openthrottle-server/src/services/plan-context-availability/plan-context-availability.service.test.ts
  M applications/openthrottle-server/src/services/plan-creation/plan-creation.service.test.ts
  M applications/openthrottle-server/src/services/plan-creation/plan-creation.service.ts
  M applications/openthrottle-server/src/services/plan-creation/plan-creation.utils.ts
  M applications/openthrottle-server/src/services/plan-run-workspace-preflight/plan-run-workspace-preflight.service.ts
  M applications/openthrottle-server/src/services/plan-run-workspace-preflight/plan-run-workspace-preflight.types.ts
  M applications/openthrottle-server/src/services/plan-run-workspace/plan-run-workspace.module.ts
  M applications/openthrottle-server/src/services/plan-run-workspace/plan-run-workspace.service.test.ts
  M applications/openthrottle-server/src/services/plan-run-workspace/plan-run-workspace.service.ts
  M applications/openthrottle-server/src/services/plan-run-workspace/plan-run-workspace.types.ts
  M applications/openthrottle-server/src/services/plan-run-worktree-checkout/plan-run-worktree-checkout.service.test.ts
  M applications/openthrottle-server/src/services/plan-run-worktree-checkout/plan-run-worktree-checkout.service.ts
  M applications/openthrottle-server/src/services/plan-run-worktree-cleanup/plan-run-worktree-cleanup.constants.ts
  M applications/openthrottle-server/src/services/plan-run-worktree-cleanup/plan-run-worktree-cleanup.service.test.ts
  M applications/openthrottle-server/src/services/plan-run-worktree-cleanup/plan-run-worktree-cleanup.service.ts
  M applications/openthrottle-server/src/services/project-skills/project-skills.service.test.ts
  M applications/openthrottle-server/src/services/skill-availability/skill-availability.service.test.ts
  M applications/openthrottle-server/src/services/tags/tags.utils.ts
  M applications/openthrottle-server/src/services/workspace-editor-config/workspace-editor-config.constants.test.ts
  M applications/openthrottle-server/src/services/workspace-editor-config/workspace-editor-config.constants.ts
  M applications/openthrottle-server/src/workspace-type-stripping.test.ts
  M applications/openthrottle-server/tsconfig.app.json
  M applications/openthrottle-server/tsconfig.test.json
  M applications/openthrottle-website/app/**generated**/graphql.ts
  M applications/openthrottle/README.md
  M databases/openthrottle/README.md
  A databases/openthrottle/migrations/194_rename_plan_runs_execution_backend_to_driver.sql
  A databases/openthrottle/migrations/195_backfill_run_config_run_block.sql
  A databases/openthrottle/migrations/196_rename_ralph_environment_to_headless.sql
  A databases/openthrottle/migrations/197_rename_workflow_ralph_to_plan_runner.sql
  M databases/openthrottle/reports/work-ledger-status-agreement.sql
  M databases/openthrottle/seeds/plan-run-states.sql
  M docs/README.md
  M docs/Skills.md
  M docs/marketing/publishing.md
  M docs/monorepo/CI-quality-gates.md
  M docs/monorepo/Knip.md
  M docs/monorepo/NX.md
  M docs/monorepo/NX/tags.md
  M docs/monorepo/agent-editor-folders.md
  M docs/monorepo/child-repo-hook-overlay.md
  M docs/monorepo/code-style.md
  M docs/monorepo/environment-variables.md
  M docs/monorepo/foreign-workspace-skill-injection.md
  M docs/monorepo/plan-task-tags-rules-design.md
  M docs/monorepo/recurring-agent-jobs.md
  M docs/monorepo/skill-usage-telemetry-scope.md
  M docs/monorepo/source-first-packages-and-strip-only.md
  M docs/monorepo/work-ledger-sessions.md
  M docs/openthrottle/authoring-plans-via-mcp.md
  M docs/openthrottle/claude-stream-json-schema.md
  M docs/openthrottle/eval-system-adr.md
  M docs/openthrottle/first-time-onboarding.md
  M docs/openthrottle/local-quickstart.md
  M docs/openthrottle/monorepo-architecture.md
  M docs/openthrottle/openthrottle-server-auth.md
  M docs/openthrottle/ot-loop-ci-gate.md
  M docs/openthrottle/per-task-model-attribution.md
  M docs/openthrottle/plan-run-worktrees.md
  M docs/openthrottle/run-openthrottle-server-developer.md
  M docs/openthrottle/running-and-scheduling-plans.md
  M docs/openthrottle/scheduled-agent-jobs-usage.md
  M docs/openthrottle/task-wave-encoding.md
  M docs/tools/templates/AGENT_USAGE.md
  D docs/workflows/graphql-only-transport-boundary.md
  M docs/workflows/ot-loop-job.md
  D docs/workflows/ralph-design.md
  M knip.jsonc
  M nx.json
  M package.json
  M packages/AGENTS.md
  M packages/agentic-hooks/AGENTS.md
  M packages/agentic-hooks/src/data/plan-runs.ts
  M packages/agentic-replay-testing/AGENTS.md
  M packages/agentic-replay-testing/README.md
  D packages/agentic-replay-testing/fixtures/antigravity/plan-run-complete.ndjson
  D packages/agentic-replay-testing/fixtures/antigravity/plan-run-error.ndjson
  D packages/agentic-replay-testing/fixtures/antigravity/plan-run-no-marker.ndjson
  D packages/agentic-replay-testing/fixtures/claude/plan-run-account-error.ndjson
  D packages/agentic-replay-testing/fixtures/claude/plan-run-complete.ndjson
  D packages/agentic-replay-testing/fixtures/claude/plan-run-error.ndjson
  D packages/agentic-replay-testing/fixtures/claude/plan-run-no-marker.ndjson
  D packages/agentic-replay-testing/fixtures/codex/plan-run-complete.ndjson
  D packages/agentic-replay-testing/fixtures/codex/plan-run-error.ndjson
  D packages/agentic-replay-testing/fixtures/codex/plan-run-no-marker.ndjson
  D packages/agentic-replay-testing/fixtures/cursor/plan-run-complete.ndjson
  D packages/agentic-replay-testing/fixtures/cursor/plan-run-error.ndjson
  D packages/agentic-replay-testing/fixtures/cursor/plan-run-no-marker.ndjson
  D packages/agentic-replay-testing/fixtures/opencode/plan-run-complete.ndjson
  D packages/agentic-replay-testing/fixtures/opencode/plan-run-error.ndjson
  D packages/agentic-replay-testing/fixtures/opencode/plan-run-no-marker.ndjson
  M packages/agentic-replay-testing/package.json
  M packages/agentic-replay-testing/scripts/check-drift.ts
  M packages/agentic-replay-testing/scripts/record.ts
  D packages/agentic-replay-testing/scripts/synthetic/claude-credit-exhausted/runSyntheticCli.ts
  D packages/agentic-replay-testing/src/data/data.plan-run-scenarios.ts
  M packages/agentic-replay-testing/src/index.ts
  D packages/agentic-replay-testing/src/types/plan-run-scenario.ts
  M packages/agentic-replay-testing/src/types/transcript.ts
  D packages/agentic-replay-testing/src/utils/plan-run/createDriversIterationRunner.ts
  D packages/agentic-replay-testing/src/utils/plan-run/index.ts
  D packages/agentic-replay-testing/src/utils/plan-run/plan-run-store.ts
  D packages/agentic-replay-testing/src/utils/plan-run/runPlanRunScenario.ts
  M packages/agentic-replay-testing/src/utils/record/**tests**/recorders.test.ts
  M packages/agentic-replay-testing/src/utils/record/index.ts
  M packages/agentic-replay-testing/src/utils/record/recorders.ts
  M packages/agentic-replay-testing/src/utils/replay/index.ts
  M packages/agentic-replay-testing/src/utils/replay/replayPaths.ts
  M packages/agentic-replay-testing/src/utils/replay/replayers.ts
  M packages/agentic-replay-testing/tests/opencode.replay.test.ts
  D packages/agentic-replay-testing/tests/ralph.replay.test.ts
  M packages/agentic-replay-testing/tsconfig.lib.json
  M packages/graphql-codegen/AGENTS.md
  M packages/graphql-codegen/README.md
  M packages/graphql-codegen/src/index.ts
  D packages/nestjs-agentic-workflow/AGENTS.md
  D packages/nestjs-agentic-workflow/LICENSE.md
  D packages/nestjs-agentic-workflow/README.md
  D packages/nestjs-agentic-workflow/eslint.config.ts
  D packages/nestjs-agentic-workflow/package.json
  D packages/nestjs-agentic-workflow/src/agentic-workflow-base.strategy.test.ts
  D packages/nestjs-agentic-workflow/src/agentic-workflow-base.strategy.ts
  D packages/nestjs-agentic-workflow/src/agentic-workflow-ralph.strategy.test.ts
  D packages/nestjs-agentic-workflow/src/agentic-workflow-ralph.strategy.ts
  D packages/nestjs-agentic-workflow/src/agentic-workflow-worker-graphql.token.ts
  D packages/nestjs-agentic-workflow/src/config/.gitkeep
  D packages/nestjs-agentic-workflow/src/controllers/.gitkeep
  D packages/nestjs-agentic-workflow/src/index.ts
  D packages/nestjs-agentic-workflow/src/nestjs-agentic-workflow.constants.ts
  D packages/nestjs-agentic-workflow/src/nestjs-agentic-workflow.module.test.ts
  D packages/nestjs-agentic-workflow/src/nestjs-agentic-workflow.module.ts
  D packages/nestjs-agentic-workflow/src/nestjs-agentic-workflow.test.ts
  D packages/nestjs-agentic-workflow/src/nestjs-agentic-workflow.types.ts
  D packages/nestjs-agentic-workflow/src/services/.gitkeep
  D packages/nestjs-agentic-workflow/src/testing/README.md
  D packages/nestjs-agentic-workflow/src/testing/index.ts
  D packages/nestjs-agentic-workflow/src/testing/testing.module.ts
  D packages/nestjs-agentic-workflow/src/testing/testing.utils.ts
  D packages/nestjs-agentic-workflow/tests/.gitkeep
  D packages/nestjs-agentic-workflow/tsconfig.build.json
  D packages/nestjs-agentic-workflow/tsconfig.json
  D packages/nestjs-agentic-workflow/tsconfig.lib.json
  D packages/nestjs-agentic-workflow/tsconfig.test.json
  D packages/nestjs-agentic-workflow/vite.config.ts
  D packages/nestjs-agentic-workflow/vitest.config.ts
  M packages/nestjs-logging/README.md
  M packages/nestjs-logging/src/keyed-jsonl-reader/keyed-jsonl-reader.utils.test.ts
  M packages/nestjs-logging/src/keyed-jsonl-writer/keyed-jsonl-writer.types.ts
  M packages/nestjs-modules/AGENTS.md
  M packages/nestjs-modules/src/modules/global-cls/global-cls.module.test.ts
  M packages/nestjs-modules/src/modules/global-cls/global-cls.types.ts
  M packages/nestjs-modules/src/modules/global-cls/global-cls.utils.ts
  M packages/nestjs-rbac/README.md
  M packages/nestjs-rbac/src/roles/roles.constants.ts
  M packages/nestjs-rbac/src/roles/roles.utils.test.ts
  M packages/nestjs-repositories-server/src/modules/plan-runs/plan-run.entity.ts
  M packages/nestjs-repositories-server/src/modules/plan-runs/plan-runs.constants.ts
  M packages/nestjs-repositories-server/src/modules/plan-runs/plan-runs.factory.ts
  M packages/nestjs-repositories-server/src/modules/plan-runs/plan-runs.repository.test.ts
  M packages/nestjs-repositories-server/src/modules/plan-runs/plan-runs.repository.ts
  M packages/nestjs-repositories-server/src/modules/plan-runs/plan-runs.types.ts
  M packages/nestjs-repositories-server/src/modules/plan-runs/plan-runs.utils.test.ts
  M packages/nestjs-repositories-server/src/modules/plan-runs/plan-runs.utils.ts
  M packages/nestjs-repositories-server/src/modules/plans/plans.constants.ts
  M packages/nestjs-repositories-server/src/modules/scheduled-agent-jobs/scheduled-agent-jobs.types.ts
  M packages/nestjs-repositories-server/src/modules/service-accounts/service-accounts.factory.ts
  M packages/nestjs-repositories-server/src/modules/service-accounts/service-accounts.repository.test.ts
  M packages/nestjs-repositories-server/src/modules/service-accounts/service-accounts.repository.ts
  M packages/nestjs-repositories-server/src/modules/service-accounts/service-accounts.utils.test.ts
  M packages/nestjs-repositories-server/src/modules/tasks/tasks.repository.ts
  M packages/nestjs-repositories-server/src/modules/work-sessions/work-sessions.factory.ts
  M packages/nestjs-testing/AGENTS.md
  M packages/nestjs-worktrees/AGENTS.md
  M packages/nestjs-worktrees/README.md
  M packages/nestjs-worktrees/package.json
  M packages/nestjs-worktrees/src/index.ts
  M packages/nestjs-worktrees/src/nestjs-worktrees.types.ts
  M packages/nestjs-worktrees/src/parent-job/parent-job.test.ts
  M packages/nestjs-worktrees/src/parent-job/parent-job.utils.test.ts
  M packages/nestjs-worktrees/src/parent-job/parent-job.utils.ts
  M packages/nestjs-worktrees/src/workflow/workflow.utils.test.ts
  M packages/nestjs-worktrees/src/workflow/workflow.utils.ts
  M packages/nestjs-worktrees/tsconfig.lib.json
  M packages/nodejs-graphql/AGENTS.md
  M packages/nodejs-graphql/README.md
  M packages/nodejs-graphql/src/timeout.ts
  M packages/nodejs-utils/AGENTS.md
  M packages/openthrottle-agentic-loop/AGENTS.md
  M packages/openthrottle-agentic-loop/README.md
  M packages/openthrottle-agentic-loop/package.json
  M packages/openthrottle-agentic-loop/src/contract/index.ts
  A packages/openthrottle-agentic-loop/src/contract/plan-run-config.ts
  A packages/openthrottle-agentic-loop/src/contract/plan-run-finalize-port.ts
  M packages/openthrottle-agentic-loop/src/contract/validation-contract.ts
  A packages/openthrottle-agentic-loop/src/contract/workflow-run-result.ts
  M packages/openthrottle-agentic-loop/src/data/data.constants.ts
  A packages/openthrottle-agentic-loop/src/data/data.plan-run-config.ts
  M packages/openthrottle-agentic-loop/src/index.ts
  M packages/openthrottle-agentic-loop/src/utils/**tests**/finalizeOtLoopRun.test.ts
  R086 packages/openthrottle-agentic-ralph/src/utils/**tests**/finalizePlanRun.test.ts packages/openthrottle-agentic-loop/src/utils/**tests**/finalizePlanRun.test.ts
  M packages/openthrottle-agentic-loop/src/utils/**tests**/git-fixtures.ts
  A packages/openthrottle-agentic-loop/src/utils/**tests**/mergePlanRunTuningWithConfig.test.ts
  A packages/openthrottle-agentic-loop/src/utils/**tests**/plan-run-config.test.ts
  R097 packages/openthrottle-agentic-ralph/src/utils/**tests**/plan-run-pr-body.test.ts packages/openthrottle-agentic-loop/src/utils/**tests**/plan-run-pr-body.test.ts
  R067 packages/openthrottle-agentic-ralph/src/utils/**tests**/plan-task-list-order.test.ts packages/openthrottle-agentic-loop/src/utils/**tests**/plan-task-list-order.test.ts
  A packages/openthrottle-agentic-loop/src/utils/**tests**/writePlanRunDefaults.ts
  M packages/openthrottle-agentic-loop/src/utils/commit.ts
  M packages/openthrottle-agentic-loop/src/utils/createLoopGit.ts
  M packages/openthrottle-agentic-loop/src/utils/finalizeOtLoopRun.ts
  R086 packages/openthrottle-agentic-ralph/src/utils/finalizePlanRun.ts packages/openthrottle-agentic-loop/src/utils/finalizePlanRun.ts
  A packages/openthrottle-agentic-loop/src/utils/isRecord.ts
  A packages/openthrottle-agentic-loop/src/utils/mergePlanRunTuningWithConfig.ts
  A packages/openthrottle-agentic-loop/src/utils/plan-run-config.ts
  R100 packages/openthrottle-agentic-ralph/src/utils/plan-run-pr-body.ts packages/openthrottle-agentic-loop/src/utils/plan-run-pr-body.ts
  R100 packages/openthrottle-agentic-ralph/src/utils/plan-run-pr-draft.ts packages/openthrottle-agentic-loop/src/utils/plan-run-pr-draft.ts
  R057 packages/openthrottle-agentic-ralph/src/utils/plan-task-list-order.ts packages/openthrottle-agentic-loop/src/utils/plan-task-list-order.ts
  M packages/openthrottle-agentic-loop/src/utils/resolveOtLoopCommands.ts
  M packages/openthrottle-agentic-loop/src/utils/runOtLoop.ts
  M packages/openthrottle-agentic-loop/src/utils/shell-command.ts
  M packages/openthrottle-agentic-loop/tsconfig.lib.json
  D packages/openthrottle-agentic-ralph/.gitignore
  D packages/openthrottle-agentic-ralph/AGENTS.md
  D packages/openthrottle-agentic-ralph/LICENSE.md
  D packages/openthrottle-agentic-ralph/README.md
  D packages/openthrottle-agentic-ralph/codegen.ts
  D packages/openthrottle-agentic-ralph/eslint.config.ts
  D packages/openthrottle-agentic-ralph/package.json
  D packages/openthrottle-agentic-ralph/src/**generated**/.gitkeep
  D packages/openthrottle-agentic-ralph/src/**generated**/gql.ts
  D packages/openthrottle-agentic-ralph/src/**generated**/schemas.ts
  D packages/openthrottle-agentic-ralph/src/**tests**/.gitkeep
  D packages/openthrottle-agentic-ralph/src/config/**tests**/.gitkeep
  D packages/openthrottle-agentic-ralph/src/config/index.ts
  D packages/openthrottle-agentic-ralph/src/contract/index.ts
  D packages/openthrottle-agentic-ralph/src/contract/ralph-orchestrator-deps.ts
  D packages/openthrottle-agentic-ralph/src/contract/step-results.ts
  D packages/openthrottle-agentic-ralph/src/data/**tests**/.gitkeep
  D packages/openthrottle-agentic-ralph/src/index.ts
  D packages/openthrottle-agentic-ralph/src/types.ts
  D packages/openthrottle-agentic-ralph/src/utils/**tests**/.gitkeep
  D packages/openthrottle-agentic-ralph/src/utils/**tests**/context.test.ts
  D packages/openthrottle-agentic-ralph/src/utils/**tests**/describeWorkflowAccountError.test.ts
  D packages/openthrottle-agentic-ralph/src/utils/**tests**/graphql.test.ts
  D packages/openthrottle-agentic-ralph/src/utils/**tests**/orchestrator-foreign-workdir.test.ts
  D packages/openthrottle-agentic-ralph/src/utils/**tests**/orchestrator.test.ts
  D packages/openthrottle-agentic-ralph/src/utils/**tests**/output.test.ts
  D packages/openthrottle-agentic-ralph/src/utils/**tests**/ralph-plan-run-context.test.ts
  D packages/openthrottle-agentic-ralph/src/utils/**tests**/terminal-status.test.ts
  D packages/openthrottle-agentic-ralph/src/utils/context.ts
  D packages/openthrottle-agentic-ralph/src/utils/createDefaultWorkflowRalphCommandRunner.ts
  D packages/openthrottle-agentic-ralph/src/utils/describeWorkflowAccountError.ts
  D packages/openthrottle-agentic-ralph/src/utils/graphql.ts
  D packages/openthrottle-agentic-ralph/src/utils/orchestrator.ts
  D packages/openthrottle-agentic-ralph/src/utils/output.ts
  D packages/openthrottle-agentic-ralph/src/utils/recordIterationTrajectory.ts
  D packages/openthrottle-agentic-ralph/src/utils/terminal-status.ts
  D packages/openthrottle-agentic-ralph/tests/.gitkeep
  D packages/openthrottle-agentic-ralph/tsconfig.json
  D packages/openthrottle-agentic-ralph/tsconfig.lib.json
  D packages/openthrottle-agentic-ralph/tsconfig.test.json
  D packages/openthrottle-agentic-ralph/vite.config.ts
  D packages/openthrottle-agentic-ralph/vitest.config.ts
  M packages/openthrottle-agentic-utils/AGENTS.md
  M packages/openthrottle-agentic-utils/README.md
  M packages/openthrottle-agentic-utils/package.json
  R094 tools/workflows/src/bin/memory-reconcile.ts packages/openthrottle-agentic-utils/src/bin/memory-reconcile.ts
  M packages/openthrottle-agentic-utils/src/config/index.ts
  M packages/openthrottle-agentic-utils/src/data/artwork.ts
  M packages/openthrottle-agentic-utils/src/data/prompts.ts
  M packages/openthrottle-agentic-utils/src/index.ts
  R096 tools/workflows/src/memory-reconcile/**tests**/demotion.test.ts packages/openthrottle-agentic-utils/src/memory-reconcile/**tests**/demotion.test.ts
  R099 tools/workflows/src/memory-reconcile/**tests**/integrity.test.ts packages/openthrottle-agentic-utils/src/memory-reconcile/**tests**/integrity.test.ts
  R098 tools/workflows/src/memory-reconcile/**tests**/reconcile.test.ts packages/openthrottle-agentic-utils/src/memory-reconcile/**tests**/reconcile.test.ts
  R100 tools/workflows/src/memory-reconcile/claims.ts packages/openthrottle-agentic-utils/src/memory-reconcile/claims.ts
  R097 tools/workflows/src/memory-reconcile/demotion.ts packages/openthrottle-agentic-utils/src/memory-reconcile/demotion.ts
  R100 tools/workflows/src/memory-reconcile/integrity.ts packages/openthrottle-agentic-utils/src/memory-reconcile/integrity.ts
  A packages/openthrottle-agentic-utils/src/memory-reconcile/listAllPlans.ts
  R098 tools/workflows/src/memory-reconcile/reconcile.ts packages/openthrottle-agentic-utils/src/memory-reconcile/reconcile.ts
  R090 tools/workflows/src/types/job-run-lifecycle-hooks.ts packages/openthrottle-agentic-utils/src/types/job-run-lifecycle-hooks.ts
  A packages/openthrottle-agentic-utils/src/types/plan-run-settings.ts
  A packages/openthrottle-agentic-utils/src/types/plan-run.ts
  R100 packages/openthrottle-agentic-workflow/src/types/metrics.ts packages/openthrottle-agentic-utils/src/types/system-metrics.ts
  A packages/openthrottle-agentic-utils/src/types/workflow-config.ts
  R094 packages/openthrottle-agentic-workflow/src/types/lifecycle.ts packages/openthrottle-agentic-utils/src/types/workflow-lifecycle.ts
  A packages/openthrottle-agentic-utils/src/types/workflow-run.ts
  R080 packages/openthrottle-agentic-ralph/src/utils/**tests**/format-plan-and-tasks-for-prompt.test.ts packages/openthrottle-agentic-utils/src/utils/**tests**/formatPlanAndTasksForPrompt.test.ts
  R098 tools/workflows/src/utils/**tests**/hook-task-to-job-run-hook.test.ts packages/openthrottle-agentic-utils/src/utils/**tests**/hook-task-to-job-run-hook.test.ts
  R095 packages/openthrottle-agentic-workflow/src/utils/**tests**/index.test.ts packages/openthrottle-agentic-utils/src/utils/**tests**/isLifecycleHooksChildJobsEnabled.test.ts
  R080 tools/workflows/src/utils/**tests**/job-run-hooks-runner.test.ts packages/openthrottle-agentic-utils/src/utils/**tests**/job-run-hooks-runner.test.ts
  R094 tools/workflows/src/utils/**tests**/job-run-lifecycle-hooks-validation.test.ts packages/openthrottle-agentic-utils/src/utils/**tests**/job-run-lifecycle-hooks-validation.test.ts
  D packages/openthrottle-agentic-utils/src/utils/**tests**/metrics.integration.test.ts
  D packages/openthrottle-agentic-utils/src/utils/**tests**/metrics.test.ts
  M packages/openthrottle-agentic-utils/src/utils/**tests**/nodejs.test.ts
  R068 tools/workflows/src/utils/**tests**/ralph-prompt-resolution.test.ts packages/openthrottle-agentic-utils/src/utils/**tests**/plan-run-prompt-resolution.test.ts
  A packages/openthrottle-agentic-utils/src/utils/**tests**/plan-run-settings.test.ts
  A packages/openthrottle-agentic-utils/src/utils/**tests**/runJobRunHookAgent.test.ts
  R059 packages/openthrottle-agentic-workflow/src/utils/**tests**/metrics.test.ts packages/openthrottle-agentic-utils/src/utils/**tests**/system-metrics.test.ts
  M packages/openthrottle-agentic-utils/src/utils/**tests**/workflow.test.ts
  M packages/openthrottle-agentic-utils/src/utils/configuration.ts
  M packages/openthrottle-agentic-utils/src/utils/conversation-backend/acp/routing.ts
  M packages/openthrottle-agentic-utils/src/utils/conversation-backend/grok/**tests**/grok-1-tool-calls.fixture.ts
  A packages/openthrottle-agentic-utils/src/utils/createPlanRunCommandRunner.ts
  M packages/openthrottle-agentic-utils/src/utils/foreign-workspace-context.ts
  R080 packages/openthrottle-agentic-ralph/src/utils/index.ts packages/openthrottle-agentic-utils/src/utils/formatPlanAndTasksForPrompt.ts
  R095 tools/workflows/src/utils/hook-task-to-job-run-hook.ts packages/openthrottle-agentic-utils/src/utils/hook-task-to-job-run-hook.ts
  R077 packages/openthrottle-agentic-workflow/src/utils/index.ts packages/openthrottle-agentic-utils/src/utils/isLifecycleHooksChildJobsEnabled.ts
  R084 tools/workflows/src/utils/job-run-hooks-runner.ts packages/openthrottle-agentic-utils/src/utils/job-run-hooks-runner.ts
  R098 tools/workflows/src/utils/job-run-lifecycle-hooks-validation.ts packages/openthrottle-agentic-utils/src/utils/job-run-lifecycle-hooks-validation.ts
  M packages/openthrottle-agentic-utils/src/utils/metrics.ts
  M packages/openthrottle-agentic-utils/src/utils/nodejs.ts
  R073 tools/workflows/src/utils/ralph-prompt-resolution.ts packages/openthrottle-agentic-utils/src/utils/plan-run-prompt-resolution.ts
  A packages/openthrottle-agentic-utils/src/utils/plan-run-settings.ts
  M packages/openthrottle-agentic-utils/src/utils/postgres.ts
  A packages/openthrottle-agentic-utils/src/utils/runJobRunHookAgent.ts
  M packages/openthrottle-agentic-utils/src/utils/structured-output/**tests**/structured-output.test.ts
  M packages/openthrottle-agentic-utils/src/utils/structured-output/withStructuredOutput.ts
  R057 packages/openthrottle-agentic-workflow/src/utils/metrics.ts packages/openthrottle-agentic-utils/src/utils/system-metrics.ts
  M packages/openthrottle-agentic-utils/src/utils/workflow.ts
  M packages/openthrottle-agentic-utils/tsconfig.lib.json
  D packages/openthrottle-agentic-workflow/AGENTS.md
  D packages/openthrottle-agentic-workflow/LICENSE.md
  D packages/openthrottle-agentic-workflow/README.md
  D packages/openthrottle-agentic-workflow/eslint.config.ts
  D packages/openthrottle-agentic-workflow/package.json
  D packages/openthrottle-agentic-workflow/src/config/**tests**/.gitkeep
  D packages/openthrottle-agentic-workflow/src/config/index.ts
  D packages/openthrottle-agentic-workflow/src/data/**tests**/.gitkeep
  D packages/openthrottle-agentic-workflow/src/index.ts
  D packages/openthrottle-agentic-workflow/src/types/**tests**/.gitkeep
  D packages/openthrottle-agentic-workflow/src/types/config.ts
  D packages/openthrottle-agentic-workflow/src/types/index.ts
  D packages/openthrottle-agentic-workflow/tests/.gitkeep
  D packages/openthrottle-agentic-workflow/tsconfig.json
  D packages/openthrottle-agentic-workflow/tsconfig.lib.json
  D packages/openthrottle-agentic-workflow/tsconfig.test.json
  D packages/openthrottle-agentic-workflow/vite.config.ts
  D packages/openthrottle-agentic-workflow/vitest.config.ts
  M packages/openthrottle-drivers/AGENTS.md
  M packages/openthrottle-drivers/README.md
  M packages/openthrottle-drivers/src/drivers/**tests**/parity.test.ts
  M packages/openthrottle-drivers/src/drivers/claude.ts
  M packages/openthrottle-drivers/src/drivers/cursor.ts
  M packages/openthrottle-drivers/src/drivers/opencode.ts
  M packages/openthrottle-drivers/src/engine/index.ts
  M packages/openthrottle-drivers/src/errors/index.ts
  M packages/openthrottle-drivers/src/registry/**tests**/registry.test.ts
  M packages/openthrottle-drivers/src/registry/index.ts
  M packages/openthrottle-drivers/src/types/index.ts
  M packages/openthrottle-drivers/src/utils/child-kill.ts
  M packages/openthrottle-drivers/src/utils/claude-output.ts
  M packages/openthrottle-drivers/src/utils/logger.ts
  M packages/openthrottle-drivers/src/utils/output-format.ts
  M packages/openthrottle-drivers/src/utils/reasoning-effort.ts
  M packages/openthrottle-drivers/src/utils/shell-flags.ts
  M packages/openthrottle-drivers/src/utils/shell.ts
  M packages/openthrottle-mcp-evals/src/search-ranking/data/data.cases.ts
  M packages/openthrottle-mcp-evals/src/tool-selection/data/data.cases.ts
  M packages/openthrottle-mcp/AGENTS.md
  M packages/openthrottle-mcp/README.md
  M packages/openthrottle-mcp/codegen.ts
  M packages/openthrottle-mcp/docs/AUTH.md
  M packages/openthrottle-mcp/docs/agent-conversation-read-tools-contract.md
  M packages/openthrottle-mcp/docs/verification-environment.md
  M packages/openthrottle-mcp/package.json
  M packages/openthrottle-mcp/src/**generated**/gql.ts
  M packages/openthrottle-mcp/src/**generated**/graphql.ts
  M packages/openthrottle-mcp/src/**generated**/schemas.ts
  M packages/openthrottle-mcp/src/config/**tests**/agent-environment.test.ts
  M packages/openthrottle-mcp/src/config/agent-environment.ts
  R061 packages/openthrottle-mcp/src/config/execution-backend.ts packages/openthrottle-mcp/src/config/driver.ts
  R088 packages/openthrottle-agentic-ralph/src/graphql/**tests**/fragment-coverage.test.ts packages/openthrottle-mcp/src/graphql/**tests**/fragment-coverage.test.ts
  M packages/openthrottle-mcp/src/graphql/agent-conversations.graphql
  M packages/openthrottle-mcp/src/graphql/agent-discovery.graphql
  M packages/openthrottle-mcp/src/graphql/embeddings-health.graphql
  M packages/openthrottle-mcp/src/graphql/model-discovery.graphql
  R093 packages/openthrottle-agentic-ralph/src/graphql/ralph/fragments.graphql packages/openthrottle-mcp/src/graphql/operations/fragments.graphql
  R052 packages/openthrottle-agentic-ralph/src/graphql/ralph/mutations.graphql packages/openthrottle-mcp/src/graphql/operations/mutations.graphql
  R064 packages/openthrottle-agentic-ralph/src/graphql/ralph/queries.graphql packages/openthrottle-mcp/src/graphql/operations/queries.graphql
  M packages/openthrottle-mcp/src/graphql/projects.graphql
  M packages/openthrottle-mcp/src/runServer.ts
  M packages/openthrottle-mcp/src/tools/**tests**/agent-conversations.test.ts
  M packages/openthrottle-mcp/src/tools/**tests**/ambient-session-propagation.test.ts
  M packages/openthrottle-mcp/src/tools/**tests**/output.test.ts
  M packages/openthrottle-mcp/src/tools/**tests**/plan-runs.test.ts
  M packages/openthrottle-mcp/src/tools/agent-conversations.ts
  M packages/openthrottle-mcp/src/tools/plan-runs.ts
  M packages/openthrottle-mcp/src/tools/skill-availability.ts
  M packages/openthrottle-mcp/src/tools/tag-action-rules.ts
  M packages/openthrottle-plan-config/README.md
  M packages/openthrottle-plan-config/package.json
  M packages/openthrottle-plan-config/src/**tests**/plan-run-config-snapshot.test.ts
  D packages/openthrottle-plan-config/src/**tests**/plan-run-config-storage.parity.test.ts
  M packages/openthrottle-plan-config/src/**tests**/plan-run-config-storage.test.ts
  M packages/openthrottle-plan-config/src/index.ts
  M packages/openthrottle-plan-config/src/plan-run-config-ot-loop.validation.ts
  M packages/openthrottle-plan-config/src/plan-run-config-snapshot.build.ts
  M packages/openthrottle-plan-config/src/plan-run-config-snapshot.types.ts
  M packages/openthrottle-plan-config/src/plan-run-config-snapshot.validation.ts
  M packages/openthrottle-plan-config/src/plan-run-config-storage.constants.ts
  M packages/openthrottle-plan-config/src/plan-run-config-storage.defaults.ts
  M packages/openthrottle-plan-config/src/plan-run-config-storage.round-trip.ts
  M packages/openthrottle-plan-config/src/plan-run-config-storage.types.ts
  M packages/openthrottle-plan-config/src/plan-run-config-storage.validation.ts
  M packages/openthrottle-plan-config/tsconfig.lib.json
  M packages/openthrottle-product/src/data/data.features.ts
  M packages/openthrottle-showroom/README.md
  M packages/openthrottle-showroom/RECORDABILITY.md
  R091 packages/openthrottle-showroom/src/episodes/11-ralph-one-task/episode.ts packages/openthrottle-showroom/src/episodes/11-plan-run-one-task/episode.ts
  R096 packages/openthrottle-showroom/src/episodes/11-ralph-one-task/flow.ts packages/openthrottle-showroom/src/episodes/11-plan-run-one-task/flow.ts
  M packages/openthrottle-showroom/src/episodes/**tests**/migration-parity.test.ts
  M packages/openthrottle-showroom/src/episodes/flows.ts
  M packages/openthrottle-showroom/src/episodes/registry.ts
  M packages/openthrottle-showroom/src/scripts/demo-live-run.ts
  M packages/openthrottle-showroom/src/scripts/seed-demo.ts
  M packages/openthrottle-showroom/src/snapshot/data/_tables.json
  M packages/openthrottle-showroom/src/snapshot/data/agent_conversation_messages.jsonl
  M packages/openthrottle-showroom/src/snapshot/data/custom_prompt_embeddings.jsonl
  M packages/openthrottle-showroom/src/snapshot/data/custom_prompts.jsonl
  M packages/openthrottle-showroom/src/snapshot/data/documentation.jsonl
  M packages/openthrottle-showroom/src/snapshot/data/documentation_embeddings.jsonl
  M packages/openthrottle-showroom/src/snapshot/data/plan_embeddings.jsonl
  M packages/openthrottle-showroom/src/snapshot/data/plan_output_stream.jsonl
  M packages/openthrottle-showroom/src/snapshot/data/plan_runs.jsonl
  M packages/openthrottle-showroom/src/snapshot/data/plans.jsonl
  M packages/openthrottle-showroom/src/snapshot/data/scheduled_agent_jobs.jsonl
  M packages/openthrottle-showroom/src/snapshot/data/service_accounts.jsonl
  M packages/openthrottle-showroom/src/snapshot/data/skill_usage_events.jsonl
  M packages/openthrottle-showroom/src/snapshot/data/task_embeddings.jsonl
  M packages/openthrottle-showroom/src/snapshot/data/tasks.jsonl
  M packages/openthrottle-showroom/src/snapshot/data/work_sessions.jsonl
  M packages/openthrottle-showroom/src/snapshot/manifest.data.ts
  M packages/openthrottle-skills/src/**tests**/agent-assets-ingest.test.ts
  M packages/openthrottle-skills/src/**tests**/rankMatchedTagActions.test.ts
  M packages/openthrottle-skills/src/**tests**/resolveSkillAvailability.test.ts
  M packages/openthrottle-skills/src/**tests**/tag-actions.test.ts
  M packages/openthrottle-skills/src/resolveSkillAvailability.ts
  M packages/react-router-graphql/src/utils/form-data-schema.ts
  M packages/react-router-profiling/AGENTS.md
  M packages/react-router-profiling/README.md
  M packages/react-router-profiling/src/types.ts
  M packages/react-router-ui-global/README.md
  M packages/react-router-ui/src/components/OpenThrottleClipboard.tsx
  M packages/react-router-ui/src/data/data.introductions.ts
  M pnpm-lock.yaml
  M pnpm-workspace.yaml
  M scripts/**tests**/parallelize-tasks.test.ts
  M scripts/bootstrap-default-user.ts
  M scripts/bootstrap-service-account-credentials.ts
  M scripts/check-package-entrypoints.ts
  M scripts/model-facing-text.snapshot.json
  M scripts/shard-weights.json
  M scripts/verify-graphql-codegen.ts
  M skills/README.md
  D skills/agents-ralph/SKILL.md
  M skills/ot-folders/references/Packages.md
  M skills/ot-loop/SKILL.md
  M skills/ot-loop/references/model-routing.md
  M skills/ot-plans/SKILL.md
  M skills/ot-postgres/SKILL.md
  M skills/ot-stack/SKILL.md
  M tools/AGENTS.md
  M tools/generators/AGENTS.md
  M tools/ollama-proxy/package.json
  M tools/ot-telemetry/src/utils/metrics/agent-runs.ts
  M tools/ot-telemetry/src/utils/metrics/type-guards.ts
  M tools/ot-telemetry/src/utils/renderMarkdownReport.ts
  D tools/workflows/AGENTS.md
  D tools/workflows/LICENSE.md
  D tools/workflows/README.md
  D tools/workflows/docs/cross-repo-usage.md
  D tools/workflows/docs/local-api-design.md
  D tools/workflows/docs/process-management-proposal.md
  D tools/workflows/docs/process-model.md
  D tools/workflows/docs/profiling-ui-usage.md
  D tools/workflows/docs/server-and-task-metrics.md
  D tools/workflows/docs/verification-and-reporting.md
  D tools/workflows/docs/worktree-registration-and-allocation.md
  D tools/workflows/eslint.config.ts
  D tools/workflows/package.json
  D tools/workflows/results/actionable-insights.json
  D tools/workflows/results/baseline-results.json
  D tools/workflows/results/caching-headers-report.json
  D tools/workflows/results/cwv-report.json
  D tools/workflows/results/image-optimization-report.json
  D tools/workflows/results/ralph-sequenced-execute.json
  D tools/workflows/results/ralph-sequenced-finalize.json
  D tools/workflows/results/ralph-sequenced-setup.json
  D tools/workflows/results/ralph-sequenced-verify.json
  D tools/workflows/schemas/workflow-ralph.defaults.schema.json
  D tools/workflows/scripts/associate-completed-plans-with-nx-projects.ts
  D tools/workflows/scripts/load-plan.ts
  D tools/workflows/scripts/smoke-sort-order-ralph.ts
  D tools/workflows/src/bin/**tests**/.gitkeep
  D tools/workflows/src/bin/**tests**/ralph.cancelable-run.test.ts
  D tools/workflows/src/bin/**tests**/ralph.test.ts
  D tools/workflows/src/bin/**tests**/runIteration.test.ts
  D tools/workflows/src/bin/lighthouse.ts
  D tools/workflows/src/bin/link-merge.ts
  D tools/workflows/src/bin/ralph.ts
  D tools/workflows/src/bin/runIteration.ts
  D tools/workflows/src/config/**tests**/.gitkeep
  D tools/workflows/src/config/**tests**/loadWorkflowRalphConfig.test.ts
  D tools/workflows/src/config/**tests**/mergePlanRunTuningWithWorkflowRalphConfig.test.ts
  D tools/workflows/src/config/**tests**/workflow-ralph-spawn-env.test.ts
  D tools/workflows/src/config/index.ts
  D tools/workflows/src/config/loadWorkflowRalphConfig.ts
  D tools/workflows/src/config/mergePlanRunTuningWithWorkflowRalphConfig.ts
  D tools/workflows/src/config/messages.ts
  D tools/workflows/src/config/workflow-ralph-defaults.types.ts
  D tools/workflows/src/config/workflow-ralph-spawn-env.ts
  D tools/workflows/src/index.ts
  D tools/workflows/src/type.ts
  D tools/workflows/src/types/**tests**/.gitkeep
  D tools/workflows/src/types/child-process-metrics.ts
  D tools/workflows/src/types/lighthouse.ts
  D tools/workflows/src/types/wall-clock-metrics.ts
  D tools/workflows/src/types/worktree.ts
  D tools/workflows/src/utils/WorktreeTargetsTracker.ts
  D tools/workflows/src/utils/**tests**/.gitkeep
  D tools/workflows/src/utils/**tests**/WorktreeTargetsTracker.test.ts
  D tools/workflows/src/utils/**tests**/child-process-metrics.test.ts
  D tools/workflows/src/utils/**tests**/createCursorWorkflowRalphIterationRunner.test.ts
  D tools/workflows/src/utils/**tests**/foreign-workspace-context.test.ts
  D tools/workflows/src/utils/**tests**/mutex-worktree-targets.test.ts
  D tools/workflows/src/utils/**tests**/openthrottle-ralph-graphql.test.ts
  D tools/workflows/src/utils/**tests**/openthrottle-ralph-postgres.cli-run.test.ts
  D tools/workflows/src/utils/**tests**/openthrottle-ralph-postgres.commit-link.test.ts
  D tools/workflows/src/utils/**tests**/openthrottle-ralph-types.test.ts
  D tools/workflows/src/utils/**tests**/openthrottle-ralph.register-worktree-checkout.test.ts
  D tools/workflows/src/utils/**tests**/openthrottle-ralph.test.ts
  D tools/workflows/src/utils/**tests**/ot-diagnostics.test.ts
  D tools/workflows/src/utils/**tests**/parent-job.test.ts
  D tools/workflows/src/utils/**tests**/parsers.backend.test.ts
  D tools/workflows/src/utils/**tests**/parsers.effort.test.ts
  D tools/workflows/src/utils/**tests**/parsers.prompt-delivery.test.ts
  D tools/workflows/src/utils/**tests**/parsers.task-iterations.test.ts
  D tools/workflows/src/utils/**tests**/parsers.test.ts
  D tools/workflows/src/utils/**tests**/parsers.worktree.test.ts
  D tools/workflows/src/utils/**tests**/process-metrics-format.test.ts
  D tools/workflows/src/utils/**tests**/ralph-execution-backend.test.ts
  D tools/workflows/src/utils/**tests**/ralph-runtime-config.iteration-timeout.test.ts
  D tools/workflows/src/utils/**tests**/ralph-runtime-config.test.ts
  D tools/workflows/src/utils/**tests**/ralph-worktree-cli.test.ts
  D tools/workflows/src/utils/**tests**/ralphDebugLogger.test.ts
  D tools/workflows/src/utils/**tests**/run-output.test.ts
  D tools/workflows/src/utils/**tests**/show-configuration.test.ts
  D tools/workflows/src/utils/**tests**/workflow-ralph-nested-argv.test.ts
  D tools/workflows/src/utils/**tests**/workflow.test.ts
  D tools/workflows/src/utils/child-process-metrics.ts
  D tools/workflows/src/utils/createCursorWorkflowRalphIterationRunner.ts
  D tools/workflows/src/utils/index.ts
  D tools/workflows/src/utils/mutex-worktree-targets.ts
  D tools/workflows/src/utils/openthrottle-ralph-graphql.ts
  D tools/workflows/src/utils/openthrottle-ralph-postgres.ts
  D tools/workflows/src/utils/openthrottle-ralph-types.ts
  D tools/workflows/src/utils/openthrottle-ralph.ts
  D tools/workflows/src/utils/ot-diagnostics.ts
  D tools/workflows/src/utils/parent-job.ts
  D tools/workflows/src/utils/parsers.ts
  D tools/workflows/src/utils/process-metrics-format.ts
  D tools/workflows/src/utils/projects.ts
  D tools/workflows/src/utils/ralph-execution-backend.ts
  D tools/workflows/src/utils/ralph-runtime-config.ts
  D tools/workflows/src/utils/ralph-worktree-cli.ts
  D tools/workflows/src/utils/ralphDebugLogger.ts
  D tools/workflows/src/utils/resolveAgentVersion.ts
  D tools/workflows/src/utils/run-output.ts
  D tools/workflows/src/utils/workflow-ralph-nested-argv.ts
  D tools/workflows/src/utils/workflow-transport.ts
  D tools/workflows/src/utils/workflow.ts
  D tools/workflows/tsconfig.build.json
  D tools/workflows/tsconfig.json
  D tools/workflows/tsconfig.lib.json
  D tools/workflows/tsconfig.test.json
  D tools/workflows/vite.config.ts
  D tools/workflows/vitest.config.ts
  M tsconfig.json
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
