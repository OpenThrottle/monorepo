---
id: 05-connect-ot-mcp-v2
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

Variant 2 of 3 — "How it works." Teaches while it demos: what the user scope
is, why the restart matters, why the plan appears in the dashboard. Best for a
skeptical developer audience that wants to know what's actually happening. The
0:44 line does the most connect-the-dots work of the three variants: rooted in
source, executable in parallel, every run tracked.

Pacing: every beat holds 1.9–2.2 words/second so the read stays unhurried with
no dead air. Same recording and beat timings as `05-connect-ot-mcp.md`.

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
| 0:00 | Terminal. Run `pnpm run setup:mcp-instructions`; the printed block appears.       | OpenThrottle ships an MCP server, and this one command prints the exact setup for every agent CLI.                     |
| 0:09 | Highlight the printed `claude mcp add-json … --scope user` line.                  | Here's the Claude Code line — the key part is the user scope flag.                                                     |
| 0:15 | Run that line in the same terminal; it confirms the server was added.             | User scope installs it once, globally — not per project. Any repo you open on this machine, it's already connected.    |
| 0:24 | Restart the agent CLI; its banner shows `openthrottle-mcp` connected.             | Agents load MCP servers at startup, so restart once and the connection is live.                                        |
| 0:31 | In the agent, type: `create a plan to add request tracing, with three tasks`.     | No special syntax — just describe the plan. What you get back isn't chat output, it's database records.                |
| 0:39 | Agent reports the created plan id and its three tasks.                            | The agent writes plan and tasks into OpenThrottle, ready to execute.                                                   |
| 0:44 | Switch to the browser; refresh `/plans`; the new plan is at the top with 3 tasks. | Refresh the dashboard and it's all there — rooted in your source code, executable in parallel, with every run tracked. |
| 0:53 | Outro card.                                                                       |                                                                                                                        |
