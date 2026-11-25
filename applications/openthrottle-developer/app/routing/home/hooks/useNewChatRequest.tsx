import { isRecord } from '@openthrottle/nodejs-utils';
import * as React from 'react';
import { useLocation } from 'react-router';

export interface UseNewChatRequestOptions {
  /** Clears the thread; called once per New chat request. */
  readonly onNewChat: () => void;
}

/** Nothing to return: the hook only reacts to navigation. */
export type UseNewChatRequestResult = void;

/**
 * @description Answers the docked conversations column's New chat, which
 * navigates to the chat route with `state.newChat` set to a timestamp (so a
 * second click still changes it): each new value calls `onNewChat` once.
 */
export const useNewChatRequest = (
  options: UseNewChatRequestOptions,
): UseNewChatRequestResult => {
  const { onNewChat } = options;

  // Hooks
  const { state } = useLocation();
  const onNewChatRef = React.useRef(onNewChat);
  onNewChatRef.current = onNewChat;

  // Setup
  const request = isRecord(state) ? state.newChat : undefined;

  // Handlers

  // Markup

  // Life Cycle
  React.useEffect(() => {
    if (typeof request === 'number') {
      onNewChatRef.current();
    }
  }, [request]);

  // 🔌 Short Circuit
};
