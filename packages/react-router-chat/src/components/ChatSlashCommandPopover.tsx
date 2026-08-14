import * as React from 'react';
import clsx from 'clsx';
import type { ChatSlashCommand } from '../types';

export interface ChatSlashCommandPopoverProps {
  /** Index of the highlighted option (keyboard/hover). */
  readonly activeIndex: number;
  /** Copy shown when {@link results} is empty and not loading. */
  readonly emptyLabel: string;
  /** id of the listbox element, wired to the textarea's `aria-controls`. */
  readonly listboxId: string;
  /** True while the provider query is in flight. */
  readonly loading: boolean;
  /** Copy shown while {@link loading}. */
  readonly loadingLabel: string;
  /** Highlight an option on pointer hover (keeps the textarea focused). */
  readonly onHoverOption: (index: number) => void;
  /** Commit an option (click). Uses mousedown so the textarea keeps focus. */
  readonly onSelectOption: (slug: string) => void;
  /** Stable per-index option id for `aria-activedescendant`. */
  readonly optionId: (index: number) => string;
  /** Skills to offer (already filtered by the provider). */
  readonly results: readonly ChatSlashCommand[];
}

/**
 * Inline `/`-command listbox anchored under the composer textarea. Presentational
 * only: it renders the provider's skills and reports hover/selection; the
 * textarea (not this listbox) keeps focus and drives keyboard navigation, so
 * options commit on `mousedown` to avoid a blur before the click lands. A
 * model-disabled skill is still selectable — it carries a subtle marker rather
 * than being dropped.
 *
 * Internal to react-router-chat (used by {@link ChatComposer}); not part of the
 * package's public export surface.
 */
export const ChatSlashCommandPopover = (
  props: ChatSlashCommandPopoverProps,
): React.ReactElement => {
  const {
    activeIndex,
    emptyLabel,
    listboxId,
    loading,
    loadingLabel,
    onHoverOption,
    onSelectOption,
    optionId,
    results,
  } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  return (
    <div
      className="bg-popover text-popover-foreground absolute bottom-full z-50 mb-1 max-h-60 w-full overflow-y-auto rounded-md border shadow-md"
      data-testid="ChatSlashCommandPopover"
    >
      {loading ? (
        <div className="text-muted-foreground p-3 text-sm" role="status">
          {loadingLabel}
        </div>
      ) : results.length === 0 ? (
        <div className="text-muted-foreground p-3 text-sm">{emptyLabel}</div>
      ) : (
        <ul aria-label="Slash commands" id={listboxId} role="listbox">
          {results.map((command, index) => (
            <li
              aria-selected={index === activeIndex}
              className={clsx(
                'flex cursor-pointer items-baseline gap-2 px-3 py-1.5 text-sm',
                index === activeIndex
                  ? 'bg-accent text-accent-foreground'
                  : 'text-foreground',
              )}
              id={optionId(index)}
              key={command.slug}
              // mousedown (not click) so the textarea does not blur first.
              onMouseDown={(event) => {
                event.preventDefault();
                onSelectOption(command.slug);
              }}
              onMouseEnter={() => onHoverOption(index)}
              role="option"
            >
              <span className="font-medium whitespace-nowrap">
                /{command.slug}
              </span>
              {command.description ? (
                <span className="text-muted-foreground truncate">
                  {command.description}
                </span>
              ) : null}
              {command.disabledForModel ? (
                <span
                  className="text-muted-foreground border-border ml-auto shrink-0 rounded border px-1 text-[10px] tracking-wide uppercase"
                  title="The model cannot auto-invoke this skill; you can still run it."
                >
                  Manual
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
