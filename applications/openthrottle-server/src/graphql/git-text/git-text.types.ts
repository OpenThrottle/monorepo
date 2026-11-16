/** @description The plan fields the git-text drafts read. */
export interface GitTextPlan {
  readonly category: string | null;
  readonly description: string | null;
  readonly id: string;
  readonly summary: string | null;
  readonly title: string;
}

/** @description The task fields the git-text drafts read. */
export interface GitTextTask {
  readonly category: string | null;
  readonly description: string | null;
  readonly id: string;
  readonly status: string;
  readonly summary: string | null;
  readonly title: string;
}
