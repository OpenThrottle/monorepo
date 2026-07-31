import * as React from 'react';
import { normalizeUrlBase } from '~/routing/settings/utils/normalize-url-base';
import type { SettingsDiagnosticsLoaderData } from '~/routing/settings/utils/settings-diagnostics-loader-data';

export interface SettingsEnvironmentDiagnosticsOptions {
  /** Configured developer portal base URL (`env.APP_URL_DEVELOPER`). */
  appUrlDeveloper: string;
  supportBundle: SettingsDiagnosticsLoaderData['supportBundle'];
}

export interface UseSettingsEnvironmentDiagnosticsResult {
  handleCopySupportBundle: () => Promise<void>;
  origin: string | null;
  originMatches: boolean | null;
}

/**
 * @description Browser-origin detection (vs the configured developer URL) and
 * the copy-support-bundle handler for Settings → Diagnostics. Extracted from
 * SettingsEnvironmentDiagnostics per component-primitive-shape R6/R7.
 */
export const useSettingsEnvironmentDiagnostics = (
  options: SettingsEnvironmentDiagnosticsOptions,
): UseSettingsEnvironmentDiagnosticsResult => {
  const { appUrlDeveloper, supportBundle } = options;

  // Hooks
  const [origin, setOrigin] = React.useState<string | null>(null);

  // Setup
  const devPortalExpected = normalizeUrlBase(appUrlDeveloper);
  const originMatches =
    origin === null ? null : normalizeUrlBase(origin) === devPortalExpected;

  // Handlers
  const handleCopySupportBundle = async (): Promise<void> => {
    const text = JSON.stringify(supportBundle, null, 2);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  // Markup

  // Life Cycle
  React.useEffect(() => {
    if (globalThis.window !== undefined) {
      setOrigin(globalThis.window.location.origin);
    }
  }, []);

  // 🔌 Short Circuit

  return { handleCopySupportBundle, origin, originMatches };
};
