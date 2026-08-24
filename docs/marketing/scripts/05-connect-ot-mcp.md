---
id: 05-connect-ot-mcp
title: Connect OpenThrottle to Claude Code in 60 seconds
format: short
status: draft
release: 6
recording: live
titleCard: ['Connect it to', 'Claude Code']
spokenWords: 64
blockedOn: []
tags:
  - openthrottle
  - mcp
  - claude code
  - ai agents
  - developer tools
---

Terminal only, no dashboard until the payoff. The single most important beat is
0:44: the plan the agent created showing up in the UI unprompted.

Recorded against typeset shell surfaces in the recording browser, not a screen
capture — see `applications/openthrottle-developer/tests/demo/surfaces/shell.ts`.
The printed block and the command line the viewer copies both come from
`scripts/setup_mcp-instructions.ts`'s own exports, rendered against a fictional
`/workspace/openthrottle` root, so nothing in frame is a real machine.

## Beats

| t    | on-screen action                                                                  | narration                                                               |
| ---- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 0:00 | Terminal. Run `pnpm run setup:mcp-instructions`; the printed block appears.       | Your agent can read and write plans directly. Here is the wiring.       |
| 0:09 | Highlight the printed `claude mcp add-json … --scope user` line.                  | This prints the config block for you. Copy it.                          |
| 0:15 | Run that line in the same terminal; it confirms the server was added.             | Run it. One command registers it for every project.                     |
| 0:24 | Restart the agent CLI; its banner shows `openthrottle-mcp` connected.             | Restart the agent. Servers only load at startup.                        |
| 0:31 | In the agent, type: `create a plan to add request tracing, with three tasks`.     | Now just ask it for a plan.                                             |
| 0:39 | Agent reports the created plan id and its three tasks.                            | It writes straight into OpenThrottle.                                   |
| 0:44 | Switch to the browser; refresh `/plans`; the new plan is at the top with 3 tasks. | And there it is, in the dashboard, tasks and all. Nobody typed that in. |
| 0:53 | Outro card.                                                                       |                                                                         |
