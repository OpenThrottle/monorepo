/**
 * @description Normalizes browser CSP violation reports into one flat,
 * structured shape regardless of delivery mechanism:
 *
 * - `application/csp-report` — the legacy `report-uri` body: a single
 *   `{ "csp-report": { "blocked-uri": ... } }` object (the only mechanism
 *   WebKit/Firefox reliably support).
 * - `application/reports+json` — Reports API batches from
 *   `report-to`/`Reporting-Endpoints` (Chromium): an array of
 *   `{ type: 'csp-violation', url, user_agent, body: { blockedURL: ... } }`.
 *
 * Anything unrecognized yields an empty array — the endpoint must tolerate
 * malformed and browser-extension-noise payloads without erroring.
 */

export interface CspViolationLogEntry {
  blockedUri?: string;
  disposition?: string;
  documentUri?: string;
  effectiveDirective?: string;
  lineNumber?: number;
  originalPolicy?: string;
  referrer?: string;
  sample?: string;
  sourceFile?: string;
  statusCode?: number;
  userAgent?: string;
  violatedDirective?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readNumber = (
  record: Record<string, unknown>,
  key: string,
): number | undefined => {
  const value = record[key];
  return typeof value === 'number' ? value : undefined;
};

const readString = (
  record: Record<string, unknown>,
  key: string,
): string | undefined => {
  const value = record[key];
  return typeof value === 'string' ? value : undefined;
};

/**
 * @description Maps a legacy `report-uri` body (`{ "csp-report": {...} }`,
 * kebab-case fields) to the normalized entry.
 */
const parseLegacyReport = (
  payload: Record<string, unknown>,
): CspViolationLogEntry[] => {
  const report = payload['csp-report'];
  if (!isRecord(report)) return [];

  return [
    {
      blockedUri: readString(report, 'blocked-uri'),
      disposition: readString(report, 'disposition'),
      documentUri: readString(report, 'document-uri'),
      effectiveDirective: readString(report, 'effective-directive'),
      lineNumber: readNumber(report, 'line-number'),
      originalPolicy: readString(report, 'original-policy'),
      referrer: readString(report, 'referrer'),
      sample: readString(report, 'script-sample'),
      sourceFile: readString(report, 'source-file'),
      statusCode: readNumber(report, 'status-code'),
      violatedDirective: readString(report, 'violated-directive'),
    },
  ];
};

/**
 * @description Maps a Reports API batch (array of camelCase `csp-violation`
 * reports) to normalized entries. Non-CSP report types in the batch (e.g.
 * `deprecation`) are ignored.
 */
const parseReportsApiBatch = (payload: unknown[]): CspViolationLogEntry[] => {
  const entries: CspViolationLogEntry[] = [];

  for (const item of payload) {
    if (!isRecord(item)) continue;
    if (readString(item, 'type') !== 'csp-violation') continue;

    const body = item['body'];
    if (!isRecord(body)) continue;

    entries.push({
      blockedUri: readString(body, 'blockedURL'),
      disposition: readString(body, 'disposition'),
      documentUri: readString(body, 'documentURL') ?? readString(item, 'url'),
      effectiveDirective: readString(body, 'effectiveDirective'),
      lineNumber: readNumber(body, 'lineNumber'),
      originalPolicy: readString(body, 'originalPolicy'),
      referrer: readString(body, 'referrer'),
      sample: readString(body, 'sample'),
      sourceFile: readString(body, 'sourceFile'),
      statusCode: readNumber(body, 'statusCode'),
      userAgent: readString(item, 'user_agent'),
    });
  }

  return entries;
};

/**
 * @description Parses either CSP report delivery format into normalized
 * entries; returns an empty array for anything unrecognized.
 */
export const parseCspReportPayload = (
  payload: unknown,
): CspViolationLogEntry[] => {
  if (Array.isArray(payload)) return parseReportsApiBatch(payload);
  if (isRecord(payload)) return parseLegacyReport(payload);
  return [];
};
