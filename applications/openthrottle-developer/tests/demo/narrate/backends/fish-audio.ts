/**
 * @description Fish Audio hosted TTS backend (OpenAudio models).
 *
 * Paid and OFF-BOX: every sentence is POSTed to api.fish.audio, so takes are
 * marked `sendsDataOffBox: true`. Narration text describes unreleased work — see
 * ../NARRATION.md before rendering anything not already published.
 *
 * A missing API key fails loudly; this never falls back to another backend.
 */

import { writeFileSync } from 'node:fs';

import type { RenderRequest, TtsBackend } from '../types';

/**
 * Candidate voice for the bake-off: "Slax", a clear, measured male narration
 * voice from the public library (fish.audio/app/m/<id>). Pinned so takes are
 * reproducible — change only via a new bake-off.
 */
export const DEFAULT_FISH_AUDIO_VOICE = 'c5f56a6cc2ec4fa8920cb4c5889a3fb7';

/**
 * OpenAudio S1 — the model family with open-weight releases, which is the
 * self-hosting escape hatch if the hosted voice ever changes or disappears.
 * Selected via the `model` HTTP header, pinned and recorded per take.
 */
export const DEFAULT_FISH_AUDIO_MODEL = 's1';

const KEY_HINT =
  'Set FISH_AUDIO_API_KEY in the repo root .env and export it before running (set -a; source .env; set +a). See applications/openthrottle-developer/tests/demo/NARRATION.md';

/**
 * @description API key from the environment. Throws when unset — never falls back.
 */
export const resolveFishAudioApiKey = (
  env: NodeJS.ProcessEnv = process.env,
): string => {
  const key = env.FISH_AUDIO_API_KEY?.trim();

  if (!key) {
    throw new Error(`fish-audio: FISH_AUDIO_API_KEY is not set. ${KEY_HINT}`);
  }

  return key;
};

export const fishAudioBackend: TtsBackend = {
  id: 'fish-audio',
  model: DEFAULT_FISH_AUDIO_MODEL,
  render: async (request: RenderRequest): Promise<string> => {
    const key = resolveFishAudioApiKey();
    const wavPath = request.outputPath.replace(/\.(aiff|wav)$/i, '.wav');

    const response = await fetch('https://api.fish.audio/v1/tts', {
      body: JSON.stringify({
        format: 'wav',
        reference_id: request.voice,
        text: request.text,
      }),
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        model: DEFAULT_FISH_AUDIO_MODEL,
      },
      method: 'POST',
    });

    if (!response.ok) {
      const detail = await response.text();

      throw new Error(
        `fish-audio: render failed (${String(response.status)} ${response.statusText}): ${detail.slice(0, 500)}`,
      );
    }

    writeFileSync(wavPath, Buffer.from(await response.arrayBuffer()));

    return wavPath;
  },
  sendsDataOffBox: true,
};
