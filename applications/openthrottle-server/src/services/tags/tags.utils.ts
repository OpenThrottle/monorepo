import type { TagSource } from '@openthrottle/nestjs-repositories-server';
import { TAG_SOURCES } from '@openthrottle/nestjs-repositories-server';
import { QueryFailedError } from 'typeorm';

import { TAGGING_SERVICE_ACCOUNT_NAME } from './tags.constants.ts';
import type { TagCaller } from './tags.types.ts';

/**
 * @description Derives the provenance source from the caller identity:
 * user → `human`; the tagging service account → `server-llm`; any other
 * service account (MCP, Ralph workers) → `agent`.
 */
export const deriveTagSource = (caller: TagCaller): TagSource => {
  if (caller.principalKind === 'user') {
    return TAG_SOURCES.HUMAN;
  }
  if (caller.serviceAccountName === TAGGING_SERVICE_ACCOUNT_NAME) {
    return TAG_SOURCES.SERVER_LLM;
  }
  return TAG_SOURCES.AGENT;
};

/**
 * @description True when a TypeORM error wraps a Postgres foreign-key violation (SQLSTATE
 * 23503), which a tag write raises when its plan, task or project does not exist.
 */
export const isForeignKeyViolation = (error: unknown): boolean => {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }
  const driverError: unknown = error.driverError;
  return (
    typeof driverError === 'object' &&
    driverError !== null &&
    'code' in driverError &&
    driverError.code === '23503'
  );
};
