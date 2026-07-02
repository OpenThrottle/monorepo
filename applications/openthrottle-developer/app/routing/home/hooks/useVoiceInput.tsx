/**
 * @description Voice input for the home composer: composes useAudioCapture
 * (mic → 16kHz Float32 PCM) with useTranscriptionStream (graphql-ws session +
 * snapshot transcripts) behind a single toggle, and owns the locked
 * freeze-draft-append-live semantics — on start the existing draft freezes as
 * a read-only prefix, live snapshot transcripts render after it, and on stop
 * the finalized text becomes the editable draft (no auto-send).
 *
 * Startup runs the mic request and the transcription session in parallel;
 * chunks captured before the session is live are buffered client-side so the
 * user's first words are never clipped.
 */
import * as React from 'react';
import { ChatComposerMicState } from '@openthrottle/react-router-chat';
import { useAudioCapture } from '@openthrottle/react-router-ui';
import { encodeFloat32ToInt16Base64 } from '~/routing/home/utils/audio-encoding';
import { useTranscriptionStream } from '~/routing/home/hooks/useTranscriptionStream';

/** Lifecycle of one voice-input interaction. */
const VOICE_PHASE = {
  finalizing: 'finalizing',
  idle: 'idle',
  recording: 'recording',
  starting: 'starting',
} as const;

type VoicePhase = (typeof VOICE_PHASE)[keyof typeof VOICE_PHASE];

export interface UseVoiceInputArgs {
  /** Current composer draft (frozen as the prefix when recording starts). */
  readonly draft: string;
  /** Called when the voice interaction finalizes (focus the composer). */
  readonly onDraftChange: (draft: string) => void;
  /** Write the combined prefix + transcript into the composer draft. */
  readonly onFinalized?: () => void;
}

export interface UseVoiceInputResult {
  /** Permission / availability / stream error to surface next to the composer. */
  readonly error: string | null;
  /** True while the draft should be frozen (recording or finalizing). */
  readonly isDraftFrozen: boolean;
  /** State for the toolbar mic control. */
  readonly micState: ChatComposerMicState;
  /** Click handler for the mic: starts when idle, stops when recording. */
  readonly toggle: () => Promise<void>;
}

/** Join the frozen prefix and a Whisper transcript without doubled spaces. */
export function joinDraftParts(prefix: string, transcript: string): string {
  const trimmedTranscript = transcript.trim();
  if (prefix === '') {
    return trimmedTranscript;
  }
  if (trimmedTranscript === '') {
    return prefix;
  }

  return `${prefix.replace(/\s+$/, '')} ${trimmedTranscript}`;
}

/** Spike latency instrumentation: mic-start→first-partial, speech-end→final. */
interface VoiceLatencyMarks {
  firstPartialAt: number | null;
  micStartAt: number | null;
  speechEndAt: number | null;
}

export function useVoiceInput(args: UseVoiceInputArgs): UseVoiceInputResult {
  const { draft, onDraftChange, onFinalized } = args;

  // Hooks
  const [phase, setPhase] = React.useState<VoicePhase>(VOICE_PHASE.idle);
  const [startError, setStartError] = React.useState<string | null>(null);
  const prefixRef = React.useRef('');
  const pendingChunksRef = React.useRef<string[]>([]);
  const latencyRef = React.useRef<VoiceLatencyMarks>({
    firstPartialAt: null,
    micStartAt: null,
    speechEndAt: null,
  });

  const transcription = useTranscriptionStream();
  const transcriptionRef = React.useRef(transcription);
  transcriptionRef.current = transcription;

  const isSessionLive = transcription.sessionId !== null;
  const isSessionLiveRef = React.useRef(isSessionLive);
  isSessionLiveRef.current = isSessionLive;

  const capture = useAudioCapture({
    onChunk: (chunk) => {
      const encoded = encodeFloat32ToInt16Base64(chunk);
      if (isSessionLiveRef.current) {
        void transcriptionRef.current.sendAudioChunk(encoded);
      } else {
        // Session still starting: buffer so the first words are not clipped.
        pendingChunksRef.current.push(encoded);
      }
    },
  });
  const captureRef = React.useRef(capture);
  captureRef.current = capture;

  // Setup
  const micState: ChatComposerMicState = !capture.isSupported
    ? ChatComposerMicState.disabled
    : phase === VOICE_PHASE.finalizing
      ? ChatComposerMicState.finalizing
      : phase === VOICE_PHASE.idle
        ? ChatComposerMicState.idle
        : ChatComposerMicState.recording;

  // Handlers
  const toggle = React.useCallback(async (): Promise<void> => {
    const current = transcriptionRef.current;

    if (phase === VOICE_PHASE.recording || phase === VOICE_PHASE.starting) {
      // Toggle off: release the mic immediately; the terminal snapshot
      // arriving over the subscription completes the finalizing phase.
      latencyRef.current.speechEndAt = performance.now();
      setPhase(VOICE_PHASE.finalizing);
      captureRef.current.stop();
      await current.stop();

      return;
    }
    if (phase !== VOICE_PHASE.idle) {
      return;
    }

    // Toggle on: freeze the current draft as the prefix, then request the mic
    // and mint the transcription session in parallel.
    prefixRef.current = draft;
    pendingChunksRef.current = [];
    latencyRef.current = {
      firstPartialAt: null,
      micStartAt: performance.now(),
      speechEndAt: null,
    };
    setStartError(null);
    setPhase(VOICE_PHASE.starting);

    const [, started] = await Promise.all([
      captureRef.current.start(),
      current.start(),
    ]);

    const captureError = captureRef.current.error;
    if (captureError !== null || started.sessionId === null) {
      captureRef.current.stop();
      if (started.sessionId !== null) {
        await transcriptionRef.current.stop();
      }
      transcriptionRef.current.reset();
      setStartError(
        captureError !== null
          ? `Microphone unavailable: ${captureError.message}`
          : (started.errorMessage ?? 'Voice input could not start.'),
      );
      setPhase(VOICE_PHASE.idle);

      return;
    }

    setPhase(VOICE_PHASE.recording);
  }, [draft, phase]);

  // Life Cycle

  // Flush chunks buffered while the session was starting (in capture order).
  React.useEffect(() => {
    if (!isSessionLive || pendingChunksRef.current.length === 0) {
      return;
    }
    for (const encoded of pendingChunksRef.current.splice(0)) {
      void transcriptionRef.current.sendAudioChunk(encoded);
    }
  }, [isSessionLive]);

  // Live snapshots stream into the draft after the frozen prefix.
  const liveTranscript = transcription.snapshot.transcript;
  React.useEffect(() => {
    if (phase !== VOICE_PHASE.recording && phase !== VOICE_PHASE.finalizing) {
      return;
    }
    const marks = latencyRef.current;
    if (marks.firstPartialAt === null && liveTranscript !== '') {
      marks.firstPartialAt = performance.now();
      if (marks.micStartAt !== null) {
        // Spike latency gate: mic-start → first partial (target ≤2s).
        console.info(
          `[voice-input] first partial: ${((marks.firstPartialAt - marks.micStartAt) / 1000).toFixed(2)}s after mic start`,
        );
      }
    }
    onDraftChange(joinDraftParts(prefixRef.current, liveTranscript));

    // onDraftChange intentionally omitted: consumers pass fresh closures every
    // render; re-running on identity would rewrite the draft on every keystroke.
  }, [liveTranscript, phase]);

  // Terminal snapshot → finalize: editable draft, cursor to the consumer.
  const isDone = transcription.snapshot.done;
  React.useEffect(() => {
    if (!isDone || phase === VOICE_PHASE.idle) {
      return;
    }
    const { speechEndAt } = latencyRef.current;
    if (speechEndAt !== null) {
      // Spike latency gate: speech-end → final transcript (target ≤2s).
      console.info(
        `[voice-input] final transcript: ${((performance.now() - speechEndAt) / 1000).toFixed(2)}s after speech end`,
      );
    }
    captureRef.current.stop();
    transcriptionRef.current.reset();
    setPhase(VOICE_PHASE.idle);
    onFinalized?.();

    // onFinalized intentionally omitted (same fresh-closure reasoning as above).
  }, [isDone, phase]);

  // 🔌 Short Circuit

  return {
    error: startError ?? transcription.error,
    isDraftFrozen:
      phase === VOICE_PHASE.recording || phase === VOICE_PHASE.finalizing,
    micState,
    toggle,
  };
}
