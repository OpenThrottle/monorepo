/**
 * @description Whether a usage-limited run is continued automatically. `resume` carries how long to
 * delay the continuation job; `hold` carries a human-readable reason that is shown to the user.
 */
export type UsageLimitResumeDecision =
  | { readonly delayMs: number; readonly kind: 'resume' }
  | { readonly kind: 'hold'; readonly reason: string };
