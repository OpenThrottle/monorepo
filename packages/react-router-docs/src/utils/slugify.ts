/**
 * Turn heading text into a stable, URL-safe anchor slug. Lowercases, collapses
 * every run of non-alphanumeric characters to a single hyphen, and trims
 * leading/trailing hyphens. Deterministic and dependency-free so the same
 * function can slug both the parsed source (for the TOC) and the rendered
 * heading text (for its `id` + copy-anchor) — the two agree by construction.
 *
 * @public
 */
export const slugify = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '');
