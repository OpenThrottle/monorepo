import type { GlobalLayoutHeaderSearchEvent } from '@openthrottle/react-router-ui-global';
import type { CommanderSearchFields } from './commander-empty-extras';

interface HandleGlobalLayoutHeaderSearchChromeDeps {
  readonly setCommanderOpen: (open: boolean) => void;
  readonly submitCommanderSearch: (fields: CommanderSearchFields) => void;
}

/**
 * @description Maps header chrome search events to commander open vs root `commander-search` POST (same transport as palette empty-state search).
 */
export const handleGlobalLayoutHeaderSearchChromeEvent = (
  deps: HandleGlobalLayoutHeaderSearchChromeDeps,
  event: GlobalLayoutHeaderSearchEvent,
): void => {
  if (event.type === 'engage') {
    deps.setCommanderOpen(true);
    return;
  }
  deps.submitCommanderSearch({ q: event.query });
};
