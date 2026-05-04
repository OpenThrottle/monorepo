/**
 * @description Client-only persistence for pasted generator CLI output (support bundles).
 */

const storageKey = (generatorName: string): string =>
  `openthrottle-developer:generator-cli-last-run:${generatorName}`;

/**
 * @description Returns saved CLI text for a generator, or empty string if missing / unavailable.
 */
export const readGeneratorLastRun = (generatorName: string): string => {
  if (typeof window === 'undefined') {
    return '';
  }

  try {
    return window.localStorage.getItem(storageKey(generatorName)) ?? '';
  } catch {
    return '';
  }
};

/**
 * @description Persists CLI text for a generator (best-effort; ignores quota errors).
 */
export const writeGeneratorLastRun = (
  generatorName: string,
  text: string,
): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(storageKey(generatorName), text);
  } catch {
    // Quota or privacy mode — ignore.
  }
};

/**
 * @description Removes saved output for a generator.
 */
export const clearGeneratorLastRun = (generatorName: string): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(storageKey(generatorName));
  } catch {
    // ignore
  }
};

/**
 * @description Builds a copy-friendly support snippet (generator id, timestamp, output).
 */
export const buildGeneratorSupportBundle = (
  generatorName: string,
  cliOutput: string,
): string => {
  const capturedAt = new Date().toISOString();

  return [
    `generator: ${generatorName}`,
    `captured: ${capturedAt}`,
    '',
    '--- cli output ---',
    cliOutput.trim() === '' ? '(empty)' : cliOutput.trim(),
  ].join('\n');
};
