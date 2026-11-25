/**
 * @description `pnpm run social:x-validate -- <drafts.json>`, or the JSON on stdin: checks each
 * draft payload in a JSON array against the tweet-task contract (kind, postOn, 280 weighted
 * characters, poll limits) and prints one verdict per draft. Exit 0 when all are valid, 1 when any
 * is not, 2 when the input is not a JSON array.
 */
import { readFile } from 'node:fs/promises';
import { text } from 'node:stream/consumers';

import { EXIT_CODES } from '../config/exit-codes.ts';
import { validateDrafts } from '../utils/validateDrafts.ts';

const [path] = process.argv.slice(2).filter((arg) => arg !== '--');
const input =
  path === undefined ? await text(process.stdin) : await readFile(path, 'utf8');
const result = validateDrafts(input);

if (!result.ok) {
  console.error(`x-validate: ${result.error}`);
  process.exit(EXIT_CODES.config);
}

result.value.forEach((verdict) => {
  console.log(verdict.line);
});
process.exit(
  result.value.every((verdict) => verdict.ok)
    ? EXIT_CODES.ok
    : EXIT_CODES.failed,
);
