export interface EnqueuePromotionParams {
  readonly actorServiceAccountId: string | null;
  readonly actorUserId: string | null;
  readonly idempotencyKey?: string | null;
  readonly taskId: string;
}

export type EnqueuePromotionResult =
  { readonly jobId: string } | { readonly error: string };
