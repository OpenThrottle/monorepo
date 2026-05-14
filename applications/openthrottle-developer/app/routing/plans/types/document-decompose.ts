/**
 * @description Client-side shape for document → plan decomposition preview (stub until ingest GraphQL exists).
 */
export interface ProposedTaskPreview {
  readonly requirements: readonly string[];
  readonly title: string;
}

export interface ProposedPlanDecomposition {
  readonly planDescription: string | undefined;
  readonly planTitle: string;
  readonly tasks: readonly ProposedTaskPreview[];
}

export interface DocumentDecomposeActionSuccess {
  readonly error: undefined;
  readonly proposal: ProposedPlanDecomposition;
}

export interface DocumentDecomposeActionFailure {
  readonly error: string;
  readonly proposal: undefined;
}

export type DocumentDecomposeActionData =
  | DocumentDecomposeActionFailure
  | DocumentDecomposeActionSuccess;
