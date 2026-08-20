/**
 * @description Read a narration script and split it into sentences.
 *
 * The narration column of the beats table is the literal TTS input — that is the
 * contract the scripts are written to — so this parser is deliberately dumb: it
 * reads the third cell of every beat row and splits it on sentence boundaries.
 *
 * Sentences, not beats, are the atomic unit. The task asked for per-beat clips so a
 * re-record of one beat does not invalidate the take; per-sentence is strictly
 * finer, and it also gives caption-grade segment timings for free.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { applyLexicon } from './lexicon';
import type { NarrationSentence, ParsedScript } from './types';

const BEAT_TIME = /^\d{1,2}:\d{2}$/;

const frontMatterValue = (frontMatter: string, key: string): string => {
  const match = frontMatter.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'));

  return (match?.[1] ?? '').trim();
};

/**
 * Split on sentence-ending punctuation followed by a space and a capital. Naive by
 * design: narration is written as short declarative sentences with no
 * abbreviations, precisely so this stays predictable.
 */
const splitSentences = (text: string): readonly string[] =>
  text
    .split(/(?<=[.!?])\s+(?=[A-Z"'])/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);

export const parseScript = (
  repositoryRoot: string,
  slug: string,
): ParsedScript => {
  const path = join(
    repositoryRoot,
    'docs',
    'marketing',
    'scripts',
    `${slug}.md`,
  );
  const source = readFileSync(path, 'utf8');
  const match = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!match) {
    throw new Error(`${path}: missing front matter`);
  }

  const [, frontMatter = '', body = ''] = match;
  const format = frontMatterValue(frontMatter, 'format');

  if (format !== 'short' && format !== 'longform') {
    throw new Error(
      `${path}: format must be 'short' or 'longform', got '${format}'`,
    );
  }

  const sentences: NarrationSentence[] = [];

  for (const line of body.split('\n')) {
    if (!line.trimStart().startsWith('|')) {
      continue;
    }

    const cells = line
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((cell) => cell.trim());

    const beat = cells[0] ?? '';
    const narration = cells[2] ?? '';

    if (!BEAT_TIME.test(beat) || narration.length === 0) {
      continue;
    }

    for (const written of splitSentences(narration)) {
      sentences.push({
        beat,
        index: sentences.length,
        spoken: applyLexicon(written),
        written,
      });
    }
  }

  if (sentences.length === 0) {
    throw new Error(`${path}: no narration found in the beats table`);
  }

  return {
    format,
    sentences,
    slug,
    title: frontMatterValue(frontMatter, 'title').replace(/^['"]|['"]$/g, ''),
  };
};
