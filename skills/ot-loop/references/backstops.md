# What catches an unsettled run

Loaded from `ot-loop` § Your run row. Three backstops exist. **None of them can pick the right terminal status** — only you know whether this run completed, was cancelled or failed — so every one settles to `STALE`, which reads as "lost contact". Treat them as damage control for a hard crash, never as a substitute for Finishing step 6.

| Backstop                        | Harness | Fires                                        |
| ------------------------------- | ------- | -------------------------------------------- |
| Settle-on-next-register         | any     | instantly, when a new run opens on this plan |
| Claude Code `Stop` hook         | Claude  | ~6h after the session is provably gone       |
| Unsupervised age sweep (server) | any     | ~12h after the run started                   |

The floor is harness-agnostic: a run left open under cursor-agent, codex or antigravity is settled by the age sweep just as surely as one under Claude Code — the difference is latency, not coverage. What you lose by not settling is the accurate status and the hours in between, during which the run reads as live and its worktree stays marked busy.
