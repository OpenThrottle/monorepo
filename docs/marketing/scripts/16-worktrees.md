---
id: 16-worktrees
title: Worktrees — parallel agents that do not step on each other
format: short
status: draft
release: 23
recording: live
titleCard: ['Parallel agents,', 'no collisions']
spokenWords: 66
blockedOn:
  - Worktree state surfaced in the dashboard (today this is a CLI-only story)
tags:
  - openthrottle
  - git
  - ai agents
  - monorepo
  - developer tools
---

**BLOCKED as an app video.** Worktrees work, but nothing in the UI shows them, so
this can only be a terminal video today. Either accept it as terminal-only (and
drop it down the order, as here), or ship worktree visibility first. Recording it
as an app video is not an option — there is no app surface to record.

## Beats

| t    | on-screen action                                                    | narration                                                                         |
| ---- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 0:00 | Terminal, two panes, two agents working in two directories at once. | Two agents. Two branches. Same repository. No collisions.                         |
| 0:09 | Run `pnpm run worktree:new feature-b`.                              | One command makes a second checkout with its own branch.                          |
| 0:18 | Output shows the ports allocated for that worktree.                 | It gets its own ports too, so both stacks can run at once.                        |
| 0:28 | Split to both panes; both agents editing different files.           | Now they cannot touch each other's files, because they are not in the same files. |
| 0:38 | Show `git worktree list` with both entries.                         | Git tracks them as one repository with two working directories.                   |
| 0:47 | Hold on the two panes.                                              | Which is how you run four agents without four clones.                             |
| 0:54 | Outro card.                                                         |                                                                                   |
