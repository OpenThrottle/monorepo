import * as React from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { SEARCH_DEBOUNCE_MS } from '~/global/config/defaults';
import { MAIL_PATHS } from '~/global/data/data.navigation';
import type { MailBreadcrumb } from '~/global/utils/mail-breadcrumb';
import { getMailBreadcrumb } from '~/global/utils/mail-breadcrumb';

/** Return value of {@link useMailToolbar}. */
export interface UseMailToolbarResult {
  /** Current-page breadcrumb (label + optional link). */
  readonly breadcrumb: MailBreadcrumb;
  /** Search input change handler (updates state; debounced navigate on the search page). */
  readonly handleSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Controlled value for the search input. */
  readonly inputValue: string;
}

/**
 * @description Owns the {@link MailToolbar} behavior: search input state
 * synced from the URL, debounced navigate-as-you-type on the search page, and
 * the current-page breadcrumb.
 */
export const useMailToolbar = (): UseMailToolbarResult => {
  // Hooks
  const [inputValue, setInputValue] = React.useState('');
  const [searchParams] = useSearchParams();
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Setup
  const isSearchPage = location.pathname === MAIL_PATHS.search;
  const queryFromUrl = searchParams.get('q') ?? '';
  const breadcrumb = getMailBreadcrumb(location.pathname);

  // Handlers
  const scheduleSearchNavigate = React.useCallback(
    (value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        const q = value.trim();
        navigate(
          q
            ? `${MAIL_PATHS.search}?q=${encodeURIComponent(q)}`
            : MAIL_PATHS.search,
          {
            replace: true,
            viewTransition: true,
          },
        );
      }, SEARCH_DEBOUNCE_MS);
    },

    // Debounced navigate to search when user types on the search page. Future: consider navigating from any page for live search.
    [navigate],
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    if (isSearchPage) scheduleSearchNavigate(value);
  };

  // Markup

  // Life Cycle
  React.useEffect(() => {
    if (isSearchPage) setInputValue(queryFromUrl);

    // Sync input from URL when navigating to search page or when URL query changes (e.g. after debounced navigate).
  }, [isSearchPage, queryFromUrl]);

  React.useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  // 🔌 Short Circuit

  return { breadcrumb, handleSearchChange, inputValue };
};
