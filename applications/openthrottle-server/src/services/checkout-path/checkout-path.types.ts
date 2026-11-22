/** A checkout to resolve, scoped to the user who owns the row referencing it. */
export interface ResolveCheckoutPathInput {
  readonly checkoutId: string;
  /**
   * Owner of the row referencing the checkout. Null for system-seeded rows, which have no
   * owning user to scope by; the referencing row is then treated as authoritative (the documented
   * use of `findCheckoutById`).
   */
  readonly ownerUserId: string | null;
}

/**
 * Either the resolved directory (this process's view, see `toContainerPath`), or `not-found` when
 * the checkout does not exist or is not the owner's. Deliberately a result union rather than a
 * throw: the schedule write path turns it into a BadRequestException, the worker degrades to the
 * payload fallback, and the chat resolver answers with its own message.
 */
export type ResolveCheckoutPathResult =
  { readonly error: 'not-found' } | { readonly path: string };

/** A run's workspace reference, as a launcher receives it from its caller. */
export interface ResolveRunWorkspaceInput {
  /**
   * The user enqueuing the run. A checkout or repository reference is resolved only for an
   * authenticated user: unlike {@link ResolveCheckoutPathInput.ownerUserId} there is no system
   * fallback, because the request is the only authority for which checkout it may use.
   */
  readonly actorUserId: string | null | undefined;
  readonly checkoutId: string | null | undefined;
  readonly repositoryId: string | null | undefined;
}

/** A workspace reference resolved to one owned checkout. */
export interface ResolvedRunWorkspace {
  readonly checkoutId: string;
  /**
   * The checkout's host-truthful `filesystemPath`. Job payloads store this form: they cross the
   * host/container boundary, and their consumers translate at use (`getWorkflowConfigCwd`).
   */
  readonly hostPath: string;
  readonly kind: 'resolved';
  /** {@link hostPath} translated to where it lives in this process. Spawn here. */
  readonly processPath: string;
  readonly repositoryId: string;
}

/** Neither a checkoutId nor a repositoryId was given; the caller falls back to its raw path. */
export interface NoRunWorkspaceReference {
  readonly kind: 'no-reference';
}

/** The reference was given but cannot be used. `message` is user-facing; surface it verbatim. */
export interface RunWorkspaceRejected {
  readonly kind: 'rejected';
  readonly message: string;
  readonly reason:
    | 'checkout-not-found'
    | 'multiple-checkouts'
    | 'no-checkout'
    | 'unauthenticated';
}

export type ResolveRunWorkspaceResult =
  NoRunWorkspaceReference | ResolvedRunWorkspace | RunWorkspaceRejected;
