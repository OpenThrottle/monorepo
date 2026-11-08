export type TimelineLane = {
  readonly key: string;
  readonly label: string;
};

/**
 * The facts a row can be grouped by. Every field is optional because no single
 * source carries all of them — a task has a plan but no backend, a grilling
 * event has a branch but no plan.
 */
export type TimelineLaneFacts = {
  readonly backend?: string | null;
  readonly branch?: string | null;
  readonly checkoutId?: string | null;
  readonly planId?: string | null;
  readonly planTitle?: string | null;
};

/** Rows that belong in a fixed lane regardless of what facts they carry. */
export type TimelineLaneOverride = 'scheduled' | 'skills' | null;
