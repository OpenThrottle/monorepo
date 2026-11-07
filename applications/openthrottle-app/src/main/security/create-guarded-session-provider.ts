export interface GuardedSessionProviderOptions<TSession> {
  readonly fromPartition: (partition: string) => TSession;
  /** Installs the permission handlers on one session. */
  readonly install: (session: TSession) => void;
}

/**
 * @description Returns the session for a partition and guarantees the security
 * guards were installed on it first, exactly once per partition. Permission
 * handlers are per session, so a partition created without going through
 * here would silently fall back to Electron's allow-by-default.
 */
export const createGuardedSessionProvider = <TSession>(
  options: GuardedSessionProviderOptions<TSession>,
): ((partition: string) => TSession) => {
  const { fromPartition, install } = options;
  const guarded = new Set<string>();

  return (partition: string): TSession => {
    const session = fromPartition(partition);

    if (!guarded.has(partition)) {
      install(session);
      guarded.add(partition);
    }

    return session;
  };
};
