import { type ScheduledAgentJobScheduleKind } from '@openthrottle/nestjs-repositories';

/** The validated schedule fields, exactly as persisted. */
export interface ScheduleSpec {
  readonly cronPattern: string | null;
  readonly intervalMs: number | null;
  readonly runAt: Date | null;
  readonly scheduleKind: ScheduledAgentJobScheduleKind;
}

/** The schedule fields a create or update request carries; undefined/null means "not supplied". */
export interface ScheduleSpecRequest {
  readonly cronPattern?: string | null;
  readonly intervalMs?: number | null;
  readonly runAt?: string | null;
  readonly scheduleKind?: string | null;
}

export type ScheduleSpecResult =
  | { readonly ok: true; readonly spec: ScheduleSpec }
  | { readonly ok: false; readonly reason: string };
