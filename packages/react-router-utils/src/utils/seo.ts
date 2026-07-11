import type { MetaDescriptor } from 'react-router';
import { APP_URL } from '../config/application';

/**
 * @public
 * @description Builds the absolute canonical URL for a route from its pathname,
 * using the current app's `APP_URL`. Search params and hash fragments are
 * dropped and trailing slashes normalized away (except root), so duplicate
 * variants (`?ref=…`, `#section`, `/docs/`) all consolidate onto one signal.
 */
export function buildCanonicalUrl(pathname: string): string {
  const base = (APP_URL ?? '').replace(/\/+$/, '');
  const normalizedPath =
    pathname === '/' ? '' : `/${pathname.replace(/^\/+|\/+$/g, '')}`;

  return `${base}${normalizedPath}`;
}

/**
 * @public
 * @description Per-route canonical `<link>` meta descriptor for the given
 * pathname. Use inside a route `meta()` so every page advertises its own
 * canonical URL rather than inheriting a single static one.
 */
export function canonicalMeta(pathname: string): MetaDescriptor {
  return {
    href: buildCanonicalUrl(pathname),
    rel: 'canonical',
    tagName: 'link',
  };
}

export interface SeoMetaOptions {
  /** Page description (used for `description`, `og:description`, `twitter:description`). */
  readonly description: string;
  /** Absolute OG/Twitter image URL. Omit to skip image tags. */
  readonly image?: string;
  /** Site name for `og:site_name`. */
  readonly siteName?: string;
  /** Page title (used for `<title>`, `og:title`, `twitter:title`). */
  readonly title: string;
  /** Twitter card type. Defaults to `summary_large_image`. */
  readonly twitterCard?: string;
  /** Open Graph type. Defaults to `website`. */
  readonly type?: string;
  /** Absolute page URL for `og:url`. Defaults to the app's `APP_URL`. */
  readonly url?: string;
}

/**
 * @public
 * @description Builds the OpenGraph + Twitter meta descriptor array for a route
 * `meta()`, parameterized per app. Emits `<title>`, `description`, the
 * `og:*` set, and the `twitter:*` set; image tags are included only when
 * `image` is provided.
 */
export function buildSeoMeta(options: SeoMetaOptions): MetaDescriptor[] {
  const {
    description,
    image,
    siteName,
    title,
    twitterCard = 'summary_large_image',
    type = 'website',
    url = APP_URL,
  } = options;

  const meta: MetaDescriptor[] = [
    { title },
    { content: description, name: 'description' },
    { content: description, property: 'og:description' },
    { content: title, property: 'og:title' },
    { content: type, property: 'og:type' },
  ];

  if (image != null) {
    meta.push({ content: image, property: 'og:image' });
  }
  if (siteName != null) {
    meta.push({ content: siteName, property: 'og:site_name' });
  }
  if (url != null) {
    meta.push({ content: url, property: 'og:url' });
  }

  meta.push(
    { content: twitterCard, name: 'twitter:card' },
    { content: description, name: 'twitter:description' },
    { content: title, name: 'twitter:title' },
  );
  if (image != null) {
    meta.push({ content: image, name: 'twitter:image' });
  }

  return meta;
}

export interface OrganizationJsonLdOptions {
  readonly founderName?: string;
  readonly logo?: string;
  readonly name: string;
  readonly sameAs?: readonly string[];
  readonly url: string;
}

/**
 * @public
 * @description Builds a schema.org `Organization` JSON-LD object. Combine with
 * {@link serializeJsonLd} and render in a `<script type="application/ld+json">`.
 */
export function buildOrganizationJsonLd(
  options: OrganizationJsonLdOptions,
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    founder:
      options.founderName != null
        ? { '@type': 'Person', name: options.founderName }
        : undefined,
    logo: options.logo,
    name: options.name,
    sameAs: options.sameAs,
    url: options.url,
  };
}

export interface WebsiteJsonLdOptions {
  readonly description?: string;
  readonly name: string;
  readonly url: string;
}

/**
 * @public
 * @description Builds a schema.org `WebSite` JSON-LD object.
 */
export function buildWebsiteJsonLd(
  options: WebsiteJsonLdOptions,
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    description: options.description,
    name: options.name,
    url: options.url,
  };
}

/**
 * @public
 * @description Serializes JSON-LD entries for a `<script type="application/ld+json">`
 * (drops `undefined` keys).
 */
export function serializeJsonLd(entries: readonly unknown[]): string {
  return JSON.stringify(entries);
}

/**
 * @public
 * @description Builds an XML sitemap body from a list of route paths. Paths are
 * deduped, sorted, and rendered as absolute canonical URLs.
 */
export function buildSitemapXml(paths: readonly string[]): string {
  const unique = [...new Set(paths)].sort();
  const urls = unique
    .map(
      (path) => `  <url>\n    <loc>${buildCanonicalUrl(path)}</loc>\n  </url>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

/**
 * @public
 * @description Builds a `GET /sitemap.xml` {@link Response} from a list of route
 * paths, with an `application/xml` content type and a cache header.
 */
export function buildSitemapResponse(
  paths: readonly string[],
  options?: { readonly maxAgeSeconds?: number },
): Response {
  return new Response(buildSitemapXml(paths), {
    headers: {
      'Cache-Control': `public, max-age=${options?.maxAgeSeconds ?? 3600}`,
      'Content-Type': 'application/xml',
    },
  });
}

export interface RobotsOptions {
  /** When true, emit `Disallow: /` (noindex) for internal/authenticated apps. */
  readonly disallowAll?: boolean;
  /** Path to the sitemap (e.g. `/sitemap.xml`) to advertise for public apps. */
  readonly sitemapPath?: string;
}

/**
 * @public
 * @description Builds a `robots.txt` body. `disallowAll` yields a noindex policy
 * for internal apps; otherwise allows all and (optionally) advertises the
 * sitemap as an absolute canonical URL.
 */
export function buildRobotsTxt(options: RobotsOptions = {}): string {
  if (options.disallowAll === true) {
    return 'User-agent: *\nDisallow: /\n';
  }

  const lines = ['User-agent: *', 'Allow: /'];
  if (options.sitemapPath != null) {
    lines.push(`Sitemap: ${buildCanonicalUrl(options.sitemapPath)}`);
  }

  return `${lines.join('\n')}\n`;
}

/**
 * @public
 * @description Builds a `GET /robots.txt` {@link Response} with a `text/plain`
 * content type and a cache header.
 */
export function buildRobotsResponse(options: RobotsOptions = {}): Response {
  return new Response(buildRobotsTxt(options), {
    headers: {
      'Cache-Control': 'public, max-age=86400',
      'Content-Type': 'text/plain',
    },
  });
}
