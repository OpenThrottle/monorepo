import { DESKTOP_DEEP_LINK_PROTOCOL } from '../data/data.desktop-bridge.ts';

/**
 * @description The first `openthrottle://` argument in a process argv (how
 * Windows and Linux deliver a deep link to a new or second instance), or
 * `undefined`.
 *
 * @public
 */
export const findDeepLink = (argv: readonly string[]): string | undefined => {
  return argv.find((arg) => arg.startsWith(`${DESKTOP_DEEP_LINK_PROTOCOL}://`));
};
