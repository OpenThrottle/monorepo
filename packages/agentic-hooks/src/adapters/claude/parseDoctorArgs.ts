/**
 * Flags for the telemetry doctor CLI.
 *
 * @public
 */
export interface DoctorArgs {
  readonly fix: boolean;
  readonly json: boolean;
  readonly strict: boolean;
}

/**
 * Parse `--fix`, `--json` and `--strict`; unknown arguments are ignored.
 *
 * @public
 */
export const parseDoctorArgs = (argv: readonly string[]): DoctorArgs => {
  return {
    fix: argv.includes('--fix'),
    json: argv.includes('--json'),
    strict: argv.includes('--strict'),
  };
};
