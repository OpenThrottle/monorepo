import * as React from 'react';
import clsx from 'clsx';
import { CheckIcon, LinkIcon } from 'lucide-react';

export interface DocHeadingAnchorProps {
  readonly className?: string;
  /** The heading slug to copy as `#slug`. */
  readonly slug: string;
}

/**
 * Hover-revealed copy-anchor button rendered beside a doc heading. Copies the
 * heading's `#slug` fragment to the clipboard; degrades to a no-op when the
 * Clipboard API is unavailable (older browsers, insecure contexts, tests).
 *
 * @public
 */
export const DocHeadingAnchor = (
  props: DocHeadingAnchorProps,
): React.ReactElement => {
  const { className, slug } = props;

  // Hooks
  const [copied, setCopied] = React.useState(false);
  const timeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Setup

  // Handlers
  const handleCopy = React.useCallback(async (): Promise<void> => {
    try {
      await navigator.clipboard?.writeText(`#${slug}`);
      setCopied(true);
      if (timeout.current !== null) {
        clearTimeout(timeout.current);
      }
      timeout.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable / denied — leave the affordance inert.
    }
  }, [slug]);

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
    <button
      aria-label={`Copy link to “${slug}” section`}
      className={clsx(
        'text-muted-foreground hover:text-foreground ml-2 inline-flex size-5 items-center justify-center rounded align-middle opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100',
        className,
      )}
      onClick={handleCopy}
      type="button"
    >
      {copied ? (
        <CheckIcon className="size-3.5" />
      ) : (
        <LinkIcon className="size-3.5" />
      )}
    </button>
  );
};
