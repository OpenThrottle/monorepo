import * as React from 'react';

import type { ChatPermissionResponder } from '../types';

/**
 * Carries the host's permission responder from {@link ChatThread} down to the
 * {@link ChatPermissionRequest} cards, so it need not be drilled through the
 * message and timeline components. `undefined` renders the card read-only.
 */
export const ChatPermissionResponderContext = React.createContext<
  ChatPermissionResponder | undefined
>(undefined);
