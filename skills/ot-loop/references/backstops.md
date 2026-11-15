# What catches an unsettled run

Loaded from `ot-loop` § Your run row. Three backstops exist. **None of them can pick the right terminal status** — only you know whether this run completed, was cancelled or failed — so every one settles to `STALE`, which reads as "lost contact", and writes a `settledReason` naming which backstop fired. Treat them as damage control for a hard crash, never as a substitute for Finishing step 6.

| Backstop                        | Harness | Fires                                                                         |
| ------------------------------- | ------- | ----------------------------------------------------------------------------- |
| Settle-on-next-register         | any     | instantly, when a new run opens on this plan                                  |
| Claude Code `Stop` hook         | Claude  | when the session's last turn ended 6h+ ago **and** its MCP process has exited |
| Unsupervised age sweep (server) | any     | ~12h after the run started                                                    |

**Pausing on a human gate is safe under Claude Code.** Every `Stop` refreshes the current session's own run record — including the one that ends a turn on a question — and the janitor never settles a run whose MCP process is still alive, however long the human takes to answer. A run outliving 12h is still swept by the server, so a gate held overnight may need a re-register: the cancel poll at the next boundary shows the run settled.

The floor is harness-agnostic: a run left open under cursor-agent, codex or antigravity is settled by the age sweep just as surely as one under Claude Code — the difference is latency, not coverage. What you lose by not settling is the accurate status and the hours in between, during which the run reads as live and its worktree stays marked busy.
