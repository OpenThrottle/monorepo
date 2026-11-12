import { createHash } from 'node:crypto';

/**
 * @description The persistent session partition for one OT server origin. The
 * name is a stable hash so two origins never share cookies and the same origin
 * always gets its session back; it is derived from the normalized origin only.
 */
export const buildPartitionName = (serverOrigin: string): string => {
  const digest = createHash('sha256').update(serverOrigin).digest('hex');

  return `persist:ot-${digest.slice(0, 16)}`;
};
