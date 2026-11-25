/** @description What trust is resolved for: the directory the agent spawns in, and who owns the run. */
export interface ResolveAgentConfigTrustParams {
  /**
   * The checkout the run targets, when it names one. Its row's flag decides trust; when null the
   * owner's row for `directory` does, if there is one.
   */
  readonly checkoutId: string | null;
  /** The directory the agent CLI spawns in. */
  readonly directory: string;
  /**
   * Loads the user the run acts for; null for system rows, which only a targeted checkout id can
   * trust. Called only when the directory is not OpenThrottle's own, so a trusted run reads nothing.
   */
  readonly loadOwnerUserId: () => Promise<string | null>;
}
