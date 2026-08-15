import * as React from 'react';
import clsx from 'clsx';
import { useSearchParams } from 'react-router';
import { Button, Input } from '@openthrottle/react-router-shadcn';
import { GLOBAL_TOOLBAR_SEARCH_COPY } from '../data/data.copy';

export interface GlobalToolbarSearchProps {
  'aria-label'?: string;
  className?: string;
  paramKey?: string;
  placeholder?: string;
  /**
   * Runs against the next params right before they are written, so paginated
   * lists can e.g. reset `page` when the query changes. Mutate `next` in place.
   */
  transformCommittedParams?: (next: URLSearchParams) => void;
}

/**
 * @public
 * Submit-to-URL list-toolbar search control. Owns its own `<form role="search">`
 * so it is never nested inside another toolbar form — sibling filters/CTAs live
 * outside it. URL is the source of truth: the input hydrates from `paramKey`
 * (default `search`) and resyncs on Back/Forward; submit trims and writes the
 * committed value with `replace: true`, preserving other params. v1 is
 * submit-only — no live/debounced typing (see `useDebouncedSearchParam` for the
 * live carve-out).
 */
export const GlobalToolbarSearch = (
  props: GlobalToolbarSearchProps,
): React.ReactElement => {
  const {
    'aria-label': ariaLabel,
    className,
    paramKey = 'search',
    placeholder,
    transformCommittedParams,
  } = props;

  // Hooks
  const [searchParams, setSearchParams] = useSearchParams();

  // Setup
  const committed = searchParams.get(paramKey) ?? '';
  const [value, setValue] = React.useState(committed);

  // Handlers
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setValue(event.target.value);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    const trimmed = value.trim();

    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);

        if (trimmed === '') {
          next.delete(paramKey);
        } else {
          next.set(paramKey, trimmed);
        }

        transformCommittedParams?.(next);

        return next;
      },
      { preventScrollReset: true, replace: true },
    );
  };

  // Markup

  // Life Cycle
  // Resync the local input when the committed param changes out from under us
  // (Back/Forward, or a sibling control rewriting the URL). Typing does not
  // touch `committed`, so in-progress edits are never clobbered.
  React.useEffect(() => {
    setValue(committed);
  }, [committed]);

  // 🔌 Short Circuit

  return (
    <form
      className={clsx('flex gap-2', className)}
      data-testid="GlobalToolbarSearch"
      onSubmit={handleSubmit}
      role="search"
    >
      <Input
        aria-label={ariaLabel}
        onChange={handleChange}
        placeholder={placeholder}
        type="search"
        value={value}
      />
      <Button type="submit" variant="outline">
        {GLOBAL_TOOLBAR_SEARCH_COPY.buttonLabel}
      </Button>
    </form>
  );
};
