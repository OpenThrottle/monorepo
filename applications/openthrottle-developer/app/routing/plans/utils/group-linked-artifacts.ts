/**
 * @description Group artifact rows by `type` for {@link LinkedArtifactsPanel}.
 *
 * Ordering is by human value (see `LINKED_ARTIFACT_GROUP_ORDER`), with
 * unrecognized types alphabetical after the known ones — the registry is open
 * by design, so a type this build has never heard of still gets a group rather
 * than disappearing.
 *
 * Rows within a group stay newest-first via the existing `toMillis` comparator.
 */

import {
  LINKED_ARTIFACT_ALWAYS_COLLAPSED,
  LINKED_ARTIFACT_COLLAPSE_THRESHOLD,
  LINKED_ARTIFACT_GROUP_LABELS,
  LINKED_ARTIFACT_GROUP_ORDER,
} from '~/routing/plans/data/linked-artifacts-panel-groups';
import { toMillis } from '~/routing/plans/utils/linked-artifacts-panel';

export interface GroupableArtifact {
  producedAt: number | string;
  type: string;
}

export interface LinkedArtifactGroupModel<T extends GroupableArtifact> {
  /** True when this group should render closed on first paint. */
  collapsedByDefault: boolean;
  count: number;
  label: string;
  rows: T[];
  type: string;
}

/** Position in the curated order; unranked types sort after all ranked ones. */
const rankOf = (type: string): number => {
  const index = LINKED_ARTIFACT_GROUP_ORDER.indexOf(type);
  return index === -1 ? LINKED_ARTIFACT_GROUP_ORDER.length : index;
};

const labelOf = (type: string): string =>
  LINKED_ARTIFACT_GROUP_LABELS[type] ?? type;

const isCollapsedByDefault = (type: string, count: number): boolean =>
  LINKED_ARTIFACT_ALWAYS_COLLAPSED.includes(type) ||
  count > LINKED_ARTIFACT_COLLAPSE_THRESHOLD;

/**
 * @description Bucket artifacts into ordered, counted groups.
 * @public
 */
export const groupLinkedArtifacts = <T extends GroupableArtifact>(
  artifacts: readonly T[],
): LinkedArtifactGroupModel<T>[] => {
  const buckets = new Map<string, T[]>();

  for (const artifact of artifacts) {
    const bucket = buckets.get(artifact.type);

    if (bucket === undefined) {
      buckets.set(artifact.type, [artifact]);
    } else {
      bucket.push(artifact);
    }
  }

  return [...buckets.entries()]
    .map(([type, rows]) => ({
      collapsedByDefault: isCollapsedByDefault(type, rows.length),
      count: rows.length,
      label: labelOf(type),
      // Newest first, reusing the shared Date-scalar comparator.
      rows: [...rows].sort(
        (a, b) => toMillis(b.producedAt) - toMillis(a.producedAt),
      ),
      type,
    }))
    .sort((a, b) => {
      const byRank = rankOf(a.type) - rankOf(b.type);
      return byRank === 0 ? a.type.localeCompare(b.type) : byRank;
    });
};
