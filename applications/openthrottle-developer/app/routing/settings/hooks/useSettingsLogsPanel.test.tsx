import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { clearClientLogSink, push } from '~/routing/settings/client-log-sink';
import { useSettingsLogsPanel } from './useSettingsLogsPanel';

describe('useSettingsLogsPanel', () => {
  beforeEach(() => {
    clearClientLogSink();
    vi.stubGlobal('navigator', {
      ...globalThis.navigator,
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  test('starts empty with the empty-buffer reason and all levels selected', () => {
    const { result } = renderHook(() => useSettingsLogsPanel());

    expect(result.current.entries).toEqual([]);
    expect(result.current.filteredEntries).toEqual([]);
    expect(result.current.viewerEmptyReason).toBe('empty-buffer');
    expect(result.current.levelSelection).toEqual([
      'log',
      'info',
      'warn',
      'error',
      'debug',
    ]);
  });

  test('flips isClient to true after mount', () => {
    const { result } = renderHook(() => useSettingsLogsPanel());

    expect(result.current.isClient).toBe(true);
  });

  test('reflects captured log entries via the external store subscription', () => {
    const { result } = renderHook(() => useSettingsLogsPanel());

    act(() => push('info', ['hello world']));

    expect(result.current.entries).toHaveLength(1);
    expect(result.current.filteredEntries).toHaveLength(1);
    expect(result.current.filteredEntries[0]?.message).toBe('hello world');
    expect(result.current.viewerEmptyReason).toBe('none');
  });

  test('filters entries by the search query (message or level, case-insensitive)', () => {
    const { result } = renderHook(() => useSettingsLogsPanel());

    act(() => {
      push('info', ['starting run']);
      push('error', ['boom failed']);
    });

    act(() => result.current.setSearchQuery('BOOM'));

    expect(result.current.filteredEntries).toHaveLength(1);
    expect(result.current.filteredEntries[0]?.message).toBe('boom failed');
  });

  test('reports no-match when the search query matches nothing', () => {
    const { result } = renderHook(() => useSettingsLogsPanel());

    act(() => push('info', ['starting run']));
    act(() => result.current.setSearchQuery('nonexistent'));

    expect(result.current.filteredEntries).toEqual([]);
    expect(result.current.viewerEmptyReason).toBe('no-match');
  });

  test('handleLevelSelectionChange filters to only the chosen levels and reports levels-none when empty', () => {
    const { result } = renderHook(() => useSettingsLogsPanel());

    act(() => {
      push('info', ['info line']);
      push('error', ['error line']);
    });

    act(() => result.current.handleLevelSelectionChange(['error']));
    expect(result.current.levelSelection).toEqual(['error']);
    expect(result.current.filteredEntries).toHaveLength(1);
    expect(result.current.filteredEntries[0]?.message).toBe('error line');

    act(() => result.current.handleLevelSelectionChange([]));
    expect(result.current.levelSelection).toEqual([]);
    expect(result.current.viewerEmptyReason).toBe('levels-none');
  });

  test('handleLevelSelectionChange drops values that are not valid log levels', () => {
    const { result } = renderHook(() => useSettingsLogsPanel());

    act(() =>
      result.current.handleLevelSelectionChange(['error', 'not-a-level']),
    );

    expect(result.current.levelSelection).toEqual(['error']);
  });

  test('handleClear empties the sink', () => {
    const { result } = renderHook(() => useSettingsLogsPanel());

    act(() => push('info', ['hello world']));
    expect(result.current.entries).toHaveLength(1);

    act(() => result.current.handleClear());

    expect(result.current.entries).toEqual([]);
    expect(result.current.viewerEmptyReason).toBe('empty-buffer');
  });

  test('handleCopyLines writes the formatted log text to the clipboard', async () => {
    const { result } = renderHook(() => useSettingsLogsPanel());

    act(() => push('info', ['hello world']));

    await act(async () => {
      await result.current.handleCopyLines();
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      result.current.logText,
    );
    expect(result.current.logText).toContain('[info] hello world');
  });

  test('handleCopyLines copies the empty placeholder when there is nothing to show', async () => {
    const { result } = renderHook(() => useSettingsLogsPanel());

    await act(async () => {
      await result.current.handleCopyLines();
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('(empty)');
  });

  test('handleCopyLogJson writes JSON-serialized filtered entries', async () => {
    const { result } = renderHook(() => useSettingsLogsPanel());

    act(() => push('warn', ['careful now']));

    await act(async () => {
      await result.current.handleCopyLogJson();
    });

    const call: unknown = vi.mocked(navigator.clipboard.writeText).mock
      .calls[0]?.[0];
    const parsed: unknown = JSON.parse(String(call));
    expect(parsed).toEqual([
      expect.objectContaining({ message: 'careful now' }),
    ]);
  });

  test('handleCopyLogNdjson writes newline-delimited JSON records', async () => {
    const { result } = renderHook(() => useSettingsLogsPanel());

    act(() => {
      push('info', ['line one']);
      push('info', ['line two']);
    });

    await act(async () => {
      await result.current.handleCopyLogNdjson();
    });

    const call: unknown = vi.mocked(navigator.clipboard.writeText).mock
      .calls[0]?.[0];
    const lines = String(call).split('\n');
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0] ?? '{}')).toMatchObject({
      message: 'line one',
    });
  });
});
