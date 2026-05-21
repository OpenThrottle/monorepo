interface GeneratorErrorPayload {
  readonly code: string;
  readonly field?: string;
  readonly message: string;
  readonly hint?: string;
  readonly validValues?: readonly string[];
}

/**
 * Throws an Error with an embedded machine-readable payload.
 * The payload can be extracted by tooling by searching for `TEMPLATES_ERROR=`.
 */
export const throwGeneratorError = (payload: GeneratorErrorPayload): never => {
  const message = [
    payload.message,
    payload.hint ? `Hint: ${payload.hint}` : undefined,
    `TEMPLATES_ERROR=${JSON.stringify(payload)}`,
  ]
    .filter(Boolean)
    .join('\n');

  throw new Error(message);
};
