import { afterEach, describe, expect, it } from 'vitest';

import { getGraphQLToken, getGraphQLUrl } from '../endpoint.ts';

describe('getGraphQLUrl', () => {
  const original = process.env.API_URL_INTERNAL;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.API_URL_INTERNAL;
    } else {
      process.env.API_URL_INTERNAL = original;
    }
  });

  it('throws when API_URL_INTERNAL is unset', () => {
    delete process.env.API_URL_INTERNAL;

    expect(() => getGraphQLUrl()).toThrow('API_URL_INTERNAL is not set');
  });

  it('throws when API_URL_INTERNAL is an empty string', () => {
    process.env.API_URL_INTERNAL = '';

    expect(() => getGraphQLUrl()).toThrow('API_URL_INTERNAL is not set');
  });

  it('appends /graphql to the base URL', () => {
    process.env.API_URL_INTERNAL = 'http://localhost:6021';

    expect(getGraphQLUrl()).toBe('http://localhost:6021/graphql');
  });

  it('strips a single trailing slash before appending /graphql', () => {
    process.env.API_URL_INTERNAL = 'http://localhost:6021/';

    expect(getGraphQLUrl()).toBe('http://localhost:6021/graphql');
  });
});

describe('getGraphQLToken', () => {
  const original = process.env.API_TOKEN;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.API_TOKEN;
    } else {
      process.env.API_TOKEN = original;
    }
  });

  it('returns the API_TOKEN env value when set', () => {
    process.env.API_TOKEN = 'secret-token';

    expect(getGraphQLToken()).toBe('secret-token');
  });

  it('returns undefined when API_TOKEN is unset', () => {
    delete process.env.API_TOKEN;

    expect(getGraphQLToken()).toBeUndefined();
  });
});
