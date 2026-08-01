import * as React from 'react';
import {
  ChatComposer,
  ChatComposerToolbar,
  ChatThread,
  type ChatModelOption,
  type ChatPersonaOption,
} from '@openthrottle/react-router-chat';
import { InlineErrors } from '@openthrottle/react-router-shadcn';
import { CHAT_TOOLBAR_CONTEXT_SOURCES } from '~/routing/home/data/chat-toolbar';
import type { RepositoryOption } from '~/routing/home/data/models.server';
import type { UseAgenticChatTurnResult } from '~/routing/home/hooks/useAgenticChatTurn';
import type { UseConversationListResult } from '~/routing/home/hooks/useConversationList';
import { useHomeComposer } from '~/routing/home/hooks/useHomeComposer';

export interface HomeComposerProps {
  /** Sidebar-backing conversation list; the composer refreshes it on new persisted turns. */
  conversationList: UseConversationListResult;
  /** Discovered composer models (local endpoints + agent CLIs + driver×endpoint). */
  models: ChatModelOption[];
  /** Registry personas; falls back to the mock list when empty. */
  personas: ChatPersonaOption[];
  /** Registered local checkouts selectable as the CLI working directory. */
  repositories: RepositoryOption[];
  /** Streaming turn lifecycle shared with the parent route (and sidebar). */
  turn: UseAgenticChatTurnResult;
}

/**
 * @description The models/personas/repositories-dependent composer + toolbar
 * subtree of the home route. Rendered inside the home route's `<Await>` once the
 * deferred composer-data bundle resolves, so the route shell (hero + sidebar)
 * paints instantly while model discovery streams in behind a Suspense fallback.
 */
export const HomeComposer = (props: HomeComposerProps): React.ReactElement => {
  const { conversationList, models, personas, repositories, turn } = props;

  // Hooks
  const {
    capabilities,
    checkouts,
    composerTextAreaRef,
    draft,
    hasModels,
    hasRepositories,
    isCliBackend,
    mentionProvider,
    mode,
    modelGroups,
    modelId,
    onSubmit,
    permissionMode,
    persist,
    personaId,
    personas: effectivePersonas,
    reasoning,
    repositoryId,
    serviceTier,
    setDraft,
    setMode,
    setModelId,
    setPermissionMode,
    setPersist,
    setPersonaId,
    setReasoning,
    setRepositoryId,
    setServiceTier,
    voice,
  } = useHomeComposer({
    conversationList,
    models,
    personas,
    repositories,
    turn,
  });

  // Setup

  // Handlers

  // Markup
  const toolbar = (
    <div className="flex flex-col gap-2">
      <ChatComposerToolbar
        capabilities={capabilities}
        checkouts={checkouts}
        contextSources={CHAT_TOOLBAR_CONTEXT_SOURCES}
        micState={voice.micState}
        mode={mode}
        modelGroups={modelGroups}
        modelId={modelId}
        models={models}
        onAddContext={() => {}}
        onCheckoutChange={setRepositoryId}
        onMicToggle={() => void voice.toggle()}
        onModeChange={setMode}
        onModelChange={setModelId}
        onPermissionModeChange={setPermissionMode}
        onPersistChange={setPersist}
        onPersonaChange={setPersonaId}
        onReasoningChange={setReasoning}
        onServiceTierChange={setServiceTier}
        permissionMode={permissionMode}
        persist={persist}
        personaId={personaId}
        personas={effectivePersonas}
        reasoning={reasoning}
        selectedCheckoutId={repositoryId}
        serviceTier={serviceTier}
      />
      {isCliBackend && !hasRepositories ? (
        <p className="text-muted-foreground text-xs">
          Register a local repository in Settings to run an agent CLI.
        </p>
      ) : null}
    </div>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      <ChatThread
        canRetry={turn.canRetry}
        emptyStateLabel=""
        messages={turn.messages}
        onRetry={turn.onRetry}
      />
      <InlineErrors errors={[turn.error, voice.error]} />
      {!hasModels ? (
        <p className="text-muted-foreground mb-2 text-center text-sm">
          No local models discovered. Start a local OpenAI-compatible server
          (e.g. Ollama) and reload.
        </p>
      ) : null}
      <ChatComposer
        className="border-t-0"
        disabled={!hasModels}
        draft={draft}
        isStreaming={turn.isStreaming}
        mentionProvider={mentionProvider}
        onDraftChange={setDraft}
        onStop={turn.onStop}
        onSubmit={onSubmit}
        readOnly={voice.isDraftFrozen}
        sessionUsage={turn.sessionUsage}
        textAreaRef={composerTextAreaRef}
        toolbar={toolbar}
      />
    </>
  );
};
