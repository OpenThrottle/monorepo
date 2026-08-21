---
id: 07-semantic-search
title: Semantic search across every plan you have ever written
format: short
status: draft
release: 9
recording: live
titleCard: ['Search every plan', 'you ever wrote']
spokenWords: 73
blockedOn:
  - The /search route is unreachable in a production build (it redirects to /dashboard)
tags:
  - openthrottle
  - semantic search
  - embeddings
  - ai agents
  - developer tools
---

**BLOCKED.** Recording this flow found that `/search` — and `/search?q=…` —
redirects to `/dashboard` in a production build, reproducibly, for a fully
permissioned user. There is also no Search item in the sidebar. Search today is the
header ⌘K commander, which is a different UX from the one this script describes
(a results page with per-result match reasons and pagination).

Two options, and this script cannot be recorded until one is taken: fix the
`/search` route, or rewrite the script around the commander. Do not record it
against the commander while the narration still describes a results page.

## Beats

| t    | on-screen action                                                            | narration                                                                     |
| ---- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 0:00 | `/search` open with results already on screen for `rate limiting`.          | Two years of plans. You remember solving this. You do not remember where.     |
| 0:08 | Clear the field; type `how did we handle retries`.                          | So do not search for a title. Describe the problem.                           |
| 0:18 | Results render — plans, tasks and notes, none of which contain that phrase. | These do not share a single word with what I typed.                           |
| 0:27 | Hover the top result; the match reason shows.                               | It matched on meaning. Everything you write gets embedded when you save it.   |
| 0:36 | Click the top result → the plan from months ago opens.                      | And now you have the plan you half remembered, with what you decided and why. |
| 0:46 | Hold on the plan description.                                               | Your agents search the same index. Which is the actual point.                 |
| 0:54 | Outro card.                                                                 |                                                                               |
