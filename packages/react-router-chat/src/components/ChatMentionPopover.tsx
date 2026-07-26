import * as React from 'react';
import clsx from 'clsx';

export interface ChatMentionPopoverProps {
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
  readonly onSelectOption: (path: string) => void;
  /** Stable per-index option id for `aria-activedescendant`. */
  readonly optionId: (index: number) => string;
  /** Workspace-relative paths to offer (already filtered by the provider). */
  readonly results: readonly string[];
}

/**
 * Inline `@`-mention listbox anchored under the composer textarea. Presentational
 * only: it renders the provider's results and reports hover/selection; the
 * textarea (not this listbox) keeps focus and drives keyboard navigation, so
 * options commit on `mousedown` to avoid a blur before the click lands.
 *
 * Internal to react-router-chat (used by {@link ChatComposer}); not part of the
 * package's public export surface.
 */
export const ChatMentionPopover = (
  props: ChatMentionPopoverProps,
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
      data-testid="ChatMentionPopover"
    >
      {loading ? (
        <div className="text-muted-foreground p-3 text-sm" role="status">
          {loadingLabel}
        </div>
      ) : results.length === 0 ? (
        <div className="text-muted-foreground p-3 text-sm">{emptyLabel}</div>
      ) : (
        <ul aria-label="File mentions" id={listboxId} role="listbox">
          {results.map((path, index) => (
            <li
              aria-selected={index === activeIndex}
              className={clsx(
                'cursor-pointer px-3 py-1.5 text-sm',
                index === activeIndex
                  ? 'bg-accent text-accent-foreground'
                  : 'text-foreground',
              )}
              id={optionId(index)}
              key={path}
              // mousedown (not click) so the textarea does not blur first.
              onMouseDown={(event) => {
                event.preventDefault();
                onSelectOption(path);
              }}
              onMouseEnter={() => onHoverOption(index)}
              role="option"
            >
              {path}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
