# Ralph plan-centric task status: investigation findings

**Plan:** 6eaebb97-dfcf-474d-9630-f2c684aea45c
**Task:** 274cbc71-de69-457d-8814-7976773584a7 — Investigate task status not updating in plan-centric mode

## Summary

Traced the flow from agent output → parsing → DB update. The implementation is correct: plan-centric mode sets the first PENDING task to IN_PROGRESS each iteration, injects the task UUID into the prompt, parses `<ralph:task-complete>uuid</ralph:task-complete>` from `cursor-agent` stdout/stderr, and calls `updateTaskStatus(..., 'COMPLETED')`. The DB uses uppercase enum values; Ralph passes uppercase. If tasks were observed “staying PENDING,” likely causes are (1) agent output not containing the signal, (2) `cursor-agent` not forwarding the agent’s final response to stdout/stderr, or (3) an older CLI version before the IN_PROGRESS-at-start and fallback logic.

---

## (1) Does the agent output `<ralph:task-complete>uuid</ralph:task-complete>`?

- **Ralph’s responsibility:** The prompt is built with the current task UUID and explicit instruction: “Current task for this iteration: &lt;uuid&gt;. When you complete it output &lt;ralph:task-complete&gt;&lt;uuid&gt;&lt;/ralph:task-complete&gt; so the CLI can mark it completed.” (See `tools/workflows/src/bin/ralph.ts` ~line 184.)
- **What Ralph parses:** `result` is the concatenation of **stdout** and **stderr** from `cursor-agent` (`spawnSync(..., stdio: ['inherit', 'pipe', 'pipe'])`). So the signal must appear in whatever `cursor-agent` writes to stdout or stderr. If the Cursor agent emits the tag but `cursor-agent` does not forward that text to stdout/stderr, Ralph will not see it.
- **Conclusion:** Ralph instructs the agent correctly. Whether the tag appears in `result` depends on the agent actually outputting it and on `cursor-agent` exposing that output to stdout/stderr.

---

## (2) Does `parseRalphCompleteTaskSignals` find it?

- **Implementation:** `tools/workflows/src/utils/parsers.ts`. Regex: `/<ralph:task-complete>([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})<\/ralph:task-complete>/gi`. Returns unique task IDs (lowercased).
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
  - The prompt is then set to include: “Current task for this iteration: &lt;taskForIteration.id&gt;. When you complete it output &lt;ralph:task-complete&gt;&lt;id&gt;&lt;/ralph:task-complete&gt; …”
- **Conclusion:** Plan-centric mode does set the first pending (or in-progress) task to IN_PROGRESS and passes its UUID in the prompt. No dependency on the agent having MCP for this step.

---

## Fallback when the agent does not emit the tag

If the agent outputs `<promise>COMPLETE</promise>` but does **not** output `<ralph:task-complete>uuid</ralph:task-complete>`, Ralph still marks the current iteration’s task completed:

- `isComplete(result)` is true when `result.includes('<promise>COMPLETE</promise>')`.
- If `firstPendingForIteration` is set and the parsed `completeTaskIds` do not already include it, Ralph appends it to `completeTaskIds`, so the same `updateTaskStatus(..., 'COMPLETED')` loop runs for that task.

So even without the tag, if the agent signals COMPLETE, the task can be marked COMPLETED (see `ralph.ts` ~lines 208–225).

---

## Root causes if “tasks stay PENDING” was observed

1. **No complete-task tag in agent output** — Agent didn’t emit the tag, or `cursor-agent` didn’t forward the agent’s final response to stdout/stderr, so `result` never contained the tag.
2. **No COMPLETE promise** — If the agent also didn’t emit `<promise>COMPLETE</promise>`, the fallback above never runs, so the task wouldn’t be marked COMPLETED from the fallback either.
3. **Older Ralph version** — If the run used a version before the “set first PENDING to IN_PROGRESS” and “fallback from COMPLETE” logic, tasks could remain PENDING or never get marked COMPLETED.

---

## Claude Code CLI (`--backend claude`)

**Contract:** The Ralph parser does not branch on execution backend. Both `cursor-agent` and Claude Code (`claude --bare -p …`) feed a single UTF-8 string into `parseRalphCompleteTaskSignals` and `parseRalphResponse`: async/sync runners concatenate **stdout** and **stderr** (when stderr is non-empty: `stdoutTrim + "\n" + stderrTrim`; see `tools/workflows/src/bin/run-iteration.ts`). Chunk ordering during streaming does not matter because parsing runs **after** the child exits on the full combined string.

**Validation (fixtures, no live CLI):** `tools/workflows/src/utils/__tests__/parsers.test.ts` includes “Claude-shaped” samples (stderr noise + stdout body, ANSI near markers, markdown fences). They confirm the existing regex still extracts `<ralph:task-complete>uuid</ralph:task-complete>` and that `<promise>COMPLETE</promise>` / ERROR / INPUT_REQUIRED behave like the Cursor path.

**Operational risks (same class as cursor-agent):**

1. **Markers must appear literally** in the combined output. HTML-escaped tags (e.g. `&lt;ralph:task-complete&gt;`) do **not** match; the model should emit raw angle brackets, matching the injected prompt.
2. **Buffering:** If a future CLI revision withheld assistant text until EOF, Ralph would still parse correctly once the process closes; if final text never reached stdout/stderr, neither backend would mark tasks complete (same failure mode as § Root causes).
3. **Strip/reformat:** If a CLI stripped XML-like substrings from logged output, task completion would fail; mitigation is the same as for `cursor-agent`: verify runner forwards the model’s final message verbatim into the pipes Ralph reads.

---

## References

- `tools/workflows/src/bin/ralph.ts` — main loop, prompt building, parsing, updateTaskStatus calls
- `tools/workflows/src/utils/parsers.ts` — `parseRalphCompleteTaskSignals`, `isComplete`
- `tools/workflows/src/utils/cortex-ralph.ts` — `updateTaskStatus`, `updatePlanStatus`
- `databases/cortex/migrations/028_plan_task_status_enum.sql` — status enum
- `docs/workflows/ralph-design.md` — Plan-centric task status section
- `tools/workflows/src/bin/run-iteration.ts` — stdout/stderr combine for both backends
