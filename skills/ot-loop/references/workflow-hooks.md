# What the workflow hooks back up

Loaded from `ot-loop` § Your run row.

Under Claude Code with the `openthrottle-workflow` plugin, hooks watch the loop's duties. **Every
duty stays on you.** Each hook only warns, writes a floor, or cleans up after a crash, and it binds
to the run through your own `register_plan_run` in the transcript. So under any other driver, and in
a session that never registered, the SKILL.md prose is all there is.

| Duty                              | Hook that backs it up                                                                                                                                            |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Step 1 before work                | `plan-run-task-guard` warns on an edit with no task `IN_PROGRESS`                                                                                                |
| One task `IN_PROGRESS` (step 4)   | `plan-run-invariants` warns when a task goes `IN_PROGRESS` while another still is, and at `Stop` when a committed task (`Task-Id:` footer) is left `IN_PROGRESS` |
| Adding tasks before the last flip | `plan-auto-close` tells you when a completion closed the plan                                                                                                    |
| Narration                         | `plan-narration` writes a `[hook:narration]` chunk for a transition you did not narrate, and at `Stop` a summary for a task with no narration at all             |
| Mid-task inbox claims             | `plan-inbox-claim` claims before destructive `Bash` and `Agent` calls (§ Mid-task claims)                                                                        |
| Settling the run                  | `plan-run-janitor` settles an abandoned run `STALE` ([backstops.md](./backstops.md))                                                                             |

A hook chunk is a floor: one line per transition, no reasoning. Narrate the decisions yourself.
