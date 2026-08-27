import * as React from 'react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@openthrottle/react-router-shadcn';
import type { ChatCheckoutOption } from '../types';
import {
  describeCheckouts,
  type ChatCheckoutDescriptor,
} from '../utils/checkout-labels';
import { groupCheckoutOptions } from '../utils/checkout-groups';
import { toggleCheckoutSelection } from '../utils/chat-checkout-selection';
import { ChatCheckoutSelectorRow } from './ChatCheckoutSelectorRow';
import { ChatCheckoutSelectorTrigger } from './ChatCheckoutSelectorTrigger';

export interface ChatCheckoutSelectorProps {
  /** Selectable repositories/checkouts; empty renders a disabled trigger. */
  readonly checkouts: readonly ChatCheckoutOption[];
  readonly className?: string;
  /** Copy shown on the trigger when nothing is selected. */
  readonly emptyLabel?: string;
  /** Ceiling on {@link multiple} selections; ignored in single-select mode. */
  readonly maxCheckouts?: number;
  /**
   * Opt into multi-select: one primary checkout plus additional context
   * directories. Requires {@link onCheckoutsChange}; absent or false keeps the
   * historical single-select behavior.
   */
  readonly multiple?: boolean;
  readonly onCheckoutChange: (checkoutId: string) => void;
  /** Primary-first selection callback, used only in {@link multiple} mode. */
  readonly onCheckoutsChange?: (checkoutIds: readonly string[]) => void;
  readonly placeholder?: string;
  readonly selectedCheckoutId?: string;
  /** Primary-first selection (index 0 is the spawn cwd), in multiple mode. */
  readonly selectedCheckoutIds?: readonly string[];
}

/**
 * @description Controlled, presentational repository/checkout selector (the
 * screenshots' "Current checkout" + branch affordance). A searchable, grouped
 * list rather than a flat menu, because a real workspace holds several
 * checkouts whose display names collide — `monorepo` under three different
 * orgs — and a bare name gives the user nothing to pick on. Rows group under
 * their remote's owner/org, carry an `owner/repo` (or shortened path)
 * qualifier, and the search matches owner, host, path and project as well as
 * the name. Fully controlled — the package hardcodes no repositories. Meant to
 * be shown by the toolbar only when the selected backend's
 * `requiresRepository` capability is true.
 *
 * In `multiple` mode (gated by the backend's `maxRepositories` capability) the
 * FIRST selected id is the primary checkout — the directory the agent process
 * actually runs in. The remainder are context only, which the rows say out
 * loud: the agent is granted read access to them, not a promise that
 * concurrent runs there are safe.
 *
 * @public
 */
export const ChatCheckoutSelector = (
  props: ChatCheckoutSelectorProps,
): React.ReactElement => {
  const {
    checkouts,
    className,
    emptyLabel = 'No checkouts',
    maxCheckouts = 1,
    multiple = false,
    onCheckoutChange,
    onCheckoutsChange,
    placeholder = 'Select checkout',
    selectedCheckoutId,
    selectedCheckoutIds,
  } = props;

  // Hooks
  const [open, setOpen] = React.useState(false);
  const groups = React.useMemo(
    () => groupCheckoutOptions(checkouts),
    [checkouts],
  );
  // Resolved against the whole list, so a name that collides with another
  // checkout's promotes itself to `owner/name` on the trigger.
  const descriptors = React.useMemo(
    () => describeCheckouts(checkouts),
    [checkouts],
  );

  // Setup
  const hasCheckouts = checkouts.length > 0;
  const isMultiple = multiple && onCheckoutsChange !== undefined;
  const selectedIds = isMultiple ? (selectedCheckoutIds ?? []) : [];
  const primaryId = isMultiple ? selectedIds[0] : selectedCheckoutId;
  const secondaryCount = Math.max(selectedIds.length - 1, 0);
  const atCap = isMultiple && selectedIds.length >= maxCheckouts;
  const selectedCheckout = checkouts.find(
    (checkout) => checkout.id === primaryId,
  );
  const descriptorFor = (id: string): ChatCheckoutDescriptor | undefined =>
    descriptors.find((descriptor) => descriptor.id === id);
  const primaryDescriptor =
    primaryId === undefined ? undefined : descriptorFor(primaryId);
  const triggerLabel = !hasCheckouts
    ? emptyLabel
    : (primaryDescriptor?.triggerLabel ?? placeholder);

  // Handlers
  const onSelectRow = (checkoutId: string): void => {
    if (!isMultiple) {
      onCheckoutChange(checkoutId);
      setOpen(false);
      return;
    }

    // Multi-select has to survive several picks in a row, so the list stays open.
    onCheckoutsChange?.(
      toggleCheckoutSelection(selectedIds, checkoutId, maxCheckouts),
    );
  };

  // Markup
  const trigger = (
    <ChatCheckoutSelectorTrigger
      branch={selectedCheckout?.branch}
      className={className}
      enabled={hasCheckouts}
      label={triggerLabel}
      secondaryCount={secondaryCount}
    />
  );

  // Life Cycle

  // 🔌 Short Circuit
  if (!hasCheckouts) {
    return trigger;
  }

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild={true}>{trigger}</PopoverTrigger>
      {/* Wide enough that `owner/repo` — the text doing the disambiguating —
          is not the thing that gets truncated. */}
      <PopoverContent align="start" className="w-96 p-0">
        <Command>
          <CommandInput
            className="border-0 border-b px-3 py-2.5 focus:ring-0"
            data-testid="ChatCheckoutSelector-search"
            placeholder="Search checkouts…"
          />
          <CommandList>
            <CommandEmpty>No matching checkouts.</CommandEmpty>
            {groups.map((group) => (
              <CommandGroup heading={group.heading} key={group.heading}>
                {group.options.map((checkout) => (
                  <ChatCheckoutSelectorRow
                    atCap={atCap}
                    checkout={checkout}
                    descriptor={descriptorFor(checkout.id)}
                    isPrimary={checkout.id === primaryId}
                    isSelected={
                      isMultiple
                        ? selectedIds.includes(checkout.id)
                        : checkout.id === selectedCheckoutId
                    }
                    key={checkout.id}
                    multiple={isMultiple}
                    onSelect={onSelectRow}
                  />
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
