import type { CommanderItem } from '@openthrottle/react-router-ui';
import { queueJobDetailPath } from '~/routing/queues/utils/queue-job-detail-path';

/**
 * @description Matches typical Cortex / RFC UUID strings pasted into the command palette.
 */
export const CORTEX_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const UUID_GROUP =
  '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})';

/**
 * @description Parses `queueId/jobId` or two UUIDs separated by whitespace (common when pasting from logs).
 * @returns Tuple `[queueId, jobId]` or `null` if the string is not a valid pair.
 */
const parseQueueAndJobId = (
  query: string,
): readonly [string, string] | null => {
  const trimmed = query.trim();
  const slash = new RegExp(
    `^\\s*${UUID_GROUP}\\s*\\/\\s*${UUID_GROUP}\\s*$`,
    'i',
  );
  const m1 = trimmed.match(slash);
  if (m1?.[1] && m1[2]) {
    return [m1[1], m1[2]];
  }
  const spaced = new RegExp(`^\\s*${UUID_GROUP}\\s+${UUID_GROUP}\\s*$`, 'i');
  const m2 = trimmed.match(spaced);
  if (m2?.[1] && m2[2]) {
    return [m2[1], m2[2]];
  }
  return null;
};

/**
 * @description Extra commander rows when the palette filter matches no static commands: debug jumps and search escape.
 * @param navigate - React Router navigate from {@link useNavigate}
 */
export const buildCommanderEmptyStateExtras = (
  query: string,
  navigate: (to: string) => void,
): readonly CommanderItem[] => {
  const q = query.trim();
  if (q.length === 0) {
    return [];
  }

  const queueJob = parseQueueAndJobId(q);
  if (queueJob) {
    const [queueId, jobId] = queueJob;
    return [
      {
        id: `jump-queue-job-${queueId}-${jobId}`,
        label: `Open queue job (${queueId.slice(0, 8)}… / ${jobId.slice(0, 8)}…)`,
        onSelect: () => {
          navigate(queueJobDetailPath(queueId, jobId));
        },
        value: `${q} open queue job`,
      },
    ];
  }

  if (CORTEX_UUID_PATTERN.test(q)) {
    const preview = q.slice(0, 8);
    return [
      {
        id: `jump-plan-${q}`,
        label: `Open plan (${preview}…)`,
        onSelect: () => {
          navigate(`/plans/${q}`);
        },
        value: `${q} open plan`,
      },
      {
        id: `jump-queue-${q}`,
        label: `Open queue (${preview}…)`,
        onSelect: () => {
          navigate(`/queues/${q}`);
        },
        value: `${q} open queue`,
      },
      {
        id: `jump-generator-${q}`,
        label: `Open generator (${preview}…)`,
        onSelect: () => {
          navigate(`/generators/${q}`);
        },
        value: `${q} open generator`,
      },
      {
        id: `jump-search-uuid-${q}`,
        label: `Search workspace for “${preview}…” (tasks, plans, chunks)`,
        onSelect: () => {
          navigate(`/search?q=${encodeURIComponent(q)}`);
        },
        value: `${q} search workspace uuid`,
      },
    ];
  }

  return [];
};
