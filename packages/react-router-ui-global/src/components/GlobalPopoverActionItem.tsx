import * as React from 'react';
import clsx from 'clsx';
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@openthrottle/react-router-shadcn';
import { Form, Link } from 'react-router';
import type { GlobalPopoverAction } from './GlobalPopover';

/**
 * Renders one {@link GlobalPopover} action (optional separator + menu item).
 * Kept as its own file so `GlobalPopover` stays under the component-shape line
 * cap.
 */
export interface GlobalPopoverActionItemProps {
  readonly action: GlobalPopoverAction;
  readonly onConfirmRequest: (actionId: string) => void;
}

export const GlobalPopoverActionItem = (
  props: GlobalPopoverActionItemProps,
): React.ReactElement => {
  const { action, onConfirmRequest } = props;

  // Hooks

  // Setup
  const isDisabled =
    action.disabled === true ||
    (action.kind === 'submit' && action.pending === true);
  const label =
    action.kind === 'submit' && action.pending === true
      ? (action.pendingLabel ?? action.label)
      : action.label;
  const fieldEntries =
    action.kind === 'submit'
      ? Object.keys(action.fields)
          .sort()
          .map((name) => ({ name, value: action.fields[name] ?? '' }))
      : [];

  // Handlers
  const handleConfirmSelect = React.useCallback(
    (event: Event): void => {
      event.preventDefault();
      onConfirmRequest(action.id);
    },
    [action.id, onConfirmRequest],
  );

  const handleSelect = React.useCallback((): void => {
    if (action.kind === 'select') {
      action.onSelect();
    }
  }, [action]);

  // Markup
  const icon = action.icon;

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      {action.separatorBefore === true ? <DropdownMenuSeparator /> : null}

      {action.kind === 'link' ? (
        <DropdownMenuItem asChild={true} disabled={isDisabled}>
          <Link className="flex gap-2" to={action.to} viewTransition={true}>
            {icon}
            {label}
          </Link>
        </DropdownMenuItem>
      ) : null}

      {action.kind === 'select' ? (
        <DropdownMenuItem
          className="flex gap-2"
          disabled={isDisabled}
          onSelect={handleSelect}
        >
          {icon}
          {label}
        </DropdownMenuItem>
      ) : null}

      {action.kind === 'submit' && action.confirm !== undefined ? (
        <DropdownMenuItem
          className={clsx(
            'flex gap-2',
            action.destructive === true ? 'text-destructive' : undefined,
          )}
          disabled={isDisabled}
          onSelect={handleConfirmSelect}
        >
          {icon}
          {label}
        </DropdownMenuItem>
      ) : null}

      {action.kind === 'submit' && action.confirm === undefined ? (
        <Form
          action={action.action}
          method={action.method ?? 'post'}
          navigate={action.navigate}
        >
          {fieldEntries.map((field) => (
            <input
              key={field.name}
              name={field.name}
              type="hidden"
              value={field.value}
            />
          ))}
          <DropdownMenuItem asChild={true} disabled={isDisabled}>
            <button
              className="flex w-full gap-2"
              disabled={isDisabled}
              type="submit"
            >
              {icon}
              {label}
            </button>
          </DropdownMenuItem>
        </Form>
      ) : null}
    </>
  );
};
