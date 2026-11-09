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
