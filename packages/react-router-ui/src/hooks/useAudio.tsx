import * as React from 'react';

import { getMediaError } from '../utils/get-media-error';
import { readPlaybackState } from '../utils/read-playback-state';

export interface UseAudioOptions {
  /**
   * @description Existing ref for an `<audio>` element; kept in sync with {@link UseAudioResult.audioRef}.
   */
  readonly audioRef?: React.RefObject<HTMLAudioElement | null>;
  /**
   * @description Optional `src` applied to the bound `<audio>` element when {@link UseAudioResult.audioRef} is attached.
   */
  readonly src?: string;
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
  readonly pause: () => void;
  readonly paused: boolean;
  readonly play: () => Promise<void>;
  readonly seek: (seconds: number) => void;
  readonly src: string | undefined;
  readonly toggle: () => Promise<void>;
}

/**
 * @description Controls an `<audio>` element via the HTMLMediaElement API: playback state, seek, and event-synced metrics.
 */
export function useAudio(options: UseAudioOptions = {}): UseAudioResult {
  const { audioRef: externalAudioRef, src } = options;

  // Hooks
  const elementRef = React.useRef<HTMLAudioElement | null>(null);
  const [mediaElement, setMediaElement] =
    React.useState<HTMLAudioElement | null>(null);
  const [playback, setPlayback] = React.useState(() => readPlaybackState(null));
  const [error, setError] = React.useState<Error | null>(null);

  // Setup
  const getElement = (): HTMLAudioElement | null => elementRef.current;

  // Handlers
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
        externalAudioRef.current = node;
      }

      if (node !== null && src !== undefined) {
        node.src = src;
      }
    },
    [externalAudioRef, src],
  );

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

  // Markup

  // Life Cycle
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

  // 🔌 Short Circuit

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
