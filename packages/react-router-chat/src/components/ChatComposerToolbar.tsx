import * as React from 'react';
import classnames from 'classnames';
import type {
  ChatComposerMode,
  ChatContextSource,
  ChatModelOption,
  ChatPersonaOption,
} from '../types';

export interface ChatComposerToolbarProps {
  readonly className?: string;
  /** Context sources for the attach control; omit to hide the control. */
  readonly contextSources?: readonly ChatContextSource[];
  /** Selected agent mode; omit to hide the mode toggle. */
  readonly mode?: ChatComposerMode;
  /** Selected model id; pair with {@link models}. */
  readonly modelId?: string;
  /** Selectable models; omit to hide the model control. */
  readonly models?: readonly ChatModelOption[];
  readonly onAddContext?: (sourceId: string) => void;
  readonly onModeChange?: (mode: ChatComposerMode) => void;
  readonly onModelChange?: (modelId: string) => void;
  readonly onPersonaChange?: (personaId: string) => void;
  /** Selected persona id; pair with {@link personas}. */
  readonly personaId?: string;
  /** Selectable personas; omit to hide the persona control. */
  readonly personas?: readonly ChatPersonaOption[];
}

/**
 * @description Controlled, presentational toolbar for the chat composer:
 * model / persona selectors, a Plan↔Build mode toggle, and an attach control.
 * Each control is independently optional — supply its props to render it. The
 * package hardcodes no model/persona data; consumers own state and content.
 *
 * @publicApi
 */
export const ChatComposerToolbar = (
  props: ChatComposerToolbarProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={classnames('flex flex-wrap items-center gap-2', className)}
      data-testid="ChatComposerToolbar"
    />
  );
};
