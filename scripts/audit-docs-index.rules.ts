/**
 * @description Docs that `audit-docs-index.ts` deliberately does not require to
 * be reachable from an index, kept separate from the script so the list can be
 * read and reviewed on its own.
 *
 * Every entry carries a reason. An entry without one is a convention failure,
 * not a valid allowlist item — link the doc from an index instead.
 */
export const ALLOWLIST: readonly string[] = [
  // Slated for deletion by OT c096a2dc task 18303e4a: twelve lines with zero
  // inbound references, pasting what `setup.sh` already prints on completion.
  'docs/Post_Install.md',
];
