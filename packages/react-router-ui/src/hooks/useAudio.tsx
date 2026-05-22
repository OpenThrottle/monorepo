import * as React from 'react';

export interface UseAudioOptions {
  /**
   * @description Optional `src` applied to the bound `<audio>` element when {@link UseAudioResult.audioRef} is attached.
   */
  readonly src?: string;
  /**
   * @description Existing ref for an `<audio>` element; kept in sync with {@link UseAudioResult.audioRef}.
   */
  readonly audioRef?: React.RefObject<HTMLAudioElement | null>;
}

export interface UseAudioResult {
  /**
   * @description Ref callback to attach to `<audio ref={audioRef} />` (or merge with an external ref via {@link UseAudioOptions.audioRef}).
   */
  readonly audioRef: React.RefCallback<HTMLAudioElement>;
  readonly currentTime: number;
  readonly duration: number;
  readonly ended: boolean;
  readonly error: Error | null;
  readonly paused: boolean;
  readonly pause: () => void;
  readonly play: () => Promise<void>;
  readonly seek: (seconds: number) => void;
  readonly src: string | undefined;
  readonly toggle: () => Promise<void>;
}

const getMediaError = (target: HTMLMediaElement): Error | null => {
  const mediaError = target.error;
  if (mediaError == null) {
    return null;
  }

  const message =
    typeof mediaError.message === 'string' && mediaError.message.length > 0
      ? mediaError.message
      : `Media error code ${mediaError.code}`;

  return new Error(message);
};

const readPlaybackState = (
  target: HTMLAudioElement | null,
): Pick<UseAudioResult, 'currentTime' | 'duration' | 'ended' | 'paused'> => {
  if (target === null) {
    return {
      currentTime: 0,
      duration: 0,
      ended: false,
      paused: true,
    };
  }

  return {
    currentTime: target.currentTime,
    duration: Number.isFinite(target.duration) ? target.duration : 0,
    ended: target.ended,
    paused: target.paused,
  };
};

/**
 * @description Controls an `<audio>` element via the HTMLMediaElement API: playback state, seek, and event-synced metrics.
 */
export function useAudio(options: UseAudioOptions = {}): UseAudioResult {
  const { audioRef: externalAudioRef, src } = options;

  const elementRef = React.useRef<HTMLAudioElement | null>(null);
  const [mediaElement, setMediaElement] =
    React.useState<HTMLAudioElement | null>(null);
  const [playback, setPlayback] = React.useState(() => readPlaybackState(null));
  const [error, setError] = React.useState<Error | null>(null);

  const syncFromElement = React.useCallback((): void => {
    const target = elementRef.current;
    setPlayback(readPlaybackState(target));
    setError(target === null ? null : getMediaError(target));
  }, []);

  const bindMediaListeners = React.useCallback(
    (target: HTMLAudioElement | null): (() => void) => {
      if (target === null) {
        return () => {};
      }

      const events = [
        'durationchange',
        'ended',
        'error',
        'loadedmetadata',
        'pause',
        'play',
        'timeupdate',
      ] as const;

      for (const eventName of events) {
        target.addEventListener(eventName, syncFromElement);
      }

      syncFromElement();

      return () => {
        for (const eventName of events) {
          target.removeEventListener(eventName, syncFromElement);
        }
      };
    },
    [syncFromElement],
  );

  const audioRef = React.useCallback<React.RefCallback<HTMLAudioElement>>(
    (node) => {
      elementRef.current = node;
      setMediaElement(node);

      if (externalAudioRef !== undefined) {
        (
          externalAudioRef as React.MutableRefObject<HTMLAudioElement | null>
        ).current = node;
      }

      if (node !== null && src !== undefined) {
        node.src = src;
      }
    },
    [externalAudioRef, src],
  );

  React.useEffect(
    () => bindMediaListeners(mediaElement),
    [bindMediaListeners, mediaElement],
  );

  React.useEffect(() => {
    const target = elementRef.current;
    if (target === null || src === undefined) {
      return;
    }
    if (target.src !== src) {
      target.src = src;
    }
    syncFromElement();
  }, [src, syncFromElement]);

  const getElement = (): HTMLAudioElement | null => elementRef.current;

  const play = React.useCallback(async (): Promise<void> => {
    const target = getElement();
    if (target === null) {
      return;
    }
    try {
      await target.play();
      syncFromElement();
    } catch (playError) {
      const normalized =
        playError instanceof Error ? playError : new Error(String(playError));
      setError(normalized);
      throw normalized;
    }
  }, [syncFromElement]);

  const pause = React.useCallback((): void => {
    const target = getElement();
    if (target === null) {
      return;
    }
    target.pause();
    syncFromElement();
  }, [syncFromElement]);

  const toggle = React.useCallback(async (): Promise<void> => {
    const target = getElement();
    if (target === null) {
      return;
    }
    if (target.paused) {
      await play();
      return;
    }
    pause();
  }, [pause, play]);

  const seek = React.useCallback(
    (seconds: number): void => {
      const target = getElement();
      if (target === null) {
        return;
      }
      target.currentTime = seconds;
      syncFromElement();
    },
    [syncFromElement],
  );

  return {
    audioRef,
    currentTime: playback.currentTime,
    duration: playback.duration,
    ended: playback.ended,
    error,
    pause,
    paused: playback.paused,
    play,
    seek,
    src,
    toggle,
  };
}
