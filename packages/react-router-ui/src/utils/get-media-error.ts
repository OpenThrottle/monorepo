/**
 * @description Normalizes an `HTMLMediaElement` error into an `Error`, or `null`
 * when the element has none. Hoisted out of `useAudio` per hook-primitive-shape H3.
 */
export const getMediaError = (target: HTMLMediaElement): Error | null => {
  const mediaError = target.error;
  if (mediaError == null) {
    return null;
  }

  const message =
    typeof mediaError.message === 'string' && mediaError.message.length > 0
      ? mediaError.message
      : `Media error code ${mediaError.code}`;

  return new Error(message);
};
