import type {
  DesktopNotifyInput,
  DesktopNotifyResult,
} from '@openthrottle/openthrottle-desktop-bridge';

/** The slice of Electron's `Notification` the notifier uses; injected for tests. */
export interface NativeNotificationHandle {
  readonly onClick: (listener: () => void) => void;
  readonly onClose: (listener: () => void) => void;
  readonly show: () => void;
}

export interface CreateNativeNotifierOptions {
  readonly createNotification: (options: {
    readonly body: string;
    readonly title: string;
  }) => NativeNotificationHandle;
  readonly isSupported: () => boolean;
  /** Whether the app window is focused right now. */
  readonly isWindowFocused: () => boolean;
  /** Runs when the user clicks a notification; `link` is the page-supplied path, still unvalidated. */
  readonly onActivate: (link: string | undefined) => void;
}

/**
 * @description Raises native notifications for the desktop bridge. Skips one
 * while the window is focused (the page already shows an in-app toast, so a
 * native one would duplicate it) and when the OS has no notification support.
 * Shown notifications are held until clicked or closed so they are not garbage
 * collected before the user can act on them.
 */
export const createNativeNotifier = (
  options: CreateNativeNotifierOptions,
): ((input: DesktopNotifyInput) => DesktopNotifyResult) => {
  const { createNotification, isSupported, isWindowFocused, onActivate } =
    options;
  const live = new Set<NativeNotificationHandle>();

  return (input) => {
    if (!isSupported()) {
      return { ok: false, reason: 'Native notifications are not supported.' };
    }

    if (isWindowFocused()) {
      return { ok: true, shown: false };
    }

    const notification = createNotification({
      body: input.body,
      title: input.title,
    });

    live.add(notification);
    notification.onClick(() => {
      live.delete(notification);
      onActivate(input.link);
    });
    notification.onClose(() => {
      live.delete(notification);
    });
    notification.show();

    return { ok: true, shown: true };
  };
};
