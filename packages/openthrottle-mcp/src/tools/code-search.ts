/**
 * @description code_search: semantic search over a registered repository's indexed code, wrapping
 * the `codeSemanticSearch` GraphQL query. Returns path, line range, score and a short snippet per
 * match, best first, within a small result budget so a review can look for existing code without
 * overflowing the client. The repository is the caller's workspace unless one is named.
 */

import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import { z } from 'zod';

import type { CodeSearchMatchFragment } from '../__generated__/graphql.js';
import { SearchCodeDocument } from '../__generated__/graphql.js';
import { getAuthToken } from '../auth/getAuthToken.ts';
import { resolveWorkspacePathArgument } from '../config/workspace-path.ts';
import type { GenericResult } from '../types/index.ts';
import { invalidArgsContent } from '../utils/errors.ts';
import { runTool } from '../utils/runTool.ts';

const CODE_SEARCH_DEFAULT_LIMIT = 8;
const CODE_SEARCH_MAX_LIMIT = 20;
const SNIPPET_MAX_LINES = 6;
const SNIPPET_MAX_LINE_LENGTH = 160;

interface CodeSearchHit {
  readonly endLine: number;
  readonly path: string;
  readonly score: number;
  readonly snippet: string;
  readonly startLine: number;
}

type CodeSearchStructured = {
  available: boolean;
  matches: CodeSearchHit[];
};

type CodeSearchResult = GenericResult<CodeSearchStructured>;

export const codeSearchToolParameters = z
  .object({
    limit: z.number().int().min(1).max(CODE_SEARCH_MAX_LIMIT).optional(),
    query: z.string().min(1),
    repositoryId: z.string().uuid().optional(),
    workspacePath: z.string().optional(),
  })
  .strict();

export const codeSearchToolDescription = `Semantic search over a repository's indexed code: path, lines, score and snippet per match, best first. Use it to find code that already does something. Searches the repository you are in; repositoryId or workspacePath names another. available=false: code search is off.`;

/**
 * @description The first few lines of a match, each clipped, so a result stays small. The full
 * chunk is a file read away: path and line range are exact.
 */
const toSnippet = (content: string): string => {
  const lines = content.split('\n');
  const head = lines.slice(0, SNIPPET_MAX_LINES).map((line) => {
    return line.length > SNIPPET_MAX_LINE_LENGTH
      ? `${line.slice(0, SNIPPET_MAX_LINE_LENGTH)}…`
      : line;
  });
  const more = lines.length > SNIPPET_MAX_LINES ? '\n…' : '';

  return `${head.join('\n')}${more}`;
};

const toHit = (match: CodeSearchMatchFragment): CodeSearchHit => {
  return {
    endLine: match.endLine,
    path: match.path,
    score: match.score,
    snippet: toSnippet(match.content),
    startLine: match.startLine,
  };
};

const formatHit = (hit: CodeSearchHit): string => {
  return `${hit.path}:${hit.startLine}-${hit.endLine} (score: ${hit.score.toFixed(3)})\n${hit.snippet}`;
};

export async function codeSearchToolHandler(
  args: z.infer<typeof codeSearchToolParameters>,
): Promise<CodeSearchResult> {
  const parsed = codeSearchToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error);
  }

  const query = parsed.data.query.trim();
  if (query === '') {
    return invalidArgsContent('query must be a non-empty string');
  }

  const repositoryId = parsed.data.repositoryId ?? null;
  const callerWorkspace =
    resolveWorkspacePathArgument(parsed.data.workspacePath) ?? null;
  const workspacePath = repositoryId === null ? callerWorkspace : null;
  if (repositoryId === null && workspacePath === null) {
    return invalidArgsContent(
      'pass repositoryId or workspacePath: this server has no workspace of its own',
    );
  }

  return runTool<CodeSearchStructured>('code_search', async () => {
    const token = getAuthToken();
    const result = await executeGraphqlWithAuth(token, SearchCodeDocument, {
      input: {
        limit: parsed.data.limit ?? CODE_SEARCH_DEFAULT_LIMIT,
        query,
        repositoryId,
        workspacePath,
      },
    });

    const { available, matches } = result.codeSemanticSearch;
    const hits = [...matches]
      .sort((a, b) => b.score - a.score)
      .map((match) => toHit(match));

    if (!available) {
      return {
        structuredContent: { available, matches: [] },
        text: 'Code search is unavailable: the server has no embeddings provider for code.',
      };
    }

    if (hits.length === 0) {
      return {
        structuredContent: { available, matches: hits },
        text: 'No matching code found. The repository may not be indexed yet.',
      };
    }

    return {
      structuredContent: { available, matches: hits },
      text: hits.map((hit) => formatHit(hit)).join('\n\n---\n\n'),
    };
  });
}
