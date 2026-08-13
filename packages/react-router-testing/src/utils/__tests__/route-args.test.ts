import { RouterContextProvider } from 'react-router';
import { describe, expect, it } from 'vitest';

import { createActionArgs, createLoaderArgs } from '../route-args';

describe('createLoaderArgs', () => {
  it('builds a GET request with defaults', () => {
    const args = createLoaderArgs();

    expect(args.request).toBeInstanceOf(Request);
    expect(args.request.method).toBe('GET');
    expect(args.request.url).toBe('http://localhost/');
    expect(args.params).toEqual({});
    expect(args.context).toBeInstanceOf(RouterContextProvider);
  });

  it('applies url, headers, and params', () => {
    const args = createLoaderArgs({
      headers: { cookie: 'ot_auth=token' },
      params: { userId: 'user-1' },
      url: 'http://localhost/users/user-1',
    });

    expect(args.request.url).toBe('http://localhost/users/user-1');
    expect(args.request.headers.get('cookie')).toBe('ot_auth=token');
    expect(args.params).toEqual({ userId: 'user-1' });
  });

  it('builds a fresh context per call', () => {
    expect(createLoaderArgs().context).not.toBe(createLoaderArgs().context);
  });
});

describe('createActionArgs', () => {
  it('defaults to a POST request with empty FormData', async () => {
    const args = createActionArgs();

    expect(args.request.method).toBe('POST');
    const formData = await args.request.formData();
    expect([...formData.entries()]).toEqual([]);
  });

  it('serializes a record body into FormData', async () => {
    const args = createActionArgs({
      body: { githubUsername: 'visormatt', intent: 'createUser' },
    });

    const formData = await args.request.formData();
    expect(formData.get('githubUsername')).toBe('visormatt');
    expect(formData.get('intent')).toBe('createUser');
  });

  it('passes a FormData body through unchanged', async () => {
    const body = new FormData();
    body.append('intent', 'deleteUser');

    const args = createActionArgs({ body });

    const formData = await args.request.formData();
    expect(formData.get('intent')).toBe('deleteUser');
  });

  it('applies url, headers, params, and method', () => {
    const args = createActionArgs({
      headers: { cookie: 'ot_auth=token' },
      method: 'PUT',
      params: { userId: 'user-1' },
      url: 'http://localhost/users/user-1',
    });

    expect(args.request.method).toBe('PUT');
    expect(args.request.url).toBe('http://localhost/users/user-1');
    expect(args.request.headers.get('cookie')).toBe('ot_auth=token');
    expect(args.params).toEqual({ userId: 'user-1' });
  });
});
