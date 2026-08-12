import * as React from 'react';
import { TextArea } from '@openthrottle/react-router-shadcn';
import clsx from 'clsx';
import type { UseChatComposerMentionsResult } from '../hooks/use-chat-composer-mentions';
import type { UseChatComposerSlashCommandsResult } from '../hooks/use-chat-composer-slash-commands';
import type { ChatMentionProvider, ChatSlashCommandProvider } from '../types';
import { ChatMentionPopover } from './ChatMentionPopover';
import { ChatSlashCommandPopover } from './ChatSlashCommandPopover';

export interface ChatComposerInputProps {
  readonly disabled: boolean;
  readonly draft: string;
  readonly mentionProvider?: ChatMentionProvider;
  /** The `@`-mention state machine driving the textarea + mention popover. */
  readonly mentions: UseChatComposerMentionsResult;
  /** Composed keydown (popover nav first, then Enter-to-send) owned by the composer. */
  readonly onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  readonly placeholder: string;
  readonly readOnly: boolean;
  /** The `/`-command state machine driving the slash-command popover. */
  readonly slash: UseChatComposerSlashCommandsResult;
  readonly slashCommandProvider?: ChatSlashCommandProvider;
}

/**
 * @description The composer's textarea and its inline autocomplete popover(s),
 * split out of {@link ChatComposer} so that surface stays a thin form shell. The
 * autocomplete state machines (`@`-mentions and `/`-commands) live in the
 * composer and are threaded in as results; this component is presentational,
 * fanning each textarea event out to both machines and rendering whichever
 * popover is open. At most one popover is open at a time (`/` is anchored to a
 * line start, `@` scans back mid-text), so the two never overlap.
 */
export const ChatComposerInput = (
  props: ChatComposerInputProps,
): React.ReactElement => {
  const {
    disabled,
    draft,
    mentionProvider,
    mentions,
    onKeyDown,
    placeholder,
    readOnly,
    slash,
    slashCommandProvider,
  } = props;

  // Hooks

  // Setup
  // The open popover (if any) owns the aria wiring; at most one is ever open.
  const open = mentions.popoverOpen
    ? mentions
    : slash.popoverOpen
      ? slash
      : null;
  const autocompleteEnabled = mentions.mentionEnabled || slash.slashEnabled;
  const activeDescendant =
    open && open.results.length > 0
      ? open.optionId(open.activeIndex)
      : undefined;

  // Handlers
  const onChange = (event: React.ChangeEvent<HTMLTextAreaElement>): void => {
    mentions.onChange(event);
    slash.onChange(event);
  };
  const onClick = (event: React.MouseEvent<HTMLTextAreaElement>): void => {
    mentions.onClick(event);
    slash.onClick(event);
  };
  const onKeyUp = (event: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    mentions.onKeyUp(event);
    slash.onKeyUp(event);
  };
  const setRefs = (node: HTMLTextAreaElement | null): void => {
    mentions.setRefs(node);
    slash.setRefs(node);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  return (
    <div className="relative">
      <TextArea
        aria-activedescendant={activeDescendant}
        aria-autocomplete={autocompleteEnabled ? 'list' : undefined}
        aria-controls={open ? open.listboxId : undefined}
        aria-expanded={autocompleteEnabled ? open !== null : undefined}
        aria-label="Message"
        className={clsx({ 'text-muted-foreground': readOnly })}
        disabled={disabled}
        onChange={onChange}
        onClick={onClick}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        placeholder={placeholder}
        readOnly={readOnly}
        ref={setRefs}
        rows={3}
        value={draft}
      />
      {mentions.popoverOpen ? (
        <ChatMentionPopover
          activeIndex={mentions.activeIndex}
          emptyLabel={mentionProvider?.emptyLabel ?? 'No matching files.'}
          listboxId={mentions.listboxId}
          loading={mentions.loading}
          loadingLabel={mentionProvider?.loadingLabel ?? 'Searching files…'}
          onHoverOption={mentions.setActiveIndex}
          onSelectOption={mentions.selectOption}
          optionId={mentions.optionId}
          results={mentions.results}
        />
      ) : null}
      {slash.popoverOpen ? (
        <ChatSlashCommandPopover
          activeIndex={slash.activeIndex}
          emptyLabel={slashCommandProvider?.emptyLabel ?? 'No matching skills.'}
          listboxId={slash.listboxId}
          loading={slash.loading}
          loadingLabel={
            slashCommandProvider?.loadingLabel ?? 'Searching skills…'
          }
          onHoverOption={slash.setActiveIndex}
          onSelectOption={slash.selectOption}
          optionId={slash.optionId}
          results={slash.results}
        />
      ) : null}
    </div>
  );
};
