---
id: 22-self-host-docker-compose
title: Self-host the whole thing on one box
format: short
status: draft
release: 21
recording: live
titleCard: ['Self-host it', 'on one box']
spokenWords: 59
blockedOn: []
tags:
  - openthrottle
  - docker
  - self hosting
  - open source
  - developer tools
---

Terminal, then browser. The compose file shown must be the committed one — do not
edit it for the shot.

## Beats

| t    | on-screen action                                                           | narration                                                             |
| ---- | -------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 0:00 | Browser showing the running dashboard, then cut to the terminal behind it. | This is running in Docker. One box, one file.                         |
| 0:09 | Open the committed compose file; scroll the service list.                  | The database, Redis, the API, the dashboard, and the MCP server.      |
| 0:19 | Run the compose up command with the production profile.                    | One command brings all of it up.                                      |
| 0:27 | Containers start; health checks go green.                                  | It waits for the database, applies migrations, then starts serving.   |
| 0:37 | Browser loads the dashboard on the served port.                            | And that is your own instance. Your data, your machine, your network. |
| 0:46 | Hold on the dashboard.                                                     | Apache two licensed. No hosted account involved at any point.         |
| 0:54 | Outro card.                                                                |                                                                       |
