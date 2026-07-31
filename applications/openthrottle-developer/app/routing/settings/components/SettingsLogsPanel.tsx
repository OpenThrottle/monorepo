import * as React from 'react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Skeleton,
  ToggleGroup,
  ToggleGroupItem,
} from '@openthrottle/react-router-shadcn';
import {
  CLIENT_LOG_BUFFER_MAX_ENTRIES,
  CLIENT_LOG_LEVELS,
} from '~/routing/settings/client-log-sink';
import { SettingsLogsIntro } from '~/routing/settings/components/SettingsLogsIntro';
import { SettingsLogsServerStreams } from '~/routing/settings/components/SettingsLogsServerStreams';
import { SettingsSupportBundle } from '~/routing/settings/components/SettingsSupportBundle';
import { useSettingsLogsPanel } from '~/routing/settings/hooks/useSettingsLogsPanel';

export interface SettingsLogsPanelProps {}

export const SettingsLogsPanel = (
  _props: SettingsLogsPanelProps,
): React.ReactElement => {
  // Hooks
  const {
    entries,
    filteredEntries,
    handleClear,
    handleCopyLines,
    handleCopyLogJson,
    handleCopyLogNdjson,
    handleLevelSelectionChange,
    isClient,
    levelSelection,
    logPreRef,
    logText,
    searchFieldId,
    searchQuery,
    setSearchQuery,
    viewerEmptyReason,
  } = useSettingsLogsPanel();

  // Setup

  // Handlers

  // Markup
  const renderViewerBody = (): React.ReactNode => {
    if (!isClient) {
      return (
        <div
          aria-busy="true"
          className="space-y-2"
          data-testid="logs-viewer-loading"
        >
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-4/6" />
        </div>
      );
    }

    if (viewerEmptyReason === 'empty-buffer') {
      return 'No entries yet. Use the app or open the browser console to produce logs.';
    }

    if (viewerEmptyReason === 'levels-none') {
      return 'Select at least one level above to view captured lines.';
    }

    if (viewerEmptyReason === 'no-match') {
      return 'No entries match your level selection or search.';
    }

    return logText;
  };

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      <SettingsLogsIntro />

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">Client console sink</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleClear}
              size="sm"
              type="button"
              variant="outline"
            >
              Clear
            </Button>
            <Button
              disabled={!isClient || viewerEmptyReason !== 'none'}
              onClick={handleCopyLines}
              size="sm"
              type="button"
              variant="outline"
            >
              Copy lines
            </Button>
            <Button
              disabled={!isClient || viewerEmptyReason !== 'none'}
              onClick={handleCopyLogJson}
              size="sm"
              type="button"
              variant="outline"
            >
              Copy log JSON
            </Button>
            <Button
              disabled={!isClient || viewerEmptyReason !== 'none'}
              onClick={handleCopyLogNdjson}
              size="sm"
              type="button"
              variant="outline"
            >
              Copy log NDJSON
            </Button>
          </div>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-4 text-sm">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" role="status">
            <span aria-live="polite" data-testid="logs-buffer-summary">
              Buffer {entries.length}/{CLIENT_LOG_BUFFER_MAX_ENTRIES}
              {filteredEntries.length !== entries.length &&
                entries.length > 0 &&
                ` · Shown ${filteredEntries.length}`}
            </span>
          </div>

          <div className="space-y-2">
            <span className="text-foreground text-xs font-medium">Levels</span>
            <ToggleGroup
              aria-label="Filter by log level"
              className="flex flex-wrap justify-start gap-1"
              onValueChange={handleLevelSelectionChange}
              size="sm"
              type="multiple"
              value={[...levelSelection]}
              variant="outline"
            >
              {CLIENT_LOG_LEVELS.map((level) => (
                <ToggleGroupItem aria-label={level} key={level} value={level}>
                  {level}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground text-xs" htmlFor={searchFieldId}>
              Search
            </Label>
            <Input
              autoComplete="off"
              className="font-mono text-xs"
              id={searchFieldId}
              onChange={(ev) => setSearchQuery(ev.target.value)}
              placeholder="Filter messages (case-insensitive)"
              type="search"
              value={searchQuery}
            />
          </div>

          <p className="text-xs">
            <span className="text-foreground font-medium">
              log / info / warn / error / debug
            </span>{' '}
            plus uncaught <code className="text-xs">window.onerror</code> and{' '}
            <code className="text-xs">unhandledrejection</code>. Buffer keeps
            the last {CLIENT_LOG_BUFFER_MAX_ENTRIES} lines in this tab only
            (memory). Data stays on this device unless you copy or export.
          </p>
          <pre
            className="bg-muted text-foreground max-h-72 overflow-auto rounded-md border p-3 font-mono text-xs break-words whitespace-pre-wrap"
            ref={logPreRef}
          >
            {renderViewerBody()}
          </pre>
        </CardContent>
      </Card>

      <SettingsSupportBundle />

      <SettingsLogsServerStreams />
    </>
  );
};
