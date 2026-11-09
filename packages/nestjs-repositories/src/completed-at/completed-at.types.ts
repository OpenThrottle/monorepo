export interface ResolveCompletedAtForStatusChangeInput {
  readonly currentCompletedAt: Date | null;
  readonly nextStatus: string;
  readonly now?: Date;
  readonly previousStatus: string;
}
