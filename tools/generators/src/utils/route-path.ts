/**
 * @description Maps one flat-route filename segment to its URL segment, or
 * `undefined` when the segment adds nothing to the URL (`_index`, a pathless
 * `_layout`).
 */
const toPathSegment = (segment: string): string | undefined => {
  if (segment === '_index' || segment.startsWith('_')) return undefined;

  const withoutOptOut = segment.endsWith('_') ? segment.slice(0, -1) : segment;
  const unescaped = withoutOptOut.replace(/\[(.+?)\]/g, '$1');

  if (unescaped === '$') return '*';
  if (unescaped.startsWith('$')) return `:${unescaped.slice(1)}`;

  return unescaped;
};

export interface RoutePathVariables {
  readonly routeEntry: string;
  readonly routePath: string;
}

/**
 * @description Derives the URL a flat route (React Router `@react-router/fs-routes`)
 * serves, plus a concrete entry that matches it, so a generated spec can mount
 * the route through `createRoutesStub` with no hand-edits.
 *
 * `overview._index`   -> `/overview`, `/overview`
 * `components.$uuid`  -> `/components/:uuid`, `/components/test-uuid`
 * `_auth.login`       -> `/login`, `/login`
 *
 * @public
 */
export const getRoutePathVariables = (name: string): RoutePathVariables => {
  // A `.` inside `[...]` is an escaped literal, not a segment separator.
  const segments = name
    .split(/\.(?![^[]*\])/)
    .filter(Boolean)
    .map(toPathSegment)
    .filter((segment): segment is string => {
      return segment !== undefined;
    });

  const routePath = `/${segments.join('/')}`;
  const routeEntry = `/${segments
    .map((segment) => {
      if (segment === '*') return 'test-splat';
      if (segment.startsWith(':')) return `test-${segment.slice(1)}`;

      return segment;
    })
    .join('/')}`;

  return { routeEntry, routePath };
};
