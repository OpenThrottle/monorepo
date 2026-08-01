import * as React from 'react';
import clsx from 'clsx';
import { CheckIcon, CopyIcon } from 'lucide-react';

export interface DocCodeBlockProps extends React.ComponentPropsWithoutRef<'pre'> {}

/**
 * Drop-in replacement for the Markdown `pre` element that adds a hover copy
 * button to fenced code blocks. The button copies the block's exact rendered
 * text (read from the `<pre>` at click time, so it never includes the button
 * itself) and degrades to a no-op when the Clipboard API is unavailable.
 *
 * @public
 */
export const DocCodeBlock = (props: DocCodeBlockProps): React.ReactElement => {
  const { children, className, ...rest } = props;

  // Hooks
  const preRef = React.useRef<HTMLPreElement>(null);
  const [copied, setCopied] = React.useState(false);
  const timeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Setup

  // Handlers
  const handleCopy = React.useCallback(async (): Promise<void> => {
    const text = preRef.current?.textContent ?? '';
    try {
      await navigator.clipboard?.writeText(text);
      setCopied(true);
      if (timeout.current !== null) {
        clearTimeout(timeout.current);
      }
      timeout.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable / denied — leave the affordance inert.
    }
  }, []);

  // Markup

  // Life Cycle
  React.useEffect(
    () => () => {
      if (timeout.current !== null) {
        clearTimeout(timeout.current);
      }
    },
    [],
  );

  // 🔌 Short Circuit

  return (
    <div className="group relative">
      <pre {...rest} className={className} ref={preRef}>
        {children}
      </pre>
      <button
        aria-label={copied ? 'Code copied' : 'Copy code'}
        className={clsx(
          'text-muted-foreground hover:text-foreground bg-background/80 absolute top-2 right-2',
          'inline-flex size-7 items-center justify-center rounded border opacity-0 transition-opacity',
          'group-hover:opacity-100 focus-visible:opacity-100',
        )}
        onClick={handleCopy}
        type="button"
      >
        {copied ? (
          <CheckIcon className="size-3.5" />
        ) : (
          <CopyIcon className="size-3.5" />
        )}
      </button>
    </div>
  );
};
