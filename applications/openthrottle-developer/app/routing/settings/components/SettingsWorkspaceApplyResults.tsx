import {
  cn,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { WORKSPACE_SETTINGS_COPY } from '~/routing/settings/data/data.copy';
import type { WorkspaceApplyResult } from '~/routing/settings/utils/buildWorkspaceApplyResults';

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
  const summaryMarkup = (
    <p className="text-muted-foreground text-sm" role="status">
      {summary}
    </p>
  );
  const resultCards = results.map((result) => {
    const noFiles = (
      <p className="text-muted-foreground mt-1 text-xs">
        {WORKSPACE_SETTINGS_COPY.resultsNoFiles}
      </p>
    );
    const fileList = (
      <ul className="mt-1 space-y-0.5">
        {result.filesWritten.map((file) => (
          <li className="font-mono text-xs" key={file}>
            {file}
          </li>
        ))}
      </ul>
    );
    const warningList = (
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
    );
    const hasFiles = result.filesWritten.length > 0;
    const hasWarnings = result.warnings.length > 0;

    return (
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
          {hasFiles ? fileList : noFiles}
        </details>

        {hasWarnings ? warningList : null}
      </div>
    );
  });

  // Life Cycle

  // 🔌 Short Circuit
  if (results.length === 0) {
    return (
      <Empty
        className={cn(className)}
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
      className={cn('space-y-3', className)}
      data-testid="SettingsWorkspaceApplyResults"
    >
      <p className="text-sm font-medium">
        {WORKSPACE_SETTINGS_COPY.resultsHeading}
      </p>
      {summary ? summaryMarkup : null}

      {resultCards}
    </div>
  );
};
