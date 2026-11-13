/**
 * Flags for the telemetry doctor CLI.
 *
 * @public
 */
export interface DoctorArgs {
  readonly json: boolean;
  readonly strict: boolean;
}

/**
 * Parse `--json` and `--strict`; unknown arguments are ignored.
 *
 * @public
 */
export const parseDoctorArgs = (argv: readonly string[]): DoctorArgs => {
  return {
    json: argv.includes('--json'),
    strict: argv.includes('--strict'),
  };
};
