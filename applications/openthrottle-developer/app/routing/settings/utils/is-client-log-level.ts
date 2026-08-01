/**
 * @description Type guard narrowing an arbitrary ToggleGroup value to a known
 * client console log level. Hoisted out of SettingsLogsPanel so it is
 * discoverable and independently testable (component-primitive-shape R4).
 */

import { CLIENT_LOG_LEVELS } from '~/routing/settings/client-log-sink';
import type { ClientLogLevel } from '~/routing/settings/client-log-sink';

export const isClientLogLevel = (value: string): value is ClientLogLevel =>
  CLIENT_LOG_LEVELS.some((level) => level === value);
