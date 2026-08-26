import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import {
  DEFAULT_PIPER_VOICE,
  piperBackend,
  piperModelPath,
  resolvePiperBinary,
  resolvePiperDataDir,
} from '../piper';

describe('resolvePiperBinary', () => {
  test('defaults to piper on PATH', () => {
    expect(resolvePiperBinary({})).toBe('piper');
  });

  test('uses PIPER_BIN when set', () => {
    expect(resolvePiperBinary({ PIPER_BIN: '/opt/piper' })).toBe('/opt/piper');
  });
});

describe('resolvePiperDataDir', () => {
  test('uses PIPER_DATA_DIR when set', () => {
    expect(resolvePiperDataDir({ PIPER_DATA_DIR: '/tmp/voices' })).toBe(
      '/tmp/voices',
    );
  });
});

describe('piperModelPath', () => {
  test('joins a voice name onto the data dir', () => {
    expect(piperModelPath('en_US-lessac-high', '/voices')).toBe(
      '/voices/en_US-lessac-high.onnx',
    );
  });

  test('passes through an absolute onnx path', () => {
    expect(piperModelPath('/abs/voice.onnx', '/voices')).toBe(
      '/abs/voice.onnx',
    );
  });
});

describe('piperBackend', () => {
  test('identifies as on-box piper', () => {
    expect(piperBackend.id).toBe('piper');
    expect(piperBackend.sendsDataOffBox).toBe(false);
  });

  test('fails loudly when the voice model is missing', async () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'piper-voices-'));
    const previous = process.env.PIPER_DATA_DIR;

    process.env.PIPER_DATA_DIR = dataDir;

    try {
      await expect(
        piperBackend.render({
          outputPath: join(dataDir, 'out.wav'),
          text: 'hello',
          voice: DEFAULT_PIPER_VOICE,
        }),
      ).rejects.toThrow(/voice model not found/);
    } finally {
      if (previous === undefined) {
        delete process.env.PIPER_DATA_DIR;
      } else {
        process.env.PIPER_DATA_DIR = previous;
      }
    }
  });

  test('fails loudly when the binary is missing', async () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'piper-voices-'));
    const modelPath = join(dataDir, `${DEFAULT_PIPER_VOICE}.onnx`);

    writeFileSync(modelPath, 'not-a-real-model');

    const previousBin = process.env.PIPER_BIN;
    const previousDir = process.env.PIPER_DATA_DIR;

    process.env.PIPER_BIN = join(dataDir, 'no-such-piper-binary');
    process.env.PIPER_DATA_DIR = dataDir;

    try {
      await expect(
        piperBackend.render({
          outputPath: join(dataDir, 'out.wav'),
          text: 'hello',
          voice: DEFAULT_PIPER_VOICE,
        }),
      ).rejects.toThrow(/binary not found/);
    } finally {
      if (previousBin === undefined) {
        delete process.env.PIPER_BIN;
      } else {
        process.env.PIPER_BIN = previousBin;
      }

      if (previousDir === undefined) {
        delete process.env.PIPER_DATA_DIR;
      } else {
        process.env.PIPER_DATA_DIR = previousDir;
      }
    }
  });
});
