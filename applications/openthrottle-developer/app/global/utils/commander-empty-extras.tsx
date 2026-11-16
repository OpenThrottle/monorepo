import type { CommanderItem, IdRefMatch } from '@openthrottle/react-router-ui';
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
import * as React from 'react';

/**
 * @description Full OpenThrottle / RFC UUID matcher, re-exported from the shared
 * recognition util for the full-UUID commander paths (and the root action's
 * REGEX_UUID guard, which still validates the resolved full id before redirect).
 */
export { REGEX_UUID };

const UUID_GROUP = `([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})`;

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
   * @description True while an id lookup (short fragment or full UUID) is in flight; drives the "Resolving…" row.
   */
  readonly idRefLoading?: boolean;
  /**
   * @description Plans and tasks the typed id resolved to (from `useIdRefResolver`). Empty until the lookup resolves.
   */
  readonly idRefMatches?: readonly IdRefMatch[];
  /**
   * @description Renders a resolved ref's status as the row's trailing badge. Injected by the caller so `global/` never imports a `routing/` component.
   */
  readonly renderStatus?: (status: string) => React.ReactNode;
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
 * Flagged `isFallback`, so the palette's "Search for …" row leads them.
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
      isFallback: true,
      label: 'Open Plans (browse all)',
      onSelect: () => {
        submit({ jump: 'plans-index' });
      },
      value: `${q} debug plans index`,
    },
    {
      icon: <ChartLineIcon aria-hidden={true} className={ICON_SM} />,
      id: 'debug-open-queues-index',
      isFallback: true,
      label: 'Open Queues (browse all)',
      onSelect: () => {
        submit({ jump: 'queues-index' });
      },
      value: `${q} debug queues index`,
    },
    {
      icon: <BotIcon aria-hidden={true} className={ICON_SM} />,
      id: 'debug-open-generators-index',
      isFallback: true,
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
 * short-fragment id rows so there is an action even when nothing resolves.
 */
const buildWorkspaceSearchItem = (
  q: string,
  submit: CommanderEmptyStateExtrasHandlers['submitCommanderSearch'],
): CommanderItem => {
  return {
    icon: <SearchIcon aria-hidden={true} className={ICON_SM} />,
    id: `jump-search-fragment-${q}`,
    label: `Search workspace for “${q}” (tasks, plans, chunks)`,
    onSelect: () => {
      submit({ q });
    },
    value: `${q} search workspace fragment`,
  };
};

/**
 * @description One confident row per resolved id ref. A plan opens its detail
 * page; a task opens `/plans/<planId>/tasks/<taskId>` and names its plan. Each
 * row carries the ref's status as a trailing badge, so the palette answers
 * "what state is it in?" without navigating.
 */
const buildIdRefMatchItem = (
  q: string,
  match: IdRefMatch,
  handlers: CommanderEmptyStateExtrasHandlers,
): CommanderItem => {
  const { renderStatus, submitCommanderSearch: submit } = handlers;
  const preview = match.id.slice(0, 8);
  const trailing = renderStatus?.(match.status);

  if (match.kind === 'TASK') {
    const planContext = match.planTitle ? ` · ${match.planTitle}` : '';

    return {
      icon: <ClipboardListIcon aria-hidden={true} className={ICON_SM} />,
      id: `jump-task-ref-${match.id}`,
      label: `Open task: ${match.title} (${preview}…)${planContext}`,
      onSelect: () => {
        submit({ id: match.planId, id2: match.id, jump: 'plan-task' });
      },
      trailing,
      value: `${q} open task ${match.title} ${match.id}`,
    };
  }

  return {
    icon: <MapIcon aria-hidden={true} className={ICON_SM} />,
    id: `jump-plan-ref-${match.id}`,
    label: `Open plan: ${match.title} (${preview}…)`,
    onSelect: () => {
      submit({ id: match.id, jump: 'plan-detail' });
    },
    trailing,
    value: `${q} open plan ${match.title} ${match.id}`,
  };
};

/**
 * @description Rows for a typed id (short fragment or full UUID): a confident
 * row per resolved plan or task, or a "Resolving…" indicator while the lookup
 * is in flight. Returns `null` when the id resolved to nothing and is idle, so
 * the caller decides what to fall back to.
 */
const buildIdRefItems = (
  q: string,
  handlers: CommanderEmptyStateExtrasHandlers,
): readonly CommanderItem[] | null => {
  const { idRefLoading = false, idRefMatches = [] } = handlers;

  if (idRefMatches.length > 0) {
    return idRefMatches.map((match) => {
      return buildIdRefMatchItem(q, match, handlers);
    });
  }

  if (idRefLoading) {
    return [
      {
        icon: <Loader2Icon aria-hidden={true} className={ICON_SM} />,
        id: `resolving-id-ref-${q}`,
        label: `Resolving “${q.slice(0, 8)}…”`,
        value: `${q} resolving id`,
      },
    ];
  }

  return null;
};

/**
 * @description Blind jumps for a full UUID the resolver could not place: it may
 * be a queue or generator (which `resolveIdRef` does not cover), or a plan the
 * lookup missed. The plan row is dropped once the id resolved to a plan or
 * task, since the confident row above already covers it.
 */
const buildUuidFallbackItems = (
  q: string,
  isResolved: boolean,
  submit: CommanderEmptyStateExtrasHandlers['submitCommanderSearch'],
): readonly CommanderItem[] => {
  const preview = q.slice(0, 8);
  const planItem: CommanderItem = {
    icon: <MapIcon aria-hidden={true} className={ICON_SM} />,
    id: `jump-plan-${q}`,
    label: `Open plan (${preview}…)`,
    onSelect: () => {
      submit({ id: q, jump: 'plan-detail' });
    },
    value: `${q} open plan`,
  };
  const otherItems: readonly CommanderItem[] = [
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

  return isResolved ? otherItems : [planItem, ...otherItems];
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
    const idRefItems = buildIdRefItems(q, handlers) ?? [];
    const isResolved = (handlers.idRefMatches?.length ?? 0) > 0;

    return [...idRefItems, ...buildUuidFallbackItems(q, isResolved, submit)];
  }

  if (isShortIdFragment(q)) {
    const idRefItems = buildIdRefItems(q, handlers);

    if (idRefItems) {
      return [...idRefItems, buildWorkspaceSearchItem(q, submit)];
    }
  }

  return buildNonUuidDebugIndexItems(q, submit);
};
