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

import type {
  RenderedTake,
  RenderRequest,
  TakeRequest,
  TtsBackend,
} from '../types.ts';
import type { SseEvent } from './fish-audio-sse.ts';
import {
  assembleTake,
  assertCoverage,
  buildWav,
  FISH_TAKE_SAMPLE_RATE,
  flushSseText,
  parseSseText,
  parseTakeEvent,
} from './fish-audio-sse.ts';

/**
 * The pinned voice for the default backend, from the public library
 * (fish.audio/app/m/<id>). Pinned so takes are reproducible; recorded per take
 * alongside the backend and model, because a voice id alone does not reproduce a
 * hosted render.
 *
 * A swap is planned — treat this constant as the only answer to "which voice is
 * this", and do not encode the current id anywhere else. The bake-off's Fish
 * winner was a different voice ("Ethan"); that id is recorded in ../../NARRATION.md
 * rather than kept here as dead code.
 */
export const DEFAULT_FISH_AUDIO_VOICE = '6ca04d7a79d645e0986069e663d131d0';

/**
 * OpenAudio S1 — the model family with open-weight releases, which is the
 * self-hosting escape hatch if the hosted voice ever changes or disappears.
 * Selected via the `model` HTTP header, pinned and recorded per take.
 */
export const DEFAULT_FISH_AUDIO_MODEL = 's2.1-pro-free';

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

/**
 * @description The pinned `chunk_length` for a whole-take request. Part of the
 * take cache key, because it shapes the request even though the spike saw no
 * effect from it.
 */
export const FISH_TAKE_CHUNK_LENGTH = 300;

const TAKE_ENDPOINT = 'https://api.fish.audio/v1/tts/stream/with-timestamp';

/**
 * @description Request body for a whole-take render.
 *
 * - `sample_rate: 44100` — the highest wav rate Fish accepts: 48000 is rejected
 *   with a 400. The take is therefore NOT at format.json's rate; the gain-then-slice
 *   step (OT task 4) resamples it with `-ar <format.audio.sampleRate>`, the same
 *   way the per-sentence path's ffmpeg passes do.
 * - `chunk_length: 300` — had no observable effect in the spike; pinned and
 *   provisional until the human listen.
 * - `condition_on_previous_chunks`, `temperature` and `top_p` are deliberately not
 *   sent: unverified on this endpoint.
 */
export const buildTakeBody = (
  text: string,
  voice: string,
): Record<string, string | number> => {
  return {
    chunk_length: FISH_TAKE_CHUNK_LENGTH,
    format: 'wav',
    reference_id: voice,
    sample_rate: FISH_TAKE_SAMPLE_RATE,
    text,
  };
};

const readTakeStream = async (response: Response): Promise<SseEvent[]> => {
  if (response.body === null) {
    throw new Error('fish-audio: whole-take response has no body');
  }

  const decoder = new TextDecoder();
  const events: SseEvent[] = [];
  let rest = '';

  for await (const part of response.body) {
    const parsed = parseSseText(rest, decoder.decode(part, { stream: true }));

    events.push(...parsed.events);
    rest = parsed.rest;
  }

  events.push(...flushSseText(`${rest}${decoder.decode()}`));

  return events;
};

const renderTake = async (request: TakeRequest): Promise<RenderedTake> => {
  const key = resolveFishAudioApiKey();
  const wavPath = request.outputPath.replace(/\.(aiff|wav)$/i, '.wav');

  const response = await fetch(TAKE_ENDPOINT, {
    body: JSON.stringify(buildTakeBody(request.text, request.voice)),
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
      `fish-audio: whole-take render failed (${String(response.status)} ${response.statusText}): ${detail.slice(0, 500)}`,
    );
  }

  const events = await readTakeStream(response);
  const take = assembleTake(events.map((event) => parseTakeEvent(event.data)));

  assertCoverage(request.text, take.words);
  writeFileSync(wavPath, buildWav(take.pcm, FISH_TAKE_SAMPLE_RATE));

  return { audioPath: wavPath, words: take.words };
};

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
  renderTake,
  sendsDataOffBox: true,
};
