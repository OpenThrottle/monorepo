/**
 * @description Picks the per-call {@link ShareData} override over the hook default.
 * Hoisted out of `useShare` per hook-primitive-shape H3.
 */
export const resolveShareData = (
  override: ShareData | undefined,
  fallback: ShareData | undefined,
): ShareData | undefined => override ?? fallback;
