/**
 * @description Shared count/bucket shapes for the plan, task, and skill-usage
 * metric families (`lib/plan-metrics.ts`, `lib/task-metrics.ts`,
 * `lib/skill-usage-metrics.ts`). Every field here is a label plus a count —
 * never a title, description, summary, or requirements value.
 */

/** One category bucket and how many rows fall in it. */
export interface CategoryCount {
  readonly category: string;
  readonly count: number;
}

/** One free-form label (e.g. a hook name, agent type, privacy level, or outcome) and its count. */
export interface LabelCount {
  readonly count: number;
  readonly label: string;
}

/** One status bucket and how many rows fall in it. */
export interface StatusCount {
  readonly count: number;
  readonly status: string;
}

/** One tag slug (vocabulary, not work content) and how many rows carry it. */
export interface TagCount {
  readonly count: number;
  readonly tag: string;
}
