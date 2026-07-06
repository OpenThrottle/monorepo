# @openthrottle/react-router-docs — agent notes

Docs/FAQ rendering layer: turns a per-app Markdown content folder (`app/docs-content/`) into
`/docs` and `/faq` routes with shared nav and styling. Rendering is delegated to
`@openthrottle/react-router-markdown` (SSR-capable).

**Consumed by:** all four React Router apps — `openthrottle-developer`, `openthrottle-admin`,
`openthrottle-email`, `openthrottle-website`.

## Layout

- [src/utils/buildDocsManifest.ts](src/utils/buildDocsManifest.ts) — app glob module map → normalized `DocEntry[]`; frontmatter parsing and path derivation live here.
- [src/utils/buildDocsNav.ts](src/utils/buildDocsNav.ts) — manifest section → ordered `DocsNavGroup[]`.
- [src/components/](src/components/) — `DocsNav` (sidebar), `DocPageView` (single page), `FaqView` (grouped accordions, deep-linkable via `#<slug>`).

## Invariants & gotchas

- Source-first, no build target — see [packages/AGENTS.md](../AGENTS.md).
- **The app owns the glob.** `import.meta.glob` resolves relative to the calling file, so this package never globs — consumers run the glob over their own `docs-content/` and pass the module map to `buildDocsManifest`. Do not add a glob inside this package.
- `buildDocsManifest` throws on a content file missing frontmatter `title` — a bad Markdown file in any consuming app fails that app's build, by design.
- Frontmatter is parsed with the pure-JS `yaml` package, not `gray-matter` — gray-matter needs Node's `Buffer` and breaks in the browser, where the manifest is also built.
- Content is Markdown (CommonMark + GFM), **not MDX**; frontmatter schema (`title`, `description`, `slug`, `group`, `order`, `draft`) is defined by the convention doc below.
- Reference wiring (layout + index + splat routes) is in `openthrottle-developer`; `openthrottle-website`'s `docs.$.tsx` is the reference for emitting a `description` meta tag for SEO.

## Pointers

- [README.md](README.md) — step-by-step wiring for a new app, public API table.
- [docs/openthrottle/docs-faq-convention.md](../../docs/openthrottle/docs-faq-convention.md) — content folder + frontmatter convention.
- [docs/openthrottle/docs-faq-delivery-adr.md](../../docs/openthrottle/docs-faq-delivery-adr.md) — why the app owns the glob.
