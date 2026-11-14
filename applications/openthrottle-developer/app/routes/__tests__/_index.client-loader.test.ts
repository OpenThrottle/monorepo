import { createLoaderArgs } from '@openthrottle/react-router-testing';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/_index';
import type { HomeComposerData } from '~/routing/home/utils/home-composer-cache';
import {
  clearHomeComposerCache,
  readHomeComposerCache,
  writeHomeComposerCache,
} from '~/routing/home/utils/home-composer-cache';

import { clientLoader, shouldRevalidate } from '../_index';

const SAMPLE: HomeComposerData = {
  agentRuntimes: {},
  defaultAgent: null,
  models: [
    {
      description: 'ollama',
      groupId: 'openai:ollama',
      id: 'http://localhost:11434/v1::llama3',
      label: 'llama3',
    },
  ],
  personas: [],
  repositories: [],
};

const buildArgs = (
  serverLoader: Route.ClientLoaderArgs['serverLoader'],
): Route.ClientLoaderArgs => {
  return { ...createLoaderArgs<Route.ClientLoaderArgs>(), serverLoader };
};

describe('routes/_index clientLoader', () => {
  beforeEach(() => {
    clearHomeComposerCache();
  });

  afterEach(() => {
    clearHomeComposerCache();
  });

  describe('when the cache is warm', () => {
    test('serves the cached bundle without calling the server loader', async () => {
      writeHomeComposerCache(SAMPLE);
      const serverLoader = vi.fn();

      const result = await clientLoader(buildArgs(serverLoader));

      expect(serverLoader).not.toHaveBeenCalled();
      await expect(result.composerData).resolves.toEqual(SAMPLE);
    });
  });

  describe('when the cache is cold', () => {
    test('streams the server bundle and caches it once resolved', async () => {
      const serverLoader = vi.fn(async () => {
        return { composerData: Promise.resolve(SAMPLE) };
      });

      const result = await clientLoader(buildArgs(serverLoader));

      expect(serverLoader).toHaveBeenCalledTimes(1);
      expect(result.composerData).toBeInstanceOf(Promise);
      await expect(result.composerData).resolves.toEqual(SAMPLE);
      expect(readHomeComposerCache()).toEqual(SAMPLE);
    });

    test('shares one server load between overlapping client loads', async () => {
      let resolveLoad: (data: HomeComposerData) => void = () => {};
      const serverLoader = vi.fn(async () => {
        return {
          composerData: new Promise<HomeComposerData>((resolve) => {
            resolveLoad = resolve;
          }),
        };
      });

      const first = await clientLoader(buildArgs(serverLoader));
      const second = await clientLoader(buildArgs(serverLoader));
      await vi.waitFor(() => {
        expect(serverLoader).toHaveBeenCalledTimes(1);
      });
      resolveLoad(SAMPLE);

      await expect(first.composerData).resolves.toEqual(SAMPLE);
      await expect(second.composerData).resolves.toEqual(SAMPLE);
      expect(serverLoader).toHaveBeenCalledTimes(1);
    });

    test('does not cache a load that a clear overtook', async () => {
      let resolveLoad: (data: HomeComposerData) => void = () => {};
      const serverLoader = vi.fn(async () => {
        return {
          composerData: new Promise<HomeComposerData>((resolve) => {
            resolveLoad = resolve;
          }),
        };
      });

      const result = await clientLoader(buildArgs(serverLoader));
      await vi.waitFor(() => {
        expect(serverLoader).toHaveBeenCalledTimes(1);
      });
      clearHomeComposerCache();
      resolveLoad(SAMPLE);

      await expect(result.composerData).resolves.toEqual(SAMPLE);
      expect(readHomeComposerCache()).toBeNull();
    });
  });
});

describe('routes/_index shouldRevalidate cache invalidation', () => {
  const submit = (formAction: string): boolean => {
    return shouldRevalidate({
      currentParams: {},
      currentUrl: new URL('http://localhost/'),
      defaultShouldRevalidate: true,
      formAction,
      formMethod: 'POST',
      nextParams: {},
      nextUrl: new URL('http://localhost/'),
    });
  };

  beforeEach(() => {
    writeHomeComposerCache(SAMPLE);
  });

  afterEach(() => {
    clearHomeComposerCache();
  });

  test('keeps the cache for a chat-turn submission', () => {
    expect(submit('/resources/conversation-stream')).toBe(true);
    expect(readHomeComposerCache()).toEqual(SAMPLE);
  });

  test('drops the cache for any other submission', () => {
    expect(submit('/resources/repositories')).toBe(true);
    expect(readHomeComposerCache()).toBeNull();
  });
});
