---
id: 05-connect-ot-mcp-v1
title: Connect OpenThrottle to Claude Code in 60 seconds
format: short
status: draft
release: 6
recording: live
titleCard: ['Connect it to', 'Claude Code']
spokenWords: 110
blockedOn: []
tags:
  - openthrottle
  - mcp
  - claude code
  - ai agents
  - developer tools
---

Variant 1 of 3 — "Why this matters." Leads with the pain: agents already make
plans, but they evaporate into chat history. Strongest hook of the three; best
if the short has to earn attention in the first two seconds.

Pacing: every beat holds 1.8–2.2 words/second so the read stays unhurried with
no dead air. The 0:39–0:53 stretch carries the full payoff arc: real records →
executable → parallel → tracked. Same recording and beat timings as
`05-connect-ot-mcp.md`.

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

| t    | on-screen action                                                                  | narration                                                                                                              |
| ---- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 0:00 | Terminal. Run `pnpm run setup:mcp-instructions`; the printed block appears.       | Agents already make plans — they just disappear into chat history. One command prints everything you need to fix that. |
| 0:09 | Highlight the printed `claude mcp add-json … --scope user` line.                  | We're showing Claude Code here, but every agent CLI connects the same way.                                             |
| 0:15 | Run that line in the same terminal; it confirms the server was added.             | Paste it, run it once. The user scope makes it global — every project, every worktree on your machine is covered.      |
| 0:24 | Restart the agent CLI; its banner shows `openthrottle-mcp` connected.             | Restart your agent so the server loads, check the banner — connected. That's the whole setup.                          |
| 0:31 | In the agent, type: `create a plan to add request tracing, with three tasks`.     | Now just ask for a plan in plain English — and these aren't notes, they're runnable work.                              |
| 0:39 | Agent reports the created plan id and its three tasks.                            | The plan and its tasks land in OpenThrottle, ready to run.                                                             |
| 0:44 | Switch to the browser; refresh `/plans`; the new plan is at the top with 3 tasks. | And there they are in the dashboard — agents can execute these tasks in parallel, with every run tracked.              |
| 0:53 | Outro card.                                                                       |                                                                                                                        |
