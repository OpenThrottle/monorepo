import type {
  NotificationEventNamesValue,
  NotificationPayload,
} from '@openthrottle/openthrottle-notifications';

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
 * @description Fields every resolved id ref carries, whichever entity it names.
 */
export interface IdRefMatchBase {
  readonly id: string;
  readonly status: string;
  readonly title: string;
}

/**
 * @public
 * @description An id that resolved to a plan.
 */
export interface PlanIdRefMatch extends IdRefMatchBase {
  readonly kind: 'PLAN';
}

/**
 * @public
 * @description An id that resolved to a task; carries its owning plan so a row
 * can name it and link to `/plans/<planId>/tasks/<id>`.
 */
export interface TaskIdRefMatch extends IdRefMatchBase {
  readonly kind: 'TASK';
  readonly planId: string;
  readonly planTitle: string | null;
}

/**
 * @public
 * @description One `resolveIdRef` result (mirrors the server `IdRefObject`),
 * discriminated on `kind`.
 */
export type IdRefMatch = PlanIdRefMatch | TaskIdRefMatch;

/**
 * @public
 * @description Payload an id-ref resolver resource route returns. `ref` echoes
 * the normalized hex the matches were resolved for, so the hook can drop data
 * that belongs to a stale keystroke.
 */
export interface IdRefResolverData {
  readonly matches: readonly IdRefMatch[];
  readonly ref: string;
}

/**
 * @description Connection status for the debugger header chip (aligned with notifications socket).
 */
export type WebsocketDebuggerConnectionStatus =
  'connected' | 'connecting' | 'disconnected' | 'error' | 'reconnecting';

/**
 * @description Multiselect option for filtering debugger events by Socket.IO event name.
 */
export interface WebsocketDebuggerEventOption {
  readonly label: string;
  readonly value: NotificationEventNamesValue;
}

/**
 * @description Minimal Socket.IO client surface used for standalone debugger mode.
 */
export interface WebsocketDebuggerSocket {
  off(event: string, handler: (payload: NotificationPayload) => void): void;
  on(event: string, handler: (payload: NotificationPayload) => void): void;
}

/**
 * @description Transport-agnostic fan-out of notification events: registers a
 * listener and returns its unsubscribe function.
 */
export type WebsocketDebuggerEventSubscriber = (
  listener: (
    event: NotificationEventNamesValue,
    payload: NotificationPayload,
  ) => void,
) => () => void;

/**
 * @description One Socket.IO notification captured for the live debugger feed.
 */
export interface WebsocketDebuggerLogEntry {
  readonly event: NotificationEventNamesValue;
  readonly id: string;
  readonly payload: NotificationPayload;
  /** ISO 8601 timestamp when the entry was recorded in the client. */
  readonly receivedAt: string;
}
