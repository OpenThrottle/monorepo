import * as React from 'react';
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@openthrottle/react-router-shadcn';
import {
  HELP_LINKS,
  HELP_MODAL_COPY,
  HELP_SHORTCUTS,
} from '../data/data.copy.help';
import { GlobalModal } from './GlobalModal';

export interface GlobalHelpModalProps {
  /**
   * @description Optional class applied to the dialog body wrapper.
   */
  readonly className?: string;
}

const MODAL_KEY = 'help' as const;
const MODAL_PARAM = 'modal' as const;

/**
 * @description URL-synced orientation dialog (`?modal=help`). Renders once at
 * app root; the {@link GlobalHelpTrigger} in the shared header sets the param.
 * Static copy only — no loading or failure path.
 */
export const GlobalHelpModal = (
  props: GlobalHelpModalProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup
  const isExternal = (href: string): boolean => href.startsWith('http');

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalModal param={MODAL_PARAM} value={MODAL_KEY}>
      <div className={className} data-testid="GlobalHelpModal">
        <DialogHeader>
          <DialogTitle className="text-card-foreground text-base font-semibold">
            {HELP_MODAL_COPY.title}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm leading-snug font-normal">
            {HELP_MODAL_COPY.description}
          </DialogDescription>
        </DialogHeader>

        <div className="text-muted-foreground mt-4 text-sm">
          <p className="text-card-foreground mb-2 text-sm font-semibold">
            Keyboard shortcuts
          </p>
          <ul className="mb-3 list-disc space-y-2 pl-4 font-normal">
            {HELP_SHORTCUTS.map((shortcut) => (
              <li key={shortcut.keys}>
                <kbd className="bg-muted text-foreground rounded px-1 py-0.5 text-[11px]">
                  {shortcut.keys}
                </kbd>{' '}
                — {shortcut.label}
              </li>
            ))}
          </ul>

          <p className="text-card-foreground mb-2 text-sm font-semibold">
            Where to go next
          </p>
          <ul className="list-disc space-y-2 pl-4 font-normal">
            {HELP_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  className="text-primary font-medium underline underline-offset-2"
                  href={link.href}
                  {...(isExternal(link.href)
                    ? { rel: 'noreferrer', target: '_blank' }
                    : {})}
                >
                  {link.label}
                </a>{' '}
                — {link.description}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </GlobalModal>
  );
};

GlobalHelpModal.key = MODAL_KEY;
