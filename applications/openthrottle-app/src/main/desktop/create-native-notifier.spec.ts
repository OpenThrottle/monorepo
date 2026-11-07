import { describe, expect, it, vi } from 'vitest';

import { createNativeNotifier } from './create-native-notifier.ts';

const build = (overrides: { focused?: boolean; supported?: boolean }) => {
  const listeners = { click: () => {}, close: () => {} };
  const show = vi.fn();
  const createNotification = vi.fn(() => ({
    onClick: (listener: () => void) => {
      listeners.click = listener;
    },
    onClose: (listener: () => void) => {
      listeners.close = listener;
    },
    show,
  }));
  const onActivate = vi.fn();
  const notify = createNativeNotifier({
    createNotification,
    isSupported: () => overrides.supported ?? true,
    isWindowFocused: () => overrides.focused ?? false,
    onActivate,
  });

  return { createNotification, listeners, notify, onActivate, show };
};

const INPUT = { body: 'Body', link: '/plans/x', title: 'Title' };

describe('createNativeNotifier', () => {
  it('shows a notification while the window is not focused', () => {
    const { createNotification, notify, show } = build({});

    expect(notify(INPUT)).toEqual({ ok: true, shown: true });
    expect(createNotification).toHaveBeenCalledWith({
      body: 'Body',
      title: 'Title',
    });
    expect(show).toHaveBeenCalledOnce();
  });

  it('suppresses the notification while the window is focused', () => {
    const { createNotification, notify } = build({ focused: true });

    expect(notify(INPUT)).toEqual({ ok: true, shown: false });
    expect(createNotification).not.toHaveBeenCalled();
  });

  it('reports lack of OS support', () => {
    expect(build({ supported: false }).notify(INPUT).ok).toBe(false);
  });

  it('activates with the link when clicked', () => {
    const { listeners, notify, onActivate } = build({});

    notify(INPUT);
    listeners.click();

    expect(onActivate).toHaveBeenCalledWith('/plans/x');
  });
});
