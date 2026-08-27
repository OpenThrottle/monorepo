import {
  parseRepositoryRemote,
  shortenFilesystemPath,
} from './repository-identity';
import type { ChatCheckoutOption } from '../types';

/** What to render for one checkout, resolved against the whole list. @public */
export interface ChatCheckoutDescriptor {
  readonly id: string;
  /**
   * The row's primary text — always the bare display name. Rows sit under an
   * owner heading and carry their own {@link qualifier}, so promoting the name
   * here would only duplicate what is already on screen.
   */
  readonly label: string;
  /**
   * Muted secondary text: `owner/name`, or the shortened filesystem path when
   * there is no remote (or when `owner/name` is itself ambiguous). `undefined`
   * only when the option carries neither remote nor path.
   */
  readonly qualifier?: string;
  /**
   * What the TRIGGER shows once this checkout is the primary selection. The
   * bare name while it is unique in the list; promoted to the qualifier the
   * moment another checkout shares the name, because at that point the name
   * alone no longer tells the user which directory the agent will run in.
   */
  readonly triggerLabel: string;
}

/** Count how many times each value appears, so ambiguity is a lookup not a scan. */
function countBy<T>(
  items: readonly T[],
  key: (item: T) => string,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const value = key(item);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return counts;
}

/**
 * Resolve every checkout's label and qualifier against the FULL list, so
 * disambiguation is content-aware rather than a fixed format. The escalation:
 *
 * 1. Name unique in the list → the trigger shows the bare name.
 * 2. Name shared → the trigger promotes to `owner/name`.
 * 3. `owner/name` also shared (two checkouts of the same repo, e.g. a worktree
 *    beside its primary) → both the trigger and the qualifier fall back to the
 *    shortened filesystem path, which is the only thing left that differs.
 * 4. Nothing to fall back to → the bare name, deliberately ambiguous rather
 *    than throwing. The branch chip and the group heading still carry signal.
 *
 * Returns descriptors in input order — the caller indexes by id, and nothing
 * here depends on Map iteration order.
 *
 * @public
 */
export function describeCheckouts(
  checkouts: readonly ChatCheckoutOption[],
): ChatCheckoutDescriptor[] {
  const identities = checkouts.map((checkout) => {
    const identity = parseRepositoryRemote(checkout.remoteUrl);
    const shortPath =
      checkout.filesystemPath != null && checkout.filesystemPath !== ''
        ? shortenFilesystemPath(checkout.filesystemPath)
        : undefined;

    return {
      checkout,
      ownerName:
        identity === null ? undefined : `${identity.owner}/${identity.name}`,
      shortPath,
    };
  });

  const labelCounts = countBy(identities, ({ checkout }) => checkout.label);
  // Only entries that actually HAVE an owner/name compete for that key, so a
  // pair of remote-less checkouts never looks like an owner collision.
  const ownerNameCounts = countBy(
    identities.filter((entry) => entry.ownerName !== undefined),
    (entry) => entry.ownerName ?? '',
  );

  return identities.map(({ checkout, ownerName, shortPath }) => {
    const labelIsAmbiguous = (labelCounts.get(checkout.label) ?? 0) > 1;
    const ownerNameIsAmbiguous =
      ownerName !== undefined && (ownerNameCounts.get(ownerName) ?? 0) > 1;

    // The qualifier the row shows: owner/name normally, the path when owner/name
    // would not tell two rows apart (or when there is no remote at all).
    const qualifier =
      ownerName !== undefined && !ownerNameIsAmbiguous ? ownerName : shortPath;

    return {
      id: checkout.id,
      label: checkout.label,
      qualifier: qualifier ?? ownerName,
      triggerLabel:
        labelIsAmbiguous && qualifier !== undefined
          ? qualifier
          : checkout.label,
    };
  });
}
