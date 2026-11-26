import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { isStringArray, toErrorMessage } from '@openthrottle/nodejs-utils';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';

import type { AgentConversationRow } from './agent-conversations-api';
import {
  emptyMutateAgentConversationResult,
  toAgentConversationListItem,
  trimStringFormField,
} from './agent-conversations-api';
import type {
  AgentConversationGroup,
  ListAgentConversationGroupsResult,
  MutateAgentConversationGroupResult,
  MutateAgentConversationResult,
} from './types';

/**
 * @description Pinning and user-defined groups for the chat conversations
 * sidebar, behind the same `/resources/agent-conversations` resource route as
 * {@link createAgentConversationsApi}. A separate factory so an app that does
 * not offer pinning or groups (the admin app) need not supply these documents.
 * Server-only: the intent handlers run in resource-route actions.
 */

/** A conversation group row (GraphQL) reduced to the sidebar shape. @public */
export interface AgentConversationGroupRow {
  readonly id: string;
  readonly name: string;
  readonly sortOrder: number;
}

/**
 * The app-generated pin/group documents the shared API executes. Kept
 * structural so each app's generated documents are assignable.
 * @public
 */
export interface AgentConversationGroupsDocuments {
  readonly createGroupDocument: TypedDocumentNode<
    { createAgentConversationGroup: AgentConversationGroupRow },
    { input: { name: string } }
  >;
  readonly deleteGroupDocument: TypedDocumentNode<
    { deleteAgentConversationGroup: AgentConversationGroupRow },
    { input: { groupId: string } }
  >;
  readonly listGroupsDocument: TypedDocumentNode<
    { listAgentConversationGroups: readonly AgentConversationGroupRow[] },
    Record<string, never>
  >;
  readonly moveToGroupDocument: TypedDocumentNode<
    { moveAgentConversationToGroup: AgentConversationRow },
    { input: { conversationId: string; groupId?: string | null } }
  >;
  readonly renameGroupDocument: TypedDocumentNode<
    { renameAgentConversationGroup: AgentConversationGroupRow },
    { input: { groupId: string; name: string } }
  >;
  readonly reorderGroupsDocument: TypedDocumentNode<
    { reorderAgentConversationGroup: readonly AgentConversationGroupRow[] },
    { input: { groupIds: string[] } }
  >;
  readonly setPinnedDocument: TypedDocumentNode<
    { setAgentConversationPinned: AgentConversationRow },
    { input: { conversationId: string; pinned: boolean } }
  >;
}

/** The pin/group resource-route intent handlers. @public */
export interface AgentConversationGroupsApi {
  handleCreateGroupIntent(
    request: Request,
    formData: FormData,
  ): Promise<MutateAgentConversationGroupResult>;
  handleDeleteGroupIntent(
    request: Request,
    formData: FormData,
  ): Promise<MutateAgentConversationGroupResult>;
  handleListGroupsIntent(
    request: Request,
  ): Promise<ListAgentConversationGroupsResult>;
  handleMoveToGroupIntent(
    request: Request,
    formData: FormData,
  ): Promise<MutateAgentConversationResult>;
  handleRenameGroupIntent(
    request: Request,
    formData: FormData,
  ): Promise<MutateAgentConversationGroupResult>;
  /** `groupIds` is a JSON array: every one of the user's group ids, in order. */
  handleReorderGroupsIntent(
    request: Request,
    formData: FormData,
  ): Promise<ListAgentConversationGroupsResult>;
  handleSetPinnedIntent(
    request: Request,
    formData: FormData,
  ): Promise<MutateAgentConversationResult>;
}

/** @public */
export const emptyMutateAgentConversationGroupResult = (
  overrides: Partial<MutateAgentConversationGroupResult>,
): MutateAgentConversationGroupResult => {
  return {
    conversation: null,
    errorMessage: null,
    group: null,
    ...overrides,
  };
};

const parseGroupIds = (value: FormDataEntryValue | null): string[] | null => {
  if (typeof value !== 'string') {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(value);

    return isStringArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
};

const toAgentConversationGroup = (
  row: AgentConversationGroupRow,
): AgentConversationGroup => {
  return { id: row.id, name: row.name, sortOrder: row.sortOrder };
};

/**
 * Build the pin/group API from an app's generated documents.
 * @public
 */
export function createAgentConversationGroupsApi(
  documents: AgentConversationGroupsDocuments,
): AgentConversationGroupsApi {
  const handleListGroupsIntent = async (
    request: Request,
  ): Promise<ListAgentConversationGroupsResult> => {
    try {
      const data = await executeGraphqlWithAuth(
        request,
        documents.listGroupsDocument,
        {},
      );

      return {
        errorMessage: null,
        groups: data.listAgentConversationGroups.map(toAgentConversationGroup),
      };
    } catch (error) {
      return { errorMessage: toErrorMessage(error), groups: [] };
    }
  };

  const handleSetPinnedIntent = async (
    request: Request,
    formData: FormData,
  ): Promise<MutateAgentConversationResult> => {
    const conversationId = trimStringFormField(formData.get('conversationId'));

    if (conversationId == null) {
      return emptyMutateAgentConversationResult({
        errorMessage: 'conversationId is required',
      });
    }

    try {
      const data = await executeGraphqlWithAuth(
        request,
        documents.setPinnedDocument,
        {
          input: { conversationId, pinned: formData.get('pinned') === 'true' },
        },
      );

      return emptyMutateAgentConversationResult({
        conversation: toAgentConversationListItem(
          data.setAgentConversationPinned,
        ),
      });
    } catch (error) {
      return emptyMutateAgentConversationResult({
        errorMessage: toErrorMessage(error),
      });
    }
  };

  const moveToGroup = async (
    request: Request,
    conversationId: string,
    groupId: string | null,
  ): Promise<MutateAgentConversationResult> => {
    const data = await executeGraphqlWithAuth(
      request,
      documents.moveToGroupDocument,
      { input: { conversationId, groupId } },
    );

    return emptyMutateAgentConversationResult({
      conversation: toAgentConversationListItem(
        data.moveAgentConversationToGroup,
      ),
    });
  };

  const handleMoveToGroupIntent = async (
    request: Request,
    formData: FormData,
  ): Promise<MutateAgentConversationResult> => {
    const conversationId = trimStringFormField(formData.get('conversationId'));

    if (conversationId == null) {
      return emptyMutateAgentConversationResult({
        errorMessage: 'conversationId is required',
      });
    }

    try {
      const groupId = trimStringFormField(formData.get('groupId'));

      return await moveToGroup(request, conversationId, groupId);
    } catch (error) {
      return emptyMutateAgentConversationResult({
        errorMessage: toErrorMessage(error),
      });
    }
  };

  const handleCreateGroupIntent = async (
    request: Request,
    formData: FormData,
  ): Promise<MutateAgentConversationGroupResult> => {
    const name = trimStringFormField(formData.get('name'));

    if (name == null) {
      return emptyMutateAgentConversationGroupResult({
        errorMessage: 'name is required',
      });
    }

    try {
      const data = await executeGraphqlWithAuth(
        request,
        documents.createGroupDocument,
        { input: { name } },
      );
      const group = toAgentConversationGroup(data.createAgentConversationGroup);
      const conversationId = trimStringFormField(
        formData.get('conversationId'),
      );
      if (conversationId == null) {
        return emptyMutateAgentConversationGroupResult({ group });
      }
      const moved = await moveToGroup(request, conversationId, group.id);

      return emptyMutateAgentConversationGroupResult({
        conversation: moved.conversation,
        group,
      });
    } catch (error) {
      return emptyMutateAgentConversationGroupResult({
        errorMessage: toErrorMessage(error),
      });
    }
  };

  const handleRenameGroupIntent = async (
    request: Request,
    formData: FormData,
  ): Promise<MutateAgentConversationGroupResult> => {
    const groupId = trimStringFormField(formData.get('groupId'));
    const name = trimStringFormField(formData.get('name'));

    if (groupId == null || name == null) {
      return emptyMutateAgentConversationGroupResult({
        errorMessage: 'groupId and name are required',
      });
    }

    try {
      const data = await executeGraphqlWithAuth(
        request,
        documents.renameGroupDocument,
        { input: { groupId, name } },
      );

      return emptyMutateAgentConversationGroupResult({
        group: toAgentConversationGroup(data.renameAgentConversationGroup),
      });
    } catch (error) {
      return emptyMutateAgentConversationGroupResult({
        errorMessage: toErrorMessage(error),
      });
    }
  };

  const handleDeleteGroupIntent = async (
    request: Request,
    formData: FormData,
  ): Promise<MutateAgentConversationGroupResult> => {
    const groupId = trimStringFormField(formData.get('groupId'));

    if (groupId == null) {
      return emptyMutateAgentConversationGroupResult({
        errorMessage: 'groupId is required',
      });
    }

    try {
      const data = await executeGraphqlWithAuth(
        request,
        documents.deleteGroupDocument,
        { input: { groupId } },
      );

      return emptyMutateAgentConversationGroupResult({
        group: toAgentConversationGroup(data.deleteAgentConversationGroup),
      });
    } catch (error) {
      return emptyMutateAgentConversationGroupResult({
        errorMessage: toErrorMessage(error),
      });
    }
  };

  const handleReorderGroupsIntent = async (
    request: Request,
    formData: FormData,
  ): Promise<ListAgentConversationGroupsResult> => {
    const groupIds = parseGroupIds(formData.get('groupIds'));

    if (groupIds == null) {
      return { errorMessage: 'groupIds is required', groups: [] };
    }

    try {
      const data = await executeGraphqlWithAuth(
        request,
        documents.reorderGroupsDocument,
        { input: { groupIds } },
      );

      return {
        errorMessage: null,
        groups: data.reorderAgentConversationGroup.map(
          toAgentConversationGroup,
        ),
      };
    } catch (error) {
      return { errorMessage: toErrorMessage(error), groups: [] };
    }
  };

  return {
    handleCreateGroupIntent,
    handleDeleteGroupIntent,
    handleListGroupsIntent,
    handleMoveToGroupIntent,
    handleRenameGroupIntent,
    handleReorderGroupsIntent,
    handleSetPinnedIntent,
  };
}
