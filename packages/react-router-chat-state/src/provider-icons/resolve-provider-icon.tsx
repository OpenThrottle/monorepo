import * as React from 'react';
import { ClaudeIcon } from './ClaudeIcon';
import { CursorIcon } from './CursorIcon';
import { GrokIcon } from './GrokIcon';
import { OpenAiIcon } from './OpenAiIcon';
import { OpenCodeIcon } from './OpenCodeIcon';
import { ProviderLetterIcon } from './ProviderLetterIcon';

/** Prefix the app-side mapper uses for a local OpenAI endpoint group id. */
const OPENAI_GROUP_PREFIX = 'openai:';

/**
 * Map a picker group id to its provider glyph. Agent-CLI groups key on the bare
 * driver backend id (`claude`, `codex`, `cursor`, `grok`, `opencode`); local
 * OpenAI endpoint groups use the `openai:<providerOrHost>` prefix. Unknown ids
 * get a {@link ProviderLetterIcon} derived from the id. Pure and SSR-safe.
 *
 * @public
 */
export function resolveProviderIcon(groupId: string): React.ReactNode {
  const key = groupId.toLowerCase();

  if (key.startsWith(OPENAI_GROUP_PREFIX)) {
    return <OpenAiIcon />;
  }

  switch (key) {
    case 'claude':
      return <ClaudeIcon />;
    case 'codex':
      return <OpenAiIcon />;
    case 'cursor':
      return <CursorIcon />;
    case 'grok':
      return <GrokIcon />;
    case 'opencode':
      return <OpenCodeIcon />;
    default:
      return <ProviderLetterIcon label={groupId} />;
  }
}
