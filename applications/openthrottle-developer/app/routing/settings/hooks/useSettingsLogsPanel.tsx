import * as React from 'react';
import {
  clearClientLogSink,
  getClientLogEntries,
  subscribeClientLogSink,
} from '~/routing/settings/client-log-sink';
import type {
  ClientLogEntry,
  ClientLogLevel,
} from '~/routing/settings/client-log-sink';
import { CLIENT_LOG_LEVELS } from '~/routing/settings/client-log-sink';
import { isClientLogLevel } from '~/routing/settings/utils/is-client-log-level';
import {
  copyText,
  entryToJsonRecord,
  formatEntryLine,
  getEmptyServerSnapshot,
} from '~/routing/settings/utils/settings.support';

export interface SettingsLogsPanelOptions {}

export interface UseSettingsLogsPanelResult {
  entries: readonly ClientLogEntry[];
  filteredEntries: readonly ClientLogEntry[];
  handleClear: () => void;
  handleCopyLines: () => Promise<void>;
  handleCopyLogJson: () => Promise<void>;
  handleCopyLogNdjson: () => Promise<void>;
  handleLevelSelectionChange: (next: string[]) => void;
  isClient: boolean;
  levelSelection: ClientLogLevel[];
  logPreRef: React.RefObject<HTMLPreElement | null>;
  logText: string;
  searchFieldId: string;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  viewerEmptyReason: 'empty-buffer' | 'levels-none' | 'no-match' | 'none';
}

/**
 * @description State, derived selections, and clipboard/clear handlers for the
 * Settings → Logs client console sink. Extracted from SettingsLogsPanel per
 * component-primitive-shape R6/R7 so the panel component stays UI-focused.
 */
export const useSettingsLogsPanel = (
  _options: SettingsLogsPanelOptions = {},
): UseSettingsLogsPanelResult => {
  // Hooks
  const logPreRef = React.useRef<HTMLPreElement>(null);
  const searchFieldId = React.useId();
  const [isClient, setIsClient] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [levelSelection, setLevelSelection] = React.useState<ClientLogLevel[]>([
    ...CLIENT_LOG_LEVELS,
  ]);

  const entries = React.useSyncExternalStore(
    subscribeClientLogSink,
    getClientLogEntries,
    getEmptyServerSnapshot,
  );

  // Setup
  const levelsDisabled = levelSelection.length === 0;
  const selectedLevelSet = React.useMemo(
    () => new Set(levelSelection),
    [levelSelection],
  );

  const filteredEntries = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return entries.filter((entry) => {
      if (!selectedLevelSet.has(entry.level)) {
        return false;
      }
      if (!q) {
        return true;
      }
      return (
        entry.message.toLowerCase().includes(q) ||
        entry.level.toLowerCase().includes(q)
      );
    });
  }, [entries, searchQuery, selectedLevelSet]);

  const viewerEmptyReason =
    entries.length === 0
      ? 'empty-buffer'
      : levelsDisabled
        ? 'levels-none'
        : filteredEntries.length === 0
          ? 'no-match'
          : 'none';

  const logText = React.useMemo(
    () => filteredEntries.map(formatEntryLine).join('\n'),
    [filteredEntries],
  );

  // Handlers
  const handleCopyLines = async (): Promise<void> => {
    await copyText(logText || '(empty)');
  };

  const handleCopyLogJson = async (): Promise<void> => {
    const payload = filteredEntries.map(entryToJsonRecord);
    await copyText(JSON.stringify(payload, null, 2));
  };

  const handleCopyLogNdjson = async (): Promise<void> => {
    const lines = filteredEntries.map((e) =>
      JSON.stringify(entryToJsonRecord(e)),
    );
    await copyText(lines.join('\n') || '');
  };

  const handleClear = (): void => {
    clearClientLogSink();
  };

  const handleLevelSelectionChange = (next: string[]): void => {
    setLevelSelection(next.filter(isClientLogLevel));
  };

  // Markup

  // Life Cycle
  React.useEffect(() => {
    const el = logPreRef.current;
    if (!el) {
      return;
    }
    el.scrollTop = el.scrollHeight;
  }, [filteredEntries]);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  // 🔌 Short Circuit

  return {
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
  };
};
