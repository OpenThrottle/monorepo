export {
  DESKTOP_BRIDGE_NAME,
  DESKTOP_DEEP_LINK_PROTOCOL,
  DESKTOP_IPC_CHANNELS,
} from './data/data.desktop-bridge.ts';
export type {
  DesktopHandshake,
  DesktopNotifyInput,
  DesktopNotifyResult,
  DesktopOpenExternalResult,
  OpenThrottleDesktopBridge,
} from './types/desktop-bridge.ts';
export { findDeepLink } from './utils/find-deep-link.ts';
export { getDesktopBridge } from './utils/get-desktop-bridge.ts';
export { isDesktopBridge } from './utils/is-desktop-bridge.ts';
export { mapDeepLink } from './utils/map-deep-link.ts';
export type { ParseNotifyInputResult } from './utils/parse-notify-input.ts';
export { parseNotifyInput } from './utils/parse-notify-input.ts';
export { toPlanRoute } from './utils/to-plan-route.ts';
