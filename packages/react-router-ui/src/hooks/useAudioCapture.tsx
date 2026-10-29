import * as React from 'react';

import {
  CAPTURE_SAMPLE_RATE,
  DEFAULT_CHUNK_DURATION_MS,
  WORKLET_PROCESSOR_NAME,
} from '../config/audio-capture';
import { WORKLET_PROCESSOR_SOURCE } from '../data/data.audio-capture-worklet';
import type { AudioCaptureStatus } from '../types';
import { isCaptureSupported } from '../utils/is-capture-supported';
import { toError } from '../utils/to-error';

export interface UseAudioCaptureOptions {
  /**
   * @description Target duration of each emitted PCM chunk in milliseconds. Defaults to 250ms (~4000 samples at 16kHz).
   */
  readonly chunkDurationMs?: number;
  /**
   * @description Called with each captured chunk of 16kHz mono Float32 PCM while recording.
   */
  readonly onChunk?: (chunk: Float32Array) => void;
}

export interface UseAudioCaptureResult {
  /**
   * @description Permission, unsupported-browser, or capture-pipeline error; cleared on the next successful start.
   */
  readonly error: Error | null;
  /**
   * @description Whether the current environment exposes getUserMedia + AudioWorklet.
   */
  readonly isSupported: boolean;
  /**
   * @description Request the microphone and begin emitting chunks (toggle-on). No-op while already recording.
   */
  readonly start: () => Promise<void>;
  readonly status: AudioCaptureStatus;
  /**
   * @description Stop capturing (toggle-off): releases media tracks and closes the AudioContext.
   */
  readonly stop: () => void;
}

interface CapturePipeline {
  readonly audioContext: AudioContext;
  readonly mediaStream: MediaStream;
  readonly sourceNode: MediaStreamAudioSourceNode;
  readonly workletNode: AudioWorkletNode;
}

/**
 * @description Captures microphone audio as ~250ms chunks of 16kHz mono Float32 PCM via
 * getUserMedia + an AudioWorklet (raw PCM — deliberately not MediaRecorder, whose timesliced
 * container chunks are not independently decodable). Toggle-only: `start()` / `stop()`.
 * @public
 */
export function useAudioCapture(
  options: UseAudioCaptureOptions = {},
): UseAudioCaptureResult {
  const { chunkDurationMs = DEFAULT_CHUNK_DURATION_MS, onChunk } = options;

  // Hooks
  const [status, setStatus] = React.useState<AudioCaptureStatus>('idle');
  const [error, setError] = React.useState<Error | null>(null);

  const pipelineRef = React.useRef<CapturePipeline | null>(null);
  const startingRef = React.useRef(false);
  const onChunkRef = React.useRef<UseAudioCaptureOptions['onChunk']>(onChunk);

  // Two-pass on purpose: SSR (and the hydrating first client render) reports
  // unsupported, then the mount effect upgrades — keeping server and client
  // markup identical avoids a hydration attribute mismatch on consumers.
  const [isSupported, setIsSupported] = React.useState(false);

  // Setup
  onChunkRef.current = onChunk;

  // Handlers
  const teardown = React.useCallback((): void => {
    const pipeline = pipelineRef.current;
    pipelineRef.current = null;
    if (pipeline === null) {
      return;
    }
    pipeline.workletNode.port.onmessage = null;
    pipeline.workletNode.disconnect();
    pipeline.sourceNode.disconnect();
    for (const track of pipeline.mediaStream.getTracks()) {
      track.stop();
    }
    void pipeline.audioContext.close().catch(() => {
      // Closing an already-closed context throws; nothing to recover.
    });
  }, []);

  const stop = React.useCallback((): void => {
    teardown();
    setStatus('idle');
  }, [teardown]);

  const start = React.useCallback(async (): Promise<void> => {
    if (startingRef.current || pipelineRef.current !== null) {
      return;
    }
    if (!isCaptureSupported()) {
      setError(
        new Error(
          'Audio capture is not supported in this browser (requires getUserMedia and AudioWorklet).',
        ),
      );
      return;
    }

    startingRef.current = true;
    setError(null);
    setStatus('requesting');

    let mediaStream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      audioContext = new AudioContext({ sampleRate: CAPTURE_SAMPLE_RATE });
      // Blob URL instead of a static asset: this is a source-first package, so
      // there is no build step to copy a worklet file into consuming apps.
      const workletUrl = URL.createObjectURL(
        new Blob([WORKLET_PROCESSOR_SOURCE], { type: 'text/javascript' }),
      );
      try {
        await audioContext.audioWorklet.addModule(workletUrl);
      } finally {
        URL.revokeObjectURL(workletUrl);
      }

      const chunkSamples = Math.max(
        128,
        Math.round((CAPTURE_SAMPLE_RATE * chunkDurationMs) / 1000),
      );
      const workletNode = new AudioWorkletNode(
        audioContext,
        WORKLET_PROCESSOR_NAME,
        {
          channelCount: 1,
          channelCountMode: 'explicit',
          numberOfInputs: 1,
          numberOfOutputs: 1,
          processorOptions: { chunkSamples },
        },
      );
      workletNode.port.onmessage = (event: MessageEvent<Float32Array>) => {
        onChunkRef.current?.(event.data);
      };

      const sourceNode = audioContext.createMediaStreamSource(mediaStream);
      sourceNode.connect(workletNode);
      // Keep the worklet pulled by the rendering graph; it outputs silence.
      workletNode.connect(audioContext.destination);

      pipelineRef.current = {
        audioContext,
        mediaStream,
        sourceNode,
        workletNode,
      };
      setStatus('recording');
    } catch (startError) {
      for (const track of mediaStream?.getTracks() ?? []) {
        track.stop();
      }
      void audioContext?.close().catch(() => {
        // Context may never have finished opening.
      });
      setError(toError(startError));
      setStatus('idle');
    } finally {
      startingRef.current = false;
    }
  }, [chunkDurationMs]);

  // Markup

  // Life Cycle
  React.useEffect(() => {
    setIsSupported(isCaptureSupported());
  }, []);

  React.useEffect(() => teardown, [teardown]);

  // 🔌 Short Circuit

  return {
    error,
    isSupported,
    start,
    status,
    stop,
  };
}
