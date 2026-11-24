export interface OpenPlanRunSessionInput {
  readonly bullmqJobId: string;
  readonly model?: string | null;
  readonly planId: string;
  readonly queueName: string;
}
