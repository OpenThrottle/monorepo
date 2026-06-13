import * as React from 'react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  cn,
} from '@openthrottle/react-router-shadcn';
import type { IdeWorkspaceListing } from '../data/view-models';

/** Default cap on rendered matches to keep the DOM bounded on large repos. */
export const DEFAULT_FILE_PALETTE_LIMIT = 200;

export interface WorkspaceFilePaletteProps {
  className?: string;
  /** Workspace listing from the loader's cheap tier (full path set). */
  listing: IdeWorkspaceListing;
  /** Max matches rendered at once. Defaults to {@link DEFAULT_FILE_PALETTE_LIMIT}. */
  maxResults?: number;
  /** Fired with the workspace-relative path when a file is chosen. */
  onSelectFile?: (path: string) => void;
}

/**
 * A cmdk command palette for browsing a workspace's files. Renders nothing until
 * the user types, then client-filters the listing and renders only the matches
 * (capped), so the DOM stays bounded regardless of repository size. Built-in cmdk
 * filtering is disabled (`shouldFilter={false}`) so the cap is authoritative.
 *
 * @publicApi
 */
export const WorkspaceFilePalette = (
  props: WorkspaceFilePaletteProps,
): React.ReactElement => {
  const {
    className,
    listing,
    maxResults = DEFAULT_FILE_PALETTE_LIMIT,
    onSelectFile,
  } = props;

  // Hooks
  const [query, setQuery] = React.useState('');

  // Setup
  const trimmed = query.trim().toLowerCase();
  const matches = React.useMemo(() => {
    if (trimmed === '') return [];

    return listing.paths.filter((path) => path.toLowerCase().includes(trimmed));
  }, [listing.paths, trimmed]);
  const visible = matches.slice(0, maxResults);
  const hiddenCount = matches.length - visible.length;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  return (
    <Command
      className={cn('rounded-lg border', className)}
      data-testid="WorkspaceFilePalette"
      shouldFilter={false}
    >
      <CommandInput
        onValueChange={setQuery}
        placeholder={`Filter ${listing.paths.length} files…`}
        value={query}
      />
      <CommandList>
        {trimmed === '' ? (
          <div className="p-4 text-sm text-muted-foreground">
            Type to filter {listing.paths.length} files in{' '}
            {listing.repository.displayName}.
          </div>
        ) : visible.length === 0 ? (
          <CommandEmpty>No files match “{query}”.</CommandEmpty>
        ) : (
          <CommandGroup>
            {visible.map((path) => (
              <CommandItem
                key={path}
                onSelect={() => onSelectFile?.(path)}
                value={path}
              >
                {path}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {hiddenCount > 0 ? (
          <div className="p-2 text-center text-xs text-muted-foreground">
            Showing {visible.length} of {matches.length} — narrow your filter to
            see more.
          </div>
        ) : null}
      </CommandList>
    </Command>
  );
};
