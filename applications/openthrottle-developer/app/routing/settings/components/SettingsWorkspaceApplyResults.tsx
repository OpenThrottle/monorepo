import * as React from 'react';
import clsx from 'clsx';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@openthrottle/react-router-shadcn';
import { WORKSPACE_SETTINGS_COPY } from '~/routing/settings/data/data.copy';
import type { WorkspaceApplyResult } from '~/routing/settings/utils/workspace-apply-results';

export interface SettingsWorkspaceApplyResultsProps {
  className?: string;
  results: readonly WorkspaceApplyResult[];
  summary?: string | null;
}

/**
 * @description Renders the per-repository outcome of an apply-editor-configuration run: which files
 * landed where, and each warning individually rather than as a count.
 */
export const SettingsWorkspaceApplyResults = (
  props: SettingsWorkspaceApplyResultsProps,
): React.ReactElement => {
  const { className, results, summary } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (results.length === 0) {
    return (
      <Empty
        className={clsx(className)}
        data-testid="SettingsWorkspaceApplyResults"
      >
        <EmptyHeader>
          <EmptyTitle>{WORKSPACE_SETTINGS_COPY.resultsHeading}</EmptyTitle>
          <EmptyDescription>
            {WORKSPACE_SETTINGS_COPY.resultsEmpty}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div
      className={clsx('space-y-3', className)}
      data-testid="SettingsWorkspaceApplyResults"
    >
      {summary ? (
        <p className="text-muted-foreground text-sm" role="status">
          {summary}
        </p>
      ) : null}

      {results.map((result) => (
        <div
          className="rounded-md border p-3 text-sm"
          key={`${result.repositoryId}:${result.editorLabel}`}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-medium">{result.displayName}</span>
            <span className="text-muted-foreground">{result.editorLabel}</span>
          </div>
          <p className="text-muted-foreground font-mono text-xs">
            {result.filesystemPath}
          </p>

          <details className="mt-2">
            <summary className="cursor-pointer text-xs">
              {WORKSPACE_SETTINGS_COPY.resultsFilesHeading}
            </summary>
            {result.filesWritten.length === 0 ? (
              <p className="text-muted-foreground mt-1 text-xs">
                {WORKSPACE_SETTINGS_COPY.resultsNoFiles}
              </p>
            ) : (
              <ul className="mt-1 space-y-0.5">
                {result.filesWritten.map((file) => (
                  <li className="font-mono text-xs" key={file}>
                    {file}
                  </li>
                ))}
              </ul>
            )}
          </details>

          {result.warnings.length > 0 ? (
            <div className="mt-2">
              <p className="text-destructive text-xs font-medium">
                {WORKSPACE_SETTINGS_COPY.resultsWarningsHeading}
              </p>
              <ul className="mt-1 space-y-0.5">
                {result.warnings.map((warning) => (
                  <li className="text-destructive text-xs" key={warning}>
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
};
