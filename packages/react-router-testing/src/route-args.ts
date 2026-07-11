import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';

import { createTestRouterContext } from './router-context';

const DEFAULT_URL = 'http://localhost/';

/**
 * @description Options shared by {@link createLoaderArgs} and
 * {@link createActionArgs} for building React Router loader/action args in unit
 * tests.
 *
 * @public
 */
export type CreateRouteArgsOptions = {
  /** Headers for the built `Request` (e.g. `{ cookie: 'ot_auth=token' }`). */
  headers?: HeadersInit;
  /** Route params (e.g. `{ userId: 'user-1' }`). Defaults to `{}`. */
  params?: Record<string, string>;
  /** Request URL. Defaults to `http://localhost/`. */
  url?: string;
};

/**
 * @description Options for {@link createActionArgs}, extending
 * {@link CreateRouteArgsOptions} with a request body and method.
 *
 * @public
 */
export type CreateActionArgsOptions = CreateRouteArgsOptions & {
  /**
   * Request body. A plain record is serialized into `FormData` (the common
   * case for form actions); a `FormData` instance is passed through as-is.
   */
  body?: FormData | Record<string, string>;
  /** HTTP method. Defaults to `POST`. */
  method?: string;
};

const toFormData = (body: FormData | Record<string, string>): FormData => {
  if (body instanceof FormData) {
    return body;
  }

  const formData = new FormData();
  Object.entries(body).forEach(([key, value]) => formData.append(key, value));

  return formData;
};

/**
 * @description Build loader args for a React Router route module under test.
 * Returns a real `Request` plus a real {@link createTestRouterContext} context
 * and `params`, cast to the route's generated `Route.LoaderArgs`. Use this in
 * place of hand-rolled `{ request } as unknown as Route.LoaderArgs` literals.
 *
 * @example
 * const result = await loader(
 *   createLoaderArgs<Route.LoaderArgs>({
 *     headers: { cookie: 'ot_auth=token' },
 *     url: 'http://localhost/users',
 *   }),
 * );
 *
 * @public
 */
export function createLoaderArgs<TArgs = LoaderFunctionArgs>(
  options?: CreateRouteArgsOptions,
): TArgs;
export function createLoaderArgs({
  headers,
  params = {},
  url = DEFAULT_URL,
}: CreateRouteArgsOptions = {}): unknown {
  const request = new Request(url, { headers });

  return {
    context: createTestRouterContext(),
    params,
    request,
  };
}

/**
 * @description Build action args for a React Router route module under test.
 * Like {@link createLoaderArgs}, but the `Request` defaults to `POST` and a
 * plain-record `body` is serialized into `FormData`. Cast to the route's
 * generated `Route.ActionArgs`.
 *
 * @example
 * const result = await action(
 *   createActionArgs<Route.ActionArgs>({
 *     body: { githubUsername: 'visormatt', intent: 'createUser' },
 *     headers: { cookie: 'ot_auth=token' },
 *     url: 'http://localhost/users',
 *   }),
 * );
 *
 * @public
 */
export function createActionArgs<TArgs = ActionFunctionArgs>(
  options?: CreateActionArgsOptions,
): TArgs;
export function createActionArgs({
  body = {},
  headers,
  method = 'POST',
  params = {},
  url = DEFAULT_URL,
}: CreateActionArgsOptions = {}): unknown {
  const request = new Request(url, {
    body: toFormData(body),
    headers,
    method,
  });

  return {
    context: createTestRouterContext(),
    params,
    request,
  };
}
