/**
 * @description A JSON-serializable value. Gold expectations and setup payloads use it so a case
 * round-trips through Postgres JSONB unchanged.
 * @public
 */
export type EvalJsonValue =
  | boolean
  | number
  | string
  | readonly EvalJsonValue[]
  | { readonly [key: string]: EvalJsonValue }
  | null;

/**
 * @description One file written into the attempt's workspace before the agent starts.
 * `path` is relative to the workspace root.
 * @public
 */
export interface EvalSetupFile {
  readonly content: string;
  readonly path: string;
}

/**
 * @description How an attempt's working directory is prepared, on top of whatever the
 * {@link EvalWorkspaceFactory} checks out.
 * @public
 */
export interface EvalCwdSetup {
  readonly files: readonly EvalSetupFile[];
}

/**
 * @description What the agent is asked to do.
 * @public
 */
export interface EvalCaseInput {
  readonly cwdSetup: EvalCwdSetup;
  readonly prompt: string;
}

/**
 * @description Which side of the dataset a case sits on. The `dev` split is for iterating;
 * `test` is held out.
 * @public
 */
export type EvalSplit = 'dev' | 'test';

/**
 * @description One task for the agent plus what a correct outcome looks like.
 * @public
 */
export interface EvalCase {
  readonly gold: EvalJsonValue;
  readonly id: string;
  readonly input: EvalCaseInput;
  readonly split: EvalSplit;
}

/**
 * @description A versioned set of cases.
 * @public
 */
export interface EvalDataset {
  readonly cases: readonly EvalCase[];
  readonly id: string;
  readonly name: string;
  readonly version: number;
}
