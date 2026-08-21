---
id: 15-kill-runaway-run
title: Kill a runaway agent run
format: short
status: draft
release: 24
recording: replay
titleCard: ['Kill a runaway', 'agent run']
spokenWords: 90
blockedOn: []
tags:
  - openthrottle
  - ai agents
  - reliability
  - developer tools
  - open source
---

Originally written around a graceful **Cancel** as well as **Kill**, and marked
blocked because of it. Checking the app settled it: **Kill run** ships and is right
there on the plan toolbar and in the plans table; a graceful cancel — stop at the
next checkpoint, return the task to pending — does not exist. The app's own copy
says so ("Unavailable while a run is active — kill the run first").

So this video is now kill-only, which is true, and the graceful-cancel half is a
future video that lands when the feature does. **Do not put cancel back into this
script until there is a control to point at.**

**Replay.** The stuck run is seeded, not produced live.

## Beats

| t    | on-screen action                                                     | narration                                                                         |
| ---- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 0:00 | Plan detail, run active, output looping on the same failing command. | This one is stuck. It has retried the same thing eleven times.                    |
| 0:09 | Scroll the repeating output.                                         | An agent that cannot tell it is looping will loop until you stop it.              |
| 0:18 | Highlight the disabled toolbar actions and their tooltip.            | While a run is active, the rest of the plan is locked. That is on purpose.        |
| 0:27 | Click **Kill run**.                                                  | So kill it. There is one button and it does not negotiate.                        |
| 0:34 | The run ends; the toolbar actions come back.                         | The process is gone and the plan is yours again.                                  |
| 0:42 | Open the run's output; the partial output is still there.            | The output it produced is kept, so you can see how far it got and why it stalled. |
| 0:51 | Hold on the partial output.                                          | Then fix the task and run it again.                                               |
| 0:56 | Outro card.                                                          |                                                                                   |
