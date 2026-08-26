/**
 * @description ElevenLabs hosted TTS backend.
 *
 * Paid and OFF-BOX: every sentence is POSTed to api.elevenlabs.io, so takes are
 * marked `sendsDataOffBox: true`. Narration text describes unreleased work — see
 * ../NARRATION.md before rendering anything not already published.
 *
 * A missing API key fails loudly; this never falls back to another backend.
 */

import { writeFileSync } from 'node:fs';

import type { RenderRequest, TtsBackend } from '../types';

/**
 * The Season 2+ ship voice: "Will", a friendly young-male premade narration
 * voice. Won the 2026-08 phone-speaker bake-off (over Brian and Liam here,
 * and over the Fish Audio contenders). Pinned so takes are reproducible —
 * change only via a new bake-off. See ../NARRATION.md.
 */
export const DEFAULT_ELEVENLABS_VOICE = 'bIHbv24MWmeRgasZH58o';

/** Quality-tier model, pinned for reproducibility and recorded per take. */
export const DEFAULT_ELEVENLABS_MODEL = 'eleven_multilingual_v2';

const KEY_HINT =
  'Set ELEVENLABS_API_KEY in the repo root .env and export it before running (set -a; source .env; set +a). See packages/openthrottle-showroom/NARRATION.md';

/**
 * @description API key from the environment. Throws when unset — never falls back.
 */
export const resolveElevenLabsApiKey = (
  env: NodeJS.ProcessEnv = process.env,
): string => {
  const key = env.ELEVENLABS_API_KEY?.trim();

  if (!key) {
    throw new Error(`elevenlabs: ELEVENLABS_API_KEY is not set. ${KEY_HINT}`);
  }

  return key;
};

export const elevenLabsBackend: TtsBackend = {
  id: 'elevenlabs',
  model: DEFAULT_ELEVENLABS_MODEL,
  render: async (request: RenderRequest): Promise<string> => {
    const key = resolveElevenLabsApiKey();
    // The narrate stage transcodes and normalises afterwards, so the highest
    // universally-available format (mp3 44.1kHz 128kbps) is fine as the raw take.
    const mp3Path = request.outputPath.replace(/\.(aiff|wav)$/i, '.mp3');

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${request.voice}?output_format=mp3_44100_128`,
      {
        body: JSON.stringify({
          model_id: DEFAULT_ELEVENLABS_MODEL,
          text: request.text,
        }),
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': key,
        },
        method: 'POST',
      },
    );

    if (!response.ok) {
      const detail = await response.text();

      throw new Error(
        `elevenlabs: render failed (${String(response.status)} ${response.statusText}): ${detail.slice(0, 500)}`,
      );
    }

    writeFileSync(mp3Path, Buffer.from(await response.arrayBuffer()));

    return mp3Path;
  },
  sendsDataOffBox: true,
};
