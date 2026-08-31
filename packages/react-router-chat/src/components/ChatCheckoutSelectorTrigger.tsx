import * as React from 'react';
import { Button } from '@openthrottle/react-router-shadcn';
import { FolderGit2, GitBranch } from 'lucide-react';
import clsx from 'clsx';
import { shortenBranchName } from '../utils/repository-identity';

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
 * ## Branch-truncation contract
 *
 * Shared verbatim with {@link ChatCheckoutSelectorRow} — change it in both
 * or in neither, or the two faces of the same picker drift apart.
 *
 * 1. **Direction — middle-ellipsis, tail preserved.** Every branch in a real
 *    workspace shares a short author/tool prefix (`visormatt/`, `claude/`,
 *    `openthrottle/`) and differs in its tail, so an end-`truncate` would
 *    render two unrelated branches identically. `shortenBranchName` keeps the
 *    head and the tail and drops the middle.
 * 2. **Shrink priority — INVERTED from the row, on purpose.** The row has
 *    slack and lets the branch yield so the name survives. This button has
 *    none: at `max-w-56` letting the branch yield crushed even a
 *    four-character `main` to `m…`. So here the branch stays `shrink-0` behind
 *    a `max-w-*` cap — the cap is what fixes the overflow — and the label,
 *    which is already the disambiguated name, truncates first. The `+N` badge
 *    is `shrink-0` and uncapped, so it always wins.
 * 3. **Full value — `title` on the branch element.** A `Tooltip` here would
 *    nest a third portal inside Popover → Command for what is a hover string;
 *    `title` is native, works inside the popover, and holds no state.
 *
 * @public
 */
export const ChatCheckoutSelectorTrigger = React.forwardRef<
  HTMLButtonElement,
  ChatCheckoutSelectorTriggerProps
>((props, ref): React.ReactElement => {
  const {
    branch: rawBranch,
    className,
    enabled,
    label,
    minimal = false,
    secondaryCount,
    ...rest
  } = props;

  // Hooks

  // Setup
  // Narrowed to a local so the JSX below can render it without a non-null cast.
  const branch = rawBranch != null && rawBranch !== '' ? rawBranch : null;

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
      {minimal ? null : <span className="min-w-0 truncate">{label}</span>}
      {!minimal && secondaryCount > 0 ? (
        <span
          className="text-muted-foreground shrink-0 text-xs"
          data-testid="ChatCheckoutSelector-overflow"
        >
          {`+${secondaryCount}`}
        </span>
      ) : null}
      {!minimal && branch != null ? (
        <span
          // `shrink-0` + a cap, NOT a shrink weight — the one place this
          // deliberately inverts the row's priority, and the live pass is why.
          // At `max-w-56` there is no slack, so letting the branch shrink first
          // crushed even a four-character `main` to `m…`; the label here is
          // already the disambiguated name and is the better thing to truncate.
          // `max-w-32` is what actually fixes the reported overflow: `shrink-0`
          // could push the button past its max-width only because nothing
          // bounded the branch. The 13-character cap fits inside that column, so
          // `truncate` stays a backstop rather than re-clipping the tail off.
          className="text-muted-foreground flex max-w-32 min-w-0 shrink-0 items-center gap-1 text-xs"
          data-testid="ChatCheckoutSelector-branch"
          title={branch}
        >
          <GitBranch className="size-3 shrink-0" />
          <span className="truncate">{shortenBranchName(branch, 13)}</span>
        </span>
      ) : null}
    </Button>
  );
});
ChatCheckoutSelectorTrigger.displayName = 'ChatCheckoutSelectorTrigger';
