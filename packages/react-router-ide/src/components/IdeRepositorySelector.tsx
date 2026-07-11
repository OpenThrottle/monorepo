import * as React from 'react';
import { Combobox, cn } from '@openthrottle/react-router-shadcn';
import type { ComboboxOption } from '@openthrottle/react-router-shadcn';

/** A selectable workspace repository, kept domain-agnostic (no GraphQL types). */
export interface IdeRepositoryOption {
  /** Stable repository id (drives the `?repositoryId=` param). */
  id: string;
  /** Human-readable label shown in the selector. */
  label: string;
}

export interface IdeRepositorySelectorProps {
  className?: string;
  /** Fired with the chosen repository id when the selection changes. */
  onSelect?: (repositoryId: string) => void;
  /** The repositories the user can browse (app maps GraphQL → these options). */
  options: IdeRepositoryOption[];
  /** Currently selected repository id, if any. */
  selectedId?: string;
}

/**
 * Presentational selector for the active workspace repository. Wraps the shadcn
 * `Combobox`; the developer app maps registered local repositories to plain
 * `{ id, label }` options and reacts to `onSelect` (typically by setting the
 * `?repositoryId=` search param).
 *
 * @public
 */
export const IdeRepositorySelector = (
  props: IdeRepositorySelectorProps,
): React.ReactElement => {
  const { className, onSelect, options, selectedId } = props;

  // Hooks

  // Setup
  const comboboxOptions: ComboboxOption[] = options.map((option) => ({
    label: option.label,
    value: option.id,
  }));
  const hasOptions = comboboxOptions.length > 0;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  return (
    <div
      className={cn('w-full max-w-sm', className)}
      data-testid="IdeRepositorySelector"
    >
      <Combobox
        disabled={!hasOptions}
        emptyText="No repositories found."
        onValueChange={onSelect}
        options={comboboxOptions}
        placeholder={
          hasOptions
            ? 'Select a repository…'
            : 'No repositories — add one in Settings → Workspace'
        }
        value={selectedId}
      />
    </div>
  );
};
