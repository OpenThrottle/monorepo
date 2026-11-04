/**
 * @description Coerces any thrown value into an `Error`. Hoisted out of
 * `useAudioCapture` per hook-primitive-shape H3.
 */
export const toError = (value: unknown): Error =>
  value instanceof Error ? value : new Error(String(value));
