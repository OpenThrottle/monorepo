/**
 * @description Group ordering, labels and the collapse threshold for
 * {@link LinkedArtifactsPanel}. These are presentation data, not logic, so they
 * live here per the component/data boundary rule rather than inline in the
 * component.
 */

/**
 * Artifact types in descending human value. The point of the ordering is that
 * the things a person came to the tab for — what shipped, what is in review —
 * are above the fold, and the high-volume transition log is last.
 *
 * Types absent from this list are unrecognized (the registry is open by design)
 * and sort alphabetically after everything named here.
 */
export const LINKED_ARTIFACT_GROUP_ORDER: readonly string[] = [
  'git_commit',
  'pull_request',
  'deployment',
  'document',
  'plan_promotion',
  'status_change',
];

/** Human labels per group; an unrecognized type falls back to its raw name. */
export const LINKED_ARTIFACT_GROUP_LABELS: Readonly<Record<string, string>> = {
  deployment: 'Deployments',
  document: 'Documents',
  git_commit: 'Commits',
  plan_promotion: 'Promotions',
  pull_request: 'Pull requests',
  status_change: 'Status changes',
};

/**
 * Groups larger than this render collapsed. A real plan carries 30+
 * status_change rows whose only distinguishing content was a raw uuid key —
 * that wall is what pushed the commits and PRs off the screen.
 */
export const LINKED_ARTIFACT_COLLAPSE_THRESHOLD = 5;

/**
 * Types that always collapse regardless of count. `status_change` is an
 * append-only event log: it is context, never the headline.
 */
export const LINKED_ARTIFACT_ALWAYS_COLLAPSED: readonly string[] = [
  'status_change',
];

/** Rows shown as a preview while a collapsed group is closed. */
export const LINKED_ARTIFACT_COLLAPSED_PREVIEW_COUNT = 2;
