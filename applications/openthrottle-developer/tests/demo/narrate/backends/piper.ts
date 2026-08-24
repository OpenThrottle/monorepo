/**
 * @description Local Piper TTS backend (OHF-Voice/piper1-gpl).
 *
 * On-box neural TTS. Install is documented in ../NARRATION.md — binary via
 * `uv tool install piper-tts`, voice model in `~/.local/share/piper/voices`.
 * Missing binary or model fails loudly; this never falls back to macOS `say`.
 */

import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { promisify } from 'node:util';

import type { RenderRequest, TtsBackend } from '../types';

const execFileAsync = promisify(execFile);

/** The pinned ship voice. Do not change mid-season — see NARRATION.md. */
export const DEFAULT_PIPER_VOICE = 'en_US-libritts_r-medium'; // 🌟🌟🌟🌟🌟
// export const DEFAULT_PIPER_VOICE = 'en_US-hfc_male-medium'; // 🌟🌟🌟🌟🌟
// export const DEFAULT_PIPER_VOICE = 'en_US-lessac-high'; // 🌟🌟🌟
// export const DEFAULT_PIPER_VOICE = 'en_US-ryan-high'; // 🌟🌟🌟
// export const DEFAULT_PIPER_VOICE = 'en_US-joe-medium'; // 🌟🌟

const INSTALL_HINT = `Install with: uv tool install piper-tts\nDownload the voice: python -m piper.download_voices en_US-hfc_male-medium --data-dir ~/.local/share/piper/voices\nSee applications/openthrottle-developer/tests/demo/NARRATION.md`;

/**
 * @description Default directory for onnx + json voice files (outside git).
 */
export const defaultPiperDataDir = (): string =>
  join(homedir(), '.local', 'share', 'piper', 'voices');

/**
 * @description Binary used to render. `PIPER_BIN` wins; otherwise `piper` on PATH.
 */
export const resolvePiperBinary = (
  env: NodeJS.ProcessEnv = process.env,
): string => {
  const fromEnv = env.PIPER_BIN?.trim();

  return fromEnv && fromEnv.length > 0 ? fromEnv : 'piper';
};

/**
 * @description Directory of voice models. `PIPER_DATA_DIR` wins.
 */
export const resolvePiperDataDir = (
  env: NodeJS.ProcessEnv = process.env,
): string => {
  const fromEnv = env.PIPER_DATA_DIR?.trim();

  return fromEnv && fromEnv.length > 0 ? fromEnv : defaultPiperDataDir();
};

/**
 * @description Absolute path to the onnx model for a voice name or a `.onnx` path.
 */
const execErrorCode = (error: unknown): string | undefined => {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }

  const code = Reflect.get(error, 'code');

  return typeof code === 'string' ? code : undefined;
};

const execErrorDetail = (error: unknown): string => {
  if (typeof error === 'object' && error !== null && 'stderr' in error) {
    const stderr = Reflect.get(error, 'stderr');

    if (typeof stderr === 'string' && stderr.trim().length > 0) {
      return stderr.trim();
    }
  }

  return error instanceof Error ? error.message : String(error);
};

export const piperModelPath = (voice: string, dataDir: string): string => {
  if (isAbsolute(voice) && voice.endsWith('.onnx')) {
    return voice;
  }

  return join(dataDir, `${voice}.onnx`);
};

export const piperBackend: TtsBackend = {
  id: 'piper',
  render: async (request: RenderRequest): Promise<string> => {
    const bin = resolvePiperBinary();
    const dataDir = resolvePiperDataDir();
    const modelPath = piperModelPath(request.voice, dataDir);
    const wavPath = request.outputPath.replace(/\.(aiff|wav)$/i, '.wav');

    if (!existsSync(modelPath)) {
      throw new Error(
        `piper: voice model not found at ${modelPath}. ${INSTALL_HINT}`,
      );
    }

    try {
      await execFileAsync(bin, [
        '-m',
        modelPath,
        '-f',
        wavPath,
        '--',
        request.text,
      ]);
    } catch (error: unknown) {
      if (execErrorCode(error) === 'ENOENT') {
        throw new Error(`piper: binary not found (${bin}). ${INSTALL_HINT}`);
      }

      throw new Error(`piper: render failed: ${execErrorDetail(error)}`);
    }

    return wavPath;
  },
  sendsDataOffBox: false,
};
