# Agentic Ralph (server)

In-process Ralph orchestration for OpenThrottle lives here: **types** for orchestrator jobs (`run-plan-orchestrator`), **worker GraphQL** env helpers, **Nest** `AgenticRalphModule` (wraps `NestjsAgenticWorkflowModule.register` + orchestrator deps + `AgenticRalphOrchestratorService`).

The BullMQ **queue** is still `plans` (`PLANS_QUEUE_NAME`); this folder is the obvious entry for “Ralph v2 / agentic-ralph” wiring without reading spawn/cancellation code in `queues/plans/`.

Start at `index.ts` and `agentic-ralph.module.ts`.
