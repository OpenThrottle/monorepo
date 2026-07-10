import * as React from 'react';
import { act, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useAudioCapture } from '../useAudioCapture';

class MockMessagePort {
  onmessage: ((event: MessageEvent<Float32Array>) => void) | null = null;
  postMessage = vi.fn();
}

class MockAudioWorkletNode {
  static instances: MockAudioWorkletNode[] = [];
  readonly port = new MockMessagePort();
  connect = vi.fn();
  disconnect = vi.fn();

  constructor(
    readonly context: unknown,
    readonly processorName: string,
    readonly options: unknown,
  ) {
    MockAudioWorkletNode.instances.push(this);
  }
}

class MockSourceNode {
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockAudioContext {
  static instances: MockAudioContext[] = [];
  readonly audioWorklet = { addModule: vi.fn().mockResolvedValue(undefined) };
  readonly destination = {};
  close = vi.fn().mockResolvedValue(undefined);
  createMediaStreamSource = vi.fn().mockReturnValue(new MockSourceNode());

  constructor(readonly options: unknown) {
    MockAudioContext.instances.push(this);
  }
}

const createMockTrack = () => ({ stop: vi.fn() });

function createMockStream() {
  const track = createMockTrack();
  return {
    getTracks: () => [track],
    track,
  };
}

function CaptureHarness(props: {
  readonly onChunk?: (chunk: Float32Array) => void;
}) {
  const capture = useAudioCapture({ onChunk: props.onChunk });

  return (
    <div>
      <span data-testid="status">{capture.status}</span>
      <span data-testid="supported">{String(capture.isSupported)}</span>
      <span data-testid="error">{capture.error?.message ?? ''}</span>
      <button
        data-testid="start"
        onClick={() => void capture.start()}
        type="button"
      >
        Start
      </button>
      <button data-testid="stop" onClick={() => capture.stop()} type="button">
        Stop
      </button>
    </div>
  );
}

describe('useAudioCapture', () => {
  let mockStream: ReturnType<typeof createMockStream>;
  let getUserMedia: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    MockAudioContext.instances = [];
    MockAudioWorkletNode.instances = [];
    mockStream = createMockStream();
    getUserMedia = vi.fn().mockResolvedValue(mockStream);

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    });
    vi.stubGlobal('AudioContext', MockAudioContext);
    vi.stubGlobal('AudioWorkletNode', MockAudioWorkletNode);
    // jsdom's URL lacks the object-URL methods; patch them rather than
    // replacing the URL global jsdom itself relies on.
    Object.assign(URL, {
      createObjectURL: vi.fn().mockReturnValue('blob:worklet'),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, 'mediaDevices');
    Reflect.deleteProperty(URL, 'createObjectURL');
    Reflect.deleteProperty(URL, 'revokeObjectURL');
  });

  test('reports capture as supported and idle before starting', () => {
    const { getByTestId } = render(<CaptureHarness />);

    expect(getByTestId('supported')).toHaveTextContent('true');
    expect(getByTestId('status')).toHaveTextContent('idle');
  });

  describe('when start is invoked', () => {
    test('builds the capture pipeline at 16kHz and records', async () => {
      const user = userEvent.setup();
      const { getByTestId } = render(<CaptureHarness />);

      await user.click(getByTestId('start'));

      expect(getByTestId('status')).toHaveTextContent('recording');
      expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
      const [context] = MockAudioContext.instances;
      expect(context.options).toEqual({ sampleRate: 16000 });
      expect(context.audioWorklet.addModule).toHaveBeenCalledWith(
        'blob:worklet',
      );
      const [worklet] = MockAudioWorkletNode.instances;
      expect(worklet.processorName).toBe('openthrottle-pcm-chunk');
    });

    test('delivers worklet chunks to onChunk', async () => {
      const onChunk = vi.fn();
      const user = userEvent.setup();
      const { getByTestId } = render(<CaptureHarness onChunk={onChunk} />);

      await user.click(getByTestId('start'));

      const [worklet] = MockAudioWorkletNode.instances;
      const chunk = new Float32Array(4000);
      act(() => {
        worklet.port.onmessage?.(
          new MessageEvent<Float32Array>('message', { data: chunk }),
        );
      });

      expect(onChunk).toHaveBeenCalledWith(chunk);
    });

    test('surfaces permission denial and returns to idle', async () => {
      getUserMedia.mockRejectedValue(new Error('Permission denied'));
      const user = userEvent.setup();
      const { getByTestId } = render(<CaptureHarness />);

      await user.click(getByTestId('start'));

      expect(getByTestId('status')).toHaveTextContent('idle');
      expect(getByTestId('error')).toHaveTextContent('Permission denied');
    });
  });

  describe('when the browser lacks capture APIs', () => {
    test('reports unsupported and errors on start', async () => {
      Reflect.deleteProperty(navigator, 'mediaDevices');
      const user = userEvent.setup();
      const { getByTestId } = render(<CaptureHarness />);

      expect(getByTestId('supported')).toHaveTextContent('false');

      await user.click(getByTestId('start'));

      expect(getByTestId('status')).toHaveTextContent('idle');
      expect(getByTestId('error')).toHaveTextContent('not supported');
    });
  });

  describe('when stop is invoked', () => {
    test('releases tracks and closes the AudioContext', async () => {
      const user = userEvent.setup();
      const { getByTestId } = render(<CaptureHarness />);

      await user.click(getByTestId('start'));
      await user.click(getByTestId('stop'));

      expect(getByTestId('status')).toHaveTextContent('idle');
      expect(mockStream.track.stop).toHaveBeenCalled();
      const [context] = MockAudioContext.instances;
      expect(context.close).toHaveBeenCalled();
      const [worklet] = MockAudioWorkletNode.instances;
      expect(worklet.disconnect).toHaveBeenCalled();
    });
  });

  describe('when the component unmounts while recording', () => {
    test('tears down the pipeline', async () => {
      const user = userEvent.setup();
      const { getByTestId, unmount } = render(<CaptureHarness />);

      await user.click(getByTestId('start'));
      unmount();

      expect(mockStream.track.stop).toHaveBeenCalled();
      const [context] = MockAudioContext.instances;
      expect(context.close).toHaveBeenCalled();
    });
  });
});
