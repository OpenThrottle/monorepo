import { REPOSITORIES_TABLE_COPY } from '~/routing/settings/repositories/data/data.copy';
import type { RepositoryCheckoutRow } from '~/routing/settings/repositories/data/types';

/** One badge to render: a label plus the hover text that explains what it means. */
export interface WorktreeBadge {
  id: string;
  label: string;
  title: string;
  /** Activity badges are the loudest signal; registration is secondary. */
  tone: 'activity' | 'registration';
}

const ACTIVITY_BADGES = {
  DIRTY: {
    label: REPOSITORIES_TABLE_COPY.worktreeActivityDirty,
    title: REPOSITORIES_TABLE_COPY.worktreeActivityDirtyTitle,
  },
  IDLE: {
    label: REPOSITORIES_TABLE_COPY.worktreeActivityIdle,
    title: REPOSITORIES_TABLE_COPY.worktreeActivityIdleTitle,
  },
  RUNNING: {
    label: REPOSITORIES_TABLE_COPY.worktreeActivityRunning,
    title: REPOSITORIES_TABLE_COPY.worktreeActivityRunningTitle,
  },
} as const;

/**
 * @description Derive the worktree badges for a row: its activity (only when the
 * server actually classified this path — a row with no `activity` was not found on
 * disk by the last scan and gets no badge rather than a misleading "Idle"), plus a
 * marker when the worktree is not registered.
 *
 * Presentation-free by design, mirroring `deriveCheckoutInspectionBadges`: the
 * component renders whatever this returns and holds no label logic of its own.
 */
export const deriveWorktreeBadges = (
  row: RepositoryCheckoutRow,
): WorktreeBadge[] => {
  const badges: WorktreeBadge[] = [];

  if (row.activity != null) {
    const activity = ACTIVITY_BADGES[row.activity];
    badges.push({
      id: `activity-${row.activity}`,
      label: activity.label,
      title: activity.title,
      tone: 'activity',
    });
  }

  if (row.unregistered) {
    badges.push({
      id: 'unregistered',
      label: REPOSITORIES_TABLE_COPY.unregisteredBadge,
      title: REPOSITORIES_TABLE_COPY.unregisteredBadgeTitle,
      tone: 'registration',
    });
  }

  return badges;
};
