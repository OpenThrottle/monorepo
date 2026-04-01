# Ralph plan-centric task status: investigation findings

**Plan:** 6eaebb97-dfcf-474d-9630-f2c684aea45c  
**Task:** 274cbc71-de69-457d-8814-7976773584a7 — Investigate task status not updating in plan-centric mode

## Summary

Traced the flow from agent output → parsing → DB update. The implementation is correct: plan-centric mode sets the first PENDING task to IN_PROGRESS each iteration, injects the task UUID into the prompt, parses `<ralph:complete-task>uuid</ralph:complete-task>` from `cursor-agent` stdout/stderr, and calls `updateTaskStatus(..., 'COMPLETED')`. The DB uses uppercase enum values; Ralph passes uppercase. If tasks were observed “staying PENDING,” likely causes are (1) agent output not containing the signal, (2) `cursor-agent` not forwarding the agent’s final response to stdout/stderr, or (3) an older CLI version before the IN_PROGRESS-at-start and fallback logic.

---

## (1) Does the agent output `<ralph:complete-task>uuid</ralph:complete-task>`?

- **Ralph’s responsibility:** The prompt is built with the current task UUID and explicit instruction: “Current task for this iteration: &lt;uuid&gt;. When you complete it output &lt;ralph:complete-task&gt;&lt;uuid&gt;&lt;/ralph:complete-task&gt; so the CLI can mark it completed.” (See `tools/workflows/src/bin/ralph.ts` ~line 184.)
- **What Ralph parses:** `result` is the concatenation of **stdout** and **stderr** from `cursor-agent` (`spawnSync(..., stdio: ['inherit', 'pipe', 'pipe'])`). So the signal must appear in whatever `cursor-agent` writes to stdout or stderr. If the Cursor agent emits the tag but `cursor-agent` does not forward that text to stdout/stderr, Ralph will not see it.
- **Conclusion:** Ralph instructs the agent correctly. Whether the tag appears in `result` depends on the agent actually outputting it and on `cursor-agent` exposing that output to stdout/stderr.

---

## (2) Does `parseRalphCompleteTaskSignals` find it?

- **Implementation:** `tools/workflows/src/utils/parsers.ts`. Regex: `/<ralph:complete-task>([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})<\/ralph:complete-task>/gi`. Returns unique task IDs (lowercased).
- **Conclusion:** The pattern matches RFC 4122 UUID v4. If the agent output (as seen in `result`) contains the tag with a valid task UUID, `parseRalphCompleteTaskSignals(result)` will return that ID. No bug found here.

---

## (3) Does `updateTaskStatus` get called and succeed?

- **Call site:** In `ralph.ts`, after parsing: `for (const taskId of completeTaskIds) { await updateTaskStatus(cortexConfig, taskId, 'COMPLETED'); ... }`. Also used for IN_PROGRESS at start of iteration and in task-centric mode for COMPLETED.
- **Implementation:** `tools/workflows/src/utils/cortex-ralph.ts`. Runs `UPDATE tasks SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING ...` with `[status, id]`. Postgres `id` is UUID; comparison is case-insensitive, so lowercased task IDs from the parser are fine.
- **Observability:** On success, Ralph logs “Marked task &lt;id&gt; completed.” On failure (task not found or throw), it logs a warning. If tasks were not updating, either this loop was never entered (no IDs parsed) or the update failed (would see warning).
- **Conclusion:** When `completeTaskIds` is non-empty, `updateTaskStatus` is invoked. Success/failure is visible from CLI logs.

---

## (4) Does Cortex DB expect different status casing or enum?

- **Schema:** `databases/cortex/migrations/028_plan_task_status_enum.sql`. Column type is `plan_task_status` with values `'BACKLOG'`, `'BLOCKED'`, `'CANCELED'`, `'COMPLETED'`, `'IN_PROGRESS'`, `'PENDING'`, `'SKIPPED'` (uppercase).
- **Ralph:** Passes `'COMPLETED'` and `'IN_PROGRESS'` (uppercase) to `updateTaskStatus` → Postgres. No casing mismatch.
- **Conclusion:** DB expects uppercase enum; Ralph sends uppercase. No issue.

---

## (5) In plan-centric mode, is any task set to IN_PROGRESS?

- **Yes.** In `ralph.ts` (plan-centric branch, ~lines 151–187):
  - Each iteration fetches tasks for the plan and filters to `PENDING`, `IN_PROGRESS`, `BLOCKED`.
  - It picks the first IN_PROGRESS (resume) or else the first PENDING.
  - If the chosen task is PENDING, it calls `updateTaskStatus(cortexConfig, taskForIteration.id, 'IN_PROGRESS')` before running the agent.
  - The prompt is then set to include: “Current task for this iteration: &lt;taskForIteration.id&gt;. When you complete it output &lt;ralph:complete-task&gt;&lt;id&gt;&lt;/ralph:complete-task&gt; …”
- **Conclusion:** Plan-centric mode does set the first pending (or in-progress) task to IN_PROGRESS and passes its UUID in the prompt. No dependency on the agent having MCP for this step.

---

## Fallback when the agent does not emit the tag

If the agent outputs `<promise>COMPLETE</promise>` but does **not** output `<ralph:complete-task>uuid</ralph:complete-task>`, Ralph still marks the current iteration’s task completed:

- `isComplete(result)` is true when `result.includes('<promise>COMPLETE</promise>')`.
- If `firstPendingForIteration` is set and the parsed `completeTaskIds` do not already include it, Ralph appends it to `completeTaskIds`, so the same `updateTaskStatus(..., 'COMPLETED')` loop runs for that task.

So even without the tag, if the agent signals COMPLETE, the task can be marked COMPLETED (see `ralph.ts` ~lines 208–225).

---

## Root causes if “tasks stay PENDING” was observed

1. **No complete-task tag in agent output** — Agent didn’t emit the tag, or `cursor-agent` didn’t forward the agent’s final response to stdout/stderr, so `result` never contained the tag.
2. **No COMPLETE promise** — If the agent also didn’t emit `<promise>COMPLETE</promise>`, the fallback above never runs, so the task wouldn’t be marked COMPLETED from the fallback either.
3. **Older Ralph version** — If the run used a version before the “set first PENDING to IN_PROGRESS” and “fallback from COMPLETE” logic, tasks could remain PENDING or never get marked COMPLETED.

---

## References

- `tools/workflows/src/bin/ralph.ts` — main loop, prompt building, parsing, updateTaskStatus calls
- `tools/workflows/src/utils/parsers.ts` — `parseRalphCompleteTaskSignals`, `isComplete`
- `tools/workflows/src/utils/cortex-ralph.ts` — `updateTaskStatus`, `updatePlanStatus`
- `databases/cortex/migrations/028_plan_task_status_enum.sql` — status enum
- `docs/workflows/ralph-design.md` — Plan-centric task status section
