import type {
  ScheduledAgentJob,
  ScheduledAgentJobRunTrigger,
} from '@openthrottle/nestjs-repositories-server';

/**
 * @description What to enqueue for one pre-created run: the schedule it belongs to, how it was
 * triggered, and the prompt to run (the schedule's own prompt for run-now, the rendered prompt for
 * a webhook delivery).
 */
export interface EnqueueScheduledAgentJobRunInput {
  readonly job: ScheduledAgentJob;
  readonly prompt: string;
  readonly trigger: ScheduledAgentJobRunTrigger;
}
