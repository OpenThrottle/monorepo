import type { PROCESS_ROLES } from './config.constants.ts';
export type ProcessRoleKey = keyof typeof PROCESS_ROLES;

export type ProcessRole = (typeof PROCESS_ROLES)[keyof typeof PROCESS_ROLES];
export interface BullMqRunOutputRetentionConfig {
  readonly baseDirectory: string;
  readonly maxAgeMs?: number;
  readonly maxTotalBytes?: number;
  readonly minIntervalMs: number;
}
