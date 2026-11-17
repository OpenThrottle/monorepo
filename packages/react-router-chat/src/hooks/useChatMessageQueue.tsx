import * as React from 'react';

import type { ChatQueuedMessage } from '../types';

export interface UseChatMessageQueueResult {
  /** Drop every queued message and un-pause (conversation switch, New chat). */
  readonly clear: () => void;
  /** Replace a queued message's text; an empty edit removes it. */
  readonly edit: (id: string, message: string) => void;
  /** Append a message, with the backend fields to send it with, to the tail. */
  readonly enqueue: (
    message: string,
    fields: Readonly<Record<string, string>>,
  ) => void;
  /** True after Stop or a failed turn: nothing auto-sends until {@link resume}. */
  readonly isPaused: boolean;
  /** Queued messages, oldest first. */
  readonly items: readonly ChatQueuedMessage[];
  readonly pause: () => void;
  readonly remove: (id: string) => void;
  readonly resume: () => void;
  /**
   * Remove and return a message: the one with `id`, or the oldest when `id` is
   * omitted. Reads the latest queue synchronously, so a caller can take and send
   * in the same handler. `undefined` when there is nothing to take.
   */
  readonly take: (id?: string) => ChatQueuedMessage | undefined;
}

/**
 * @description FIFO queue of chat messages sent while a turn was still running,
 * plus a paused flag. Pure client state: it knows nothing about turns, so
 * {@link useAgenticChatTurn} decides when to drain it.
 */
export const useChatMessageQueue = (): UseChatMessageQueueResult => {
  // Hooks
  const [items, setItems] = React.useState<readonly ChatQueuedMessage[]>([]);
  const [isPaused, setIsPaused] = React.useState(false);
  // Mirrors `items` so `take` can return the removed message synchronously.
  const itemsRef = React.useRef<readonly ChatQueuedMessage[]>([]);
  const nextIdRef = React.useRef(0);

  // Setup
  const commit = (next: readonly ChatQueuedMessage[]): void => {
    itemsRef.current = next;
    setItems(next);
  };

  // Handlers
  const enqueue = (
    message: string,
    fields: Readonly<Record<string, string>>,
  ): void => {
    nextIdRef.current += 1;
    const id = `queued-${nextIdRef.current}`;
    commit([...itemsRef.current, { fields, id, message }]);
  };

  const remove = (id: string): void => {
    commit(itemsRef.current.filter((item) => item.id !== id));
  };

  const edit = (id: string, message: string): void => {
    const trimmed = message.trim();
    if (trimmed === '') {
      remove(id);
      return;
    }
    commit(
      itemsRef.current.map((item) => {
        return item.id === id ? { ...item, message: trimmed } : item;
      }),
    );
  };

  const take = (id?: string): ChatQueuedMessage | undefined => {
    const current = itemsRef.current;
    const taken =
      id === undefined ? current[0] : current.find((item) => item.id === id);
    if (taken !== undefined) {
      commit(current.filter((item) => item.id !== taken.id));
    }
    return taken;
  };

  const pause = (): void => {
    setIsPaused(true);
  };

  const resume = (): void => {
    setIsPaused(false);
  };

  const clear = (): void => {
    commit([]);
    setIsPaused(false);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return { clear, edit, enqueue, isPaused, items, pause, remove, resume, take };
};
