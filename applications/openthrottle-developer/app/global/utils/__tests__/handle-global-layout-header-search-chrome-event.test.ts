import { describe, expect, test, vi } from 'vitest';
import { handleGlobalLayoutHeaderSearchChromeEvent } from '../handle-global-layout-header-search-chrome-event';

describe('handleGlobalLayoutHeaderSearchChromeEvent', () => {
  test('engage opens commander and does not submit search', () => {
    const setCommanderOpen = vi.fn();
    const submitCommanderSearch = vi.fn();

    handleGlobalLayoutHeaderSearchChromeEvent(
      { setCommanderOpen, submitCommanderSearch },
      { type: 'engage' },
    );

    expect(setCommanderOpen).toHaveBeenCalledTimes(1);
    expect(setCommanderOpen).toHaveBeenCalledWith(true);
    expect(submitCommanderSearch).not.toHaveBeenCalled();
  });

  test('submit posts commander-search fields with trimmed query from event', () => {
    const setCommanderOpen = vi.fn();
    const submitCommanderSearch = vi.fn();

    handleGlobalLayoutHeaderSearchChromeEvent(
      { setCommanderOpen, submitCommanderSearch },
      { query: 'plan tasks', type: 'submit' },
    );

    expect(setCommanderOpen).not.toHaveBeenCalled();
    expect(submitCommanderSearch).toHaveBeenCalledTimes(1);
    expect(submitCommanderSearch).toHaveBeenCalledWith({ q: 'plan tasks' });
  });
});
