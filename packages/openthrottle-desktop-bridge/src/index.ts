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
export { findDeepLink } from './utils/findDeepLink.ts';
export { getDesktopBridge } from './utils/getDesktopBridge.ts';
export { isDesktopBridge } from './utils/isDesktopBridge.ts';
export { mapDeepLink } from './utils/mapDeepLink.ts';
export type { ParseNotifyInputResult } from './utils/parseNotifyInput.ts';
export { parseNotifyInput } from './utils/parseNotifyInput.ts';
export { toPlanRoute } from './utils/toPlanRoute.ts';
