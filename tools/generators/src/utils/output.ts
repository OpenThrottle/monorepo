export const writeJsonToStdout = (value: unknown): void => {
  // Nx captures stdout/stderr; keep output strictly JSON for agents.
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
};
