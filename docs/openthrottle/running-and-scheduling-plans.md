# Running and scheduling a plan

How the developer app starts, schedules and cancels a plan run, and what each control saves. Moved here from the retired `docs/openthrottle/features.md`; product copy for this feature lives in the registry (`@openthrottle/openthrottle-product`, feature `scheduled-runs`).

The **Run** control on Plan Details is a split button. It lives in the plan toolbar, which (with the Configuration tab) is behind `FEATURE_BETA_PREVIEW` for now. The caret menu holds the other ways to start (or stop) a run:

- **Run plan** (primary, one click) enqueues a run now with the plan's saved run configuration.
- **Run with options…** opens the Run dialog on its _Run now_ tab; **Schedule…** opens it on _Schedule_ (a date and time picked and shown in your browser's local zone, with a "fires 3:00 PM PST, in about 3 hours" summary).
- **Cancel scheduled run** appears while a run is scheduled and asks for confirmation. The run-history table also has a **Cancel** action on a `Scheduled` row.

**What the dialog changes.** Model and effort are **plan settings**: choosing them saves them to the plan's run configuration, so later one-click runs use them too (effort is disabled on backends with no separate effort knob, such as cursor, where it is part of the model id). Iterations is **this run only**: it resets to the plan's configured value every time the dialog opens and is never saved. Branch and checkout are shown read-only and come from the Configuration tab; Run is blocked while the branch is blank.

**How a scheduled run behaves.**

- A scheduled run is a `plan_runs` row with status `SCHEDULED` and a delayed BullMQ job. Its run configuration is **frozen when you schedule it**. Scheduling moves the plan to the **`SCHEDULED`** status (shown to everyone, with the fire time in the badge's tooltip) and leaves the tasks alone; the plan and its runnable tasks move to `QUEUED` when the run fires.
- **Only `PENDING` and `BACKLOG` plans can be scheduled, once.** A plan has at most one scheduled run. Scheduling a `QUEUED`/`IN_PROGRESS` plan is refused (`PLAN_ACTIVE`), as is a `BLOCKED` or finished one (`PLAN_NOT_SCHEDULABLE`); scheduling a plan that already has a run waiting is `PLAN_ALREADY_SCHEDULED` unless you reschedule.
- `scheduledFor` must be strictly in the future and **at most 30 days** ahead (`SCHEDULED_PLAN_RUN_MAX_HORIZON_DAYS`); the dialog and the server both reject anything else.
- **Changing your mind.** _Schedule…_ becomes _Reschedule…_ and replaces the waiting run. Running now while a run is scheduled asks you to confirm unscheduling it first. Changing the plan's status (Mark Complete included) also cancels the scheduled run, after a confirmation; so does the plan's last task completing. Cancelling the scheduled run, or the run settling `MISSED` or `SUPERSEDED`, returns the plan to `PENDING`.
- **1-hour grace window.** If the run cannot start until it is an hour or more past its time (for example the server was down), it settles `MISSED` and you get a warning notification instead of a surprise late run.
- **Collision hold.** If the plan already has an active run when the scheduled one is due, the scheduled run settles `SUPERSEDED` (with a warning) rather than double-running the plan. A scheduled run on a plan with no task left to run settles `COMPLETED` with an info notification.
- **Restarts.** On boot the plans worker re-creates any delayed job missing from Redis (flushed or recreated volume) with the time still left, or settles the run `MISSED` if it is already past the grace window. Only the instance that owns the repeatable jobs does this.

**GraphQL.** `schedulePlanRun(input: SchedulePlanRunInput!)` takes everything `enqueuePlanRun` takes (`planId`, a required `branch`, `tuning` with `driver`/`model`/`effort`/`debugCli`/`iterationTimeoutSeconds`/`worktreeName`, optional `checkoutId`, `idempotencyKey`, ...) plus a required `scheduledFor` ISO-8601 instant and an optional `replaceScheduled` (reschedule), and returns `planRunId`, `jobId`, `scheduledFor`, `driver` and `planId`. `enqueuePlanRun` takes an optional `cancelScheduled` to run a scheduled plan now. Refusals are GraphQL errors with `extensions.code` `PLAN_ALREADY_SCHEDULED`, `PLAN_ACTIVE` or `PLAN_NOT_SCHEDULABLE`, plus the waiting run's `planRunId` and `scheduledFor`. Cancel with `cancelPlanRun(input: { planId, planRunId })`: with `planRunId` it cancels only that `SCHEDULED` run (delayed job removed, row `CANCELLED`), returns a `SCHEDULED` plan to `PENDING`, and leaves any live run and the tasks alone. It is idempotent: a `planRunId` that has already fired or settled is a no-op, and one that is `QUEUED` or `IN_PROGRESS` is rejected. Omit `planRunId` to cancel the whole plan's queued and scheduled runs and stop a live one. Plan objects expose `scheduledRunAt` and `scheduledRunId` for the soonest waiting run.

## See also

- [databases/openthrottle/README.md](../../databases/openthrottle/README.md) (`plan_runs.scheduled_for` and the `SCHEDULED` / `MISSED` / `SUPERSEDED` statuses)
- [authoring-plans-via-mcp.md](./authoring-plans-via-mcp.md) (scheduling from an agent)
- [plan-run-worktrees.md](./plan-run-worktrees.md) (where a run executes).
