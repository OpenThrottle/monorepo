/**
 * @description The normalised URL that may be handed to `shell.openExternal`,
 * or `undefined`. Only `http:` and `https:` qualify; anything that fails to
 * parse, and every other scheme (`file:`, `mailto:`, `javascript:`, custom
 * protocol handlers), is refused.
 */
export const toExternalUrl = (url: string): string | undefined => {
  const parsed = URL.parse(url);

  if (parsed === null) {
    return undefined;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return undefined;
  }

  return parsed.href;
};
