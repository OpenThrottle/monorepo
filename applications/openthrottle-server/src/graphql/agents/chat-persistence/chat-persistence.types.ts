interface ResolvePersistedConversationFailure {
  readonly errorMessage: string;
  readonly ok: false;
}

interface ResolvePersistedConversationSuccess {
  readonly conversationId: string;
  readonly ok: true;
}

export type ResolvePersistedConversationResult =
  ResolvePersistedConversationFailure | ResolvePersistedConversationSuccess;
