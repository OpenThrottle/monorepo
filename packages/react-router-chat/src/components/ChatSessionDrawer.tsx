import { Button } from '@openthrottle/react-router-shadcn';
import { X } from 'lucide-react';
import * as React from 'react';

import { CHAT_PANEL_HOVER_CLASSES } from '../data/chat-panel.classes';
import { CHAT_SESSION_DRAWER_SECTIONS } from '../data/chat-session-drawer-sections';
import { CHAT_SESSION_DRAWER_COPY } from '../data/copy';
import type {
  ChatMessage,
  ChatQueuedMessage,
  ChatSessionChanges,
  ChatSessionEnvironment,
} from '../types';
import { deriveSessionFiles } from '../utils/deriveSessionFiles';
import { ChatSessionDrawerChanges } from './ChatSessionDrawerChanges';
import { ChatSessionDrawerContext } from './ChatSessionDrawerContext';
import { ChatSessionDrawerEnvironment } from './ChatSessionDrawerEnvironment';
import { ChatSessionDrawerRunning } from './ChatSessionDrawerRunning';
import { ChatSessionDrawerSection } from './ChatSessionDrawerSection';

export interface ChatSessionDrawerProps {
  /** The Changes section's diff, selection and callbacks, owned by the host. */
  readonly changes: ChatSessionChanges;
  /** Ids of the sections shown collapsed. */
  readonly collapsedSections: readonly string[];
  /** What the next turn runs with, once the composer has reported it. */
  readonly environment: ChatSessionEnvironment | undefined;
  /** True while a turn is in flight. */
  readonly isStreaming: boolean;
  /** The thread the drawer summarizes. */
  readonly messages: readonly ChatMessage[];
  readonly onClose: () => void;
  readonly onToggleSection: (sectionId: string) => void;
  /** Messages queued behind the running turn, when the host has a queue. */
  readonly queuedMessages: readonly ChatQueuedMessage[] | undefined;
  /** False when the host already supplies a close control (a Sheet's own). */
  readonly showClose: boolean;
}

/**
 * @description The collapsible session panel beside a chat: Running, Context,
 * Environment and Changes (which marks the files this conversation touched), each a
 * collapsible section. Presentational —
 * open state, the collapsed set and any persistence belong to the host; this
 * renders the panel's content and reports toggles and close.
 *
 * @public
 */
export const ChatSessionDrawer = (
  props: ChatSessionDrawerProps,
): React.ReactElement => {
  const {
    changes,
    collapsedSections,
    environment,
    isStreaming,
    messages,
    onClose,
    onToggleSection,
    queuedMessages,
    showClose,
  } = props;

  // Hooks
  const rootPath = environment?.checkout?.filesystemPath;
  const touchedFiles = React.useMemo(() => {
    return deriveSessionFiles(messages, rootPath);
  }, [messages, rootPath]);

  // Setup
  const copy = CHAT_SESSION_DRAWER_COPY;
  const sections = CHAT_SESSION_DRAWER_SECTIONS;
  const liveDiff = changes.diff?.available === true ? changes.diff : undefined;
  const sectionFor = (
    sectionId: string,
    title: string,
    body: React.ReactNode,
  ) => {
    return (
      <ChatSessionDrawerSection
        isCollapsed={collapsedSections.includes(sectionId)}
        onToggle={() => onToggleSection(sectionId)}
        sectionId={sectionId}
        title={title}
      >
        {body}
      </ChatSessionDrawerSection>
    );
  };

  // Handlers

  // Markup
  const closeButton = (
    <Button
      aria-label={copy.closeLabel}
      className={CHAT_PANEL_HOVER_CLASSES}
      data-testid="ChatSessionDrawer-close"
      onClick={onClose}
      size="icon"
      title={copy.closeLabel}
      type="button"
      variant="ghost"
    >
      <X aria-hidden={true} className="size-4" />
    </Button>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <aside
      aria-label={copy.region}
      className="flex h-full min-h-0 w-full flex-col"
      data-testid="ChatSessionDrawer"
    >
      <div className="flex h-12 shrink-0 items-center justify-between border-b px-4">
        <h2 className="text-sm font-medium">{copy.title}</h2>
        {showClose ? closeButton : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {sectionFor(
          sections.RUNNING,
          copy.sectionTitles.running,
          <ChatSessionDrawerRunning
            isStreaming={isStreaming}
            messages={messages}
            queuedMessages={queuedMessages}
          />,
        )}
        {sectionFor(
          sections.CONTEXT,
          copy.sectionTitles.context,
          <ChatSessionDrawerContext messages={messages} />,
        )}
        {sectionFor(
          sections.ENVIRONMENT,
          copy.sectionTitles.environment,
          <ChatSessionDrawerEnvironment
            environment={environment}
            headBranch={liveDiff?.headBranch}
            pullRequest={liveDiff?.pullRequest}
          />,
        )}
        {sectionFor(
          sections.CHANGES,
          copy.sectionTitles.changes,
          <ChatSessionDrawerChanges
            {...changes}
            isStreaming={isStreaming}
            touchedFiles={touchedFiles}
          />,
        )}
      </div>
    </aside>
  );
};
