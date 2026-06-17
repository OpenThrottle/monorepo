/**
 * Schedule-X v4 references `globalThis.Temporal` directly (it does not import
 * temporal-polyfill itself), so the global polyfill must be installed before any
 * calendar is created. Importing this module for its side effect installs
 * `globalThis.Temporal`, `Intl.DateTimeFormat` extensions, and
 * `Date.prototype.toTemporalInstant`. It is a no-op in runtimes that ship a
 * native Temporal implementation.
 */
import 'temporal-polyfill/global';

/**
 * Truthy marker confirming that importing this module installed the Temporal
 * global polyfill. Import this module (or reference this marker) exactly once,
 * as early as possible, before constructing a Schedule-X calendar — the
 * `<Calendar>` component does this for consumers.
 *
 * @publicApi
 */
export const TEMPORAL_POLYFILL_INSTALLED = true;
