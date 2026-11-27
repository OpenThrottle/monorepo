/**
 * @description Status tone of an MCP server row.
 */
export type SessionMcpTone = 'error' | 'neutral' | 'ok' | 'warn';

/**
 * @description Dot colour per tone, from the existing theme tokens.
 *
 * @public
 */
export const SESSION_MCP_TONE_CLASSES: Record<SessionMcpTone, string> = {
  error: 'bg-destructive',
  neutral: 'bg-muted-foreground',
  ok: 'bg-primary',
  warn: 'bg-foreground/50',
};

/**
 * @description The tone for each status word the Claude CLI is known to report.
 */
export const SESSION_MCP_STATUS_TONES = {
  connected: 'ok',
  disabled: 'neutral',
  failed: 'error',
  'needs-auth': 'warn',
  pending: 'warn',
} as const satisfies Record<string, SessionMcpTone>;

export type SessionMcpStatusTonesKey = keyof typeof SESSION_MCP_STATUS_TONES;
export type SessionMcpStatusTonesValue =
  (typeof SESSION_MCP_STATUS_TONES)[SessionMcpStatusTonesKey];
