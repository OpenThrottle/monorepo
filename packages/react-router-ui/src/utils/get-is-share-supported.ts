/**
 * @description Whether `navigator.share` is available (secure context required in
 * browsers). Hoisted out of `useShare` per hook-primitive-shape H3.
 */
export const getIsShareSupported = (): boolean => {
  return (
    typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  );
};
