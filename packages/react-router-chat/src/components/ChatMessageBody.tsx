import * as React from 'react';
import { Markdown } from '@openthrottle/react-router-shadcn';
import type { ChatMessageRole } from '../types';

const EMPTY_BODY_LABEL = '(No content)';

export interface ChatMessageBodyProps {
  readonly body: string;
  readonly role: ChatMessageRole;
}

/**
 * @description Renders a message body: plain text for user; assistant/system
 * bodies are passed to {@link Markdown}, which currently shows the raw string
 * as escaped preformatted text (NOT parsed Markdown).
 *
 * Assistant/system bodies are untrusted (server LLM output + persisted history,
 * see `map-persisted-messages.ts`). Any future swap to a real Markdown renderer
 * MUST disable raw HTML (e.g. `react-markdown` without `rehype-raw`) or sanitize
 * with DOMPurify, and add an XSS regression test — see this package's README.
 */
export const ChatMessageBody = (
  props: ChatMessageBodyProps,
): React.ReactElement => {
  const { body, role } = props;

  // Hooks

  // Setup
  const trimmed = body.trim();

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (!trimmed) {
    return (
      <p className="text-muted-foreground text-sm italic">{EMPTY_BODY_LABEL}</p>
    );
  }

  if (role === 'user') {
    return <p className="break-words whitespace-pre-wrap">{body}</p>;
  }

  return (
    <Markdown
      className="text-sm break-words [&_pre]:whitespace-pre-wrap"
      content={body}
    />
  );
};
