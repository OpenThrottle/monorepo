/**
 * @description The credential scope vocabulary stored in `service_account_credentials.scopes`
 * and declared on handlers with the server's `@CredentialScope()`. A credential whose `scopes`
 * is null is unrestricted; a non-null list limits it to handlers declaring one of these.
 * `TELEMETRY_INGEST` covers what the telemetry hook plugins (`plugins/openthrottle*`) send:
 * `recordSkillUsage`, `recordSkillUsageOutcome`, `recordTokenUsage`,
 * `recordTelemetryHeartbeat` and `recordAgentTrajectory`. The plan-workflow hooks are a
 * separate plugin and need an unrestricted token.
 * @public
 */
export const SERVICE_ACCOUNT_CREDENTIAL_SCOPES = {
  TELEMETRY_INGEST: 'telemetry:ingest',
} as const;

/**
 * @description Label of the `telemetry:ingest` credential the local server provisions on the
 * `openthrottle-mcp` service account and writes into `~/.openthrottle/.env`.
 * @public
 */
export const TELEMETRY_INGEST_CREDENTIAL_LABEL = 'bootstrap-skill-usage';

/**
 * @description The purpose `deriveServiceAccountToken` mixes in to derive the telemetry-ingest
 * token from `OPENTHROTTLE_MCP_AUTH_TOKEN`. Changing it rotates every install's token.
 * @public
 */
export const TELEMETRY_INGEST_TOKEN_PURPOSE = 'telemetry-ingest';
