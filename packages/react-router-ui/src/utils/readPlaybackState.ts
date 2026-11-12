import type { AudioPlaybackState } from '../types';

/**
 * @description Reads the playback metrics off an `<audio>` element; an unbound
 * element (`null`) reads as paused at zero. Hoisted out of `useAudio` per
 * hook-primitive-shape H3.
 */
export const readPlaybackState = (
  target: HTMLAudioElement | null,
): AudioPlaybackState => {
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
