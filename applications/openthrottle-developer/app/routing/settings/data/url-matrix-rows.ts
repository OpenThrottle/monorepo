/**
 * @description Row configuration for the Settings → Diagnostics app & API URL
 * matrix (env key + display label). Hoisted out of
 * SettingsEnvironmentDiagnostics per component-primitive-shape R4.
 */

import type { OpenThrottleEnv } from '@openthrottle/react-router-utils';

export const URL_MATRIX_ROWS = [
  { key: 'API_URL_EXTERNAL' as const, label: 'API (external)' },
  { key: 'API_URL_INTERNAL' as const, label: 'API (internal)' },
  { key: 'APP_URL' as const, label: 'APP_URL' },
  { key: 'APP_URL_ADMIN' as const, label: 'Admin' },
  { key: 'APP_URL_CMS' as const, label: 'CMS' },
  { key: 'APP_URL_DEVELOPER' as const, label: 'Developer' },
  { key: 'APP_URL_EMAIL' as const, label: 'Email' },
  { key: 'APP_URL_SERVER' as const, label: 'Server' },
  { key: 'APP_URL_WEBSITE' as const, label: 'Website' },
] satisfies {
  key: keyof OpenThrottleEnv;
  label: string;
}[];
