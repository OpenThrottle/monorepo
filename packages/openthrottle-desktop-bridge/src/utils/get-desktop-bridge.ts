import { DESKTOP_BRIDGE_NAME } from '../data/data.desktop-bridge.ts';
import type { OpenThrottleDesktopBridge } from '../types/desktop-bridge.ts';
import { isDesktopBridge } from './is-desktop-bridge.ts';

/**
 * @description Feature-detects `window.openthrottleDesktop`. Returns
 * `undefined` in a normal browser, during SSR, or when the global does not
 * have the bridge shape, so callers branch on one value and never touch the
 * global directly.
 *
 * @public
 */
export const getDesktopBridge = (): OpenThrottleDesktopBridge | undefined => {
  const candidate: unknown = Reflect.get(globalThis, DESKTOP_BRIDGE_NAME);

  return isDesktopBridge(candidate) ? candidate : undefined;
};
