/**
 * Selection math for {@link ChatCheckoutSelector}'s multiple mode. Kept out of
 * the component per the repo's component/utils split, and pure so the
 * primary-first invariant can be tested without a DOM.
 *
 * The invariant every caller depends on: index 0 is the PRIMARY checkout — the
 * process `cwd` the agent actually runs in. Everything after it is an
 * additional granted directory.
 */

/**
 * Toggle one checkout in a primary-first selection.
 *
 * Adding appends (so the first pick stays primary), and is refused once the
 * selection is at `maxCheckouts` — the caller renders that row disabled, but
 * the guard lives here so a keyboard activation cannot slip past it. Removing
 * drops the id; removing the primary promotes the next entry, because a
 * selection with secondaries but no primary has no `cwd` to spawn in.
 *
 * @public
 */
export const toggleCheckoutSelection = (
  selectedCheckoutIds: readonly string[],
  checkoutId: string,
  maxCheckouts: number,
): readonly string[] => {
  if (selectedCheckoutIds.includes(checkoutId)) {
    return selectedCheckoutIds.filter((id) => id !== checkoutId);
  }

  if (selectedCheckoutIds.length >= maxCheckouts) {
    return selectedCheckoutIds;
  }

  return [...selectedCheckoutIds, checkoutId];
};
