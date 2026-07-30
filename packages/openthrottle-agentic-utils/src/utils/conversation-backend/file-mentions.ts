/**
 * Structured injection of the composer's @-mentioned files. The paths already
 * travel inline in the user message as `@path` tokens; this turns them into an
 * explicit, deduplicated "Referenced files" preamble the agent can act on as
 * first-class references (a CLI agent reads them with its own tools; the openai
 * HTTP backend, which has no tools, still gets them as context). We inject the
 * paths, NOT file contents — content preloading would be unbounded and the CLI
 * agents can read on demand.
 */

import type { ChatCompletionMessage } from '../chat-completions/index.ts';

/**
 * Upper bound on referenced paths listed in the preamble, so a pathological
 * mention list can never balloon the prompt. Extra paths collapse to a count.
 */
const MAX_LISTED_MENTIONS = 100;

/**
 * Normalize the raw mention list: trim, drop blanks, and dedupe while keeping
 * first-seen order. Returns an empty array when nothing usable remains.
 */
function normalizeMentions(
  fileMentions: readonly string[] | undefined,
): string[] {
  if (fileMentions === undefined) {
    return [];
  }
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of fileMentions) {
    const path = raw.trim();
    if (path !== '' && !seen.has(path)) {
      seen.add(path);
      result.push(path);
    }
  }
  return result;
}

/**
 * Build the "Referenced files" preamble for a mention list, or `''` when there
 * is nothing to inject. Paths beyond {@link MAX_LISTED_MENTIONS} collapse into a
 * trailing "(+N more)" line so the block stays bounded.
 */
export function fileMentionsPreamble(
  fileMentions: readonly string[] | undefined,
): string {
  const mentions = normalizeMentions(fileMentions);
  if (mentions.length === 0) {
    return '';
  }

  const listed = mentions.slice(0, MAX_LISTED_MENTIONS);
  const lines = listed.map((path) => `- ${path}`);
  const overflow = mentions.length - listed.length;
  if (overflow > 0) {
    lines.push(`- (+${overflow} more)`);
  }

  return [
    'The user referenced these workspace files (paths relative to the repository root):',
    ...lines,
  ].join('\n');
}

/**
 * Prepend the {@link fileMentionsPreamble} to a composed CLI prompt, separated
 * by a blank line. Returns the prompt unchanged when there are no mentions.
 */
export function withFileMentions(
  prompt: string,
  fileMentions: readonly string[] | undefined,
): string {
  const preamble = fileMentionsPreamble(fileMentions);
  return preamble === '' ? prompt : `${preamble}\n\n${prompt}`;
}

/**
 * Prepend a system message carrying the {@link fileMentionsPreamble} to a chat
 * message list, for backends that consume `messages` rather than a single
 * prompt (openai). Returns the list unchanged when there are no mentions.
 */
export function withFileMentionsMessage(
  messages: ReadonlyArray<ChatCompletionMessage>,
  fileMentions: readonly string[] | undefined,
): ReadonlyArray<ChatCompletionMessage> {
  const preamble = fileMentionsPreamble(fileMentions);
  if (preamble === '') {
    return messages;
  }
  return [{ content: preamble, role: 'system' }, ...messages];
}
