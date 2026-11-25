export interface ExitDetails {
  readonly code: number | null;
  readonly error: Error | null;
  readonly stderr: string;
}

/**
 * @description Best explanation for a CLI child exit: the spawn error, else
 * trimmed stderr, else `<binary> exited with code <code>`.
 */
export function describeExit(binary: string, details: ExitDetails): string {
  if (details.error !== null) {
    return details.error.message;
  }

  const stderr = details.stderr.trim();
  if (stderr !== '') {
    return stderr;
  }

  return `${binary} exited with code ${details.code}`;
}
