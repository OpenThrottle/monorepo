# openthrottle-developer notifications + WebSockets — kick-off plan

Use this document to kick off implementation or onboard. The plan lives in Cortex (plan ID below); this file is the single reference so you don’t need to re-read Cortex.

**Cortex plan ID:** `4424d9fa-5b33-41ce-81a0-d55f2957637a`
**Title:** openthrottle-developer notifications: WebSocket events from server, consume in app
**Project:** openthrottle-developer

---

## Goal

Add notifications to the openthrottle-developer app by wiring WebSockets end-to-end:

- **OpenThrottle-server** dispatches events (e.g. plan/task updates, queue job completion, system alerts).
- **openthrottle-developer** consumes those events and surfaces them in the UI (toast and/or notification bell).

---

## Current state (as of last doc update)

- **Server:** `NestjsWebsocketsModule` and Socket.IO (`IoAdapter` in `main.ts`). **NotificationsModule** and **NotificationsService** emit notification events using the shared contract from `@openthrottle/openthrottle-notifications`. Events are emitted from:
  - **GraphQL:** plans resolver (plan create/update), tasks resolver (task complete, plan updated).
  - **Queues:** plans processor, daily-stats processor (queue.job.completed).
- **Developer app:** Socket.IO client in `~/global/notifications/notifications-socket.context.tsx` (connects to `API_URL_EXTERNAL`); notifications store in `~/global/notifications/notifications-store.context.tsx`; **NotificationBell** in header; root wraps with `NotificationsStoreProvider` and socket bridge; Toaster (shadcn) for real-time toasts.

---

## Tasks (execute in order or in parallel where independent)

### 1. Define notification event types and payloads (server + client contract) ✅

- **Done.** Shared contract lives in **`@openthrottle/openthrottle-notifications`** (package: `packages/openthrottle/notifications`).
- Event names: `plan.updated`, `task.completed`, `queue.job.completed`, `system.alert` (use `NOTIFICATION_EVENT_NAMES`).
- Payload base: `message`, `severity` (`info` | `success` | `warning` | `error`), `timestamp` (ISO 8601); optional `planId`, `taskId` (and event-specific fields; see package README).
- Server and developer app both depend on `@openthrottle/openthrottle-notifications` and import the same types.

### 2. Server: notifications gateway and emit from application events ✅

- **Done.** NotificationsService (openthrottle-server) uses `NestjsWebsocketsGateway` to emit. Queue processors (plans, daily-stats) and GraphQL resolvers (plans, tasks) inject and call `notifications.emitPlanUpdated`, `emitTaskCompleted`, `emitQueueJobCompleted`. Socket.IO broadcast reaches connected clients.

### 3. Developer app: Socket.IO client and connection to server ✅

- **Done.** Socket.IO client in `NotificationsSocketProvider`; connects to `API_URL_EXTERNAL` from settings; subscribes to all `NOTIFICATION_EVENT_NAMES`; connect/disconnect/reconnect status exposed. Optional auth not yet implemented.

### 4. Developer app: notifications state and persistence ✅

- **Done.** Notifications store context holds list, read/unread, dismiss. Optional persistence (e.g. localStorage) can be added later. Components use context to read and mark read/dismiss.

### 5. Developer app: notification UI (toast and/or bell) ✅

- **Done.** Toast via `@openthrottle/react-router-shadcn` Toaster; NotificationBell in header with dropdown; mark-as-read and dismiss supported.

### 6. Write single kick-off document ✅

- **Done.** This file. Update it when env vars, URLs, or implementation details change.

---

## Where things live

- **Contract:** `packages/openthrottle/notifications` — event names, payload types, README.
- **Server:** `applications/openthrottle-server/src/notifications/` (NotificationsModule, NotificationsService); `main.ts` (IoAdapter); resolvers/processors inject NotificationsService and call `emit*`.
- **Developer app:** `applications/openthrottle-developer/app/global/notifications/` (socket context, store context, NotificationBell); `app/global/config/settings.ts` (API_URL_EXTERNAL); root.tsx (NotificationsStoreProvider, NotificationsSocketBridge, Toaster).

---

## Shared contract: @openthrottle/openthrottle-notifications

- **Package:** `packages/openthrottle/notifications`; add dependency `"@openthrottle/openthrottle-notifications": "workspace:*"` in server and developer app.
- **Event names:** `NOTIFICATION_EVENT_NAMES.PLAN_UPDATED` → `plan.updated`, `TASK_COMPLETED` → `task.completed`, `QUEUE_JOB_COMPLETED` → `queue.job.completed`, `SYSTEM_ALERT` → `system.alert`.
- **Payload types:** `PlanUpdatedPayload`, `TaskCompletedPayload`, `QueueJobCompletedPayload`, `SystemAlertPayload` (all extend base with `message`, `severity`, `timestamp`; event-specific fields in package README).

### Plan/task status-change events (UI sync)

For keeping the plans detail route in sync without manual refresh (e.g. when status is updated via Cortex/mcp-developer or API):

- **Transport:** Same WebSocket (Socket.IO) as above. No SSE or polling.
- **Event names:** `NOTIFICATION_EVENT_NAMES.PLAN_STATUS_CHANGED` → `plan.status_changed`, `NOTIFICATION_EVENT_NAMES.TASK_STATUS_CHANGED` → `task.status_changed`.
- **Payloads:**
  - **plan.status_changed:** `PlanStatusChangedPayload`: `planId`, `status`, `timestamp` (ISO 8601).
  - **task.status_changed:** `TaskStatusChangedPayload`: `planId`, `taskId`, `status`, `timestamp` (ISO 8601).
- **Usage:** Server emits these when plan or task status is updated (in addition to existing `plan.updated` / `task.completed` for toasts). Developer app: on `plans/$planId`, subscribe to both events; when `payload.planId === params.planId`, revalidate loader or refetch so plan and tasks stay in sync.
- **Types:** `PlanStatusChangedPayload`, `TaskStatusChangedPayload`, `StatusChangePayload` (discriminated union with `kind: 'plan_status_changed' | 'task_status_changed'` for a single handler). See `packages/openthrottle/notifications/src/events.ts`.

### Status-change emission inventory

Paths that change `plans.status` or `tasks.status`, and whether they emit `plan.status_changed` / `task.status_changed` on the OpenThrottle server WebSocket:

| Path                                                                   | Changes                                        | `plan.status_changed`                     | `task.status_changed`                                                   |
| ---------------------------------------------------------------------- | ---------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------- |
| GraphQL `updatePlan`, `setPlanStatus`                                  | plan                                           | `@EmitNotification`                       | —                                                                       |
| GraphQL `enqueuePlanRun`, `enqueuePlanRalphOrchestrator`               | plan → QUEUED; bulk tasks → QUEUED             | `@EmitNotification`                       | `updateMatchingTasksAndEmitStatusChanged` (one event per affected task) |
| GraphQL `cancelPlanRun`                                                | plan → PENDING; QUEUED tasks → PENDING         | `@EmitNotification`                       | `updateMatchingTasksAndEmitStatusChanged`                               |
| GraphQL `createTask`, `updateTask`                                     | task; may promote plan                         | manual `emitPlanStatusChanged` on promote | `@EmitNotification`                                                     |
| `PlansProcessor` `process()`                                           | plan → IN_PROGRESS                             | `emitPlanStatusChanged`                   | —                                                                       |
| Processors `reconcilePlanStatusOnStartup`                              | plan → QUEUED                                  | `emitPlanStatusChanged`                   | —                                                                       |
| Processors `reconcilePlansQueuedWithInProgressTasks`                   | plan → IN_PROGRESS                             | `emitPlanStatusChanged`                   | —                                                                       |
| Processors `resetPlanStatusToQueued` (failed, stalled, worktree delay) | plan → QUEUED                                  | `emitPlanStatusChanged`                   | —                                                                       |
| Job-run hooks `before_run` block                                       | plan → BLOCKED                                 | `emitPlanStatusChanged`                   | —                                                                       |
| In-process Ralph orchestrator (`enqueuePlanRalphOrchestrator`)         | task/plan via GraphQL mutations                | via GraphQL decorators                    | via GraphQL decorators                                                  |
| Spawn Ralph (`enqueuePlanRun` → nested `workflow-ralph`)               | task/plan via direct Postgres (`cortex-ralph`) | **No** (bypasses server)                  | **No** (bypasses server)                                                |
| MCP / GraphQL clients                                                  | task/plan                                      | via resolvers above                       | via resolvers above                                                     |
| `tools/workflows/scripts/update-plan-status.ts`                        | plan (direct DB)                               | **No**                                    | —                                                                       |

**Known gap (by design):** nested spawn Ralph and one-off scripts write Cortex directly; the developer app will not receive socket events until the next GraphQL-driven change or a full revalidate. Orchestrator and MCP paths stay in sync via GraphQL.

**Helper:** `applications/openthrottle-server/src/notifications/emit-bulk-task-status-changes.ts` — bulk task status updates that must fan out `task.status_changed` events (enqueue and cancel).

## Env / config

- **API_URL_EXTERNAL** — Server base URL for Socket.IO (same host as GraphQL; Socket.IO serves at path `/socket.io`). Used by the developer app only.
  - **Developer app:** Set in `.env` or `.env.default` (e.g. `API_URL_EXTERNAL="http://localhost:6010"`). At runtime the app reads `window.env.API_URL_EXTERNAL` in the browser and `process.env.API_URL_EXTERNAL` on the server; see `applications/openthrottle-developer/app/global/config/settings.ts` (`API_URL_EXTERNAL`). Default when unset: `http://localhost:6010`.
  - **Server:** No env needed for the WebSocket itself; it listens on the same HTTP server as the API.

---

## Cortex task IDs (for commit footers / tracking)

| Task                                               | Task ID                                |
| -------------------------------------------------- | -------------------------------------- |
| Define notification event types and payloads       | `e32e1073-b1e8-47dc-9283-1d61eb1043fc` |
| Server: notifications gateway and emit             | `76bc2c2b-761e-4008-8aa8-bd726d259f66` |
| Developer app: Socket.IO client and connection     | `a1f2c511-808d-4c7f-a6eb-943ef4a221e7` |
| Developer app: notifications state and persistence | `bbb14d1f-c6af-4f84-8dbb-49296501455e` |
| Developer app: notification UI                     | `74e0f14a-0cf6-4a07-aa73-f4e0090c96b5` |
| Write single kick-off document                     | `2908bc1e-ceba-4d21-988c-9b0c27fb3ba6` |

---

_Last updated: kick-off doc completed; current state and env/URL documented. Use this file to kick off further work without re-reading Cortex._
