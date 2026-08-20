---
id: 02-one-command-boot
title: 0 to 60 — boot the whole stack with one command
format: short
status: draft
release: 3
recording: live
titleCard: ['Boot the stack', 'with one command']
spokenWords: 80
blockedOn: []
tags:
  - openthrottle
  - developer tools
  - monorepo
  - open source
  - devex
---

A terminal video, not an app video. The runner drives a terminal pane rather than
the browser for the first two thirds; see `pipeline.md` on terminal capture.

## Beats

| t    | on-screen action                                                                  | narration                                                                            |
| ---- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 0:00 | Split frame: empty terminal left, black browser right. Type `./scripts/setup.sh`. | One command. Postgres, Redis, the API, the dashboard, and a seeded login.            |
| 0:08 | Setup output scrolls; hold on the docker compose lines.                           | It brings up the database and Redis in Docker, then applies every pending migration. |
| 0:18 | Output reaches the seeded-user line.                                              | It seeds a user, so you are not stuck at a login screen with no account.             |
| 0:26 | Type `pnpm run start` in the same terminal.                                       | Then start it.                                                                       |
| 0:31 | Server boot lines scroll; port six-oh-two-one appears.                            | The API comes up first. The dashboard waits for it, then follows.                    |
| 0:39 | Browser pane loads the dashboard, authenticated, seeded data visible.             | And that is the whole thing running. No cloud account, no API key, no signup.        |
| 0:48 | Hold on the dashboard.                                                            | Everything after this point happens on your machine.                                 |
| 0:53 | Outro card.                                                                       |                                                                                      |

## Region of interest

The split frame does not survive a 9:16 crop. Record two sources and let the
assembly stage cut between them for the portrait export: terminal full-frame
through 0:39, browser full-frame from 0:39.
