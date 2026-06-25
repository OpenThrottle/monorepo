import { parse as parseYaml } from 'yaml';

/**
 * The two recognized top-level content sections. See the docs/FAQ content
 * convention (docs/openthrottle/docs-faq-convention.md §1).
 */
export const DOCS_SECTION = {
  docs: 'docs',
  faq: 'faq',
} as const;

/** @publicApi */
export type DocsSection = (typeof DOCS_SECTION)[keyof typeof DOCS_SECTION];

/**
 * The raw module map an app produces from its own content folder, e.g.
 * `import.meta.glob('./docs-content/ ** /*.md', { eager: true, query: '?raw', import: 'default' })`.
 * Keys are file paths; values are raw Markdown sources. The app owns the glob;
 * this package never globs (a package-side glob would resolve against the
 * package, not the app's content). See the delivery ADR §Architecture.
 *
 * @publicApi
 */
export type DocsContentModules = Readonly<Record<string, string>>;

/**
 * One normalized content entry — a docs page or an FAQ entry — after frontmatter
 * parsing and path derivation. The rendering layer (routes/nav/layouts) is built
 * on top of these.
 *
 * @publicApi
 */
export interface DocEntry {
  /** Markdown body with frontmatter stripped. */
  readonly content: string;
  /** Meta description for SEO; from frontmatter `description`. */
  readonly description: string | null;
  /** Whether the entry is a draft (from frontmatter `draft`). */
  readonly draft: boolean;
  /** Sidebar group (docs) / category (faq); from `group` or the subfolder. */
  readonly group: string;
  /** Sort order within the group (per-group, not global). */
  readonly order: number;
  /** Route path, e.g. `/docs/getting-started` or `/faq`. */
  readonly path: string;
  /** Which top-level section the entry belongs to. */
  readonly section: DocsSection;
  /** Slug segment after the section, e.g. `getting-started` or `guides/deploy`. */
  readonly slug: string;
  /** Title (docs page heading) / question (faq); from frontmatter `title`. */
  readonly title: string;
}

/** @publicApi */
export interface BuildDocsManifestOptions {
  /** Include `draft: true` entries (dev only). Defaults to `false`. */
  readonly includeDrafts?: boolean;
  /** The app-provided glob module map (see {@link DocsContentModules}). */
  readonly modules: DocsContentModules;
}

const CONTENT_ROOT_MARKER = 'docs-content/';

const isDocsSection = (value: string): value is DocsSection =>
  value === DOCS_SECTION.docs || value === DOCS_SECTION.faq;

const toOrder = (value: unknown): number =>
  typeof value === 'number' ? value : Number.MAX_SAFE_INTEGER;

const toOptionalString = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null;

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/**
 * Split a `---`-delimited YAML frontmatter block from the Markdown body. Uses
 * the pure-JS `yaml` parser (not `gray-matter`, which relies on Node's `Buffer`
 * and breaks in the browser, where this manifest is also built).
 */
const parseFrontmatter = (
  raw: string,
): { content: string; data: Record<string, unknown> } => {
  const match = FRONTMATTER_RE.exec(raw);
  if (!match) return { content: raw, data: {} };

  const parsed: unknown = parseYaml(match[1]);
  const data: Record<string, unknown> =
    typeof parsed === 'object' && parsed !== null ? { ...parsed } : {};

  return { content: raw.slice(match[0].length), data };
};

/**
 * Parse and normalize an app-provided content module map into a flat list of
 * {@link DocEntry}. Frontmatter is parsed with the pure-JS `yaml` parser; route paths, slugs,
 * groups, ordering, and draft flags follow the content convention
 * (docs/openthrottle/docs-faq-convention.md). Entries are returned sorted within
 * each group (by `order`, then `title`); cross-group sequencing is left to the
 * nav layer. Malformed entries (missing/invalid `title`) and two entries
 * normalizing to the same route `path` throw — a real misconfiguration is
 * surfaced early rather than silently dropped or resolved last-wins downstream.
 *
 * @publicApi
 */
export const buildDocsManifest = (
  options: BuildDocsManifestOptions,
): readonly DocEntry[] => {
  const { includeDrafts = false, modules } = options;

  const entries = Object.entries(modules).map(([key, raw]): DocEntry => {
    const markerIndex = key.indexOf(CONTENT_ROOT_MARKER);
    const afterRoot =
      markerIndex === -1
        ? key
        : key.slice(markerIndex + CONTENT_ROOT_MARKER.length);

    const segments = afterRoot.replace(/\.md$/, '').split('/');
    const [sectionSegment, ...rest] = segments;

    if (!isDocsSection(sectionSegment)) {
      throw new Error(
        `react-router-docs: content file "${key}" is not under a "docs/" or "faq/" section.`,
      );
    }

    const { content, data: frontmatter } = parseFrontmatter(raw);

    const title = frontmatter.title;
    if (typeof title !== 'string' || title.length === 0) {
      throw new Error(
        `react-router-docs: content file "${key}" is missing a required string "title" in frontmatter.`,
      );
    }

    // `index` maps to the section root (e.g. docs/index -> /docs).
    const pathSegments =
      rest[rest.length - 1] === 'index' ? rest.slice(0, -1) : rest;
    const derivedSlug = pathSegments.join('/');
    const slug =
      toOptionalString(frontmatter.slug) ??
      (derivedSlug.length > 0 ? derivedSlug : '');

    const subfolder = rest.length > 1 ? rest[0] : null;
    const group = toOptionalString(frontmatter.group) ?? subfolder ?? 'General';

    const path =
      slug.length > 0 ? `/${sectionSegment}/${slug}` : `/${sectionSegment}`;

    return {
      content: content.trim(),
      description: toOptionalString(frontmatter.description),
      draft: frontmatter.draft === true,
      group,
      order: toOrder(frontmatter.order),
      path,
      section: sectionSegment,
      slug,
      title,
    };
  });

  const seenPaths = new Map<string, string>();
  for (const entry of entries) {
    const previousTitle = seenPaths.get(entry.path);
    if (previousTitle !== undefined) {
      throw new Error(
        `react-router-docs: duplicate route path "${entry.path}" — both "${previousTitle}" and "${entry.title}" normalize to it. Give one a distinct frontmatter "slug".`,
      );
    }
    seenPaths.set(entry.path, entry.title);
  }

  return entries
    .filter((entry) => includeDrafts || !entry.draft)
    .sort(
      (a, b) =>
        a.section.localeCompare(b.section) ||
        a.group.localeCompare(b.group) ||
        a.order - b.order ||
        a.title.localeCompare(b.title),
    );
};
