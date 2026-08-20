/**
 * @description CI entrypoint: validate the narration scripts under
 * `docs/marketing/scripts/` against the "0-60" format spec. Counts the spoken
 * words in each beats table, rewrites the `spokenWords` front-matter field, and
 * fails when a short exceeds the spoken-word budget derived from
 * `docs/marketing/format.json`.
 *
 * Pass `--check` to validate without rewriting (CI parity).
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** Natural narration pace used to convert a word count into seconds. */
const WORDS_PER_MINUTE = 145;

/** Grace over the budget before a script fails rather than warns. */
const OVER_BUDGET_TOLERANCE_WORDS = 5;

/**
 * A long-form script whose narration covers less than this fraction of its
 * shortest permitted runtime is an outline, not a script. Warn rather than fail:
 * long-form is written as a beat skeleton first and fleshed out before recording.
 */
const LONGFORM_MIN_NARRATION_COVERAGE = 0.4;

const SCRIPTS_DIR = join(process.cwd(), 'docs', 'marketing', 'scripts');
const FORMAT_PATH = join(process.cwd(), 'docs', 'marketing', 'format.json');

interface FormatSpec {
  readonly formats: {
    readonly longform: {
      readonly maxDurationSeconds: number;
      readonly minDurationSeconds: number;
    };
    readonly short: { readonly targetDurationSeconds: number };
  };
}

interface ScriptReport {
  readonly budget: number;
  readonly format: string;
  readonly id: string;
  readonly path: string;
  readonly spokenSeconds: number;
  readonly words: number;
}

/**
 * Read the narration column out of every markdown table row in the body.
 *
 * The beats table is `| t | on-screen action | narration |`, so the narration is
 * the third pipe-delimited cell. Header and separator rows are dropped, as are
 * rows whose narration is empty (the outro beat carries no narration).
 */
const narrationCells = (body: string): readonly string[] =>
  body
    .split('\n')
    .filter((line) => line.trimStart().startsWith('|'))
    .map((line) => line.trim().replace(/^\|/, '').replace(/\|$/, ''))
    .map((line) => line.split('|').map((cell) => cell.trim()))
    .filter((cells) => cells.length >= 3)
    .filter((cells) => /^\d{1,2}:\d{2}$/.test(cells[0] ?? ''))
    .map((cells) => cells[2] ?? '')
    .filter((narration) => narration.length > 0);

const countWords = (text: string): number =>
  text.split(/\s+/).filter((word) => /[a-z0-9]/i.test(word)).length;

const frontMatterValue = (frontMatter: string, key: string): string => {
  const match = frontMatter.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'));
  return (match?.[1] ?? '').trim();
};

const run = (): void => {
  const checkOnly = process.argv.includes('--check');
  const spec: FormatSpec = JSON.parse(readFileSync(FORMAT_PATH, 'utf8'));

  const shortBudget = Math.floor(
    (spec.formats.short.targetDurationSeconds / 60) * WORDS_PER_MINUTE,
  );
  const longformBudget = Math.floor(
    (spec.formats.longform.maxDurationSeconds / 60) * WORDS_PER_MINUTE,
  );

  const files = readdirSync(SCRIPTS_DIR)
    .filter((file) => file.endsWith('.md'))
    .filter((file) => file !== 'README.md')
    .sort();

  if (files.length === 0) {
    console.error(
      'validate-video-scripts: no scripts found under docs/marketing/scripts',
    );
    process.exit(1);
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const rewritten: string[] = [];
  const reports: ScriptReport[] = [];

  for (const file of files) {
    const path = join(SCRIPTS_DIR, file);
    const source = readFileSync(path, 'utf8');
    const match = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

    if (!match) {
      errors.push(`${file}: missing front matter`);
      continue;
    }

    const [, frontMatter, body] = match;
    const id = frontMatterValue(frontMatter ?? '', 'id');
    const format = frontMatterValue(frontMatter ?? '', 'format');

    if (id.length === 0) {
      errors.push(`${file}: front matter has no id`);
    }

    if (format !== 'short' && format !== 'longform') {
      errors.push(
        `${file}: format must be 'short' or 'longform', got '${format}'`,
      );
      continue;
    }

    const cells = narrationCells(body ?? '');

    if (cells.length === 0) {
      errors.push(
        `${file}: no beats table rows found (expected '| mm:ss | action | narration |')`,
      );
      continue;
    }

    const words = cells.reduce((total, cell) => total + countWords(cell), 0);
    const budget = format === 'short' ? shortBudget : longformBudget;

    reports.push({
      budget,
      format,
      id,
      path: file,
      spokenSeconds: Math.round((words / WORDS_PER_MINUTE) * 60),
      words,
    });

    const longformFloorSeconds =
      spec.formats.longform.minDurationSeconds *
      LONGFORM_MIN_NARRATION_COVERAGE;
    const spokenSeconds = Math.round((words / WORDS_PER_MINUTE) * 60);

    if (format === 'longform' && spokenSeconds < longformFloorSeconds) {
      warnings.push(
        `${file}: ~${spokenSeconds}s of narration for a ${spec.formats.longform.minDurationSeconds}s-minimum video — still an outline; flesh out the narration column before recording`,
      );
    }

    if (words > budget + OVER_BUDGET_TOLERANCE_WORDS) {
      errors.push(
        `${file}: ${words} spoken words over the ${budget}-word budget for a ${format} — cut words, do not speed up the TTS`,
      );
    }

    const updated = source.replace(
      /^spokenWords:.*$/m,
      `spokenWords: ${String(words)}`,
    );

    if (updated !== source) {
      if (checkOnly) {
        errors.push(
          `${file}: spokenWords is stale (expected ${words}); run without --check to update`,
        );
      } else {
        writeFileSync(path, updated, 'utf8');
        rewritten.push(file);
      }
    }
  }

  for (const report of reports) {
    console.log(
      `  ${report.path.padEnd(34)} ${String(report.words).padStart(4)} words  ~${String(report.spokenSeconds).padStart(3)}s  (budget ${report.budget})`,
    );
  }

  for (const warning of warnings) {
    console.warn(`validate-video-scripts: warning: ${warning}`);
  }

  if (rewritten.length > 0) {
    console.log(
      `validate-video-scripts: updated spokenWords in ${rewritten.length} file(s)`,
    );
  }

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`validate-video-scripts: error: ${error}`);
    }
    console.error(`validate-video-scripts: ${errors.length} error(s)`);
    process.exit(1);
  }

  console.log(
    `validate-video-scripts: OK (${reports.length} script(s), ${warnings.length} warning(s))`,
  );
};

run();
