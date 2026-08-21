---
id: 01-what-is-openthrottle
title: What is OpenThrottle in 60 seconds
format: short
status: draft
release: 1
recording: live
titleCard: ['What is', 'OpenThrottle?']
spokenWords: 101
blockedOn: []
tags:
  - openthrottle
  - ai agents
  - coding agents
  - developer tools
  - open source
---

The channel trailer and the pilot. It has to answer "what is this" for someone who
has never heard the name, without a single word of setup.

## Beats

| t    | on-screen action                                                                             | narration                                                                                              |
| ---- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 0:00 | Open `/plans/<seeded-plan-id>` already loaded — plan detail, tasks visible, one IN_PROGRESS. | This is a plan. Not a markdown file in a repo somewhere. A real record, with tasks, owners and status. |
| 0:07 | Hover the task list; the IN_PROGRESS task highlights.                                        | OpenThrottle gives coding agents the one thing they have never had. A place to keep the work.          |
| 0:15 | Click the IN_PROGRESS task → task detail.                                                    | Every task has an order and a state. The agent takes the next one and finishes it before moving on.    |
| 0:24 | Back to the plan; scroll to the live output stream, already streaming.                       | You watch it happen. Output streams straight out of the run while it works.                            |
| 0:33 | Scroll the output to the commit line, which names the task it closed.                        | And when it commits, the commit says which task it closed.                                             |
| 0:41 | Back to Details; highlight the plan's description.                                           | So six months from now you can ask why a line of code exists. And actually get an answer.              |
| 0:49 | Outro card.                                                                                  |                                                                                                        |

## Region of interest

Beats at 0:33 and 0:41 are the payoff, so they get the longest dwell.

## Note: there is no commit-link UI

The first draft of this script showed a **linked commit with the task id in its
footer**. There is no such surface in the app — plans do not render linked commits,
and the demo fixture has none to render. Recording it would have meant demonstrating
a feature that does not exist, which is the one mistake the publish checklist cannot
catch after upload.

The claim survives intact, because the traceability is genuinely visible elsewhere:
the pre-baked run output contains the real commit line (`Committed 4f2a1c8
feat(atlas-api): …`) naming the task it closed. The beat now points there, and the
narration says what is actually on screen. It also drops the "zoom out to the
dashboard" beat, which was a fourth idea in a one-idea video.

The script now has exactly as many beats as the flow. A mismatch stacks the tail of
the narration on top of the opening — see the warning in `assemble/captions.ts`.
