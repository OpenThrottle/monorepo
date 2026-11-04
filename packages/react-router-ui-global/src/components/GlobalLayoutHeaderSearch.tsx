import {
  Button,
  CommandShortcut,
  Input,
} from '@openthrottle/react-router-shadcn';
import { SearchIcon } from 'lucide-react';
import * as React from 'react';

/**
 * @description Discriminated events from the header chrome search control; the app decides navigation vs commander.
 */
export type GlobalLayoutHeaderSearchEvent =
  | { readonly type: 'engage' }
  | { readonly query: string; readonly type: 'submit' };

export interface GlobalLayoutHeaderSearchProps {
  /**
   * @description When set, wires focus → `engage` and form submit → `submit` for non-empty trimmed query.
   */
  readonly onSearchChromeEvent?: (event: GlobalLayoutHeaderSearchEvent) => void;
  readonly onSearchValueChange?: (value: string) => void;
  readonly searchPlaceholder: string;
  /**
   * @description When defined with {@link GlobalLayoutHeaderSearchProps.onSearchValueChange}, controls the draft query in the chrome search field.
   */
  readonly searchValue?: string;
}

/**
 * @description Header search control. From `sm` up it is the inline search field
 * with a keyboard hint (hidden on coarse pointers). Below `sm` the field does not
 * fit, so it collapses into an icon button that emits `engage` (opens the command
 * palette) when the search is wired, and disappears when it is inert.
 */
export const GlobalLayoutHeaderSearch = (
  props: GlobalLayoutHeaderSearchProps,
): React.ReactElement => {
  const {
    onSearchChromeEvent,
    onSearchValueChange,
    searchPlaceholder,
    searchValue,
  } = props;

  // Hooks
  const [draftQuery, setDraftQuery] = React.useState('');

  // Setup
  const isSearchControlled = searchValue !== undefined;
  const resolvedSearchValue = isSearchControlled ? searchValue : draftQuery;

  // Handlers
  const handleSearchDraftChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    const next = event.target.value;
    if (isSearchControlled) {
      onSearchValueChange?.(next);
    } else {
      setDraftQuery(next);
    }
  };

  const handleSearchEngage = (): void => {
    onSearchChromeEvent?.({ type: 'engage' });
  };

  const handleSearchSubmit = (
    event: React.FormEvent<HTMLFormElement>,
  ): void => {
    event.preventDefault();
    if (!onSearchChromeEvent) {
      return;
    }
    const trimmed = resolvedSearchValue.trim();
    if (trimmed.length > 0) {
      onSearchChromeEvent({ query: trimmed, type: 'submit' });
    }
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (!onSearchChromeEvent) {
    return (
      <span className="hidden sm:contents">
        <CommandShortcut className="pointer-coarse:hidden">⌘K</CommandShortcut>
        <Input
          className="max-w-52 pointer-coarse:h-11"
          placeholder={searchPlaceholder}
          type="search"
        />
      </span>
    );
  }

  return (
    <>
      <Button
        aria-label={searchPlaceholder}
        className="size-6 rounded-full sm:hidden pointer-coarse:size-11"
        onClick={handleSearchEngage}
        type="button"
        variant="ghost"
      >
        <SearchIcon />
      </Button>
      <form
        className="relative hidden max-w-52 sm:block"
        data-testid="GlobalLayoutHeaderSearch"
        onSubmit={handleSearchSubmit}
      >
        <CommandShortcut className="absolute top-1/2 right-4 z-10 flex w-auto -translate-y-1/2 transform items-center justify-center gap-0.5 p-2 text-sm opacity-100 pointer-coarse:hidden">
          <span>⌘</span>
          <span>+</span>
          <span>k</span>
        </CommandShortcut>
        <Input
          aria-label={searchPlaceholder}
          className="w-full pointer-coarse:h-11"
          onChange={handleSearchDraftChange}
          onFocus={handleSearchEngage}
          placeholder={searchPlaceholder}
          type="search"
          value={resolvedSearchValue}
        />
      </form>
    </>
  );
};
