# OpenCode usage API

> Research for OT plan `3924b01b-03f9-42d9-8f54-09bb36967086` — Document usage APIs for Cursor, Claude, and OpenCode.
> Task `6e85ec7a-2679-489a-bded-11d2f476c4ad` — Research OpenCode usage API.

## Summary

OpenCode (sst/opencode) is an **open-source terminal AI coding agent**. Unlike Cursor and Anthropic, it exposes **no first-party REST/GraphQL usage-query API**. Usage data is available **locally** (session logs + OpenTelemetry export) and, for its hosted model gateway **Zen**, only through a billing dashboard — a programmatic balance/usage endpoint is an open feature request, not yet shipped. Aggregation must therefore be pull-from-local (OTLP collector or log parsing) or fall back to the underlying provider's usage API for BYO keys.

## Data sources & "auth"

There is no usage API key. The three integration surfaces:

1. **Local session data** — opencode writes per-session logs/JSON locally (`~/.local/share/opencode` / `~/.config/opencode`). Token and cost data live here. Third-party tools (TokenTelemetry, OpenCode Monitor) read these files directly — 100% local, no auth.
2. **OpenTelemetry export** — the `@devtheops/opencode-plugin-otel` plugin emits OTLP (gRPC or HTTP/protobuf) metrics + log events, mirroring Claude Code's monitoring schema. Auth is whatever the OTLP collector requires (`OPENCODE_OTLP_HEADERS`).
3. **Zen (hosted gateway)** — pay-as-you-go proxy; usage/billing visible only in the SolidStart dashboard. **No public usage/balance API** ([feature request #10448](https://github.com/anomalyco/opencode/issues/10448)).

## OpenTelemetry signals (richest programmatic surface)

Enable via `~/.config/opencode/opencode.json` `plugin: ["@devtheops/opencode-plugin-otel"]` and env `OPENCODE_ENABLE_TELEMETRY`, `OPENCODE_OTLP_ENDPOINT` (default `http://localhost:4317`), `OPENCODE_OTLP_PROTOCOL` (`grpc` | `http/protobuf` | `http/json`).

### Metrics

| Metric                                          | Type      | Notes                                                        |
| ----------------------------------------------- | --------- | ------------------------------------------------------------ |
| `opencode.token.usage`                          | Counter   | per type: input, output, reasoning, cacheRead, cacheCreation |
| `opencode.cost.usage`                           | Counter   | USD per completed assistant message                          |
| `opencode.session.token.total`                  | Histogram | tokens/session at idle                                       |
| `opencode.session.cost.total`                   | Histogram | USD/session at idle                                          |
| `opencode.model.usage`                          | Counter   | messages per model + provider                                |
| `opencode.message.count` / `session.count`      | Counter   | volume                                                       |
| `opencode.tool.duration` / `session.duration`   | Histogram | latency                                                      |
| `opencode.cache.count`                          | Counter   | cacheRead / cacheCreation                                    |
| `opencode.lines_of_code.total`                  | Gauge     | authoritative live cumulative churn                          |
| `opencode.commit.count`, `opencode.retry.count` | Counter   | git commits, API retries                                     |

### Log events

`session.created`, `session.idle` (totals: tokens, cost, messages), `session.error`, `user_prompt` (prompt_length, model, agent), `api_request` (tokens, cost, duration), `api_error`, `tool_result`, `tool_decision`, `commit`.

Set `OPENCODE_METRIC_PREFIX=claude_code.` for Claude Code dashboard compatibility — i.e. OpenCode and Claude Code can share one OTel pipeline.

## Granularity

Per session / per message / per model+provider. Tokens split into input/output/reasoning/cacheRead/cacheCreation; cost in USD. Time resolution = event-driven (per message/session), exported on the OTLP metrics interval (default 60 s).

## Zen billing model (for context)

Pay-per-request; auto-reload (default: reload $20 when balance < $5); per-workspace and per-member monthly usage limits. Stripe-backed (`BillingTable`/`UsageTable`/`SubscriptionTable` internally). Dashboard-only — no query API yet.

## Known gaps / caveats

- **No first-party pull API** — opposite model from Cursor/Anthropic. You push/scrape rather than query.
- **Zen has no usage/balance API** (open feature request).
- Local data is per-machine/per-developer → centralizing requires every dev to ship telemetry to a shared collector, or a sync step.
- For BYO provider keys, the provider's own usage API (e.g. Anthropic Usage & Cost) is the authoritative cost source; opencode's cost numbers are computed client-side.

## Integration recommendation for OpenThrottle

Stand up an **OTLP collector endpoint** (or OTLP→Postgres bridge) and have developers point `OPENCODE_OTLP_ENDPOINT` at it; normalize `opencode.token.usage` / `opencode.cost.usage` into the shared metrics schema. Treat Zen spend as dashboard-only until an API exists; use provider usage APIs for authoritative BYO cost.

## Sources

- [OpenCode docs](https://opencode.ai/docs/) · [Zen](https://opencode.ai/docs/zen/)
- [sst/opencode (GitHub)](https://github.com/sst/opencode)
- [@devtheops/opencode-plugin-otel](https://github.com/DEVtheOPS/opencode-plugin-otel)
- [opencode-telemetry-plugin (pai4451)](https://github.com/pai4451/opencode-telemetry-plugin/)
- [TokenTelemetry (local log reader)](https://github.com/VasiHemanth/tokentelemetry)
- [SigNoz OpenCode observability](https://signoz.io/docs/opencode-observability/)
- [Zen balance API feature request #10448](https://github.com/anomalyco/opencode/issues/10448)
