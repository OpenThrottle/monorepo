/**
 * `extensions.code` values runProject refuses with, so a client (the project page, the MCP tool)
 * can tell "already running" from "nothing to run" without parsing the message.
 */
export const PROJECT_RUN_ERROR_CODE = {
  ACTIVE: 'PROJECT_RUN_ACTIVE',
  NOTHING_TO_RUN: 'PROJECT_RUN_NOTHING_TO_RUN',
  NOT_FOUND: 'NOT_FOUND',
} as const;
