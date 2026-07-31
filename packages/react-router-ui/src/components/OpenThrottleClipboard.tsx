import * as React from 'react';
import { cn } from '@openthrottle/react-router-shadcn';

export interface OpenThrottleClipboardProps {
  readonly className?: string;
  readonly label?: string;
  readonly text: string;
}

/**
 * @description Renders a button that copies the Ralph workflow command
 * for this plan to the clipboard.
 */
export const OpenThrottleClipboard = (
  props: OpenThrottleClipboardProps,
): React.ReactElement => {
  const { className, label = 'Copy to clipboard', text } = props;

  // Hooks
  const [copied, setCopied] = React.useState(false);

  // Setup
  // const RALPH_CMD_PREFIX = 'pnpm exec workflow-ralph --plan ';
  // const command = `${RALPH_CMD_PREFIX}${planId}`;

  // Handlers
  const onClick = (): void => {
    const method =
      typeof navigator?.clipboard === 'undefined'
        ? onCopyFallback
        : onCopyModern;

    try {
      method(text);
      setCopied(true);
    } catch (error) {
      console.error(`🚨 Failed to copy text to clipboard`, error);

      setCopied(false);
    }
  };

  /**
   * @see https://stackoverflow.com/questions/51805395/navigator-clipboard-is-undefined
   * @description Fallback for when navigator.clipboard is undefined which is
   * the case in older browsers, and when running on localhost as this API
   * requires SSL.
   */
  const onCopyFallback = (text: string) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;

    document.body.appendChild(textArea);
    textArea.select();

    document.execCommand('copy');
    textArea.remove();
  };

  const onCopyModern = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => setCopied(true),
      () => setCopied(false),
    );
  };

  // Markup

  // Life Cycle
  React.useEffect(() => {
    if (!copied) return undefined;
    const t = window.setTimeout(() => {
      setCopied(false);
    }, 2000);

    return () => {
      window.clearTimeout(t);
    };
  }, [copied]);

  // 🔌 Short Circuit

  return (
    <button
      aria-label={copied ? 'Copied' : label}
      className={cn('cursor-pointer', className)}
      onClick={onClick}
      type="button"
    >
      {copied ? 'Copied!' : label}
    </button>
  );
};
