import { describe, expect, it } from 'vitest';

import {
  DEFAULT_FINGERPRINT_TIMEOUT_MS,
  DEFAULT_HOST,
  DEFAULT_MAX_CONCURRENCY,
  DEFAULT_PORTS,
  DEFAULT_PROBE_TIMEOUT_MS,
  DOCKER_INTERNAL_HOST,
  HOST_PREFERENCE,
  LLM_HOSTS_ENV,
  LLM_PORTS_ENV,
  PROVIDER_URL_ENVS,
} from '../constants.ts';

describe('model-discovery constants', () => {
  it('defines the default host and docker bridge alias', () => {
    expect(DEFAULT_HOST).toBe('localhost');
    expect(DOCKER_INTERNAL_HOST).toBe('host.docker.internal');
  });

  it('orders HOST_PREFERENCE localhost > 127.0.0.1 > docker bridge', () => {
    expect(HOST_PREFERENCE).toEqual([
      'localhost',
      '127.0.0.1',
      DOCKER_INTERNAL_HOST,
    ]);
  });

  it('builds DEFAULT_PORTS from the 8000-8020 range plus LM Studio/Ollama ports', () => {
    expect(DEFAULT_PORTS).toHaveLength(21 + 3);
    expect(DEFAULT_PORTS[0]).toBe(8000);
    expect(DEFAULT_PORTS[20]).toBe(8020);
    expect(DEFAULT_PORTS.slice(21)).toEqual([1234, 11434, 11435]);
    // No accidental duplicates within the static list itself.
    expect(new Set(DEFAULT_PORTS).size).toBe(DEFAULT_PORTS.length);
  });

  it('names the env vars used for explicit host/port overrides', () => {
    expect(LLM_HOSTS_ENV).toBe('LLM_HOSTS');
    expect(LLM_PORTS_ENV).toBe('LLM_PORTS');
  });

  it('lists the provider base-URL env vars merged into the scan set', () => {
    expect(PROVIDER_URL_ENVS).toEqual([
      'OLLAMA_BASE_URL',
      'OLLAMA_URL',
      'LM_STUDIO_URL',
    ]);
  });

  it('sets sane default concurrency and timeout knobs', () => {
    expect(DEFAULT_MAX_CONCURRENCY).toBe(50);
    expect(DEFAULT_PROBE_TIMEOUT_MS).toBe(3000);
    expect(DEFAULT_FINGERPRINT_TIMEOUT_MS).toBe(1500);
  });
});
