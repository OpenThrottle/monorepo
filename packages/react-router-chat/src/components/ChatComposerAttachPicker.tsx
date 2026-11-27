import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { Paperclip } from 'lucide-react';
import * as React from 'react';

import { CHAT_ATTACHMENT_ACCEPT } from '../data/chat-attachments';
import { CHAT_COMPOSER_ATTACHMENT_COPY } from '../data/copy';
import { pickImageFiles } from '../utils/chat-attachments';

export interface ChatComposerAttachPickerProps {
  /** Why attaching is unavailable; disables the button and shows this as its tooltip. */
  readonly disabledReason: string | undefined;
  readonly onAddFiles: (files: readonly File[]) => void;
}

/**
 * @description Paperclip button that opens the native image picker (multiple
 * files; png, jpeg, gif, webp). Disabled with an explanatory tooltip when
 * `disabledReason` is set.
 */
export const ChatComposerAttachPicker = (
  props: ChatComposerAttachPickerProps,
): React.ReactElement => {
  const { disabledReason, onAddFiles } = props;

  // Hooks
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  // Setup
  const isDisabled = disabledReason !== undefined;
  const tooltip = disabledReason ?? CHAT_COMPOSER_ATTACHMENT_COPY.attachImages;

  // Handlers
  const onClick = (): void => {
    inputRef.current?.click();
  };
  const onChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const files = pickImageFiles(Array.from(event.target.files ?? []));
    // Reset so picking the same file twice still fires a change.
    event.target.value = '';
    if (files.length > 0) {
      onAddFiles(files);
    }
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      <input
        accept={CHAT_ATTACHMENT_ACCEPT}
        aria-hidden={true}
        className="hidden"
        data-testid="ChatComposerAttachPicker-input"
        disabled={isDisabled}
        multiple={true}
        onChange={onChange}
        ref={inputRef}
        tabIndex={-1}
        type="file"
      />
      <Tooltip delayDuration={500}>
        <TooltipTrigger asChild={true}>
          {/* A disabled button swallows pointer events, so the span carries the tooltip. */}
          <span className="inline-flex" tabIndex={isDisabled ? 0 : -1}>
            <Button
              aria-label={CHAT_COMPOSER_ATTACHMENT_COPY.attachImages}
              className="pointer-coarse:size-11"
              data-testid="ChatComposerToolbar-attach"
              disabled={isDisabled}
              onClick={onClick}
              size="icon"
              type="button"
              variant="ghost"
            >
              <Paperclip className="size-4" />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">{tooltip}</TooltipContent>
      </Tooltip>
    </>
  );
};
