# @openthrottle/nestjs-slack — agent notes

NestJS module wrapping Slack incoming webhooks via native `fetch` (no Slack SDK). Exposes
`NestjsSlackService.send()` with timeout/retry/backoff; validates the webhook URL at bootstrap.

**Consumed by:** nothing yet — no other project declares it as a dependency.

## Layout

- `src/modules/nestjs-slack.module.ts` — `NestjsSlackModule.forRoot(options)`; validates
  options in the factory and registers `NestjsSlackService`.
- `src/config/nestjs-slack.options.ts` — `NestjsSlackModuleOptions`, the
  `NESTJS_SLACK_OPTIONS` injection token, default constants, and `validateNestjsSlackOptions`.
- `src/services/nestjs-slack.service.ts` — the fetch/retry send logic.

## Invariants & gotchas

- Config is passed to `forRoot(options)`, **not** read from env by this package. The only
  required option is `webhookUrl` (the credential itself — never log it, even partially).
  There is no token/env var to set here; the host app resolves the URL and passes it in.
- Undeclared workspace dep: `src` imports `@openthrottle/nestjs-modules` (`LoggerModule`/
  `LoggerService`) but `package.json` declares no dependencies. Add it as a `workspace:^`
  dependency rather than relying on pnpm hoisting (phantom-hoisted-dep bug).
- Validation is fail-fast at module init: a missing/invalid `webhookUrl`, cleartext `http:`
  against a non-loopback host, or an `allowedHosts` miss throws `NestjsSlackError`. Set
  `allowedHosts` (e.g. `['hooks.slack.com']`) whenever the URL comes from semi-trusted
  config — it is the SSRF gate.
- Built, not source-first: real `build` target, `exports` → `dist`; see [../AGENTS.md](../AGENTS.md).

## Pointers

- [README.md](./README.md) — options table and send/retry semantics.
