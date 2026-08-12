/**
 * @description Same-machine / native-availability predicate for the server-side
 * OS folder dialog, and the per-OS folder-dialog command resolution. The dialog
 * runs on the openthrottle-server host and returns an absolute host path; it is
 * only offered when the request is clearly local and a display is present. See
 * docs/openthrottle/workspace-native-folder-picker.md for the decision record.
 */

import { execFile } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { isAbsolute } from 'node:path';
import { promisify } from 'node:util';

/**
 * Env var: force the native folder picker on (`1`/`true`/`on`) or off
 * (`0`/`false`/`off`). Unset/other falls through to the computed default.
 */
export const NATIVE_PICKER_ENV = 'OPENTHROTTLE_NATIVE_PICKER';

/** Loopback peer addresses accepted as "same machine" (raw TCP peer). */
const LOOPBACK_ADDRESSES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

/**
 * @description True when the raw TCP peer address is loopback. Callers must
 * pass `req.socket.remoteAddress` (the transport peer), NOT `req.ip`, so an
 * `X-Forwarded-For` header under `trust proxy` cannot spoof same-machine.
 */
export const isLoopbackAddress = (
  address: string | null | undefined,
): boolean => {
  if (address == null) return false;
  const trimmed = address.trim();
  return trimmed !== '' && LOOPBACK_ADDRESSES.has(trimmed);
};

/**
 * @description Explicit override from {@link NATIVE_PICKER_ENV}: `true` = force
 * on, `false` = force off, `null` = no override (fall through to the default).
 */
export const resolveNativePickerOverride = (
  env: NodeJS.ProcessEnv = process.env,
): boolean | null => {
  const raw = env[NATIVE_PICKER_ENV]?.trim().toLowerCase();
  if (raw === undefined || raw === '') return null;
  if (raw === '1' || raw === 'true' || raw === 'on') return true;
  if (raw === '0' || raw === 'false' || raw === 'off') return false;
  return null;
};

/**
 * @description Whether a GUI display plausibly exists for the platform: macOS
 * and Windows are assumed to have one (headless runs fail fast at spawn time);
 * Linux requires a non-empty `DISPLAY` or `WAYLAND_DISPLAY`; anything else has
 * no picker command wired, so `false`.
 */
export const hasDisplay = (
  platform: NodeJS.Platform = process.platform,
  env: NodeJS.ProcessEnv = process.env,
): boolean => {
  if (platform === 'darwin' || platform === 'win32') return true;
  if (platform === 'linux') {
    return (
      (env.DISPLAY?.trim() ?? '') !== '' ||
      (env.WAYLAND_DISPLAY?.trim() ?? '') !== ''
    );
  }
  return false;
};

/** Inputs to the native-dialog availability predicate. */
export interface NativePickerContext {
  env?: NodeJS.ProcessEnv;
  platform?: NodeJS.Platform;
  remoteAddress?: string | null;
}

/**
 * @description Conservative predicate: the native dialog is OFF unless the
 * request is loopback AND a display is present. An explicit
 * {@link NATIVE_PICKER_ENV} override wins in both directions. Evaluated per
 * request for the `workspacePickerCapabilities` read and re-checked before
 * `pickFolderNative` spawns anything.
 */
export const canUseNativeFolderDialog = (
  context: NativePickerContext = {},
): boolean => {
  const env = context.env ?? process.env;
  const platform = context.platform ?? process.platform;

  const override = resolveNativePickerOverride(env);
  if (override !== null) return override;

  return isLoopbackAddress(context.remoteAddress) && hasDisplay(platform, env);
};

/** Max wall-clock for a native folder dialog before the child is killed. */
export const NATIVE_DIALOG_TIMEOUT_MS = 2 * 60 * 1000;

/** A folder-dialog command resolved for the host platform (argv form). */
export interface NativeDialogCommand {
  args: readonly string[];
  command: string;
}

/**
 * @description The OS folder-dialog command for the platform (argv form, no
 * shell), or null when no picker is wired. Commands print the chosen absolute
 * path to stdout and exit non-zero with empty stdout on user cancel. See the
 * decision record for the per-OS table.
 */
export const resolveNativeDialogCommand = (
  platform: NodeJS.Platform = process.platform,
): NativeDialogCommand | null => {
  if (platform === 'darwin') {
    return {
      args: [
        '-e',
        'POSIX path of (choose folder with prompt "Select a workspace folder")',
      ],
      command: 'osascript',
    };
  }
  if (platform === 'linux') {
    return {
      args: [
        '--file-selection',
        '--directory',
        '--title',
        'Select a workspace folder',
      ],
      command: 'zenity',
    };
  }
  if (platform === 'win32') {
    return {
      args: [
        '-NoProfile',
        '-STA',
        '-Command',
        "Add-Type -AssemblyName System.Windows.Forms; $d = New-Object System.Windows.Forms.FolderBrowserDialog; if ($d.ShowDialog() -eq 'OK') { [Console]::Out.Write($d.SelectedPath) }",
      ],
      command: 'powershell',
    };
  }
  return null;
};

/**
 * @description Trims dialog stdout to an absolute path, stripping a trailing
 * slash (except root). Empty output ⇒ null (user cancelled).
 */
export const normalizeNativeDialogPath = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  return trimmed.length > 1 && trimmed.endsWith('/')
    ? trimmed.slice(0, -1)
    : trimmed;
};

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

const execFileAsync = promisify(execFile);

const isErrno = (
  error: unknown,
): error is NodeJS.ErrnoException & {
  killed?: boolean;
  stdout?: Buffer | string;
} => error instanceof Error;

/**
 * @description Default runner: `execFile` (argv, no shell) with a kill timeout.
 * On Linux, falls back from `zenity` to `kdialog` when the former is not
 * installed. Rejects with the underlying error (carrying stdout/killed) so the
 * caller can distinguish cancel from timeout.
 */
export const defaultNativeDialogRunner: NativeDialogRunner = async (
  command,
  timeoutMs,
) => {
  try {
    const { stdout } = await execFileAsync(command.command, [...command.args], {
      timeout: timeoutMs,
    });
    return stdout;
  } catch (error) {
    if (
      command.command === 'zenity' &&
      isErrno(error) &&
      error.code === 'ENOENT'
    ) {
      const { stdout } = await execFileAsync(
        'kdialog',
        ['--getexistingdirectory', homedir()],
        { timeout: timeoutMs },
      );
      return stdout;
    }
    throw error;
  }
};

const readErrorStdout = (error: unknown): string => {
  if (isErrno(error) && error.stdout != null) return error.stdout.toString();
  return '';
};

/** Applies the shared path-safety posture, returning the canonical path or null. */
const canonicalizeSafely = (path: string): string | null => {
  if (path.includes('\0') || !isAbsolute(path)) return null;
  try {
    return realpathSync(path);
  } catch {
    return null;
  }
};

/**
 * @description Opens the host OS folder dialog and maps the outcome: a chosen
 * absolute path (canonicalized), a clean cancel, a timeout, an unavailable
 * platform, or an error. Never registers anything — the caller decides what to
 * do with the returned path. The runner is injectable for tests.
 */
export const pickNativeFolder = async (options: {
  platform?: NodeJS.Platform;
  run?: NativeDialogRunner;
  timeoutMs?: number;
}): Promise<NativeFolderPickResult> => {
  const platform = options.platform ?? process.platform;
  const run = options.run ?? defaultNativeDialogRunner;
  const timeoutMs = options.timeoutMs ?? NATIVE_DIALOG_TIMEOUT_MS;

  const command = resolveNativeDialogCommand(platform);
  if (command === null) return { kind: 'unavailable' };

  let stdout: string;
  try {
    stdout = await run(command, timeoutMs);
  } catch (error) {
    // Timeout: execFile kills the child (killed=true) on expiry.
    if (isErrno(error) && error.killed === true) return { kind: 'timeout' };
    // A missing dialog binary is a real misconfiguration, not a cancel.
    if (isErrno(error) && error.code === 'ENOENT') {
      return {
        kind: 'error',
        message: 'No native folder dialog is installed on the server host',
      };
    }
    // Non-zero exit with empty stdout is the user dismissing the dialog.
    if (normalizeNativeDialogPath(readErrorStdout(error)) === null) {
      return { kind: 'cancelled' };
    }
    return {
      kind: 'error',
      message: error instanceof Error ? error.message : String(error),
    };
  }

  const normalized = normalizeNativeDialogPath(stdout);
  if (normalized === null) return { kind: 'cancelled' };

  const canonical = canonicalizeSafely(normalized);
  if (canonical === null) {
    return { kind: 'error', message: 'The chosen path could not be resolved' };
  }
  return { kind: 'picked', path: canonical };
};
