import {
  APP_NAME,
  getEnvironment,
  IS_BROWSER,
} from '@openthrottle/react-router-utils';
import type { ClientLogEntry } from '~/routing/settings/client-log-sink';
import { getClientLogEntries } from '~/routing/settings/client-log-sink';
import { sanitizeEnvForDiagnostics } from '~/routing/settings/utils/sanitize-client-env';

export interface ClientLog {
  readonly isoTime: string;
  readonly level: ClientLogEntry['level'];
  readonly message: string;
  readonly t: number;
}

interface SupportBundlePayload {
  readonly clientLog: readonly ClientLog[];
  readonly env: Record<string, string>;
  readonly generatedAt: string;
  readonly kind: 'support';
  readonly note: string;
  readonly page: {
    readonly href: string;
    readonly referrer: string | null;
  };
  readonly runtime: {
    readonly language: string;
    readonly userAgent: string;
  };
  readonly version: 1;
  readonly workflowLogs: {
    readonly apiStatus: 'not_available';
    readonly hint: string;
  };
}

export const getEmptyServerSnapshot = (): readonly ClientLogEntry[] => [];

/**
 * @description Builds a JSON payload safe to paste in support tickets (sanitized env).
 */
export const buildSupportBundlePayload = (): SupportBundlePayload => {
  const env = sanitizeEnvForDiagnostics(getEnvironment());
  const raw = getClientLogEntries();

  const clientLog: ClientLog[] = raw.map((entry) => ({
    isoTime: new Date(entry.t).toISOString(),
    level: entry.level,
    message: entry.message,
    t: entry.t,
  }));

  return {
    clientLog,
    env,
    generatedAt: new Date().toISOString(),
    kind: 'support',
    note: 'Environment values are redacted for secrets. Do not paste raw .env or tokens.',
    page: {
      href: IS_BROWSER ? window.location.href : '',
      referrer: IS_BROWSER ? document.referrer || null : null,
    },
    runtime: {
      language: typeof navigator !== 'undefined' ? navigator.language : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    },
    version: 1,
    workflowLogs: {
      apiStatus: 'not_available',
      hint: 'Server-side workflow-ralph stderr and plan output streaming are not exposed here yet. Use Plan detail for output, or capture stderr from `pnpm exec workflow-ralph --plan <uuid> --debug`. When an operator API exists, this section can tail or link those logs.',
    },
  };
};

export const copyText = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);

    return true;
  } catch {
    return false;
  }
};

export const formatEntryLine = (entry: ClientLogEntry): string => {
  const iso = new Date(entry.t).toISOString();

  return `${iso} [${entry.level}] ${entry.message}`;
};

export const entryToJsonRecord = (entry: ClientLogEntry): ClientLog => ({
  isoTime: new Date(entry.t).toISOString(),
  level: entry.level,
  message: entry.message,
  t: entry.t,
});

export const downloadJson = (payload: SupportBundlePayload): void => {
  const stamp = payload.generatedAt.replace(/[:.]/g, '-').slice(0, 19);
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.download = `${APP_NAME}-support-${stamp}.json`;
  anchor.href = url;
  anchor.click();

  // Clean up the file reference
  URL.revokeObjectURL(url);
};
