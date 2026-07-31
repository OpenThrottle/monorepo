/**
 * @description Pure row helpers for the queues overview table (detail href and
 * DataTable row id). Hoisted out of QueuesTable per component-primitive-shape
 * R4.
 */

import type { QueueCardFragment } from '~/__generated__/graphql';

export function queueDetailHref(name: string): string {
  return `/queues/${encodeURIComponent(name)}`;
}

export const queueRowId = (queue: QueueCardFragment, _index: number): string =>
  queue.name;
