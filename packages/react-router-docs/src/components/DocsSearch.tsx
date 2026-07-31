import * as React from 'react';
import clsx from 'clsx';
import { SearchIcon } from 'lucide-react';
import { useNavigate } from 'react-router';
import {
  Button,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@openthrottle/react-router-shadcn';
import { docEntryHref, searchDocEntries } from '../utils/searchDocs';
import { docEntryKey } from '../utils/docEntryKey';
import type { DocEntry } from '../utils/buildDocsManifest';

export interface DocsSearchProps {
  readonly className?: string;
  /** The full manifest to search across (both docs and FAQ sections). */
  readonly entries: readonly DocEntry[];
  readonly placeholder?: string;
  /** Label on the visible trigger button. */
  readonly triggerLabel?: string;
}

const SECTION_HEADINGS = {
  docs: 'Docs',
  faq: 'FAQ',
} as const;

/**
 * Client-side command-palette search across the docs + FAQ manifest. Opens on
 * ⌘K / Ctrl-K or via the visible trigger button, filters entirely in-memory
 * (see {@link searchDocEntries}), and navigates to the selected page (or FAQ
 * anchor) on select. Fully deterministic from its `entries` prop — the route
 * decides whether to render it (the `search` feature flag), so this component
 * carries no flag or persistence logic.
 *
 * @public
 */
export const DocsSearch = (props: DocsSearchProps): React.ReactElement => {
  const {
    className,
    entries,
    placeholder = 'Search docs and FAQ…',
    triggerLabel = 'Search docs…',
  } = props;

  // Hooks
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');

  // Setup
  const results = searchDocEntries(entries, query);
  const docsResults = results.filter((entry) => entry.section === 'docs');
  const faqResults = results.filter((entry) => entry.section === 'faq');

  // Handlers
  const handleSelect = React.useCallback(
    (entry: DocEntry) => {
      setOpen(false);
      navigate(docEntryHref(entry));
    },
    [navigate],
  );

  // Markup
  const renderGroup = (
    section: keyof typeof SECTION_HEADINGS,
    groupEntries: readonly DocEntry[],
  ): React.ReactElement | null => {
    if (groupEntries.length === 0) {
      return null;
    }

    return (
      <CommandGroup heading={SECTION_HEADINGS[section]}>
        {groupEntries.map((entry) => (
          <CommandItem
            key={docEntryKey(entry)}
            onSelect={() => handleSelect(entry)}
            value={docEntryKey(entry)}
          >
            <div className="flex min-w-0 flex-col">
              <span className="truncate">{entry.title}</span>
              {entry.description ? (
                <span className="text-muted-foreground truncate text-xs">
                  {entry.description}
                </span>
              ) : null}
            </div>
          </CommandItem>
        ))}
      </CommandGroup>
    );
  };

  // Life Cycle
  React.useEffect(() => {
    if (open) {
      setQuery('');
    }
  }, [open]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((previous) => !previous);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // 🔌 Short Circuit

  return (
    <div className={clsx(className)} data-testid="DocsSearch">
      <Button
        aria-label={triggerLabel}
        className="text-muted-foreground w-full justify-start gap-2"
        onClick={() => setOpen(true)}
        size="sm"
        type="button"
        variant="outline"
      >
        <SearchIcon className="size-4" />
        <span className="flex-1 text-left">{triggerLabel}</span>
        <CommandShortcut>⌘K</CommandShortcut>
      </Button>

      <CommandDialog
        label="Search documentation"
        onOpenChange={setOpen}
        open={open}
        shouldFilter={false}
      >
        <CommandInput
          onValueChange={setQuery}
          placeholder={placeholder}
          value={query}
        />
        <CommandList>
          {results.length === 0 ? (
            <CommandEmpty>No matching docs or FAQ entries.</CommandEmpty>
          ) : null}
          {renderGroup('docs', docsResults)}
          {docsResults.length > 0 && faqResults.length > 0 ? (
            <CommandSeparator />
          ) : null}
          {renderGroup('faq', faqResults)}
        </CommandList>
      </CommandDialog>
    </div>
  );
};
