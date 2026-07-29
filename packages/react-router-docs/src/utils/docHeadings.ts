import { slugify } from './slugify';

/** A single on-page heading (h2/h3) derived from a doc's Markdown source. */
export interface DocHeading {
  /** Heading level: 2 (section) or 3 (subsection). */
  readonly depth: 2 | 3;
  /** Anchor id — matches the rendered heading's `id` (see {@link slugify}). */
  readonly id: string;
  /** Plain-text heading label (inline Markdown stripped). */
  readonly text: string;
}

const HEADING_RE = /^(#{2,3})\s+(.*\S)\s*$/u;
const FENCE_RE = /^(?:```|~~~)/u;

/** Strip the inline Markdown that MDX would render away, leaving plain text. */
const stripInlineMarkdown = (value: string): string =>
  value
    .replace(/`([^`]*)`/gu, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/gu, '$1')
    .replace(/[*_~]/gu, '')
    .trim();

/**
 * Extract the h2/h3 heading outline from a Markdown source string, in document
 * order, skipping fenced code blocks (so a `## comment` inside a code sample is
 * never mistaken for a heading). Ids are derived with the shared
 * {@link slugify}, so they match the ids the render layer assigns to the same
 * headings. h1 is intentionally excluded — it is the page title, not part of the
 * on-page outline.
 *
 * @public
 */
export const extractDocHeadings = (content: string): readonly DocHeading[] => {
  const headings: DocHeading[] = [];
  let inFence = false;

  for (const rawLine of content.split('\n')) {
    if (FENCE_RE.test(rawLine.trim())) {
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      continue;
    }

    const match = HEADING_RE.exec(rawLine);
    if (match === null) {
      continue;
    }

    const text = stripInlineMarkdown(match[2]);
    if (text.length === 0) {
      continue;
    }

    headings.push({
      depth: match[1].length === 2 ? 2 : 3,
      id: slugify(text),
      text,
    });
  }

  return headings;
};
