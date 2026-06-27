import { RouterContextProvider } from 'react-router';

/**
 * @description Build an empty {@link RouterContextProvider} for loader/action unit tests. React Router v7 types `LoaderFunctionArgs['context']`/`ActionFunctionArgs['context']` as `RouterContextProvider` (a class with `get`/`set`), so a bare `{}` literal no longer satisfies the type. Use this in place of a `{}` context literal when the loader/action under test never reads from context.
 */
export const createTestRouterContext = (): RouterContextProvider =>
  new RouterContextProvider();
