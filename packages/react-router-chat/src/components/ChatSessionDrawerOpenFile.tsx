import { fillTemplate } from '@openthrottle/nodejs-utils';
import { Button } from '@openthrottle/react-router-shadcn';
import { ExternalLink } from 'lucide-react';
import * as React from 'react';

import { CHAT_PANEL_HOVER_CLASSES } from '../data/chat-panel.classes';
import { CHAT_SESSION_DRAWER_COPY } from '../data/copy';
import type { ChatFileHrefBuilder } from '../types';

export interface ChatSessionDrawerOpenFileProps {
  /** The host's file-link builder; undefined when it has no editor or checkout path. */
  readonly buildFileHref: ChatFileHrefBuilder | undefined;
  /** The file's path as the drawer shows it. */
  readonly path: string;
}

/**
 * @description The secondary action beside a drawer file row: an icon link that opens the
 * file in the user's editor. Renders nothing when the host gives no link for the path.
 *
 * @public
 */
export const ChatSessionDrawerOpenFile = (
  props: ChatSessionDrawerOpenFileProps,
): React.ReactElement | null => {
  const { buildFileHref, path } = props;

  // Hooks

  // Setup
  const href = buildFileHref?.(path) ?? null;
  const label = fillTemplate(CHAT_SESSION_DRAWER_COPY.changes.openInEditor, {
    path,
  });

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (href === null) {
    return null;
  }

  return (
    <Button
      asChild={true}
      className={CHAT_PANEL_HOVER_CLASSES}
      data-testid="ChatSessionDrawerOpenFile"
      size="icon"
      variant="ghost"
    >
      <a aria-label={label} href={href} title={label}>
        <ExternalLink aria-hidden={true} className="size-3.5" />
      </a>
    </Button>
  );
};
