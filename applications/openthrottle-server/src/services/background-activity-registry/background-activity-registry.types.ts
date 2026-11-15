/**
 * @description Types for the background-activity registry (OT plan 5767e798).
 */

import type {
  BACKGROUND_ACTIVITY_KINDS,
  BACKGROUND_ACTIVITY_STATUSES,
} from './background-activity-registry.constants.ts';

export type BackgroundActivityKind =
  (typeof BACKGROUND_ACTIVITY_KINDS)[keyof typeof BACKGROUND_ACTIVITY_KINDS];

export type BackgroundActivityStatus =
  (typeof BACKGROUND_ACTIVITY_STATUSES)[keyof typeof BACKGROUND_ACTIVITY_STATUSES];

/** @description What a producer passes to open (or re-touch) an activity. */
export interface StartBackgroundActivityInput {
  readonly id: string;
  readonly kind: BackgroundActivityKind;
  readonly label: string;
  /** Units of work known up front; null when the size is unknown (an indeterminate bar). */
  readonly total: number | null;
}

/** @description One activity as stored, before any derived value is computed. */
export interface BackgroundActivityRecord {
  readonly done: number;
  readonly id: string;
  readonly kind: BackgroundActivityKind;
  readonly label: string;
  /** Epoch ms of the last reported progress (or of the start, before any). */
  readonly progressedAt: number;
  /** Epoch ms the backlog was first seen. */
  readonly startedAt: number;
  readonly total: number | null;
}

/** @description `done` as it stood at `at` (epoch ms). */
export interface BackgroundActivitySample {
  readonly at: number;
  readonly done: number;
}

/** @description One activity as the query serves it. */
export interface BackgroundActivitySnapshot {
  /** Clamped to `total`, which producers may overshoot. */
  readonly done: number;
  /** Seconds left at the smoothed rate; null until there is enough signal, or with no total. */
  readonly etaSeconds: number | null;
  readonly id: string;
  readonly kind: BackgroundActivityKind;
  readonly label: string;
  readonly startedAt: Date;
  readonly status: BackgroundActivityStatus;
  readonly total: number | null;
}

/** @description `done` and `total` after a progress report; null when the activity is not tracked. */
export interface BackgroundActivityProgress {
  readonly done: number;
  readonly total: number | null;
}
