# Claude (Anthropic) usage API

> Research for OT plan `3924b01b-03f9-42d9-8f54-09bb36967086` — Document usage APIs for Cursor, Claude, and OpenCode.
> Task `69a95e50-b0d0-48cf-bf31-a297e0b73b86` — Research Claude (Anthropic) usage API.

## Summary

Anthropic exposes first-class, well-documented **Usage & Cost API** endpoints as part of the **Admin API**. Token usage and dollar cost are reported separately, both with flexible time bucketing and grouping. This is the most mature and granular of the three providers surveyed. Data lands within ~5 minutes; polling once per minute is supported.

## Auth

- Requires an **Admin API key** (`sk-ant-admin...`), distinct from a standard inference key (`sk-ant-api...`).
- Only **organization members with the admin role** can provision Admin API keys, via the Claude Console.
- Header: `x-api-key: sk-ant-admin...` plus `anthropic-version`.
- Org/Console-level — not tied to a single workspace key. (Enterprise/Team and standard orgs; not available on Claude on AWS Bedrock — see gaps.)

## Base URL

`https://api.anthropic.com`

## Endpoints

| Endpoint                                  | Method | Purpose                          |
| ----------------------------------------- | ------ | -------------------------------- |
| `/v1/organizations/usage_report/messages` | GET    | Token consumption across the org |
| `/v1/organizations/cost_report`           | GET    | Dollar cost across the org       |

(Admin API also covers org members, workspaces, workspace members, and API key management — useful for attribution joins.)

### `usage_report/messages` parameters

- `starting_at`, `ending_at` — ISO-8601 time range (e.g. `2026-02-01T00:00:00Z`).
- `bucket_width` — aggregation interval: `1m`, `1h`, or `1d`.
- `group_by[]` — one or more of: API key, workspace, model, service tier, context window, data residency, speed (beta).
- `limit` — pagination; responses paginate with a next-page cursor.

### Token metrics reported

Uncached input tokens, cached input (cache read) tokens, **cache creation** tokens, and output tokens — broken down per group. Server-tool usage is also tracked.

### `cost_report` parameters / output

- Same time-range + bucketing model.
- Grouping by e.g. `workspace_id`, `description`.
- Returns dollar cost (the API's own computed cost), letting you attribute spend per workspace/key.

## Granularity

Per API key / per workspace / per model / per service-tier / per context-window, bucketed as fine as **1 minute**. Cost reported in dollars; tokens split across the four cache states above.

## Latency, polling & retention

- Usage/cost data typically appears **within ~5 minutes** of request completion.
- **Polling once per minute** is supported for sustained use.
- Retention: not explicitly documented in the API reference; Console reporting shows long ranges. Treat long-term history as "snapshot to be safe," though retention is far better than Cursor's.

## Enterprise vs individual differences

- The Usage & Cost **Admin API** is an **organization** feature — requires an org and an admin-role member to mint the admin key.
- Per-user / per-API-key cost attribution is available (recently expanded — "Enterprise Analytics"), enabling seat-level cost breakdowns.
- Individual (single-key, no org) users rely on Console usage reporting rather than the programmatic Admin API.

## Known gaps / caveats

- **Not available on Claude on AWS Bedrock** — the programmatic Usage & Cost endpoints are Anthropic-first-party only.
- Admin key is powerful (org-wide) — handle as a high-sensitivity secret.
- Retention window not formally documented → snapshot for durable history.

## Sources

- [Usage and Cost API | Claude Docs](https://docs.anthropic.com/en/api/usage-cost-api) ([platform mirror](https://platform.claude.com/docs/en/manage-claude/usage-cost-api))
- [Get Messages Usage Report](https://docs.anthropic.com/en/api/admin-api/usage-cost/get-messages-usage-report)
- [Get Cost Report](https://docs.anthropic.com/en/api/admin-api/usage-cost/get-cost-report)
- [Admin API overview](https://docs.anthropic.com/en/api/administration-api)
- [Usage & cost Admin API cookbook](https://platform.claude.com/cookbook/observability-usage-cost-api)
- [Cost & Usage reporting in Console](https://support.anthropic.com/en/articles/9534590-cost-and-usage-reporting-in-console)
