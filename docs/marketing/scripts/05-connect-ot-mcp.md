---
id: 05-connect-ot-mcp
title: Connect OpenThrottle to Claude Code in 60 seconds
format: short
status: draft
release: 6
recording: live
titleCard: ['Connect it to', 'Claude Code']
spokenWords: 63
blockedOn: []
tags:
  - openthrottle
  - mcp
  - claude code
  - ai agents
  - developer tools
---

Terminal plus editor, no dashboard until the payoff. The single most important
beat is 0:41: the plan the agent created showing up in the UI unprompted.

## Beats

| t    | on-screen action                                                                  | narration                                                               |
| ---- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 0:00 | Terminal. Run `pnpm run setup:mcp-instructions`; the printed block appears.       | Your agent can read and write plans directly. Here is the wiring.       |
| 0:09 | Copy the printed server block.                                                    | This prints the config block for you. Copy it.                          |
| 0:15 | Editor opens `.mcp.json`; paste the block; save.                                  | Paste it into your MCP config and save.                                 |
| 0:24 | Restart the agent CLI in the terminal.                                            | Restart the agent. Servers only load at startup.                        |
| 0:31 | In the agent, type: `create a plan to add rate limiting, with three tasks`.       | Now just ask it for a plan.                                             |
| 0:39 | Agent reports the created plan id.                                                | It writes straight into OpenThrottle.                                   |
| 0:44 | Switch to the browser; refresh `/plans`; the new plan is at the top with 3 tasks. | And there it is, in the dashboard, tasks and all. Nobody typed that in. |
| 0:53 | Outro card.                                                                       |                                                                         |
