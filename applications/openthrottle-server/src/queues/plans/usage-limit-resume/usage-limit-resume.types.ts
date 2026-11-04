/**
 * @description What became of a usage-limited run: continued later (`resumed`), parked for a human
 * (`held`), or left alone because something else already decided the plan's fate (`skipped`).
 * `message` is the user-facing notification text.
 */
export interface UsageLimitHandling {
  readonly message: string;
  readonly outcome: 'held' | 'resumed' | 'skipped';
}
