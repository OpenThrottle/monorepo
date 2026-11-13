/**
 * @description Runs `ask` only for an interactive generator run. A
 * non-interactive run resolves `undefined`, so the caller's missing-option
 * error fires instead of a prompt.
 */
export const askWhenInteractive = async <TAnswer>(
  interactive: boolean,
  ask: () => Promise<TAnswer>,
): Promise<TAnswer | undefined> => {
  if (!interactive) {
    return undefined;
  }

  return ask();
};
