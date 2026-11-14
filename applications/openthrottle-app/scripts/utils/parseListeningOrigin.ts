import { LISTENING_LINE_PATTERN } from '../data/data.smoke.ts';

/**
 * @description Reads the embedded server's origin from the app's captured
 * output: `undefined` until the `[openthrottle-server] listening on` line has
 * arrived. Only a loopback origin matches, which is all the child binds.
 */
export const parseListeningOrigin = (output: string): string | undefined => {
  return LISTENING_LINE_PATTERN.exec(output)?.[1];
};
