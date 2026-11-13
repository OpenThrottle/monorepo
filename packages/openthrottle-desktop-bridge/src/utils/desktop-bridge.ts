import { DESKTOP_BRIDGE_NAME } from '../data/data.desktop-bridge.ts';
import type { OpenThrottleDesktopBridge } from '../types/desktop-bridge.ts';

/**
 * @description Type guard for the bridge shape: both methods are functions and
 * `platform` / `version` are strings.
 *
 * @public
 */
export const isDesktopBridge = (
  value: unknown,
): value is OpenThrottleDesktopBridge => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  return (
    typeof Reflect.get(value, 'notify') === 'function' &&
    typeof Reflect.get(value, 'openExternal') === 'function' &&
    typeof Reflect.get(value, 'platform') === 'string' &&
    typeof Reflect.get(value, 'version') === 'string'
  );
};

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
