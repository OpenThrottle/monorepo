import * as React from 'react';
import type { ChatMessageRole } from '../types';

/**
 * `MarkdownRenderer` pulls the MDX compiler — `@mdx-js/mdx`, which carries two
 * copies of acorn — for a total of ~505 KB. The chat surface is mounted from the
 * global header on every route, so a static import hoisted that whole stack into
 * the app shell and every navigation paid for it. Chat messages arrive over the
 * wire and are never part of the server-rendered HTML, so deferring the compiler
 * to the first assistant message costs nothing here (unlike the docs/plan routes,
 * which SSR their prose and keep the direct import).
 */
const MarkdownRendererLazy = React.lazy(async () => {
  const markdownModule = await import('@openthrottle/react-router-markdown');

  return { default: markdownModule.MarkdownRenderer };
});

export interface ChatMessageBodyProps {
  readonly body: string;
  readonly role: ChatMessageRole;
}

/**
 * @description Renders a message body: plain text for user; assistant/system
 * bodies are compiled as Markdown by `MarkdownRenderer`, loaded lazily. Until it
 * arrives the body shows as escaped preformatted text, so content is legible
 * immediately and upgrades in place rather than flashing empty.
 *
 * Assistant/system bodies are untrusted (server LLM output + persisted history,
 * see `map-persisted-messages.ts`). `MarkdownRenderer` compiles via MDX with raw
 * HTML disabled; any change to that MUST keep raw HTML off (or sanitize with
 * DOMPurify) and add an XSS regression test — see this package's README.
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
  const fallback = <p className="break-words whitespace-pre-wrap">{body}</p>;

  // Life Cycle

  // 🔌 Short Circuit
  if (!trimmed) {
    return <p className="text-muted-foreground text-sm italic">(No content)</p>;
  }

  if (role === 'user') {
    return <p className="break-words whitespace-pre-wrap">{body}</p>;
  }

  return (
    <React.Suspense fallback={fallback}>
      <MarkdownRendererLazy
        className="bg-card rounded-lg p-4 text-sm break-words [&_pre]:whitespace-pre-wrap"
        source={body}
      />
    </React.Suspense>
  );
};
