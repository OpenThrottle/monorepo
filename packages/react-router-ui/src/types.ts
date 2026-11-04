/**
 * @public
 * @description Lifecycle of a microphone capture session started by `useAudioCapture`.
 */
export type AudioCaptureStatus = 'idle' | 'recording' | 'requesting';

/**
 * @description Playback metrics read from an `<audio>` element and mirrored into `useAudio` state.
 */
export interface AudioPlaybackState {
  readonly currentTime: number;
  readonly duration: number;
  readonly ended: boolean;
  readonly paused: boolean;
}

/**
 * @public
 * @description A minimal plan reference returned by the `resolvePlanRef` query
 * (mirrors the server `PlanRefObject`). Enough to render a confident ⌘K redirect
 * row and resolve a short fragment to its full id.
 */
export interface PlanRefMatch {
  readonly id: string;
  readonly status: string;
  readonly title: string;
}

/**
 * @public
 * @description Payload a resolver resource route returns for a lookup. `prefix`
 * echoes the normalized fragment the matches were resolved for, so the hook can
 * ignore data that belongs to a stale keystroke.
 */
export interface PlanRefResolverData {
  readonly matches: readonly PlanRefMatch[];
  readonly prefix: string;
}
