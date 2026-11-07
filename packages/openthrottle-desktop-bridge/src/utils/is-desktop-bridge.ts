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
