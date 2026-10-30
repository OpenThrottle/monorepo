import { resolveApiUrl } from '@openthrottle/react-router-utils';
import * as React from 'react';

import { normalizeUrlBase } from '~/routing/settings/utils/normalize-url-base';
import type { SettingsDiagnosticsLoaderData } from '~/routing/settings/utils/settings-diagnostics-loader-data';

export interface UseSettingsEnvironmentDiagnosticsOptions {
  /** Browser-facing API base (`env.API_URL_EXTERNAL`); may be relative (`/api`). */
  apiUrlExternal: string;
  /** Configured developer portal base URL (`env.APP_URL_DEVELOPER`). */
  appUrlDeveloper: string;
  supportBundle: SettingsDiagnosticsLoaderData['supportBundle'];
}

export interface UseSettingsEnvironmentDiagnosticsResult {
  /**
   * Display value for a URL-matrix row. A relative `API_URL_EXTERNAL` also
   * shows what it resolves to against the browser origin, once mounted.
   */
  formatUrlMatrixValue: (key: string, value: string) => string;
  handleCopySupportBundle: () => Promise<void>;
  origin: string | null;
  originMatches: boolean | null;
}

/**
 * @description Browser-origin detection (vs the configured developer URL), the
 * resolved API URL, and the copy-support-bundle handler for Settings →
 * Diagnostics. Extracted from SettingsEnvironmentDiagnostics per
 * component-primitive-shape R6/R7.
 */
export const useSettingsEnvironmentDiagnostics = (
  options: UseSettingsEnvironmentDiagnosticsOptions,
): UseSettingsEnvironmentDiagnosticsResult => {
  const { apiUrlExternal, appUrlDeveloper, supportBundle } = options;

  // Hooks
  const [origin, setOrigin] = React.useState<string | null>(null);

  // Setup
  const devPortalExpected = normalizeUrlBase(appUrlDeveloper);
  const originMatches =
    origin === null ? null : normalizeUrlBase(origin) === devPortalExpected;
  const resolvedApiUrl =
    origin === null ? undefined : resolveApiUrl(apiUrlExternal, origin);

  // Handlers
  const formatUrlMatrixValue = (key: string, value: string): string =>
    key === 'API_URL_EXTERNAL' && resolvedApiUrl && resolvedApiUrl !== value
      ? `${value} → ${resolvedApiUrl}`
      : value;

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

  return {
    formatUrlMatrixValue,
    handleCopySupportBundle,
    origin,
    originMatches,
  };
};
