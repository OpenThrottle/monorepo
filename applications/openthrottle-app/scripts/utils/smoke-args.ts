/** Which half of a (universal) bundle the smoke run launches. */
export type SmokeArch = 'native' | 'x64';

export type ParseSmokeArgsResult =
  | {
      readonly appPath: string;
      readonly arch: SmokeArch;
      readonly ok: true;
    }
  | { readonly ok: false; readonly reason: string };

export interface SmokeLaunchCommand {
  readonly args: readonly string[];
  readonly command: string;
}

/**
 * @description Reads `[<bundle path>] [--arch x64]` from the smoke script's
 * argv. `--arch x64` launches the x64 slice of a universal bundle under
 * Rosetta; without it the bundle runs natively.
 */
export const parseSmokeArgs = (
  argv: readonly string[],
  defaultAppPath: string,
): ParseSmokeArgsResult => {
  const positional: string[] = [];
  let arch: SmokeArch = 'native';

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--arch') {
      const value = argv[index + 1];

      if (value !== 'x64') {
        return {
          ok: false,
          reason: `unsupported --arch "${value ?? ''}"; only x64 (Rosetta) is supported`,
        };
      }

      arch = value;
      index += 1;
    } else if (arg !== undefined) {
      positional.push(arg);
    }
  }

  if (positional.length > 1) {
    return {
      ok: false,
      reason: `expected at most one bundle path, got ${positional.join(' ')}`,
    };
  }

  return { appPath: positional[0] ?? defaultAppPath, arch, ok: true };
};

/**
 * @description The process to spawn for one smoke run. x64 goes through
 * `arch -x86_64`, which execs the binary in place (same pid, so signals still
 * reach the app) and makes its universal helpers prefer x86_64 too.
 */
export const buildSmokeLaunchCommand = (
  executable: string,
  args: readonly string[],
  arch: SmokeArch,
): SmokeLaunchCommand => {
  if (arch === 'x64') {
    return { args: ['-x86_64', executable, ...args], command: '/usr/bin/arch' };
  }

  return { args, command: executable };
};
