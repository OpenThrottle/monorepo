/** @public */
export interface UpsertTagActionRuleInput {
  readonly actionPayload: unknown;
  readonly actionType: string;
  readonly enabled?: boolean;
  readonly environment?: string | null;
  /** When present, updates the existing rule (must belong to the user). */
  readonly id?: string | null;
  readonly projectId?: string | null;
  readonly status?: string | null;
  readonly tagAll?: readonly string[];
  readonly title: string;
}
