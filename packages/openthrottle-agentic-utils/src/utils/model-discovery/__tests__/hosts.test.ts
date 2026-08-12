import { describe, expect, it } from 'vitest';

import type { DiscoveryEnv } from '../../../types/model-discovery.ts';
import { DEFAULT_PORTS, DOCKER_INTERNAL_HOST } from '../constants.ts';
import { resolveHosts, resolvePorts } from '../hosts.ts';

describe('resolveHosts', () => {
  it('defaults to localhost + the docker bridge alias when env is empty', () => {
    const env: DiscoveryEnv = {};
    expect(resolveHosts(env)).toEqual(['localhost', DOCKER_INTERNAL_HOST]);
  });

  it('LLM_HOSTS override replaces the default base set, split on commas/whitespace', () => {
    expect(resolveHosts({ LLM_HOSTS: '10.0.0.1  10.0.0.2,10.0.0.3' })).toEqual([
      '10.0.0.1',
      '10.0.0.2',
      '10.0.0.3',
    ]);
  });

  it('merges hosts parsed from provider URL env vars after the base set', () => {
    expect(
      resolveHosts({
        LM_STUDIO_URL: 'http://lmbox:1234',
        OLLAMA_BASE_URL: 'http://myhost:11500/v1',
      }),
    ).toEqual(['localhost', DOCKER_INTERNAL_HOST, 'myhost', 'lmbox']);
  });

  it('tolerates a bare hostname that is not a valid URL, via the host:port fallback', () => {
    expect(resolveHosts({ OLLAMA_URL: 'myhost' })).toEqual([
      'localhost',
      DOCKER_INTERNAL_HOST,
      'myhost',
    ]);
  });

  it('ignores provider env vars with no parseable host', () => {
    expect(resolveHosts({ OLLAMA_URL: '' })).toEqual([
      'localhost',
      DOCKER_INTERNAL_HOST,
    ]);
  });

  it('appends extra host sources (the Tailscale seam) and de-dupes against the base set', () => {
    expect(
      resolveHosts({}, { extraSources: [() => ['tailnet-a', 'localhost']] }),
    ).toEqual(['localhost', DOCKER_INTERNAL_HOST, 'tailnet-a']);
  });

  it('de-dupes across multiple sources in first-seen order', () => {
    expect(
      resolveHosts(
        { OLLAMA_URL: 'localhost:11500' },
        { extraSources: [() => ['localhost', 'peer-1']] },
      ),
    ).toEqual(['localhost', DOCKER_INTERNAL_HOST, 'peer-1']);
  });
});

describe('resolvePorts', () => {
  it('returns the default port set sorted ascending when env is empty', () => {
    expect(resolvePorts({})).toEqual(
      [...DEFAULT_PORTS].sort((left, right) => left - right),
    );
  });

  it('LLM_PORTS override replaces the default set and merges provider-url ports', () => {
    expect(
      resolvePorts({ LLM_PORTS: '9001 9000', OLLAMA_URL: 'http://x:11500' }),
    ).toEqual([9000, 9001, 11500]);
  });

  it('ignores zero, negative, non-numeric, and out-of-range ports', () => {
    expect(resolvePorts({ LLM_PORTS: '0, -5, abc, 70000, 8080' })).toEqual([
      8080,
    ]);
  });

  it('de-dupes ports across the override and provider env vars', () => {
    expect(
      resolvePorts({ LLM_PORTS: '11434', OLLAMA_URL: 'http://x:11434' }),
    ).toEqual([11434]);
  });
});
