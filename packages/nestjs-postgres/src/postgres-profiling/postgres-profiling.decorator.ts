import {
  explainCapturedQueriesInBackground,
  selectQueriesToExplain,
} from './explain-runner/explain-runner.utils.ts';
import { trackPostgresProfiling } from './explain-tracking/explain-tracking.utils.ts';
import {
  copyMethodMetadata,
  resolveClassName,
  resolveQueryManager,
} from './instance/instance.utils.ts';
import {
  POSTGRES_PROFILING_LOGGER,
  POSTGRES_PROFILING_LOGGER_CONTEXT,
} from './postgres-profiling.constants.ts';
import type { PostgresProfilingMethodOverrides } from './postgres-profiling.types.ts';
import { runWithQueryCapture } from './query-capture/query-capture.utils.ts';
import {
  isProfilingTarget,
  readPostgresProfilingSettings,
} from './settings/settings.utils.ts';
import { logPostgresProfilingStartupOnce } from './startup-log/startup-log.utils.ts';

/**
 * @public
 * @description Profiles the SQL an async repository method issues by running `EXPLAIN`
 * on each explainable statement it executed, and sending the plans to the sink chosen by
 * `POSTGRES_PROFILING_MODE` (the Winston logger by default, or JSON files under
 * `POSTGRES_PROFILING_OUTPUT_DIR`, which defaults to `<cwd>/.postgres-profiling`).
 *
 * Nothing happens unless `POSTGRES_PROFILING=true`, and then only for methods whose
 * `Class.method` matches `POSTGRES_PROFILING_TARGETS` (unset or empty targets everything,
 * `*` matches either side). `Class` is the runtime class name, so a subclass is matched by
 * its own name. Settings are read on every call.
 *
 * Plans are estimates by default: costs and row counts come from the planner. With
 * `POSTGRES_PROFILING_ANALYZE=true`, plain `SELECT` statements (no `WITH`, locking clause
 * or `INTO`) use `EXPLAIN ANALYZE` instead, which adds real timings, actual row counts and
 * buffer usage. ANALYZE executes the statement again, so a `SELECT` that calls a volatile
 * or side-effecting function runs it twice. Every other statement stays estimate-only, and
 * `{ analyze: false }` keeps a single method estimate-only too.
 *
 * `POSTGRES_PROFILING_MIN_DURATION_MS` skips calls that finish faster than the threshold.
 * The duration measured is the whole decorated method, covering every statement it ran,
 * and that check happens before the dedupe check. A statement is explained at most once per
 * `POSTGRES_PROFILING_DEDUPE_SECONDS` (default 300, `0` explains every execution), keyed
 * by `Class.method` plus the SQL text.
 *
 * The explains run in the background, one after another, once the method has settled. The
 * method returns or throws without waiting for them, so a plan can show up slightly after
 * the call returns. They use `this.repository.manager`, not the caller's transaction, so
 * an ANALYZE run may see changes committed since the method ran, or miss uncommitted ones.
 * A failing explain is logged as a warning and never changes the method's result or error.
 * If the instance has no `repository.manager`, a warning is logged once per method.
 *
 * @param overrides - Per-method options; only `analyze: false` is accepted, because
 * ANALYZE can never be forced on for a method
 */
export function PostgresProfiling(
  overrides: PostgresProfilingMethodOverrides = {},
): MethodDecorator {
  return function (
    _target: unknown,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const originalMethod: unknown = descriptor.value;

    if (typeof originalMethod !== 'function') {
      return descriptor;
    }

    const methodName = String(propertyKey);
    let hasWarnedMissingManager = false;

    const wrappedMethod = async function (
      this: unknown,
      ...args: unknown[]
    ): Promise<unknown> {
      const settings = readPostgresProfilingSettings();

      if (!settings.enabled) {
        return Reflect.apply(originalMethod, this, args);
      }

      const className = resolveClassName(this);

      logPostgresProfilingStartupOnce(POSTGRES_PROFILING_LOGGER, settings);

      if (!isProfilingTarget(settings, className, methodName)) {
        return Reflect.apply(originalMethod, this, args);
      }

      const startedAtMs = performance.now();
      const capture = await runWithQueryCapture(() => {
        return Reflect.apply(originalMethod, this, args);
      });
      const durationMs = performance.now() - startedAtMs;
      const manager = resolveQueryManager(this);

      if (manager) {
        trackPostgresProfiling(
          explainCapturedQueriesInBackground(
            settings,
            overrides,
            manager,
            selectQueriesToExplain(
              settings,
              capture.queries,
              className,
              methodName,
              durationMs,
            ),
            className,
            methodName,
            durationMs,
          ),
        );
      } else if (!hasWarnedMissingManager) {
        hasWarnedMissingManager = true;
        POSTGRES_PROFILING_LOGGER.warn(
          `Skipping explain for ${methodName}: the instance has no repository.manager.`,
          { context: POSTGRES_PROFILING_LOGGER_CONTEXT },
        );
      }

      // Compared to `false` explicitly: `!capture.ok` does not narrow for consumers
      // compiled without strictNullChecks.
      if (capture.ok === false) {
        throw capture.error;
      }

      return capture.value;
    };

    Object.defineProperty(wrappedMethod, 'name', {
      configurable: true,
      value: originalMethod.name,
    });
    copyMethodMetadata(originalMethod, wrappedMethod);
    descriptor.value = wrappedMethod;

    return descriptor;
  };
}
