/**
 * A small, static shell lexer for the bash guard.
 *
 * Splits a command line into simple commands at the unquoted control operators
 * `&&`, `||`, `;`, `|`, `|&`, `&`, newlines and subshell parentheses, and each
 * of those into words with quotes removed. It never expands anything: a word
 * holding `$VAR` keeps the literal text, and rules must treat such a word as
 * unknowable rather than guess.
 *
 * It is deliberately not a full shell parser. Rules fail open, so the cost of
 * a construct this lexer misreads is a missed guard, never a blocked command.
 *
 * @public
 */
import path from 'node:path';

import type { BashSegment, ParsedBashCommand } from './types.ts';

const isBlank = (char: string): boolean => {
  return char === ' ' || char === '\t';
};

interface Heredoc {
  readonly delimiter: string;
  readonly stripTabs: boolean;
}

/**
 * Skip the bodies of pending heredocs, which start on the line after
 * `newlineIndex`. Returns the index of the newline that ends the last
 * delimiter line, or the end of the command.
 */
const skipHeredocBodies = (
  command: string,
  newlineIndex: number,
  heredocs: readonly Heredoc[],
): number => {
  let lineEnd = newlineIndex;
  for (const { delimiter, stripTabs } of heredocs) {
    let found = false;
    while (!found && lineEnd < command.length) {
      const lineStart = lineEnd + 1;
      const nextNewline = command.indexOf('\n', lineStart);
      lineEnd = nextNewline === -1 ? command.length : nextNewline;
      const line = command.slice(lineStart, lineEnd);
      found = (stripTabs ? line.replace(/^\t+/, '') : line) === delimiter;
    }
  }
  return lineEnd;
};

/**
 * The index just past a redirection operator starting at `index` (`>`, `>>`,
 * `>|`, `<`, `<>`, `&>`, `&>>`, `>&`, `<&`), and whether it carries its target
 * inline (`2>&1`, `<&-`) or takes the next word as its target.
 */
const readRedirection = (
  command: string,
  index: number,
): { readonly end: number; readonly hasInlineTarget: boolean } => {
  const char = command.charAt(index);
  let end = char === '&' ? index + 2 : index + 1;
  const after = command.charAt(end);
  if (after === '>' || after === '|' || (char === '<' && after === '>')) {
    return { end: end + 1, hasInlineTarget: false };
  }
  if (after === '&' && char !== '&') {
    end += 1;
    const fd = /^(\d+|-)/.exec(command.slice(end));
    if (fd) return { end: end + fd[0].length, hasInlineTarget: true };
  }
  return { end, hasInlineTarget: false };
};

/**
 * Split `command` into simple commands, each a list of words. Redirections and
 * their targets are dropped, and heredoc bodies are skipped, so neither can be
 * mistaken for an argument or a command.
 *
 * @public
 */
export const splitShellSegments = (
  command: string,
): readonly (readonly string[])[] => {
  const segments: string[][] = [];
  const heredocs: Heredoc[] = [];
  let words: string[] = [];
  let word: string | null = null;
  let quote: '"' | "'" | null = null;
  let dropNextWord = false;
  let pendingHeredoc: { readonly stripTabs: boolean } | null = null;

  const endWord = (): void => {
    if (word === null) return;
    if (pendingHeredoc !== null) {
      heredocs.push({ delimiter: word, stripTabs: pendingHeredoc.stripTabs });
      pendingHeredoc = null;
    } else if (dropNextWord) {
      dropNextWord = false;
    } else {
      words.push(word);
    }
    word = null;
  };
  const endSegment = (): void => {
    endWord();
    if (words.length > 0) segments.push(words);
    words = [];
    dropNextWord = false;
    pendingHeredoc = null;
  };
  const append = (text: string): void => {
    word = (word ?? '') + text;
  };

  let index = 0;
  while (index < command.length) {
    const char = command.charAt(index);
    const next = command.charAt(index + 1);

    if (quote === "'") {
      if (char === "'") quote = null;
      else append(char);
      index += 1;
      continue;
    }

    if (quote === '"') {
      if (char === '"') {
        quote = null;
      } else if (char === '\\' && '"\\$`\n'.includes(next) && next !== '') {
        if (next !== '\n') append(next);
        index += 1;
      } else {
        append(char);
      }
      index += 1;
      continue;
    }

    const isRedirection =
      char === '>' || char === '<' || (char === '&' && next === '>');

    if (char === "'" || char === '"') {
      quote = char;
      append('');
    } else if (char === '\\') {
      // A backslash-newline is a line continuation and contributes nothing.
      if (next !== '\n' && next !== '') append(next);
      index += 1;
    } else if (isBlank(char)) {
      endWord();
    } else if (char === '#' && word === null) {
      while (index < command.length && command.charAt(index) !== '\n') {
        index += 1;
      }
      continue;
    } else if (char === '\n') {
      endSegment();
      if (heredocs.length > 0) {
        index = skipHeredocBodies(command, index, heredocs);
        heredocs.length = 0;
      }
    } else if (char === ';' || char === '(' || char === ')') {
      endSegment();
    } else if (isRedirection) {
      // A word of only digits right before the operator is its fd, not an argument.
      if (word !== null && /^\d+$/.test(word)) word = null;
      else endWord();
      if (command.startsWith('<<<', index)) {
        dropNextWord = true;
        index += 3;
        continue;
      }
      if (char === '<' && next === '<') {
        const stripTabs = command.charAt(index + 2) === '-';
        pendingHeredoc = { stripTabs };
        index += stripTabs ? 3 : 2;
        continue;
      }
      const redirection = readRedirection(command, index);
      dropNextWord = !redirection.hasInlineTarget;
      index = redirection.end;
      continue;
    } else if (char === '|') {
      endSegment();
      if (next === '|' || next === '&') index += 1;
    } else if (char === '&') {
      endSegment();
      if (next === '&') index += 1;
    } else {
      append(char);
    }
    index += 1;
  }
  endSegment();

  return segments;
};

/** Words a parser can see past to the command they introduce. */
const COMMAND_PREFIXES: ReadonlySet<string> = new Set([
  'command',
  'env',
  'exec',
  'nohup',
  'time',
]);

const ENV_ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;

/**
 * The words of a simple command with leading `NAME=value` assignments and
 * pass-through prefixes (`env`, `command`, …) removed, plus the assignments
 * themselves.
 *
 * @public
 */
export const stripCommandPrefixes = (
  words: readonly string[],
): {
  readonly assignments: ReadonlyMap<string, string>;
  readonly words: readonly string[];
} => {
  const assignments = new Map<string, string>();
  let start = 0;
  for (const current of words) {
    if (ENV_ASSIGNMENT.test(current)) {
      const equals = current.indexOf('=');
      assignments.set(current.slice(0, equals), current.slice(equals + 1));
    } else if (!COMMAND_PREFIXES.has(current)) {
      break;
    }
    start += 1;
  }
  return { assignments, words: words.slice(start) };
};

const isStaticPath = (target: string): boolean => {
  return !/[$`~*?]/.test(target) && target !== '-';
};

/**
 * Lex `command` and work out each segment's directory by following plain
 * `cd <path>` segments from `cwd`. A `cd` the lexer cannot resolve statically
 * makes every later segment's directory unknown (`null`).
 *
 * @public
 */
export const parseBashCommand = (
  command: string,
  cwd: string,
): ParsedBashCommand => {
  let current: string | null = cwd;
  const segments: BashSegment[] = [];
  for (const words of splitShellSegments(command)) {
    segments.push({ cwd: current, words });
    const { words: bare } = stripCommandPrefixes(words);
    if (bare[0] !== 'cd') continue;
    const from: string | null = current;
    const target = bare[1];
    if (from === null || target === undefined || !isStaticPath(target)) {
      current = null;
    } else {
      current = path.resolve(from, target);
    }
  }
  return { raw: command, segments };
};
