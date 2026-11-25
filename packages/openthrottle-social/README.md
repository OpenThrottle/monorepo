# @openthrottle/openthrottle-social

Posts @openthrottleai's tweets from OpenThrottle itself. Each tweet is a task in the rolling
**"@openthrottleai posts"** plan. A daily scheduled job posts that day's approved tweet and
records its views a day later, and a weekly job drafts about 30 days ahead for a human to approve.
It is pay-per-use on the X API, with no third-party scheduler.

The plan is tagged `no-plan-run`, so the server refuses to run it as a plan run. Its tasks are
posts, not code.

## Commands

All of them run from the repository root and read `~/.openthrottle/.env`.

| Command                                                  | What it does                                                                  |
| -------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `pnpm run social:x-auth`                                 | One-time OAuth setup: approve the app in the browser, store the refresh token |
| `pnpm run social:x-post -- [--dry-run] [--plan <id>]`    | Post today's approved tweet (America/Los_Angeles)                             |
| `pnpm run social:x-metrics -- [--dry-run] [--plan <id>]` | Record views on tweets posted a day or more ago                               |
| `pnpm run social:x-validate -- <drafts.json>`            | Check a JSON array of draft payloads against the tweet-task contract          |

Exit codes: `0` done or nothing to do, `1` a task went `BLOCKED` or a service was unreachable,
`2` configuration missing, `3` a media post needs a human.

The env file needs these keys. The values come from the X developer portal and from
`social:x-auth`; never paste them into the repo, a task or a chat:

```bash
OPENTHROTTLE_GRAPHQL_URL=…        # already written by openthrottle-server
OPENTHROTTLE_MCP_AUTH_TOKEN=…     # already written by openthrottle-server
OPENTHROTTLE_SOCIAL_PLAN_ID=…     # the "@openthrottleai posts" plan id
X_CLIENT_ID=…                     # X developer portal → your app → Keys and tokens
X_CLIENT_SECRET=…                 # only for a confidential client
X_REFRESH_TOKEN=…                 # written by social:x-auth, rotated by every run
```

The two scheduled jobs' reviewed prompts and settings are
[src/data/job.daily-poster.md](src/data/job.daily-poster.md) and
[src/data/job.weekly-refill.md](src/data/job.weekly-refill.md). No code reads them: they are the
copy a human (or an agent with `OPENTHROTTLE_MCP_TOOLSETS=scheduling`) pastes into the
OpenThrottle MCP scheduling tools to create or update each job. Change the file first, then the job.

## Development

```bash
pnpm nx run @openthrottle/openthrottle-social:test
pnpm nx run @openthrottle/openthrottle-social:lint
pnpm nx run @openthrottle/openthrottle-social:typecheck
```

It is a private, source-first workspace package: a consumer adds
`"@openthrottle/openthrottle-social": "workspace:^"` and runs `pnpm install`.

## Runbook

### How a post moves

| Status        | Meaning                                       | Who sets it                |
| ------------- | --------------------------------------------- | -------------------------- |
| `BACKLOG`     | Drafted, not approved                         | the refill job, or you     |
| `PENDING`     | Approved: posts at 07:00 PT on its `postOn`   | **only you**               |
| `IN_PROGRESS` | Posting (or stopped mid-thread)               | the poster                 |
| `COMPLETED`   | Posted. The summary holds the URL and the ids | the poster, or you by hand |
| `SKIPPED`     | Killed                                        | you                        |
| `BLOCKED`     | The post failed. The summary says why         | the poster                 |

The permanent `BLOCKED` task "Refill marker: keeps this plan open" stops the plan from closing
itself when the last post completes. Leave it alone.

### Approve a week of drafts

Open the posts plan in the developer app and read each `BACKLOG` task: the text is in its
requirements, and its description lists the sources behind every fact. Set the ones you want to
`PENDING`. Fill in or skip anything with `[placeholders]` first.

### Edit or skip a post

- **Skip:** set the task `SKIPPED`.
- **Edit:** change the text in the task's requirements (keep it one JSON payload in an array),
  then check it:

  ```bash
  pnpm run social:x-validate -- /tmp/draft.json
  ```

  with `/tmp/draft.json` holding `[ <the payload> ]`. To move a post, change its `postOn`.

- **See exactly what tomorrow sends:** `pnpm run social:x-post -- --dry-run`. It changes
  nothing, not even the token.

### Post a media task by hand

v1 does not upload images or video. On its day the poster leaves a task with `media` at
`PENDING`, notes it on the plan, and exits `3`. Post it from the X app with the media attached,
then set the task `COMPLETED` with the post's URL in its summary. To get views recorded too, add
the tweet ids (first tweet first) to `postedTweetIds` in its requirements.

### When a post is BLOCKED

The summary starts with the reason:

| Reason             | Meaning                                                   | Fix                                        |
| ------------------ | --------------------------------------------------------- | ------------------------------------------ |
| `credits` (402)    | The X API pay-per-use balance is empty                    | Top up credits (below), then retry         |
| `auth` (401)       | X refused the token, or the refresh token no longer works | Re-run the OAuth setup (below), then retry |
| `rate-limit` (429) | X is throttling the app                                   | Wait, then retry                           |
| `forbidden` (403)  | X refused the post itself, often as a duplicate           | Reword it, then retry                      |
| `http`, `network`  | X errored or could not be reached                         | Retry                                      |

**Retry** means: set the task back to `PENDING` with today's (or a later) `postOn`. Tweets
already posted are listed in the summary and kept in `postedTweetIds`, so a retry sends only the
rest of a thread and never posts the same tweet twice.

### Re-run the OAuth setup

When posts block with `auth`, or after revoking the app:

1. In the X developer portal, make sure the app's callback URL is `http://127.0.0.1:8765/callback`
   and its permissions are read and write.
2. Sign in to X as @openthrottleai in your browser.
3. Run `pnpm run social:x-auth`, open the URL it prints, and approve.

It writes a fresh `X_REFRESH_TOKEN` to `~/.openthrottle/.env` and prints no secret. Every run
afterwards rotates the token and writes the new one back. A copy of the env file from before
that run stops working, so don't restore an old one.

### Top up X credits

The X API has no free tier: it bills per call against prepaid credits. Buy them yourself in the X
developer portal under Billing. Nothing in this package can, or ever will, buy credits.

### What it costs

At the current calendar (about 25 posts a month, seven of them with a link in their first
reply) it comes to roughly **$2 a month**: about $0.015 a post, about $0.20 for any post that
contains a URL (a first reply included), and about $0.001 for each daily metrics read. The links
are most of the bill; links sit in first replies for reach, not to save money.
