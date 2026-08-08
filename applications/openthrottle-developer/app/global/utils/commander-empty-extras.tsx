import * as React from 'react';
import type {
  CommanderItem,
  PlanRefMatch,
} from '@openthrottle/react-router-ui';
import {
  isShortIdFragment,
  REGEX_UUID,
} from '@openthrottle/react-router-utils';
import {
  BotIcon,
  ChartLineIcon,
  ClipboardListIcon,
  LayersIcon,
  Loader2Icon,
  MapIcon,
  SearchIcon,
} from 'lucide-react';

/**
 * @description Full OpenThrottle / RFC UUID matcher, re-exported from the shared
 * recognition util for the full-UUID commander paths (and the root action's
 * REGEX_UUID guard, which still validates the resolved full id before redirect).
 */
export { REGEX_UUID };

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
   * @description True while a short-fragment plan lookup is in flight (drives the "Resolving…" row).
   */
  readonly planRefLoading?: boolean;
  /**
   * @description Resolved plan matches for a typed short id fragment (from {@link usePlanRefResolver}). Empty until a fragment resolves.
   */
  readonly planRefMatches?: readonly PlanRefMatch[];
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
 * @description Workspace full-text search escape, always offered alongside the
 * short-fragment plan rows so there is an action even when nothing resolves.
 */
const buildWorkspaceSearchItem = (
  q: string,
  submit: CommanderEmptyStateExtrasHandlers['submitCommanderSearch'],
): CommanderItem => ({
  icon: <SearchIcon aria-hidden={true} className={ICON_SM} />,
  id: `jump-search-fragment-${q}`,
  label: `Search workspace for “${q}” (tasks, plans, chunks)`,
  onSelect: () => {
    submit({ q });
  },
  value: `${q} search workspace fragment`,
});

/**
 * @description Rows for a typed short id fragment: a confident `Open plan` row
 * per resolved match (redirecting to the resolved FULL id via the existing
 * commander-search POST), a "Resolving…" indicator while the lookup is in
 * flight, plus a workspace-search escape. Returns `null` when the fragment has
 * resolved to nothing and is idle, so the caller falls through to the generic
 * browse shortcuts.
 */
const buildPlanRefFragmentItems = (
  q: string,
  matches: readonly PlanRefMatch[],
  loading: boolean,
  submit: CommanderEmptyStateExtrasHandlers['submitCommanderSearch'],
): readonly CommanderItem[] | null => {
  if (matches.length > 0) {
    const planRows = matches.map((match) => {
      const preview = match.id.slice(0, 8);

      return {
        icon: <MapIcon aria-hidden={true} className={ICON_SM} />,
        id: `jump-plan-ref-${match.id}`,
        label: `Open plan: ${match.title} (${preview}…)`,
        onSelect: () => {
          submit({ id: match.id, jump: 'plan-detail' });
        },
        value: `${q} open plan ${match.title} ${match.id}`,
      };
    });

    return [...planRows, buildWorkspaceSearchItem(q, submit)];
  }

  if (loading) {
    return [
      {
        icon: <Loader2Icon aria-hidden={true} className={ICON_SM} />,
        id: `resolving-plan-ref-${q}`,
        label: `Resolving plan “${q}…”`,
        value: `${q} resolving plan`,
      },
      buildWorkspaceSearchItem(q, submit),
    ];
  }

  return null;
};

/**
 * @description Extra commander rows when the palette filter matches no static commands: POST-backed debug jumps and search escape.
 */
export const buildCommanderEmptyStateExtras = (
  query: string,
  handlers: CommanderEmptyStateExtrasHandlers,
): readonly CommanderItem[] => {
  const {
    planRefLoading = false,
    planRefMatches = [],
    submitCommanderSearch: submit,
  } = handlers;

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

  if (isShortIdFragment(q)) {
    const fragmentItems = buildPlanRefFragmentItems(
      q,
      planRefMatches,
      planRefLoading,
      submit,
    );

    if (fragmentItems) {
      return fragmentItems;
    }
  }

  return buildNonUuidDebugIndexItems(q, submit);
};
