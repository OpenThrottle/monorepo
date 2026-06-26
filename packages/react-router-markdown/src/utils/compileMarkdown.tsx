import * as runtime from 'react/jsx-runtime';
import { evaluate, evaluateSync } from '@mdx-js/mdx';
import { useMDXComponents } from '@mdx-js/react';
import remarkGfm from 'remark-gfm';

export interface CompileMarkdownOptions {
  readonly source: string;
}

/**
 * URL schemes that are safe to keep on `href`/`src` attributes. Markdown
 * link/image nodes flow through `mdast-util-to-hast`, whose handlers only call
 * `normalizeUri()` — that URL-encodes the value but does NOT drop dangerous
 * schemes — so `[x](javascript:alert(1))` and `![x](data:text/html,...)`
 * otherwise survive into the DOM as live XSS sinks. Anything outside this
 * allow-list (notably `javascript:`, `data:`, `vbscript:`, `file:`) is dropped.
 * Relative URLs and in-page fragments have no scheme and are always allowed.
 */
const SAFE_URL_SCHEMES = ['http', 'https', 'mailto', 'tel'];

/** hast attribute container. Properties are an open string-keyed record. */
interface HastProperties {
  [key: string]: unknown;
}

/** Minimal structural view of the hast nodes this plugin needs to inspect. */
interface HastNode {
  readonly children?: readonly HastNode[];
  readonly properties?: HastProperties;
  readonly tagName?: string;
  readonly type: string;
}

/**
 * Returns `true` when `value` is a URL whose scheme is not in
 * {@link SAFE_URL_SCHEMES}. Scheme-less URLs (relative paths, `#fragment`,
 * `//host` protocol-relative, query strings) are treated as safe. Leading
 * control characters / whitespace — a classic `java\tscript:` bypass — are
 * stripped before the scheme is read.
 */
const isUnsafeUrl = (value: string): boolean => {
  // Strip ASCII control chars and spaces before reading the scheme so the
  // classic `java\tscript:` / leading-newline bypasses are defeated.
  // eslint-disable-next-line no-control-regex
  const normalized = value.replace(/[\u0000-\u0020]/g, '').toLowerCase();
  const schemeMatch = normalized.match(/^([a-z][a-z0-9+.-]*):/);

  if (schemeMatch === null) {
    return false;
  }

  return !SAFE_URL_SCHEMES.includes(schemeMatch[1]);
};

/**
 * Returns `true` when `value` is an external web link — an `http:`/`https:`
 * URL or a protocol-relative `//host` URL. Relative paths, in-page `#fragment`
 * links and non-navigational schemes (`mailto:`, `tel:`) are NOT external: they
 * either stay in-app or are handled by the OS, so they need no `target`/`rel`
 * hardening. Leading control chars / whitespace are stripped first to match the
 * normalization in {@link isUnsafeUrl}.
 */
const isExternalUrl = (value: string): boolean => {
  // eslint-disable-next-line no-control-regex
  const normalized = value.replace(/[\u0000-\u0020]/g, '').toLowerCase();

  return /^https?:/u.test(normalized) || normalized.startsWith('//');
};

/**
 * Hardens an external `<a>` against reverse tabnabbing and link abuse from
 * untrusted Markdown: opens it in a new tab and stamps
 * `rel="noopener noreferrer nofollow"`. Only applied to external (non-relative)
 * hrefs that survived {@link sanitizeUrlProperty} — relative/fragment/mailto
 * links keep their default in-tab behavior.
 */
const hardenExternalAnchor = (properties: HastProperties): void => {
  const href = properties.href;

  if (typeof href !== 'string' || !isExternalUrl(href)) {
    return;
  }

  properties.rel = 'noopener noreferrer nofollow';
  properties.target = '_blank';
};

/** Drops `attribute` from `properties` when it carries an unsafe-scheme URL. */
const sanitizeUrlProperty = (
  properties: HastProperties,
  attribute: string,
): void => {
  const value = properties[attribute];

  if (typeof value === 'string' && isUnsafeUrl(value)) {
    delete properties[attribute];
  }
};

/**
 * Recursively neutralizes dangerous `href`/`src` URLs on a hast subtree. The
 * `srcset` attribute is dropped wholesale when present on an unsafe-looking
 * `<img>`/`<source>` because its comma/space-delimited candidate syntax can
 * smuggle a `data:`/`javascript:` URL past a naive scheme check.
 */
const sanitizeNodeUrls = (node: HastNode): void => {
  if (node.type === 'element' && node.properties !== undefined) {
    sanitizeUrlProperty(node.properties, 'href');
    sanitizeUrlProperty(node.properties, 'src');

    // Harden external anchors AFTER scheme sanitization so a dropped unsafe
    // `href` can never gain `target="_blank"` / `rel`. Only `<a>` carries
    // navigational `href`s that benefit from anti-tabnabbing hardening.
    if (node.tagName === 'a') {
      hardenExternalAnchor(node.properties);
    }

    const srcset = node.properties.srcset;

    if (
      typeof srcset === 'string' &&
      srcset.split(',').some((candidate) => isUnsafeUrl(candidate.trim()))
    ) {
      delete node.properties.srcset;
    }
  }

  if (node.children !== undefined) {
    for (const child of node.children) {
      sanitizeNodeUrls(child);
    }
  }
};

/**
 * Rehype plugin that strips `javascript:`, `data:`, `vbscript:` and other
 * non-allow-listed URL schemes from `href`/`src`/`srcset` attributes after
 * Markdown has been lowered to hast. This defends against stored XSS in
 * untrusted Markdown (e.g. agent/task output) where a clickable
 * `[x](javascript:...)` link would otherwise execute in the app origin. It
 * also hardens surviving external (`http(s)`/protocol-relative) anchors with
 * `target="_blank"` + `rel="noopener noreferrer nofollow"` to defend against
 * reverse tabnabbing and link abuse. It is synchronous, so it is compatible
 * with both `evaluate` and `evaluateSync`.
 */
const rehypeSanitizeUrls =
  () =>
  (tree: HastNode): void => {
    sanitizeNodeUrls(tree);
  };

/**
 * The compiled MDX content component returned by `evaluate`. Derived from the
 * library's own return type so we never import `mdx/types` directly (it is a
 * transitive dependency of `@mdx-js/*`, not a direct one).
 */
export type CompiledMarkdown = Awaited<ReturnType<typeof evaluate>>['default'];

/**
 * Shared MDX evaluate options. Input is parsed as CommonMark via `format: 'md'`,
 * so `{...}` and `<...>` are treated as literal text rather than MDX expressions
 * or JSX — that keeps it a safe drop-in for arbitrary Markdown. GFM (tables,
 * strikethrough, task lists, autolinks) is enabled through `remark-gfm`, which
 * is a synchronous remark plugin (so it works with both `evaluate` and
 * `evaluateSync`). The compiled component reads component overrides from the
 * nearest `MDXProvider` via `useMDXComponents`.
 *
 * @remarks
 * Security boundary: this config renders Markdown as **literal text with no
 * raw HTML and no JSX** — it is safe for trusted, repo-authored content only.
 * `format: 'md'` means `<...>`/`{...}` are treated as literal text rather than
 * evaluated, and no `rehype-raw` plugin is present, so embedded HTML is dropped
 * and never reaches the DOM as live markup.
 * Do NOT switch to `format: 'mdx'` or add `rehype-raw` to "support HTML in
 * docs" without first strengthening {@link rehypeSanitizeUrls} into a full
 * `rehype-sanitize` pass — otherwise a `<script>` (or `onerror=` attribute) in
 * source becomes a live XSS sink, including in the browser since manifests are
 * built client-side. The regression guard in `compileMarkdown.test.tsx`
 * asserts this invariant.
 *
 * The {@link rehypeSanitizeUrls} plugin in `rehypePlugins` neutralizes
 * `javascript:`/`data:`/etc. URLs on `href`/`src`/`srcset`, which
 * `mdast-util-to-hast` does not drop on its own — closing the link/image
 * stored-XSS vector for untrusted Markdown (agent/task output).
 */
const EVALUATE_OPTIONS = {
  ...runtime,
  format: 'md',
  rehypePlugins: [rehypeSanitizeUrls],
  remarkPlugins: [remarkGfm],
  useMDXComponents,
} satisfies Parameters<typeof evaluate>[1];

/**
 * Compile a Markdown source string into a renderable React component using MDX
 * (https://mdxjs.com). See {@link EVALUATE_OPTIONS} for parsing behavior.
 */
export const compileMarkdown = async (
  options: CompileMarkdownOptions,
): Promise<CompiledMarkdown> => {
  const { source } = options;

  const { default: Content } = await evaluate(source, EVALUATE_OPTIONS);

  return Content;
};

/**
 * Synchronous variant of {@link compileMarkdown}. Because it returns the
 * compiled component directly (no Promise), callers can compile during render —
 * which means the output is present in server-rendered HTML rather than being
 * deferred to a client-side effect. Safe here because the only remark plugin
 * (`remark-gfm`) is synchronous; `evaluateSync` throws if an async plugin is
 * supplied.
 *
 * @remarks
 * Inherits the security boundary documented on {@link EVALUATE_OPTIONS}: input
 * is rendered as literal text (no raw HTML, no JSX) and is safe for trusted
 * content only. Enabling raw-HTML or MDX-JSX evaluation requires adding
 * `rehype-sanitize` first.
 */
export const compileMarkdownSync = (
  options: CompileMarkdownOptions,
): CompiledMarkdown => {
  const { source } = options;

  const { default: Content } = evaluateSync(source, EVALUATE_OPTIONS);

  return Content;
};
