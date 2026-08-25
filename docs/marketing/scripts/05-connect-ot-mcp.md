---
id: 05-connect-ot-mcp
title: Connect OpenThrottle to Claude Code in 60 seconds
format: short
status: draft
release: 6
recording: live
titleCard: ['Connect it to', 'Claude Code']
spokenWords: 91
blockedOn: []
tags:
  - openthrottle
  - mcp
  - claude code
  - ai agents
  - developer tools
---

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

| t    | on-screen action                                                                  | narration                                                                                         |
| ---- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 0:00 | Terminal. Run `pnpm run setup:mcp-instructions`; the printed block appears.       | Install the MCP globally, and from then on your agent can read and write plans wherever you work. |
| 0:09 | Highlight the printed `claude mcp add-json … --scope user` line.                  | Here we are showing Claude, and the others work the same way.                                     |
| 0:15 | Run that line in the same terminal; it confirms the server was added.             | Run it once, and it works anywhere you open a project.                                            |
| 0:24 | Restart the agent CLI; its banner shows `openthrottle-mcp` connected.             | Restart the agent so the server loads, and then you are done with setup.                          |
| 0:31 | In the agent, type: `create a plan to add request tracing, with three tasks`.     | From here you just ask it for a plan.                                                             |
| 0:39 | Agent reports the created plan id and its three tasks.                            | It writes the plan and the tasks straight in.                                                     |
| 0:44 | Switch to the browser; refresh `/plans`; the new plan is at the top with 3 tasks. | And there they are in the dashboard, a plan and its tasks, rooted in the actual source code.      |
| 0:53 | Outro card.                                                                       |                                                                                                   |
