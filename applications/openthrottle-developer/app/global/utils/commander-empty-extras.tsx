import * as React from 'react';
import type { CommanderItem } from '@openthrottle/react-router-ui';
import {
  BotIcon,
  ChartLineIcon,
  ClipboardListIcon,
  LayersIcon,
  MapIcon,
  SearchIcon,
} from 'lucide-react';

/**
 * @description Matches typical OpenThrottle / RFC UUID strings pasted into the command palette.
 */
export const REGEX_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const UUID_GROUP =
  '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})';

const ICON_SM = 'w-3! h-3! shrink-0 opacity-80';

/**
 * @description Fields for root POST `commander-search` (excluding `intent`, added in {@link App}).
 */
export type CommanderSearchFields = {
  readonly id?: string;
  readonly id2?: string;
  readonly jump?: string;
  readonly q?: string;
};

/**
 * @description Handlers for rows built when the palette filter matches no static commands.
 */
interface CommanderEmptyStateExtrasHandlers {
  /**
   * @description Submit debug navigation via root action — same redirect rules as the loader-tested action map.
   */
  readonly submitCommanderSearch: (fields: CommanderSearchFields) => void;
}

/**
 * @description Parses `queueId/jobId` or two UUIDs separated by whitespace (common when pasting from logs).
 * @returns Tuple `[queueId, jobId]` or `null` if the string is not a valid pair.
 */
export const parseQueueAndJobIdsFromCommanderQuery = (
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
 * @description Browse shortcuts when the typed text is not a UUID (palette still shows “no match” for static commands).
 */
const buildNonUuidDebugIndexItems = (
  query: string,
  submit: CommanderEmptyStateExtrasHandlers['submitCommanderSearch'],
): readonly CommanderItem[] => {
  const q = query.trim();
  return [
    {
      icon: <MapIcon aria-hidden={true} className={ICON_SM} />,
      id: 'debug-open-plans-index',
      label: 'Open Plans (browse all)',
      onSelect: () => {
        submit({ jump: 'plans-index' });
      },
      value: `${q} debug plans index`,
    },
    {
      icon: <ChartLineIcon aria-hidden={true} className={ICON_SM} />,
      id: 'debug-open-queues-index',
      label: 'Open Queues (browse all)',
      onSelect: () => {
        submit({ jump: 'queues-index' });
      },
      value: `${q} debug queues index`,
    },
    {
      icon: <BotIcon aria-hidden={true} className={ICON_SM} />,
      id: 'debug-open-generators-index',
      label: 'Open Generators (browse all)',
      onSelect: () => {
        submit({ jump: 'generators-index' });
      },
      value: `${q} debug generators index`,
    },
  ];
};

/**
 * @description Extra commander rows when the palette filter matches no static commands: POST-backed debug jumps and search escape.
 */
export const buildCommanderEmptyStateExtras = (
  query: string,
  handlers: CommanderEmptyStateExtrasHandlers,
): readonly CommanderItem[] => {
  const { submitCommanderSearch: submit } = handlers;
  const q = query.trim();
  if (q.length === 0) {
    return [];
  }

  const queueJob = parseQueueAndJobIdsFromCommanderQuery(q);
  if (queueJob) {
    const [firstId, secondId] = queueJob;
    /** Same `uuid/uuid` shape is used for queue/job and plan/task — offer both jumps. */
    return [
      {
        icon: <LayersIcon aria-hidden={true} className={ICON_SM} />,
        id: `jump-queue-job-${firstId}-${secondId}`,
        label: `Open queue job (${firstId.slice(0, 8)}… / ${secondId.slice(0, 8)}…)`,
        onSelect: () => {
          submit({ id: firstId, id2: secondId, jump: 'queue-job' });
        },
        value: `${q} open queue job`,
      },
      {
        icon: <ClipboardListIcon aria-hidden={true} className={ICON_SM} />,
        id: `jump-plan-task-${firstId}-${secondId}`,
        label: `Open plan task (${firstId.slice(0, 8)}… / ${secondId.slice(0, 8)}…)`,
        onSelect: () => {
          submit({ id: firstId, id2: secondId, jump: 'plan-task' });
        },
        value: `${q} open plan task`,
      },
    ];
  }

  if (REGEX_UUID.test(q)) {
    const preview = q.slice(0, 8);
    return [
      {
        icon: <MapIcon aria-hidden={true} className={ICON_SM} />,
        id: `jump-plan-${q}`,
        label: `Open plan (${preview}…)`,
        onSelect: () => {
          submit({ id: q, jump: 'plan-detail' });
        },
        value: `${q} open plan`,
      },
      {
        icon: <ChartLineIcon aria-hidden={true} className={ICON_SM} />,
        id: `jump-queue-${q}`,
        label: `Open queue (${preview}…)`,
        onSelect: () => {
          submit({ id: q, jump: 'queue-detail' });
        },
        value: `${q} open queue`,
      },
      {
        icon: <BotIcon aria-hidden={true} className={ICON_SM} />,
        id: `jump-generator-${q}`,
        label: `Open generator (${preview}…)`,
        onSelect: () => {
          submit({ id: q, jump: 'generator-detail' });
        },
        value: `${q} open generator`,
      },
      {
        icon: <SearchIcon aria-hidden={true} className={ICON_SM} />,
        id: `jump-search-uuid-${q}`,
        label: `Search workspace for “${preview}…” (tasks, plans, chunks)`,
        onSelect: () => {
          submit({ q });
        },
        value: `${q} search workspace uuid`,
      },
    ];
  }

  return buildNonUuidDebugIndexItems(q, submit);
};
