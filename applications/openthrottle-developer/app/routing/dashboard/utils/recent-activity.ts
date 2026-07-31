import type { DashboardActivityCardFragment } from '~/__generated__/graphql';

/**
 * @description Row-building and labeling helpers for the dashboard's recent
 * activity table. Hoisted out of DashboardRecentActivity per
 * component-primitive-shape R4 so they are discoverable and independently
 * testable.
 */

export type ActivityRow = {
  date: string;
  description: string;
  id: string;
  planId?: string;
  planTitle: string | null;
  repo?: string;
  sha?: string;
  status: string | null;
  taskId?: string | null;
  taskTitle: string | null;
  type: 'commit' | 'output' | 'task';
};

export function toActivityRows(
  data: DashboardActivityCardFragment,
): ActivityRow[] {
  const rows: ActivityRow[] = [];

  for (const c of data.commits) {
    rows.push({
      date: c.createdAt,
      description: c.message ?? '',
      id: c.id,
      planId: c.planId,
      planTitle: c.planTitle ?? null,
      repo: c.repo,
      sha: c.sha,
      status: null,
      taskId: c.taskId ?? null,
      taskTitle: c.taskTitle ?? null,
      type: 'commit',
    });
  }

  for (const o of data.outputChunks) {
    rows.push({
      date: o.createdAt,
      description: o.content?.slice(0, 80) ?? '',
      id: o.id,
      planId: o.planId,
      planTitle: o.planTitle ?? null,
      status: null,
      taskTitle: null,
      type: 'output',
    });
  }

  for (const t of data.tasksUpdated) {
    rows.push({
      date: t.updatedAt,
      description: t.title ?? '',
      id: t.id,
      planId: t.planId,
      planTitle: t.planTitle ?? null,
      status: t.status,
      taskId: t.id,
      taskTitle: null,
      type: 'task',
    });
  }

  rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return rows.slice(0, 20);
}

/**
 * @description Builds human-readable Plan column content: repo, task context, and/or message.
 */
export function planCellContent(row: ActivityRow): string {
  if (row.type === 'commit') {
    const parts = [
      row.repo,
      row.taskTitle ??
        row.description ??
        (row.sha ? `sha ${row.sha.slice(0, 7)}` : undefined),
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(' — ') : '—';
  }

  if (row.type === 'output') {
    return row.planTitle != null ? `Output: ${row.planTitle}` : '—';
  }

  const parts = [row.planTitle, row.description].filter(Boolean);

  return parts.length > 0 ? parts.join(' — ') : '—';
}

/**
 * @description Builds plan or task detail URL for activity rows that have planId (and optional taskId).
 */
export function activityDetailHref(row: ActivityRow): string | null {
  if (row.planId == null) return null;
  const base = `/plans/${row.planId}`;

  if (row.taskId != null && row.taskId !== '') {
    return `${base}#task-${row.taskId}`;
  }

  return base;
}

/**
 * @description Accessible label for commit link: plan or task context.
 */
export function commitLinkAriaLabel(row: ActivityRow): string {
  const target = row.taskId ? 'task' : 'plan';
  const repo = row.repo ?? '';
  const context =
    row.taskTitle ?? (row.description ? row.description.slice(0, 40) : '');

  return `View ${target}${repo ? ` for ${repo}` : ''}${context ? `: ${context}` : ''}`;
}

/**
 * @description Accessible label for task-updated row link to task detail.
 */
export function taskLinkAriaLabel(row: ActivityRow): string {
  const title = row.description ? row.description.slice(0, 50) : 'task';

  return `View task: ${title}`;
}

/**
 * @description Accessible label for output chunk row link to plan detail.
 */
export function outputLinkAriaLabel(row: ActivityRow): string {
  const plan = row.planTitle ?? 'plan';
  const preview = row.description ? `: ${row.description.slice(0, 40)}` : '';

  return `View plan ${plan}${preview}`;
}
