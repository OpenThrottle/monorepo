# @openthrottle/react-router-testing — agent notes

The single shared Vitest setup for the React Router apps: jsdom polyfills, the `window.env`
fixture, and a baked-in `afterEach(cleanup)`. Each app's `tests/setup.ts` is one
`setupReactRouterTest({ env: { APP_NAME: '<app>' } })` call.

**Consumed by:** all four RR apps (`openthrottle-developer`, `-admin`, `-email`, `-website`)
plus `react-router-ide`, `react-router-scheduling`, `react-router-ui-global`,
`react-router-floor-layout` (dev-time). **Any change here changes every app's suite at once** —
run the consuming apps' tests, not just this package's.

## Layout

- [src/setup.ts](src/setup.ts) — `setupReactRouterTest(options)`: jest-dom matchers, `afterEach(cleanup)`, polyfills, `window.env`.
- [src/polyfills.ts](src/polyfills.ts) — `installPolyfills` / `uninstallPolyfills`: matchMedia, ResizeObserver, `scrollIntoView`, pointer capture.
- [src/env.ts](src/env.ts) — `DEFAULT_TEST_ENV` fixture + `createTestEnv` / `installTestEnv`.
- [src/router-context.ts](src/router-context.ts) — `createTestRouterContext()` for loader/action unit tests (React Router types `context` as `RouterContextProvider`; `{}` no longer typechecks).

## Invariants & gotchas

- Source-first, no build target — see [packages/AGENTS.md](../AGENTS.md).
- `DEFAULT_TEST_ENV` is deliberately `Required<OpenThrottleEnv>`: adding **any** key to
  `OpenThrottleEnv` (in `react-router-utils`) breaks this fixture at compile time. Update it here in
  the same change, with a realistic non-sentinel value — `getEnvironment()` throws on missing keys
  and tests assert on constructed URLs (API `:6021`, sibling apps `:6022–6027`). A length assertion
  in [src/env.test.ts](src/env.test.ts) backstops the key count.
- `OpenThrottleEnv` is imported **type-only** from `@openthrottle/react-router-utils`; never
  redeclare it here.
- Polyfills are guarded and idempotent but patch process-global state permanently for the worker;
  the apps' vmForks isolation gives each test file a fresh baseline. `uninstallPolyfills` exists for
  the rare in-file opt-out.
- The `ResizeObserver` shim reports zero size by default (recharts/Schedule-X render no geometry);
  `setupReactRouterTest({ resizeObserverSize })` opts a suite into non-zero geometry.
- Apps must **not** re-add these shims in their own `tests/setup.ts` — that file is for genuinely
  app-specific stubs only (e.g. openthrottle-developer's WebGL/GradientMesh stubs).
- Peer dependency on `react-router` (for `createTestRouterContext`).
- Note: several UI packages (`react-router-shadcn`, `-ui`, `-chat`) intentionally hand-roll their own
  `vitest.setup.ts` instead of using this package — don't "fix" them by switching without checking
  their package-specific stubs.

## Pointers

- [README.md](README.md) — options table, escape hatches (`installPolyfills` / `createTestEnv` / `installTestEnv`), usage pattern.
- [../AGENTS.md](../AGENTS.md) — source-first pattern, `@public` tags.
