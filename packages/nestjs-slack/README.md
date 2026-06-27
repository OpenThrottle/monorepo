# @openthrottle/nestjs-slack

Minimal NestJS Slack integration: incoming webhooks via native `fetch`. No heavy SDK; required config is validated at bootstrap (fail-fast).

## Installation

**pnpm:**

```bash
pnpm add @openthrottle/nestjs-slack
```

**npm:**

```bash
npm install @openthrottle/nestjs-slack
```

## Usage

Register the module with **`forRoot(options)`**. All required keys must be provided; validation runs in the dynamic module factory, so missing or invalid config fails at app bootstrap.

### Config

| Key            | Required | Description                                                                                                                         |
| -------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `webhookUrl`   | yes      | Incoming webhook URL. Must be `https`; cleartext `http` is only accepted for loopback hosts (`localhost`, `127.0.0.1`, `::1`).      |
| `allowedHosts` | no       | Allowlist of hostnames the `webhookUrl` may target. Supports exact matches and a single leading `*.` wildcard (e.g. `*.slack.com`). |

### Security: webhookUrl must be operator-trusted

`webhookUrl` is an outbound request primitive. Sending it somewhere attacker-controlled turns this module into an SSRF / cleartext-exfiltration vector. Two guards apply:

- **No cleartext to remote hosts.** `http:` is rejected unless the host is loopback (`localhost`, `127.0.0.1`, `::1`); every other host must be `https:`. This prevents message contents being sent in plaintext over a network.
- **Optional host allowlist.** If `webhookUrl` can be influenced by semi-trusted config/env, set `allowedHosts` so the URL cannot be repointed at internal services:

  ```ts
  NestjsSlackModule.forRoot({
    allowedHosts: ['hooks.slack.com'], // or ['*.slack.com']
    webhookUrl: process.env.SLACK_WEBHOOK_URL ?? '',
  });
  ```

**Documented decision:** when `allowedHosts` is omitted, any `https` host is permitted (so `https://example.com/slack-webhook` is valid). This is intentional — the module is designed to support custom/proxy webhook endpoints — and assumes `webhookUrl` is fully operator-trusted at bootstrap. Set `allowedHosts` whenever that assumption does not hold.

### Example

```ts
import { Module } from '@nestjs/common';
import { NestjsSlackModule } from '@openthrottle/nestjs-slack';

@Module({
  imports: [
    NestjsSlackModule.forRoot({
      webhookUrl: process.env.SLACK_WEBHOOK_URL ?? '', // prefer env; validate at bootstrap
    }),
  ],
})
export class AppModule {}
```

Inject `NestjsSlackService` and call `send()`:

```ts
import { NestjsSlackService } from '@openthrottle/nestjs-slack';

@Injectable()
export class MyService {
  constructor(private readonly slack: NestjsSlackService) {}

  async notify(): Promise<void> {
    await this.slack.send({ text: 'Hello from Nest' });
  }
}
```

### Fail-fast behavior

If you omit options, pass an empty `webhookUrl`, or an invalid URL, the app throws at bootstrap with a clear error (e.g. `@openthrottle/nestjs-slack: webhookUrl is required and must be a non-empty string`). No optional config that could hide misconfiguration.

### Environment / config

- Set `SLACK_WEBHOOK_URL` (or your preferred env var) and pass it into `forRoot({ webhookUrl: process.env.SLACK_WEBHOOK_URL })`.
- Ensure the value is a valid `https://` URL before the app starts (cleartext `http://` is only accepted for loopback hosts); otherwise validation will throw.
