import { MissingWorktreeCheckoutReason } from '~/__generated__/graphql';
import {
  REPOSITORIES_TABLE_COPY,
  WORKTREE_REMOVAL_OUTCOME_COPY,
} from '~/routing/settings/repositories/data/data.copy';
import type {
  RepositoryCheckoutRow,
  WorktreeRemoval,
} from '~/routing/settings/repositories/types';

/** One badge to render: a label plus the hover text that explains what it means. */
export interface WorktreeBadge {
  id: string;
  label: string;
  title: string;
  /**
   * Activity badges are the loudest signal; registration is secondary. `missing` outranks both: a
   * row the scan could not find has no activity to report at all.
   */
  tone: 'activity' | 'cleanup' | 'missing' | 'registration';
}

/**
 * Badge colour per tone. Missing is red because it is the only state that asks for cleanup; the
 * rest keep the colours the table already used.
 */
export const WORKTREE_BADGE_COLORS = {
  activity: 'green',
  cleanup: 'slate',
  missing: 'red',
  registration: 'orange',
} as const satisfies Record<WorktreeBadge['tone'], string>;

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
 * The third state, distinct from both RUNNING and IDLE: something claims this worktree, but
 * nothing verifies the claim. Kept beside {@link ACTIVITY_BADGES} rather than inside it because
 * it is not a fourth activity value — it is how much to trust the RUNNING one.
 */
const UNVERIFIED_RUNNING_BADGE = {
  label: REPOSITORIES_TABLE_COPY.worktreeActivityUnverified,
  title: REPOSITORIES_TABLE_COPY.worktreeActivityUnverifiedTitle,
} as const;

/**
 * A GraphQL DateTime as `YYYY-MM-DD HH:MM UTC`, or null when it does not parse. UTC on purpose:
 * the same string renders on the server and in the browser, so it cannot cause a hydration
 * mismatch.
 */
const formatUtcMinute = (value: unknown): string | null => {
  if (typeof value !== 'string' && !(value instanceof Date)) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
};

/** `Label: value`, or null when the value was not reported. */
const labelled = (
  label: string,
  value: string | null | undefined,
): string | null => {
  if (value === null || value === undefined) return null;
  return `${label}: ${value}`;
};

/** The hover text for a removal badge: one fact per line, only the ones that were reported. */
const describeRemoval = (removal: WorktreeRemoval): string => {
  const outcome =
    WORKTREE_REMOVAL_OUTCOME_COPY[removal.outcome] ?? removal.outcome;
  const lines = [
    REPOSITORIES_TABLE_COPY.removalTitleLead,
    labelled(REPOSITORIES_TABLE_COPY.removalResult, removal.result),
    labelled(REPOSITORIES_TABLE_COPY.removalAgentSession, removal.agentSession),
    labelled(REPOSITORIES_TABLE_COPY.removalParent, removal.parentCommand),
    outcome,
  ];
  return lines.filter((line): line is string => line !== null).join('\n');
};

/** The removal badge for a missing row, or null when no usable removal was reported. */
const removalBadge = (
  removal: WorktreeRemoval | null,
): WorktreeBadge | null => {
  if (removal === null) return null;
  const when = formatUtcMinute(removal.removedAt ?? removal.createdAt);
  if (when === null) return null;
  return {
    id: 'last-removal',
    label: REPOSITORIES_TABLE_COPY.removalBadge(when),
    title: describeRemoval(removal),
    tone: 'cleanup',
  };
};

/**
 * @description Derive the worktree badges for a row: its activity (only when the
 * server actually classified this path — a row with no `activity` was not found on
 * disk by the last scan and gets no badge rather than a misleading "Idle"), plus a
 * marker when the worktree is not registered, and one when a registered worktree is
 * missing from disk.
 *
 * Presentation-free by design, mirroring `deriveCheckoutInspectionBadges`: the
 * component renders whatever this returns and holds no label logic of its own.
 */
export const deriveWorktreeBadges = (
  row: RepositoryCheckoutRow,
): WorktreeBadge[] => {
  const badges: WorktreeBadge[] = [];

  if (row.missing) {
    const isNotAWorktree =
      row.missingReason === MissingWorktreeCheckoutReason.NotAWorktree;
    const notAWorktreeTitle =
      REPOSITORIES_TABLE_COPY.missingBadgeTitleNotAWorktree;
    const pathGoneTitle = REPOSITORIES_TABLE_COPY.missingBadgeTitlePathGone;
    badges.push({
      id: 'missing',
      label: REPOSITORIES_TABLE_COPY.missingBadge,
      title: isNotAWorktree ? notAWorktreeTitle : pathGoneTitle,
      tone: 'missing',
    });

    const removal = removalBadge(row.lastRemoval);
    if (removal !== null) badges.push(removal);
  }

  if (row.activity != null) {
    // RUNNING splits in two. An unsupervised run (`runMonitored === false`) holds the worktree
    // on nothing but its own unverified IN_PROGRESS claim, so it must not read identically to a
    // heartbeating run — a worktree stuck "Running" behind a dead agent is exactly the symptom
    // most likely to be reported as a bug against something else entirely.
    const unverified = row.activity === 'RUNNING' && row.runMonitored === false;
    const activity = unverified
      ? UNVERIFIED_RUNNING_BADGE
      : ACTIVITY_BADGES[row.activity];
    badges.push({
      id: unverified
        ? 'activity-RUNNING-unverified'
        : `activity-${row.activity}`,
      label: activity.label,
      title: activity.title,
      tone: 'activity',
    });
  }

  if (row.safeToRemove) {
    badges.push({
      id: 'safe-to-remove',
      label: REPOSITORIES_TABLE_COPY.safeToRemoveBadge,
      title: REPOSITORIES_TABLE_COPY.safeToRemoveBadgeTitle,
      tone: 'cleanup',
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
