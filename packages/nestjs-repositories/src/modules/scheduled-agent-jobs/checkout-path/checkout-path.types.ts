/** A checkout to resolve, scoped to the schedule's owner. */
export interface ResolveScheduledAgentJobCheckoutPathInput {
  readonly checkoutId: string;
  /**
   * Owner of the schedule referencing the checkout. Null for system-seeded rows, which have no
   * owning user to scope by; the referencing row is then treated as authoritative (the documented
   * use of `findById`).
   */
  readonly ownerUserId: string | null;
}

/**
 * Either the resolved directory, or `not-found` when the checkout does not exist or is not the
 * owner's. Deliberately a result union rather than a throw: the write path turns it into a
 * BadRequestException, while the worker degrades to the payload fallback.
 */
export type ResolveScheduledAgentJobCheckoutPathResult =
  { readonly error: 'not-found' } | { readonly path: string };
