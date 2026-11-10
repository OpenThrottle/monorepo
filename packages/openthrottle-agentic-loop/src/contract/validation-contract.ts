/**
 * Types for validation command resolution, command running and output batching
 * (docs/workflows/ot-loop-job.md §§ 6, 9, 10). The injected `LoopValidator` itself lives in
 * `loop-contract.ts`.
 */

/** @public */
export interface ScheduleClock {
  /** Runs `callback` once after `delayMs`; returns a function that cancels it. */
  schedule(callback: () => void, delayMs: number): () => void;
}

/** @public */
export interface BatchedChunkSinkOptions {
  readonly maxBytes: number;
  readonly maxMs: number;
}

/** @public */
export interface BatchedChunkSink {
  /** Emits whatever is buffered; call once at the end of a stream. */
  flush(): void;
  push(text: string): void;
}

/**
 * @description One batched slice of validation output; the server forwards it to plan output
 * tagged with `taskId`.
 * @public
 */
export interface ValidationChunk {
  readonly command: string;
  readonly taskId: string;
  readonly text: string;
}

/** @public */
export interface SpawnCommandInput {
  readonly command: string;
  readonly cwd: string;
  /** Receives stdout and stderr text in arrival order. */
  readonly onOutput: (text: string) => void;
}

/** @public */
export interface SpawnedCommand {
  /** Resolves when the process has ended; `null` means it was killed by a signal. */
  readonly done: Promise<{ readonly exitCode: number | null }>;
  kill(): void;
}

/** @public */
export type SpawnCommand = (input: SpawnCommandInput) => SpawnedCommand;

/** @public */
export type CommandSequenceResult =
  | { readonly kind: 'aborted' }
  | { readonly kind: 'green' }
  | {
      readonly command: string;
      readonly exitCode: number;
      readonly kind: 'red';
      readonly tail: string;
    };

/** @public */
export interface ResolverFs {
  exists(path: string): Promise<boolean>;
  /** `undefined` when the file does not exist; any other failure rejects. */
  readFile(path: string): Promise<string | undefined>;
}

/** @description The plan's `runConfigJson.otLoop` tuning that affects validation. @public */
export interface OtLoopTuning {
  readonly validationCommands: readonly string[] | undefined;
}

/** @public */
export type OtLoopCommandSource = 'nx-default' | 'plan' | 'repo-file';

/** @public */
export type ResolveOtLoopCommandsResult =
  | { readonly kind: 'invalid'; readonly message: string }
  | { readonly kind: 'none'; readonly message: string }
  | {
      readonly finalValidation: readonly string[];
      readonly kind: 'resolved';
      readonly setup: readonly string[];
      readonly source: OtLoopCommandSource;
      readonly validation: readonly string[];
    };
