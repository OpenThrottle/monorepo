import { WORKLET_PROCESSOR_NAME } from '../config/audio-capture';

/**
 * @description Source of the AudioWorklet processor `useAudioCapture` loads via a Blob URL.
 * Runs on the audio rendering thread: batches 128-sample render quanta into
 * fixed-size Float32 chunks and transfers them to the main thread.
 */
export const WORKLET_PROCESSOR_SOURCE = `
class PcmChunkProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const chunkSamples = options?.processorOptions?.chunkSamples ?? 4000;
    this.buffer = new Float32Array(chunkSamples);
    this.offset = 0;
  }

  process(inputs) {
    const channel = inputs[0]?.[0];
    if (!channel) {
      return true;
    }
    let read = 0;
    while (read < channel.length) {
      const available = this.buffer.length - this.offset;
      const toCopy = Math.min(available, channel.length - read);
      this.buffer.set(channel.subarray(read, read + toCopy), this.offset);
      this.offset += toCopy;
      read += toCopy;
      if (this.offset === this.buffer.length) {
        this.port.postMessage(this.buffer, [this.buffer.buffer]);
        this.buffer = new Float32Array(this.buffer.length);
        this.offset = 0;
      }
    }
    return true;
  }
}

registerProcessor('${WORKLET_PROCESSOR_NAME}', PcmChunkProcessor);
`;
