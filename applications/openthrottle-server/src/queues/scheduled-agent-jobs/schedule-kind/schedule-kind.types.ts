/** Inputs to {@link nextSelfScheduledSlot}. */
export interface NextSelfScheduledSlotInput {
  /**
   * When the previous fire finished, for an interval schedule. Null means none is known (a new
   * schedule, or the chain was broken by a crash), and the interval counts from `now`.
   */
  readonly lastFinishedAt: Date | null;
  readonly now: Date;
}
