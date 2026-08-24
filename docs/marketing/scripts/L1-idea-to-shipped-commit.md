---
id: L1-idea-to-shipped-commit
title: 'OpenThrottle in 10 minutes: idea to plan to tasks to shipped commit'
format: longform
status: draft
release: 22
recording: replay
titleCard: ['OpenThrottle in 10 minutes', 'Season 1 · Episode 1']
spokenWords: 299
blockedOn: []
tags:
  - openthrottle
  - ai agents
  - coding agents
  - developer tools
  - open source
---

The flagship. Everything else on the channel is a 60-second slice of this.

**Replay for act three.** The execution act depends on a real agent run; that run
is pre-baked by the demo seed and the flow drives the UI over it. Ten minutes of
live model calls is neither reproducible nor watchable, and a re-record would take
a whole afternoon of luck.

Deliberately last in the release order despite being the flagship: it is the
hardest video to make and the one that most needs the pipeline to already be
proven on shorts.

## Chapters

| Chapter | Start | What happens                            |
| ------- | ----- | --------------------------------------- |
| 1       | 00:00 | The problem with agents and context     |
| 2       | 01:10 | Turning an idea into a plan             |
| 3       | 03:00 | Breaking it into tasks                  |
| 4       | 04:30 | Running it, one task at a time          |
| 5       | 07:30 | The commits, and reading them backwards |
| 6       | 09:20 | What this costs and where it runs       |

## Beats

| t     | on-screen action                                                 | narration                                                                                                              |
| ----- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 00:00 | A finished plan with six completed tasks and six linked commits. | This took one afternoon, and I wrote almost none of it. Let me show you the whole loop, start to finish.               |
| 00:20 | Cut to an empty plans list.                                      | Start here. Nothing exists yet, just an idea I have not written down.                                                  |
| 00:40 | A chat with an agent, no plan, context lost mid-thread.          | The problem is not that agents cannot code. It is that a chat window forgets, and you re-explain the same thing daily. |
| 01:10 | Click **New plan**; type a real title and a real description.    | So the first move is to write the goal down somewhere the agent can read it every time it starts.                      |
| 01:50 | Save; plan detail, no tasks.                                     | That description is now the brief. Every run reads it.                                                                 |
| 02:20 | Add the project pointing at a checkout.                          | And point it at a checkout, so the agent knows which code we mean.                                                     |
| 03:00 | Ask the agent, over MCP, to break the plan into tasks.           | Now the breakdown. I could type six tasks. Or I can ask, since the agent already has the brief.                        |
| 03:40 | Tasks appear in the dashboard, ordered.                          | It writes them straight in. Ordered, one idea each.                                                                    |
| 04:00 | Reorder one task; rewrite another's title; delete a third.       | And then I edit them, because the ordering is the part a machine gets wrong and I get right.                           |
| 04:30 | Start the run; the first task flips to in progress.              | Now run it. One task at a time, lowest first.                                                                          |
| 05:00 | Output streams; a validation step runs and fails.                | It writes code, then validates. This one fails, which is the interesting case.                                         |
| 05:40 | The agent fixes and re-validates; the task closes.               | It reads its own failure and fixes it. Only then does the task close.                                                  |
| 06:10 | The next task opens; output streams again.                       | Then the next one. Never two at once, so a failure is always one task wide.                                            |
| 07:00 | Fast-forward montage through the remaining tasks.                | Six tasks, same loop each time.                                                                                        |
| 07:30 | Terminal `git log`; six commits, each with plan and task ids.    | Here is what came out. Six commits, each carrying the task that caused it.                                             |
| 08:10 | Copy a task id; paste into search; the task opens.               | Which means you can read the repository backwards.                                                                     |
| 08:40 | Up to the plan; read the original description.                   | From a line of code, to the task, to the reason the work existed.                                                      |
| 09:20 | Open the run's token usage and cost.                             | Every run records its model and what it cost, so this is a number and not a feeling.                                   |
| 09:50 | Show the local model settings and the compose file.              | And all of it runs on your machine. Local models if you want them, self-hosted either way.                             |
| 10:20 | Back to the finished plan.                                       | That is the loop. Write the goal down, cut it into tasks, run them one at a time, and keep the trail.                  |
| 10:50 | Outro card.                                                      |                                                                                                                        |

## Notes

- Act three is the only place a montage is allowed on this channel. Everywhere
  else, if a beat is boring, cut the beat rather than speeding the picture up.
- The failing validation at 05:00 is not a blooper to be edited out — it is the
  most persuasive thirty seconds in the video. Keep it.
