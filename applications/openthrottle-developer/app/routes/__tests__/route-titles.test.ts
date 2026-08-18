import { beforeAll, describe, expect, test } from 'vitest';
import { SITE_TITLE } from '~/global/config/settings';

/**
 * Route-title guard. One table-driven sweep over every route module, asserting
 * the conventions in AGENTS.md (## Page titles) instead of ~80 per-route
 * assertions. This is the check that would have caught `SettingsAppearance`,
 * `NotificationsIndex`, and `PersonasCreate` shipping to the browser tab.
 */

/**
 * Routes that legitimately render no document, so having no title is correct.
 * Deliberately an explicit list, not a `resources.` prefix heuristic — every
 * exemption should be a reviewable line.
 */
const RESOURCE_ROUTES: readonly string[] = [
  'auth.logout',
  'auth.ws-token',
  'docs', // Layout: both children always set their own title.
  'ide.files',
  'ide.semantic',
  'ide.symbol',
  'ide.symbols',
  'robots[.]txt',
  'skills.autocomplete',
];

/** A machine identifier that leaked into human-facing copy. */
const PASCAL_CASE_IDENTIFIER = /^[A-Z][a-z]+(?:[A-Z][a-z]+)+$/;

/**
 * Product capitalization that is Pascal-shaped on purpose. Keep this in step
 * with the reserved-word list in AGENTS.md (## Page titles).
 */
const RESERVED_WORDS: readonly string[] = [SITE_TITLE, 'OpenThrottle'];

/**
 * Route pairs that legitimately share a title, each with the reason. Rule 4
 * only holds for static titles, and a detail route called with
 * `loaderData: undefined` collapses to its generic fallback by design.
 */
const ALLOWED_TITLE_COLLISIONS: readonly (readonly string[])[] = [
  // The home screen and the pre-login shell both show the bare brand.
  ['_index', 'auth._index'],
  // `docs.$` falls back to `Docs` only when loader data is absent (the error
  // path); with a loaded entry it renders that entry's own title.
  ['docs.$', 'docs._index'],
];

const isAllowedCollision = (names: readonly string[]) =>
  ALLOWED_TITLE_COLLISIONS.some(
    (allowed) =>
      allowed.length === names.length &&
      allowed.every((name, index) => name === names[index]),
  );

interface RouteModule {
  readonly meta?: (args: unknown) => readonly { readonly title?: string }[];
}

const modules = import.meta.glob<RouteModule>('../*.tsx');

const routeNames = Object.keys(modules)
  .map((path) => path.replace('../', '').replace(/\.tsx$/, ''))
  .filter((name) => !name.startsWith('resources.'))
  .filter((name) => !RESOURCE_ROUTES.includes(name))
  .sort();

/**
 * The minimum plausible meta args. `matches: []` satisfies the
 * `mergeRouteModuleMeta` wrapper, and `loaderData: undefined` deliberately
 * exercises every detail route's fallback path — the branch that renders
 * during an error boundary.
 */
const META_ARGS = { loaderData: undefined, matches: [], params: {} };

const readTitle = async (name: string): Promise<string> => {
  const module = await modules[`../${name}.tsx`]();

  expect(module.meta, `${name} exports no meta`).toBeTypeOf('function');

  const descriptors = module.meta?.(META_ARGS) ?? [];
  const title = descriptors.find(
    (descriptor) => descriptor.title !== undefined,
  )?.title;

  expect(title, `${name} emits no title`).toBeTypeOf('string');

  return title ?? '';
};

/**
 * Titles resolved once up front. Importing ~80 route modules is far slower than
 * the default 5s per-test timeout allows, and every assertion below needs the
 * same map, so pay that cost a single time.
 */
const titles = new Map<string, string>();

describe('route titles', () => {
  beforeAll(async () => {
    const entries = await Promise.all(
      routeNames.map(async (name) => [name, await readTitle(name)] as const),
    );

    entries.forEach(([name, title]) => titles.set(name, title));
  }, 300_000);

  test('every route module is enumerated', () => {
    expect(routeNames.length).toBeGreaterThan(50);
  });

  describe.each(routeNames)('%s', (name) => {
    test('sets a non-empty title ending in the site title', () => {
      const title = titles.get(name) ?? '';

      expect(title).not.toBe('');
      expect(title.endsWith(SITE_TITLE)).toBe(true);
    });

    test('leads with human copy, not a PascalCase identifier', () => {
      const [leaf] = (titles.get(name) ?? '').split(' | ');

      if (RESERVED_WORDS.includes(leaf)) return;

      expect(leaf).not.toMatch(PASCAL_CASE_IDENTIFIER);
    });
  });

  test('no two routes produce the same title', () => {
    const byTitle = new Map<string, string[]>();
    [...titles.entries()].forEach(([name, title]) => {
      byTitle.set(title, [...(byTitle.get(title) ?? []), name]);
    });

    const collisions = [...byTitle.entries()]
      .filter(([, names]) => names.length > 1)
      .filter(([, names]) => !isAllowedCollision(names));

    expect(collisions).toStrictEqual([]);
  });
});

/**
 * Detail routes prefer the loaded entity name. The sweep above only exercises
 * the `loaderData: undefined` fallback (the error-boundary path), so these
 * spot-check the loaded branch of the same `meta` functions.
 */
describe('detail route titles with loader data', () => {
  test.each([
    ['plans.$planId._index', { plan: { title: 'Ship it' } }, 'Ship it | Plans'],
    [
      'projects.$projectId._index',
      { project: { name: 'Atlas' } },
      'Atlas | Projects',
    ],
    [
      'settings.mcp.$connectorId',
      { connector: { name: 'Linear' } },
      'Linear | MCP',
    ],
    [
      'calendar.$eventId',
      { event: { title: 'Standup' } },
      'Standup | Calendar',
    ],
  ])(
    '%s uses the entity name',
    async (name, loaderData, expected) => {
      const module = await modules[`../${name}.tsx`]();
      const descriptors = module.meta?.({ ...META_ARGS, loaderData }) ?? [];
      const title = descriptors.find(
        (descriptor) => descriptor.title !== undefined,
      )?.title;

      expect(title).toBe(`${expected} | ${SITE_TITLE}`);
    },
    60_000,
  );
});
