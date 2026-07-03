import { describe, expect, it } from 'vitest';

import { encodeFloat32ToInt16Base64 } from '../audio-encoding';

const decodeToInt16 = (base64: string): Int16Array => {
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  return new Int16Array(bytes.buffer);
};

describe('encodeFloat32ToInt16Base64', () => {
  it('quantizes Float32 samples to little-endian Int16', () => {
    const encoded = encodeFloat32ToInt16Base64(
      new Float32Array([0, 0.5, -0.5, 1]),
    );

    // Math.round(-16383.5) rounds toward +Infinity → -16383.
    expect(Array.from(decodeToInt16(encoded))).toEqual([
      0, 16384, -16383, 32767,
    ]);
  });

  it('clamps out-of-range samples instead of overflowing', () => {
    const encoded = encodeFloat32ToInt16Base64(new Float32Array([2, -2]));

    expect(Array.from(decodeToInt16(encoded))).toEqual([32767, -32767]);
  });

  it('round-trips a chunk larger than one btoa slice', () => {
    const samples = new Float32Array(8192);
    samples.fill(0.25);

    const decoded = decodeToInt16(encodeFloat32ToInt16Base64(samples));

    expect(decoded).toHaveLength(8192);
    expect(decoded[0]).toBe(8192);
    expect(decoded[8191]).toBe(8192);
  });
});
