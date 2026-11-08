/** Inputs to the native-dialog availability predicate. */
export interface NativePickerContext {
  env?: NodeJS.ProcessEnv;
  platform?: NodeJS.Platform;
  remoteAddress?: string | null;
}

/** A folder-dialog command resolved for the host platform (argv form). */
export interface NativeDialogCommand {
  args: readonly string[];
  command: string;
}

/** Discriminated outcome of a native folder pick (framework-agnostic). */
export type NativeFolderPickResult =
  | { kind: 'cancelled' }
  | { kind: 'error'; message: string }
  | { kind: 'picked'; path: string }
  | { kind: 'timeout' }
  | { kind: 'unavailable' };

/** Runs a resolved dialog command and resolves its stdout (rejects on failure). */
export type NativeDialogRunner = (
  command: NativeDialogCommand,
  timeoutMs: number,
) => Promise<string>;
