/**
 * Per-driver ceiling on how many checkouts one turn may hold in context.
 *
 * This is the ENFORCEMENT half of the cap the composer advertises. The client
 * gate (`ChatBackendCapabilities.maxRepositories`) is UX — it stops a user
 * picking a third repository for a CLI that cannot use one. This one is the
 * real boundary: the resolver applies it to the client's array before anything
 * is spawned, so a bypassed or drifted client cannot grant a CLI directories it
 * will silently drop.
 *
 * It lives here rather than beside the descriptors because the honest source of
 * truth is the adapter: a backend may exceed one only if its argv builder emits
 * a repeatable directory flag.
 */

/** A backend with no additional-directory concept runs in its cwd alone. */
const SINGLE_DIRECTORY_CAP = 1;

/**
 * Backends whose argv builder emits a repeatable `--add-dir`, and the ceiling
 * each is allowed. Keep this in step with the per-driver `maxRepositories` the
 * composer advertises — a backend listed here but capped at 1 client-side just
 * never receives extra directories, while the reverse would let the UI promise
 * something the adapter drops on the floor.
 */
const ADDITIONAL_DIRECTORY_CAPS: Readonly<Record<string, number>> = {
  antigravity: 4,
  claude: 4,
};

/**
 * How many checkouts `backend` may receive, primary included. Unknown backends
 * get the conservative single-directory cap.
 *
 * @public
 */
export const maxDirectoriesForBackend = (backend: string): number =>
  ADDITIONAL_DIRECTORY_CAPS[backend] ?? SINGLE_DIRECTORY_CAP;

/**
 * Warn that `backend` was handed extra directories it cannot grant, and ignore
 * them.
 *
 * Reaching this is not routine: the server caps the array per driver before the
 * spawn, so a populated list here means a client bypassed the UI gate or the
 * two caps have drifted apart. Loud-but-harmless is the right posture — the
 * turn still runs in its cwd, but the drop is never silent.
 *
 * @public
 */
export const warnUnsupportedAdditionalDirectories = (
  backend: string,
  additionalDirectories: readonly string[] | undefined,
  warn: (message: string) => void = console.warn,
): void => {
  if (
    additionalDirectories === undefined ||
    additionalDirectories.length === 0
  ) {
    return;
  }

  warn(
    `The ${backend} backend has no additional-directory flag; ignoring ${additionalDirectories.length} extra granted director${additionalDirectories.length === 1 ? 'y' : 'ies'}.`,
  );
};
