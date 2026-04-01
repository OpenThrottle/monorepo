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

**yarn:**

```bash
yarn add @openthrottle/nestjs-slack
```

## Usage

Register the module with **`forRoot(options)`**. All required keys must be provided; validation runs in the dynamic module factory, so missing or invalid config fails at app bootstrap.

### Required config

| Key          | Description                                      |
| ------------ | ------------------------------------------------ |
| `webhookUrl` | Incoming webhook URL (must be `http` or `https`) |

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
- Ensure the value is a valid `https://` (or `http://`) URL before the app starts; otherwise validation will throw.
