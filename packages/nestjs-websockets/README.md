# @openthrottle/nestjs-websockets

NestJS WebSockets integration and utilities for real-time features.

## Installation

Install with your preferred package manager:

**pnpm:**

```bash
pnpm add @openthrottle/nestjs-websockets
```

**npm:**

```bash
npm install @openthrottle/nestjs-websockets
```

**yarn:**

```bash
yarn add @openthrottle/nestjs-websockets
```

## EmitNotification

Declarative socket notification emissions for resolver or controller methods: use the `@EmitNotification` decorator so that when a method returns, an event is emitted via an injectable emitter (e.g. your notifications service). The interceptor reads the decorator metadata and calls the emitter when the optional payload mapper returns a non-null value.

### API

- **`@EmitNotification(event: string)`** — Emit the given event after the method returns. The interceptor may use the method’s return value as the payload (or your emitter may ignore it).
- **`@EmitNotification(event: string, payload: (ret) => unknown | null)`** — Emit only when the payload mapper returns non-null; the mapper receives the method’s return value.
- **`@EmitNotification({ event, payload? })`** — Object form: `event` (string) and optional `payload` mapper.
- **`@EmitNotification([{ event, payload? }, ...])`** — Array form: emit multiple events from one method (e.g. `plan.updated` and `plan.status_changed`).

The decorator only sets metadata; it does not perform DI. Emission is done by `EmitNotificationInterceptor` using the provider bound to `EMIT_NOTIFICATION_EMITTER`.

**Examples:**

```ts
// Event only
@EmitNotification('plan.updated')
async updatePlan(...) { ... }

// Event + payload mapper (emit only when mapper returns non-null)
@EmitNotification('plan.updated', (ret) => ret?.plan ?? null)
async updatePlan(...) { return { plan }; }

// Object form
@EmitNotification({ event: 'plan.updated', payload: (ret) => ret ?? null })
async updatePlan(...) { ... }

// Multiple events from one method (array form)
@EmitNotification([
  { event: 'plan.updated', payload: (ret) => ret ?? null },
  { event: 'plan.status_changed', payload: (ret) => ret != null ? { planId: ret.id, status: ret.status } : null },
])
async setPlanStatus(...) { ... }
```

### Registering the interceptor

Register `EmitNotificationInterceptor` so it runs for the handlers that use `@EmitNotification`. You can register it globally or per controller/resolver.

**Global (e.g. in your root module):**

```ts
import { APP_INTERCEPTOR } from '@nestjs/core';
import { EmitNotificationInterceptor } from '@openthrottle/nestjs-websockets';

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: EmitNotificationInterceptor,
      multi: true,
    },
  ],
})
export class AppModule {}
```

Ensure the module that provides `EMIT_NOTIFICATION_EMITTER` is imported (e.g. your notifications module) so the interceptor can inject the emitter.

### Providing the emitter

The interceptor calls an injectable emitter that implements `EmitNotificationEmitter`:

```ts
interface EmitNotificationEmitter {
  emit(event: string, payload: unknown): void;
}
```

Provide it with the token `EMIT_NOTIFICATION_EMITTER`. You can implement this interface directly or use an adapter that maps event names to your existing notification methods (e.g. `emitPlanUpdated`, `emitTaskCompleted`).

**Example: adapter that delegates to a NotificationsService**

```ts
import {
  EMIT_NOTIFICATION_EMITTER,
  type EmitNotificationEmitter,
} from '@openthrottle/nestjs-websockets';

@Injectable()
export class NotificationEmitterAdapter implements EmitNotificationEmitter {
  constructor(private readonly notifications: NotificationsService) {}

  emit(event: string, payload: unknown): void {
    switch (event) {
      case 'plan.updated':
        this.notifications.emitPlanUpdated(payload as PlanUpdatedPayload);
        break;
      case 'task.completed':
        this.notifications.emitTaskCompleted(payload as TaskCompletedPayload);
        break;
      default:
        break;
    }
  }
}

@Module({
  providers: [
    NotificationEmitterAdapter,
    NotificationsService,
    {
      provide: EMIT_NOTIFICATION_EMITTER,
      useClass: NotificationEmitterAdapter,
    },
  ],
})
export class NotificationsModule {}
```

**See also:** [notifications-websockets-plan.md](../../../docs/openthrottle/notifications-websockets-plan.md) for the full openthrottle contract (event names, payload types) and resolver usage.
