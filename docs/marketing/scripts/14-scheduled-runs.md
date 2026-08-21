---
id: 14-scheduled-runs
title: Scheduled agent runs — put work on a cron
format: short
status: draft
release: 14
recording: replay
titleCard: ['Put agent work', 'on a cron']
spokenWords: 74
blockedOn: []
tags:
  - openthrottle
  - automation
  - cron
  - ai agents
  - developer tools
---

**Replay** for the run-history half: the completed run the flow opens at 0:38 is
seeded, not produced during the take.

## Beats

| t    | on-screen action                                                            | narration                                                         |
| ---- | --------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 0:00 | `/schedule` with seeded jobs listed, one showing a last-run time.           | These ran last night. Nobody was awake for any of them.           |
| 0:08 | Click **New job**; pick a plan from the picker.                             | A scheduled job is a plan plus a time.                            |
| 0:16 | Set the schedule with the cron toolbar; the human-readable summary updates. | Pick when. It tells you in plain words what you just chose.       |
| 0:26 | Choose the repository checkout for the job.                                 | Point it at a checkout, so it knows where the code is.            |
| 0:34 | Save; the job appears in the list, enabled.                                 | Save, and it is on the clock.                                     |
| 0:40 | Open a seeded past run → run detail with output and token cost.             | Each run keeps its output, its model, and what it cost.           |
| 0:50 | Hold on the run detail.                                                     | So the boring work happens overnight and you read it with coffee. |
| 0:55 | Outro card.                                                                 |                                                                   |
