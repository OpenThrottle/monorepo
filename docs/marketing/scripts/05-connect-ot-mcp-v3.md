---
id: 05-connect-ot-mcp-v3
title: Connect OpenThrottle to Claude Code in 60 seconds
format: short
status: draft
release: 6
recording: live
titleCard: ['Connect it to', 'Claude Code']
spokenWords: 102
blockedOn: []
tags:
  - openthrottle
  - mcp
  - claude code
  - ai agents
  - developer tools
---

Variant 3 of 3 — "Payoff first." Promises the outcome up front ("in sixty
seconds your agent will be filing plans on its own") and closes on what you do
with the plan next. Lowest word count of the three — the slowest, most
breathing-room delivery. Pick this one if slowing the pace is the top priority.

Pacing: every beat holds 1.8–2.0 words/second so the read stays unhurried with
no dead air. The hook now promises executable plans up front, and the close
pays it off with parallel execution and tracked runs. Same recording and beat
timings as `05-connect-ot-mcp.md`.

Terminal only, no dashboard until the payoff. Claude is the example; the install
is global, so it works anywhere. Narration is one spoken story split across the
beats, not a caption per step. The single most important beat is 0:44: the plan
the agent created showing up in the UI unprompted.

Recorded against typeset shell surfaces in the recording browser, not a screen
capture — see `applications/openthrottle-developer/tests/demo/surfaces/shell.ts`.
The printed block and the command line the viewer copies both come from
`scripts/setup_mcp-instructions.ts`'s own exports, rendered against a fictional
`/workspace/openthrottle` root, so nothing in frame is a real machine.

## Beats

| t    | on-screen action                                                                  | narration                                                                                                      |
| ---- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 0:00 | Terminal. Run `pnpm run setup:mcp-instructions`; the printed block appears.       | In sixty seconds your agent will be filing plans into OpenThrottle — plans it can actually run. Starting here. |
| 0:09 | Highlight the printed `claude mcp add-json … --scope user` line.                  | Grab the line for your agent — for us today, that's Claude Code.                                               |
| 0:15 | Run that line in the same terminal; it confirms the server was added.             | Run it once and you're covered everywhere — every project, every worktree, every terminal on this machine.     |
| 0:24 | Restart the agent CLI; its banner shows `openthrottle-mcp` connected.             | One quick restart, the banner confirms the connection, and setup is completely behind you.                     |
| 0:31 | In the agent, type: `create a plan to add request tracing, with three tasks`.     | Now work like you normally would — ask your agent to plan out the next feature.                                |
| 0:39 | Agent reports the created plan id and its three tasks.                            | Plan and tasks, written straight into OpenThrottle's database.                                                 |
| 0:44 | Switch to the browser; refresh `/plans`; the new plan is at the top with 3 tasks. | And in the dashboard it's more than a document — tasks that run in parallel, with every run tracked.           |
| 0:53 | Outro card.                                                                       |                                                                                                                |
