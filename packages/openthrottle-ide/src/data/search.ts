import type { WorkspaceConfig } from '../config/workspace-config.js';
import { resolveWorkspaceConfig } from '../config/workspace-config.js';
import { runRipgrep, workspaceRipgrepArgs } from '../utils/ripgrep.js';

/** A single matching line within a file. */
export interface SearchMatch {
  /** 1-based column of the first match on the line (byte offset + 1). */
  column: number;
  /** 1-based line number. */
  line: number;
  /** Full text of the matching line (trailing newline stripped). */
  lineText: string;
  /** The matched substring of the first submatch on the line. */
  matchText: string;
  /** Workspace-relative POSIX path of the file. */
  path: string;
}

/** Options that tune a {@link searchText} query. */
export interface SearchOptions {
  /** Match case-sensitively. Defaults to `false` (case-insensitive). */
  caseSensitive?: boolean;
  /** Restrict the search to these ripgrep globs, e.g. `['*.ts', '*.tsx']`. */
  globs?: string[];
  /** Cap on the total number of matches returned across all files. */
  maxResults?: number;
  /** Treat `query` as a regular expression. Defaults to `false` (literal text). */
  regex?: boolean;
}

/**
 * Search the workspace for `query` using the bundled ripgrep binary, returning
 * structured matches. Honors `.gitignore`, the config's exclude globs, and the
 * provided {@link SearchOptions}.
 *
 * @publicApi
 */
export async function searchText(
  query: string,
  config: WorkspaceConfig,
  options: SearchOptions = {},
): Promise<SearchMatch[]> {
  const resolved = resolveWorkspaceConfig(config);
  const args = [
    ...workspaceRipgrepArgs(resolved),
    '--json',
    options.caseSensitive ? '--case-sensitive' : '--ignore-case',
  ];

  if (!options.regex) {
    args.push('--fixed-strings');
  }

  for (const glob of options.globs ?? []) {
    args.push('--glob', glob);
  }

  // Pass the pattern via --regexp and an explicit search path. Without a path,
  // ripgrep reads from the (empty, piped) stdin and hangs.
  args.push('--regexp', query, '.');

  const { stdout } = await runRipgrep(args, resolved);

  return parseMatches(stdout, options.maxResults);
}

function parseMatches(stdout: string, maxResults?: number): SearchMatch[] {
  const matches: SearchMatch[] = [];

  for (const line of stdout.split('\n')) {
    if (line.length === 0) {
      continue;
    }

    const match = parseMatchLine(line);

    if (match !== undefined) {
      matches.push(match);
    }

    if (maxResults !== undefined && matches.length >= maxResults) {
      break;
    }
  }

  return matches;
}

function parseMatchLine(line: string): SearchMatch | undefined {
  const record = asRecord(safeParse(line));

  if (record === undefined || record['type'] !== 'match') {
    return undefined;
  }

  const data = asRecord(record['data']);
  const path = asText(data?.['path']);
  const lineText = asText(data?.['lines']);
  const lineNumber = data?.['line_number'];
  const submatch = asRecord(asArray(data?.['submatches'])?.[0]);

  if (
    path === undefined ||
    lineText === undefined ||
    typeof lineNumber !== 'number'
  ) {
    return undefined;
  }

  const start = submatch?.['start'];

  return {
    column: typeof start === 'number' ? start + 1 : 1,
    line: lineNumber,
    lineText: lineText.replace(/\n$/, ''),
    matchText: asText(submatch?.['match']) ?? '',
    // Drop the leading `./` ripgrep adds when searching the `.` path, so search
    // paths match the workspace-relative form returned by listFiles.
    path: path.replace(/^\.\//, ''),
  };
}

function safeParse(line: string): unknown {
  try {
    return JSON.parse(line);
  } catch {
    return undefined;
  }
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? { ...value }
    : undefined;
}

function asArray(value: unknown): unknown[] | undefined {
  return Array.isArray(value) ? value : undefined;
}

/**
 * ripgrep encodes string fields as `{ text: string }` (or `{ bytes: string }`
 * for non-UTF-8 paths). Extract the `text` form when present.
 */
function asText(value: unknown): string | undefined {
  const record = asRecord(value);
  const text = record?.['text'];

  return typeof text === 'string' ? text : undefined;
}
