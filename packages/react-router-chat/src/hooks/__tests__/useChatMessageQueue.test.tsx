import { act, renderHook } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import { useChatMessageQueue } from '../useChatMessageQueue';

const FIELDS = { modelId: 'claude:opus' };

const setup = () => {
  const hook = renderHook(() => useChatMessageQueue());
  act(() => {
    hook.result.current.enqueue('first', FIELDS);
    hook.result.current.enqueue('second', FIELDS);
  });
  return hook;
};

describe('useChatMessageQueue', () => {
  test('starts empty and unpaused', () => {
    const { result } = renderHook(() => useChatMessageQueue());

    expect(result.current.items).toEqual([]);
    expect(result.current.isPaused).toBe(false);
  });

  test('enqueues in FIFO order with the captured fields', () => {
    const { result } = setup();

    expect(result.current.items.map((item) => item.message)).toEqual([
      'first',
      'second',
    ]);
    expect(result.current.items[0]?.fields).toEqual(FIELDS);
  });

  describe('take', () => {
    test('returns and removes the oldest message when no id is given', () => {
      const { result } = setup();
      let taken: string | undefined;

      act(() => {
        taken = result.current.take()?.message;
      });

      expect(taken).toBe('first');
      expect(result.current.items.map((item) => item.message)).toEqual([
        'second',
      ]);
    });

    test('takes a specific message by id', () => {
      const { result } = setup();
      const secondId = result.current.items[1]?.id;
      let taken: string | undefined;

      act(() => {
        taken = result.current.take(secondId)?.message;
      });

      expect(taken).toBe('second');
      expect(result.current.items).toHaveLength(1);
    });

    test('sees a message enqueued earlier in the same handler', () => {
      const { result } = renderHook(() => useChatMessageQueue());
      let taken: string | undefined;

      act(() => {
        result.current.enqueue('now', FIELDS);
        taken = result.current.take()?.message;
      });

      expect(taken).toBe('now');
    });

    test('returns undefined on an empty queue', () => {
      const { result } = renderHook(() => useChatMessageQueue());

      expect(result.current.take()).toBeUndefined();
    });
  });

  describe('edit', () => {
    test('replaces the trimmed text in place', () => {
      const { result } = setup();
      const firstId = result.current.items[0]?.id ?? '';

      act(() => {
        result.current.edit(firstId, '  changed  ');
      });

      expect(result.current.items[0]?.message).toBe('changed');
    });

    test('removes the message when edited to empty', () => {
      const { result } = setup();
      const firstId = result.current.items[0]?.id ?? '';

      act(() => {
        result.current.edit(firstId, '   ');
      });

      expect(result.current.items.map((item) => item.message)).toEqual([
        'second',
      ]);
    });
  });

  test('remove drops one message', () => {
    const { result } = setup();
    const firstId = result.current.items[0]?.id ?? '';

    act(() => {
      result.current.remove(firstId);
    });

    expect(result.current.items).toHaveLength(1);
  });

  test('pause and resume toggle the paused flag', () => {
    const { result } = renderHook(() => useChatMessageQueue());

    act(() => {
      result.current.pause();
    });
    expect(result.current.isPaused).toBe(true);

    act(() => {
      result.current.resume();
    });
    expect(result.current.isPaused).toBe(false);
  });

  test('clear empties the queue and un-pauses', () => {
    const { result } = setup();

    act(() => {
      result.current.pause();
      result.current.clear();
    });

    expect(result.current.items).toEqual([]);
    expect(result.current.isPaused).toBe(false);
  });
});
