import * as React from 'react';
import { Button } from '@openthrottle/react-router-shadcn';
import { FolderGit2, GitBranch } from 'lucide-react';
import clsx from 'clsx';

export interface ChatCheckoutSelectorTriggerProps extends Omit<
  React.ComponentPropsWithoutRef<typeof Button>,
  'className'
> {
  /** Branch of the primary selection, when known. */
  readonly branch?: string;
  readonly className?: string;
  /** False when there is nothing to pick — the button goes inert. */
  readonly enabled: boolean;
  /**
   * Already resolved by `describeCheckouts`: the bare name while it is unique,
   * promoted to `owner/name` (or a shortened path) once another checkout shares
   * it. The trigger deliberately does no disambiguation of its own.
   */
  readonly label: string;
  /**
   * Icon-only presentation for dense host rows such as the plan-detail tabs
   * row, where the full `owner/repo · branch` face would dominate. Defaults to
   * false; the label moves into the accessible name rather than disappearing.
   */
  readonly minimal?: boolean;
  /** Count of context-only directories beyond the primary, rendered as `+N`. */
  readonly secondaryCount: number;
}

/**
 * @description The button face of {@link ChatCheckoutSelector}: the primary
 * checkout's (already disambiguated) label, a `+N` affordance for context-only
 * directories, and the branch. Extracted so the selector itself stays under the
 * component line cap; it holds no state and makes no decisions.
 *
 * Ref-forwarding and prop pass-through are load-bearing, not incidental: the
 * selector mounts this inside a Radix `PopoverTrigger asChild`, which opens the
 * popover by injecting handlers and a ref onto its child. Swallow them and the
 * picker silently never opens.
 *
 * @public
 */
export const ChatCheckoutSelectorTrigger = React.forwardRef<
  HTMLButtonElement,
  ChatCheckoutSelectorTriggerProps
>((props, ref): React.ReactElement => {
  const {
    branch,
    className,
    enabled,
    label,
    minimal = false,
    secondaryCount,
    ...rest
  } = props;

  // Hooks

  // Setup
  const hasBranch = branch != null && branch !== '';

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Button
      // Icon-only drops every visible word, so the name the label was carrying
      // has to move here or a screen reader hears "Checkout" and nothing else.
      aria-label={minimal ? `Checkout: ${label}` : 'Checkout'}
      className={clsx(
        'h-8',
        minimal ? 'w-8 p-0' : 'w-auto max-w-56 gap-1.5',
        className,
      )}
      data-testid="ChatCheckoutSelector-trigger"
      disabled={!enabled}
      ref={ref}
      type="button"
      variant="outline"
      {...rest}
    >
      <FolderGit2 className="size-4 shrink-0 opacity-70" />
      {minimal ? null : <span className="truncate">{label}</span>}
      {!minimal && secondaryCount > 0 ? (
        <span
          className="text-muted-foreground shrink-0 text-xs"
          data-testid="ChatCheckoutSelector-overflow"
        >
          {`+${secondaryCount}`}
        </span>
      ) : null}
      {!minimal && hasBranch ? (
        <span
          className="text-muted-foreground flex shrink-0 items-center gap-1 text-xs"
          data-testid="ChatCheckoutSelector-branch"
        >
          <GitBranch className="size-3" />
          {branch}
        </span>
      ) : null}
    </Button>
  );
});
ChatCheckoutSelectorTrigger.displayName = 'ChatCheckoutSelectorTrigger';
