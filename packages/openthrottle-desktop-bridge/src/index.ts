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
export { findDeepLink, mapDeepLink, toPlanRoute } from './utils/deep-link.ts';
export { getDesktopBridge, isDesktopBridge } from './utils/desktop-bridge.ts';
export type { ParseNotifyInputResult } from './utils/parseNotifyInput.ts';
export { parseNotifyInput } from './utils/parseNotifyInput.ts';
