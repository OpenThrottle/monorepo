import type { ChatSessionDiff } from '@openthrottle/react-router-chat';

import { HOME_SESSION_DRAWER_COPY } from '~/routing/home/data/copy';

/** The diff shown when the resource route could not answer at all. */
export const CHANGES_LOAD_FAILED_DIFF: ChatSessionDiff = {
  available: false,
  reason: HOME_SESSION_DRAWER_COPY.changesLoadFailed,
};
