# Cursor usage API

> Research for OT plan `3924b01b-03f9-42d9-8f54-09bb36967086` — Document usage APIs for Cursor, Claude, and OpenCode.
> Task `98cdd8bc-10ec-4113-a27a-01327a0f0a6d` — Research Cursor usage API.

## Summary

Cursor exposes usage/billing data through a **Team/Enterprise Admin API** (plus a companion **Analytics API**). It is pull-only (no webhooks), aggregated hourly, and has limited history retention (~30 days), so any long-term metrics store must snapshot regularly.

## Auth

- Requires a **Cursor Team or Enterprise plan**. No usage API for individual Pro accounts.
- Generate an **Admin API key**: Settings → Team → API Keys. Key format: `key_...`.
- A separate **Analytics API key** may be required for analytics endpoints.
- HTTPS only. Documented auth scheme is **HTTP Basic** with the API key as the username and empty password: `Authorization: Basic base64("key_xxx:")`.
- Read-only for usage data; the only write operation is setting a per-user spend limit.

## Base URL

`https://api.cursor.com`

## Admin API endpoints (usage / billing)

| Endpoint                       | Method | Purpose                                 | Notes                                                                                                    |
| ------------------------------ | ------ | --------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `/teams/members`               | GET    | Roster: name, email, role               | owner / admin / member                                                                                   |
| `/teams/daily-usage-data`      | POST   | Per-day usage metrics                   | Body `{ startDate, endDate }` epoch ms, range ≤ 90 days; poll ≤ 1×/hour                                  |
| `/teams/spend`                 | POST   | Current calendar-month spend per member | `spendCents`, `fastPremiumRequests`, name, email, role, `hardLimitOverrideDollars`; search/sort/paginate |
| `/teams/filtered-usage-events` | POST   | Per-request events                      | model, tokens, cost per call; poll ≤ 1×/hour                                                             |
| Billing groups                 | POST   | Member lists + spend per billing group  |                                                                                                          |
| Set spend limit                | POST   | Hard $ limit per user                   | the one write op                                                                                         |

### `daily-usage-data` response fields (per day)

`date`, active flag, `linesAdded`, `linesDeleted`, accepted lines, applies/accepts/rejects, tabs shown/accepted, composer/chat/agent request counts, acceptance rate, most-used models, most-used extensions, client version.

### `spend` response fields (per member)

`spendCents`, `fastPremiumRequests`, `name`, `email`, `role`, `hardLimitOverrideDollars`.

## Analytics API endpoints (adoption / quality)

DAU (includes CLI, cloud agent, Bugbot), model usage breakdown per day, agent edit accept/reject rates, tab effectiveness, MCP tool adoption, top file extensions, client version distribution, command usage, plan-mode adoption.

## Granularity

Per-user, per-model, per-day. Cost in **cents**. Token-level detail via `filtered-usage-events`.

## Rate limits & retention

- Rate-limited per team; counters **reset every minute**.
- Usage/spend endpoints aggregate hourly → **poll at most once per hour**.
- **History retention ≈ 30 days** (date range arg allows up to 90 days, but practical retention is limited). Long-term trends require self-stored snapshots.

## Known gaps / caveats

- Team/Enterprise only — nothing for individual Pro.
- Limited retention → ingestion must snapshot regularly.
- Community reports of intermittent `daily-usage-data` issues.
- Pull-only; no push/webhooks.

## Sources

- [Admin API | Cursor Docs](https://cursor.com/docs/account/teams/admin-api)
- [Analytics API | Cursor Docs](https://cursor.com/docs/account/teams/analytics-api)
- [Cursor APIs Overview](https://cursor.com/docs/api)
- [ofershap/cursor-usage](https://github.com/ofershap/cursor-usage) — wraps full Enterprise Admin + Analytics API
- [h3ro-dev/cursor-admin-mcp](https://github.com/h3ro-dev/cursor-admin-mcp) — request/response shapes
