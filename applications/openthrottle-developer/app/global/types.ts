/**
 * @description Shared types for the global area. Hook-adjacent shapes that
 * used to be exported from `hooks/` files live here (hook-primitive-shape H2).
 */

import type { DocsFeatureFlagKey } from '~/global/config/docs-feature-flags';

/** Flips a single docs feature flag, persisting the merged result. */
export type SetDocsFeatureFlag = (
  key: DocsFeatureFlagKey,
  enabled: boolean,
) => void;

/** How `formatDateTime` renders a date. */
export interface FormatDateTimeOptions {
  /** A pinned IANA zone (`UTC`), or `undefined` for the viewer's local zone. */
  readonly timeZone: string | undefined;
  /** Append the short zone name (`PDT`). */
  readonly withTimeZoneName: boolean;
}

/** Setter returned by `usePersistentSetting`: a value or a functional updater. */
export type PersistentSettingSetter<T> = (next: T | ((prev: T) => T)) => void;

/**
 * Resolves a toast message from an action result: either a static string or a
 * function deriving the message from the result (returning a falsy value to
 * suppress the toast).
 */
export type ToastMessage<TResult> =
  string | ((result: TResult) => string | null | undefined);
