---
id: L2-setup-from-scratch
title: 'OpenThrottle setup from scratch: clone to running in one sitting'
format: longform
status: draft
release: 4
recording: live
titleCard: ['Setup from scratch', 'Season 1 · Episode 2']
spokenWords: 235
blockedOn: []
tags:
  - openthrottle
  - developer tools
  - monorepo
  - open source
  - self hosting
---

The onboarding piece. Its job is that a viewer can follow along in a second window
and end up with a running instance. That makes it the one video where **real time
matters more than pace** — do not cut a wait short and imply setup is faster than
it is.

Recorded on a genuinely clean machine state: fresh clone, no node_modules, no
containers running, no `.env`. If the take starts from a warm machine it is a lie
by omission, and the first comment will say so.

## Chapters

| Chapter | Start | What happens                        |
| ------- | ----- | ----------------------------------- |
| 1       | 00:00 | What you need first                 |
| 2       | 00:50 | Clone and install                   |
| 3       | 02:10 | One setup script                    |
| 4       | 04:00 | Starting the stack                  |
| 5       | 05:20 | First login and what you are seeing |
| 6       | 06:30 | Wiring your agent over MCP          |
| 7       | 08:00 | When it goes wrong                  |

## Beats

| t     | on-screen action                                                    | narration                                                                                                          |
| ----- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 00:00 | The finished dashboard, then hard cut to an empty terminal.         | By the end of this you will have this running on your own machine. It takes about ten minutes, most of it waiting. |
| 00:20 | Show `node --version`, `pnpm --version`, `docker ps`.               | Three things first. Node twenty-two or newer, pnpm, and Docker running.                                            |
| 00:50 | Clone the repository; `cd` into it.                                 | Clone it. It is one repository with everything in it.                                                              |
| 01:20 | Run `pnpm install`; output scrolls in real time.                    | Install. This is the long wait, and it is the only one.                                                            |
| 02:10 | Run `./scripts/setup.sh`.                                           | Then one script does the rest of the setup.                                                                        |
| 02:40 | Docker containers start; Postgres and Redis go healthy.             | It starts Postgres and Redis in containers, on their own ports, so they do not fight anything you already run.     |
| 03:20 | Migrations apply; the ledger output scrolls.                        | It applies every migration. Run it twice and nothing happens twice, which matters more than it sounds.             |
| 03:50 | The seeded-user line appears.                                       | And it creates a login for you.                                                                                    |
| 04:00 | Run `pnpm run start`.                                               | Now start it.                                                                                                      |
| 04:30 | API boot output; then the dashboard build and serve.                | The API comes up, the dashboard waits for it, then serves.                                                         |
| 05:20 | Browser to the dashboard port; the login form is prefilled; submit. | Open it and log in with the seeded account.                                                                        |
| 05:50 | Dashboard loads, mostly empty.                                      | It is empty, because it is yours. Nothing was uploaded and nothing was shared.                                     |
| 06:10 | Create one plan with one task.                                      | Make one plan so there is something to look at.                                                                    |
| 06:30 | Terminal: `pnpm run setup:mcp-instructions`; copy the block.        | Last step, and the one that makes it useful. Wire your agent to it.                                                |
| 07:00 | Paste into the agent's MCP config; save; restart the agent.         | Paste that into your agent's config and restart the agent.                                                         |
| 07:30 | Ask the agent to list plans; it returns the one you made.           | Ask it what plans exist. If it answers, you are done.                                                              |
| 08:00 | Show a failed Postgres connection and the fix.                      | Two things go wrong for most people. The database is not running, which looks like this.                           |
| 08:40 | Show a stale env var and the fix.                                   | And a stale environment file, which looks like this. Both are one command each.                                    |
| 09:20 | Back to the working dashboard.                                      | That is a complete local install, with no account and nothing leaving your machine.                                |
| 09:50 | Outro card.                                                         |                                                                                                                    |

## Notes

- Chapter 7 exists because the comments section will otherwise write it. Two
  failures, shown deliberately, with the exact fix on screen.
- Do not speed up `pnpm install`. Cut away from it and come back, or say how long
  it took. Compressing the wait is the thing that makes setup videos untrustworthy.
