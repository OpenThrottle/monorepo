# Usage APIs: Cursor vs Claude (Anthropic) vs OpenCode

> Research deliverable for OT plan `3924b01b-03f9-42d9-8f54-09bb36967086` — Document usage APIs for Cursor, Claude, and OpenCode.
> Task `1a8f7bfc-4d1a-4552-b33a-8d20a4cd67ba` — unified comparison + recommendations.

Per-provider detail:

- [Cursor](./cursor.md)
- [Claude (Anthropic)](./claude-anthropic.md)
- [OpenCode](./opencode.md)

## TL;DR

Three very different shapes. **Anthropic** has the best first-party usage API (granular, low-latency, cost in dollars). **Cursor** has a solid team/enterprise Admin API but short retention and pull-only. **OpenCode** has _no_ query API — it's local logs + OpenTelemetry push, with hosted "Zen" spend visible only in a dashboard. A unified OpenThrottle ingestion layer must therefore support **both pull (Cursor/Anthropic) and push/OTLP (OpenCode)**.

## Comparison matrix

| Dimension                    | Cursor                                            | Claude (Anthropic)                            | OpenCode                                               |
| ---------------------------- | ------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------ |
| **API style**                | REST Admin + Analytics API                        | REST Admin Usage & Cost API                   | None (local logs + OTLP push); Zen dashboard-only      |
| **Base URL**                 | `https://api.cursor.com`                          | `https://api.anthropic.com`                   | n/a (OTLP collector you host)                          |
| **Auth**                     | Team/Enterprise admin key (HTTP Basic, `key_...`) | Org admin key `sk-ant-admin...` (`x-api-key`) | None / OTLP collector creds                            |
| **Plan requirement**         | Team or Enterprise only                           | Organization (admin role)                     | Free/local; Zen for hosted spend                       |
| **Cost metric**              | `spendCents` per member                           | computed **dollars** via `cost_report`        | client-computed USD (`opencode.cost.usage`)            |
| **Token metrics**            | via `filtered-usage-events` (model, tokens, cost) | input / cached-read / cache-creation / output | input / output / reasoning / cacheRead / cacheCreation |
| **Per-user attribution**     | yes (per member)                                  | yes (per key/workspace; Enterprise per-user)  | per local session/dev only                             |
| **Per-model breakdown**      | yes                                               | yes (`group_by[]=model`)                      | yes (`model.usage`)                                    |
| **Seats / roster**           | `/teams/members`                                  | Admin API members/workspaces                  | n/a                                                    |
| **Time granularity**         | per day (hourly aggregation)                      | **1m / 1h / 1d** buckets                      | per event (OTLP interval, default 60s)                 |
| **Latency**                  | hourly                                            | ~5 min                                        | near-real-time (push)                                  |
| **Retention**                | ~30 days (snapshot needed)                        | not formally documented (better)              | depends on your store                                  |
| **Rate limit / polling**     | per-team, reset/min; poll ≤1×/hr                  | poll ≤1×/min                                  | n/a (push)                                             |
| **Push / webhooks**          | no                                                | no                                            | yes (OTLP)                                             |
| **API maturity**             | medium                                            | **high**                                      | low (no query API)                                     |
| **OT ingestion feasibility** | good (scheduled pull)                             | **excellent** (scheduled pull)                | medium (run a collector + per-dev opt-in)              |

## Example requests

### Cursor — daily usage

```http
POST https://api.cursor.com/teams/daily-usage-data
Authorization: Basic base64("key_xxx:")
Content-Type: application/json

{ "startDate": 1717200000000, "endDate": 1719792000000 }
```

### Anthropic — messages usage report

```http
GET https://api.anthropic.com/v1/organizations/usage_report/messages?starting_at=2026-06-01T00:00:00Z&ending_at=2026-06-08T00:00:00Z&bucket_width=1d&group_by[]=model&group_by[]=api_key
x-api-key: sk-ant-admin...
anthropic-version: 2023-06-01
```

### Anthropic — cost report

```http
GET https://api.anthropic.com/v1/organizations/cost_report?starting_at=2026-06-01T00:00:00Z&ending_at=2026-06-08T00:00:00Z&bucket_width=1d&group_by[]=workspace_id
x-api-key: sk-ant-admin...
anthropic-version: 2023-06-01
```

### OpenCode — enable OTLP export (no request; config + env)

```jsonc
// ~/.config/opencode/opencode.json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@devtheops/opencode-plugin-otel"],
}
```

```bash
export OPENCODE_ENABLE_TELEMETRY=1
export OPENCODE_OTLP_ENDPOINT=https://otel.openthrottle.internal:4317
export OPENCODE_OTLP_PROTOCOL=grpc
```

## Proposed normalized schema sketch

A single fact table all three can map into (provider-agnostic), plus a dimensions sidecar. Cost stored in integer micro-USD to avoid float drift.

```
usage_metric (
  id              uuid pk,
  provider        text,         -- 'cursor' | 'anthropic' | 'opencode'
  bucket_start    timestamptz,  -- start of the aggregation window
  bucket_width    text,         -- '1m' | '1h' | '1d'
  user_email      text null,    -- attribution where available
  api_key_ref     text null,    -- hashed/aliased key or workspace id
  model           text null,
  -- tokens (nullable; not every provider splits all five)
  input_tokens          bigint null,
  output_tokens         bigint null,
  reasoning_tokens      bigint null,
  cache_read_tokens     bigint null,
  cache_creation_tokens bigint null,
  -- cost & volume
  cost_micro_usd  bigint null,  -- integer micro-dollars
  request_count   bigint null,
  -- provenance
  source          text,         -- 'pull' | 'otlp'
  raw             jsonb,        -- original payload for re-derivation
  ingested_at     timestamptz default now()
)
-- natural-key dedupe: (provider, bucket_start, bucket_width, user_email, api_key_ref, model)
```

Companion `usage_seat` for roster/spend-limit context (Cursor members, Anthropic org members): `provider, user_email, role, spend_limit_micro_usd, period`.

## Feasibility & ingestion recommendation

1. **Anthropic** — implement first. Scheduled pull (hourly) of `usage_report/messages` + `cost_report`, `bucket_width=1d` for history + `1h` for recent; map directly to `usage_metric`. Cleanest, highest value.
2. **Cursor** — second. Hourly scheduled pull of `daily-usage-data` + `spend` (+ `filtered-usage-events` for token/model detail). Snapshot aggressively given ~30-day retention.
3. **OpenCode** — last / optional. Stand up an OTLP collector (or OTLP→Postgres bridge); per-dev opt-in via env. Reuse for Claude Code (`OPENCODE_METRIC_PREFIX=claude_code.`). Zen spend stays manual until an API ships.

**Common ingestion design:** a NestJS scheduled job (BullMQ) per pull-provider writing into `usage_metric` with natural-key upsert; a separate OTLP ingress for push-providers. Display via the developer dashboard. Store all cost as integer micro-USD; keep `raw` jsonb for re-derivation.

## Blockers / open questions (feed Task 5)

- Need an **Anthropic org admin key** and a **Cursor Team/Enterprise admin key** provisioned + stored as secrets.
- OpenCode centralization requires either a hosted collector + per-dev config rollout, or accepting local-only data.
- Zen spend has **no API** — manual or dashboard-scrape only.
- Confirm Anthropic retention window before relying on it for long-range history.
