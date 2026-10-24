import { GraphqlResponseError } from '@openthrottle/react-router-graphql';

/**
 * `extensions.code` values the server raises for workspace-folder failures
 * (`WorkspaceFolderErrorCode` in openthrottle-server). Branch on these, never
 * on message text.
 */
export const WORKSPACE_FOLDER_ERROR_CODES = {
  rootsNotConfigured: 'WORKSPACE_ROOTS_NOT_CONFIGURED',
} as const;

export interface ActionErrorResult {
  error: string;
  errorCode?: string;
}

/**
 * @description Shape a thrown failure into a route-action error. A server
 * GraphQL error contributes its own (unprefixed) message and stable
 * `extensions.code`; anything else keeps its message, or the caller's
 * fallback when it has none.
 */
export const toActionError = (
  error: unknown,
  fallback: string,
): ActionErrorResult => {
  if (error instanceof GraphqlResponseError) {
    return error.code === undefined
      ? { error: error.graphqlMessage }
      : { error: error.graphqlMessage, errorCode: error.code };
  }
  return { error: error instanceof Error ? error.message : fallback };
};
