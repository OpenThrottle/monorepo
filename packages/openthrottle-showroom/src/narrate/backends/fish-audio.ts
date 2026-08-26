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
 * Candidate voice for the bake-off: "Ethan", a curious-explainer young male
 * narration voice from the public library (fish.audio/app/m/<id>). Won the
 * phone-speaker listen over "Slax" (rejected: announcer feel, slowest read)
 * and "ELITE". Pinned so takes are reproducible — change only via a new
 * bake-off.
 */
// export const DEFAULT_FISH_AUDIO_VOICE = '536d3a5e000945adb7038665781a4aca';
export const DEFAULT_FISH_AUDIO_VOICE = 'e35d38e0269f4e8dae73d66e99376b1e';

/**
 * OpenAudio S1 — the model family with open-weight releases, which is the
 * self-hosting escape hatch if the hosted voice ever changes or disappears.
 * Selected via the `model` HTTP header, pinned and recorded per take.
 */
export const DEFAULT_FISH_AUDIO_MODEL = 's1';

const KEY_HINT = `Set FISH_AUDIO_API_KEY in the repo root .env and export it before running (set -a; source .env; set +a). See packages/openthrottle-showroom/NARRATION.md`;

/**
 * @description Model for this run. `FISH_AUDIO_MODEL` overrides the pin — useful
 * for `s2.1-pro-free` (same model as paid s2.1-pro, but requests may be retained
 * for training and there is no SLA). The resolved value is recorded per take.
 */
export const resolveFishAudioModel = (
  env: NodeJS.ProcessEnv = process.env,
): string => {
  const model = env.FISH_AUDIO_MODEL?.trim();

  return model && model.length > 0 ? model : DEFAULT_FISH_AUDIO_MODEL;
};

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

const RESOLVED_MODEL = resolveFishAudioModel();

export const fishAudioBackend: TtsBackend = {
  id: 'fish-audio',
  model: RESOLVED_MODEL,
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
        model: RESOLVED_MODEL,
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
