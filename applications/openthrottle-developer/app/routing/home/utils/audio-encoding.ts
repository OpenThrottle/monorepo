/**
 * @description Encode captured microphone PCM for the transcription transport:
 * Float32 samples (from useAudioCapture) → little-endian Int16 → base64, the
 * wire format sendTranscriptionAudioChunk expects. Int16 halves the payload
 * versus raw Float32 and the server converts back before relaying.
 */

/** btoa argument chunking: keeps String.fromCharCode off the arg-count limit. */
const BYTES_PER_SLICE = 8192;

/**
 * Convert one Float32 PCM chunk (range [-1, 1]) to base64-encoded
 * little-endian Int16 PCM. Samples are clamped before quantizing.
 */
export function encodeFloat32ToInt16Base64(chunk: Float32Array): string {
  const pcm = new Int16Array(chunk.length);
  for (let index = 0; index < chunk.length; index += 1) {
    const clamped = Math.max(-1, Math.min(1, chunk[index]));
    pcm[index] = Math.round(clamped * 32767);
  }

  const bytes = new Uint8Array(pcm.buffer);
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += BYTES_PER_SLICE) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, offset + BYTES_PER_SLICE),
    );
  }

  return btoa(binary);
}
