import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, test, vi } from 'vitest';

import {
  DEFAULT_FISH_AUDIO_MODEL,
  DEFAULT_FISH_AUDIO_VOICE,
  fishAudioBackend,
  resolveFishAudioApiKey,
  resolveFishAudioModel,
} from '../fish-audio.ts';

describe('resolveFishAudioModel', () => {
  test('defaults to the pinned OpenAudio model', () => {
    expect(resolveFishAudioModel({})).toBe(DEFAULT_FISH_AUDIO_MODEL);
  });

  test('uses FISH_AUDIO_MODEL when set', () => {
    expect(resolveFishAudioModel({ FISH_AUDIO_MODEL: 's2.1-pro-free' })).toBe(
      's2.1-pro-free',
    );
  });
});

describe('resolveFishAudioApiKey', () => {
  test('returns the key when set', () => {
    expect(resolveFishAudioApiKey({ FISH_AUDIO_API_KEY: 'abc' })).toBe('abc');
  });

  test('fails loudly when unset', () => {
    expect(() => resolveFishAudioApiKey({})).toThrow(
      /FISH_AUDIO_API_KEY is not set/,
    );
  });

  test('fails loudly when blank', () => {
    expect(() => resolveFishAudioApiKey({ FISH_AUDIO_API_KEY: '  ' })).toThrow(
      /FISH_AUDIO_API_KEY is not set/,
    );
  });
});

describe('fishAudioBackend', () => {
  test('identifies as off-box fish-audio with a pinned OpenAudio model', () => {
    expect(fishAudioBackend.id).toBe('fish-audio');
    expect(fishAudioBackend.model).toBe(DEFAULT_FISH_AUDIO_MODEL);
    expect(fishAudioBackend.sendsDataOffBox).toBe(true);
  });

  test('render fails loudly when the API key is missing', async () => {
    const previous = process.env.FISH_AUDIO_API_KEY;

    delete process.env.FISH_AUDIO_API_KEY;

    try {
      await expect(
        fishAudioBackend.render({
          outputPath: join(tmpdir(), 'out.wav'),
          text: 'hello',
          voice: DEFAULT_FISH_AUDIO_VOICE,
        }),
      ).rejects.toThrow(/FISH_AUDIO_API_KEY is not set/);
    } finally {
      if (previous === undefined) {
        delete process.env.FISH_AUDIO_API_KEY;
      } else {
        process.env.FISH_AUDIO_API_KEY = previous;
      }
    }
  });
});

describe('fishAudioBackend.renderTake', () => {
  const outputPath = join(
    mkdtempSync(join(tmpdir(), 'fish-take-')),
    'take.wav',
  );
  const fixture = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'fish-take.sse'),
    'utf8',
  );
  const request = {
    outputPath,
    text: 'Hello there. Open Throttle \u2014 local first.',
    voice: DEFAULT_FISH_AUDIO_VOICE,
  };

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  test('fails loudly when the API key is missing', async () => {
    vi.stubEnv('FISH_AUDIO_API_KEY', '');

    await expect(fishAudioBackend.renderTake?.(request)).rejects.toThrow(
      /FISH_AUDIO_API_KEY is not set/,
    );
  });

  test('fails loudly on a non-2xx response, including its JSON body', async () => {
    vi.stubEnv('FISH_AUDIO_API_KEY', 'test-key');
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ message: 'bad rate', status: 400 }), {
            status: 400,
          }),
        ),
      ),
    );

    await expect(fishAudioBackend.renderTake?.(request)).rejects.toThrow(
      /\(400.*bad rate/s,
    );
  });

  test('writes one WAV and returns absolute words from a streamed body', async () => {
    vi.stubEnv('FISH_AUDIO_API_KEY', 'test-key');

    const fetchMock = vi.fn((_url: string, init: RequestInit) => {
      const encoder = new TextEncoder();
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          // Deliberately cut mid-line to exercise buffering.
          controller.enqueue(encoder.encode(fixture.slice(0, 57)));
          controller.enqueue(encoder.encode(fixture.slice(57)));
          controller.close();
        },
      });

      expect(init.method).toBe('POST');

      return Promise.resolve(new Response(body, { status: 200 }));
    });

    vi.stubGlobal('fetch', fetchMock);

    const take = await fishAudioBackend.renderTake?.(request);
    const wav = readFileSync(outputPath);

    expect(take?.words).toHaveLength(6);
    expect(take?.audioPath).toBe(outputPath);
    expect(wav.length).toBe(44 + 5 * 8);
    expect(wav.readUInt32LE(24)).toBe(44_100);

    const sent: unknown = JSON.parse(String(fetchMock.mock.calls[0]?.[1].body));

    expect(sent).toMatchObject({
      chunk_length: 300,
      format: 'wav',
      reference_id: DEFAULT_FISH_AUDIO_VOICE,
      sample_rate: 44_100,
    });
  });

  test('fails loudly when the stream does not cover the text', async () => {
    vi.stubEnv('FISH_AUDIO_API_KEY', 'test-key');
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(fixture, { status: 200 }))),
    );

    await expect(
      fishAudioBackend.renderTake?.({
        ...request,
        text: `${request.text} And one more sentence.`,
      }),
    ).rejects.toThrow(/aligned 32 of 50 spoken characters across 6 words/);
  });
});
