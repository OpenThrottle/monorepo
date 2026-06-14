# @openthrottle/react-router-testing

Shared Vitest setup for OpenThrottle React Router applications. Centralizes the
jsdom polyfills and the `window.env` fixture that the apps' `tests/setup.ts`
files used to hand-roll (and had let drift), so every app shares one canonical,
drift-free configuration.

Source-first package: `main`/`module`/`types` point at `./src/index.ts` and the
consuming app's Vite transpiles it. There is no build step.

## What it provides

- **`setupReactRouterTest(options?)`** — the opinionated happy path. Registers the
  jest-dom matchers, bakes in `afterEach(cleanup)` (so rendered DOM never leaks
  between tests), installs the jsdom polyfills, and populates `window.env`.
- **`installPolyfills()`** — the jsdom shims component tests rely on:
  `window.matchMedia`, `ResizeObserver`, `Element.prototype.scrollIntoView`, and
  pointer capture. Idempotent; only patches what is missing.
- **`createTestEnv(overrides?)`** — the full `OpenThrottleEnv` with realistic
  localhost defaults, merged with `overrides`.
- **`installTestEnv(overrides?)`** — assigns `createTestEnv(overrides)` onto
  `window.env`.

## Usage

Keep `vitest.config.ts` pointing `setupFiles` at your app's setup file (room to
grow per-app config later):

```ts
// vitest.config.ts
setupFiles: ['./tests/setup.ts'],
```

Then reduce `tests/setup.ts` to one line plus your app's `APP_NAME`:

```ts
// tests/setup.ts
import { setupReactRouterTest } from '@openthrottle/react-router-testing';

setupReactRouterTest({ env: { APP_NAME: 'openthrottle-developer' } });
```

### Options

| Option      | Type                       | Default | Description                                             |
| ----------- | -------------------------- | ------- | ------------------------------------------------------- |
| `env`       | `Partial<OpenThrottleEnv>` | `{}`    | Overrides merged over the realistic localhost defaults. |
| `polyfills` | `boolean`                  | `true`  | All-or-nothing. Set `false` to skip the jsdom shims.    |

### Composing your own setup

If an app ever needs something other than the happy path, compose the escape
hatches directly:

```ts
import {
  createTestEnv,
  installPolyfills,
  installTestEnv,
} from '@openthrottle/react-router-testing';

installPolyfills();
installTestEnv({ APP_NAME: 'openthrottle-admin' });
// const env = createTestEnv({ APP_ENV: 'staging' });
```

## Notes

- `OpenThrottleEnv` is the single source of truth from
  `@openthrottle/react-router-utils`; this package imports it type-only and never
  redeclares it.
- The env defaults are realistic (real localhost ports, not sentinels) so tests
  that assert on constructed URLs keep working, and every key is present/non-empty
  because `getEnvironment()` throws on a missing key.
- App-specific shims that are not shared (e.g. openthrottle-developer's WebGL /
  GradientMesh stubs) intentionally stay in that app's `tests/setup.ts`.
