/**
 * @description Parse a JSON string without throwing. Returns `undefined` for a
 * missing/empty input or malformed JSON (`JSON.parse` never yields `undefined`,
 * so it is unambiguous); callers narrow the `unknown` themselves.
 */
export const parseJson = (json: string | null | undefined): unknown => {
  if (json === null || json === undefined || json === '') {
    return undefined;
  }

  try {
    const parsed: unknown = JSON.parse(json);

    return parsed;
  } catch {
    return undefined;
  }
};
