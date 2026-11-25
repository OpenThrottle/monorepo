# @openthrottle/openthrottle-social — agent notes

Posts @openthrottleai's tweets from a rolling OpenThrottle "social" plan: one
task per tweet, a daily scheduled job that posts today's approved one, and a
weekly job that drafts more. This package holds the tweet-task contract and the
scripts those jobs run.

## Why a package, not server code

The scripts run as plain CLIs inside a scheduled agent job's checkout. They talk
to OpenThrottle over GraphQL and to X over HTTPS, need no NestJS DI, and keep the
X credentials (in `~/.openthrottle/.env`) out of the server process. It is
source-first and run by Node's type stripping, so every relative import carries
its `.ts` extension.

## Layout

- [src/types/social-post.ts](src/types/social-post.ts) — the payload types and the status
  lifecycle (BACKLOG → PENDING → IN_PROGRESS → COMPLETED, with SKIPPED and BLOCKED). Read its
  JSDoc before changing what the scripts do.
- [src/utils/](src/utils/) — everything with behaviour:
  - `parseSocialPost.ts` parses a task's `requirementsJson` (a one-element array) into a
    `SocialPost` and never throws; `validateDrafts.ts` checks a batch for the refill job;
    `getWeightedTweetLength.ts` is X's weighted 280 count (URLs 23, emoji and CJK 2).
  - `runXPost.ts` and `runXMetrics.ts` are the scripts' logic over injected OT and X clients
    (`createOtClient.ts`, `createXClient.ts`).
  - `x-oauth.ts`, `completeXAuthorization.ts` and `createXTokenClient.ts` are OAuth PKCE and the
    rotating token client; `user-env-file.ts` reads and atomically writes `~/.openthrottle/.env`.
- [src/config/](src/config/) — constants: X and OT endpoints and env keys, tweet limits, exit codes.
- [src/scripts/](src/scripts/) — the thin `pnpm run social:*` entry points (knip entries).

## Invariants & gotchas

- `requirements` is stored as a JSON **array** server-side, so the payload is
  always `[post]`. Write it back with `serializeSocialPost`, never by hand.
- Nothing in this package moves a task to `PENDING`. That is the human's
  approval step.
- **Never double-post.** `runXPost` records each tweet id on the task before sending the next;
  keep that order in any change. A dry run must not call X at all, because a token refresh
  rotates `X_REFRESH_TOKEN`.
- No secret is ever printed or written to a task: route every line through `redactSecrets`.

## Pointers

- [README.md](README.md) — commands, env keys and the **runbook**: approving drafts, skipping
  or editing a post, media posts by hand, BLOCKED reasons, OAuth re-setup, credits and cost.
- [src/data/job.\*.md](src/data/) — the reviewed prompts and settings of the two scheduled jobs,
  pasted into the MCP scheduling tools by hand; no code reads them.
- [../AGENTS.md](../AGENTS.md) — parent-tier conventions.
