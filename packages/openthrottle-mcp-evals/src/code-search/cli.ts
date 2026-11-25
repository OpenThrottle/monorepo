/**
 * @description CLI for the on-demand `eval-code-search` Nx target. Runs every case through a live
 * openthrottle-server's GraphQL `codeSemanticSearch` — the query behind the MCP `code_search` tool —
 * scores the top {@link CODE_SEARCH_K}, and writes the run to tmp/evals/code-search/. Exit codes: 0
 * when the gate case hits, 1 when it misses (or code search is unavailable), 2 on a usage or
 * connection error. Free (no model tokens), but it needs a server whose code index covers the
 * repository, so it never runs in CI. See ./README.md.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { isRecord, toErrorMessage } from '@openthrottle/nodejs-utils';

import { CODE_SEARCH_CASES } from './data/data.cases.ts';
import {
  CODE_SEARCH_DATASET_ID,
  CODE_SEARCH_DATASET_VERSION,
  CODE_SEARCH_GATE_CASE_ID,
  CODE_SEARCH_GRADER_VERSION,
  CODE_SEARCH_K,
} from './data/data.dataset.ts';
import type {
  CodeCaseScore,
  CodeRankedMatch,
  CodeSearchCase,
} from './eval-case.ts';
import { scoreCodeCase, summarizeCodeScores } from './scoring.ts';

const RESULTS_DIR = resolve('tmp/evals/code-search');
const DEFAULT_URL = 'http://localhost:6021';
const SEARCH_QUERY = `query codeSearchEval($input: CodeSemanticSearchInput!) {
  codeSemanticSearch(input: $input) { available matches { path score startLine } }
}`;

interface CodeSearchAnswer {
  readonly available: boolean;
  readonly matches: readonly CodeRankedMatch[];
}

interface Scope {
  readonly repositoryId: string | null;
  readonly workspacePath: string | null;
}

function parseAnswer(body: unknown): CodeSearchAnswer | string {
  if (!isRecord(body)) {
    return 'response is not a JSON object';
  }

  if (Array.isArray(body.errors) && body.errors.length > 0) {
    return JSON.stringify(body.errors);
  }

  const result = isRecord(body.data) ? body.data.codeSemanticSearch : undefined;
  if (!isRecord(result) || !Array.isArray(result.matches)) {
    return 'response has no data.codeSemanticSearch.matches';
  }

  return {
    available: result.available === true,
    matches: result.matches.flatMap((match) => {
      return isRecord(match) && typeof match.path === 'string'
        ? [{ path: match.path }]
        : [];
    }),
  };
}

async function search(
  url: string,
  token: string | undefined,
  query: string,
  scope: Scope,
): Promise<CodeSearchAnswer> {
  const response = await fetch(`${url.replace(/\/$/, '')}/graphql`, {
    body: JSON.stringify({
      query: SEARCH_QUERY,
      variables: { input: { limit: CODE_SEARCH_K * 2, query, ...scope } },
    }),
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    method: 'POST',
  });
  const answer = parseAnswer(await response.json());

  if (typeof answer === 'string') {
    throw new Error(`code search "${query.slice(0, 40)}" failed: ${answer}`);
  }

  return answer;
}

function selectCases(filter: string | undefined): CodeSearchCase[] {
  if (!filter) {
    return [...CODE_SEARCH_CASES];
  }

  const wanted = new Set(filter.split(',').map((part) => part.trim()));

  return CODE_SEARCH_CASES.filter(
    (c) => wanted.has(c.id) || wanted.has(c.kind),
  );
}

function formatScore(score: CodeCaseScore): string {
  const rank = score.firstRelevantRank ?? '-';

  return `${score.caseId.padEnd(36)} rank ${String(rank).padStart(3)}  precision@${CODE_SEARCH_K} ${score.precisionAtK.toFixed(2)}`;
}

async function main(): Promise<number> {
  const { values } = parseArgs({
    options: {
      case: { type: 'string' },
      'repository-id': { type: 'string' },
      url: { type: 'string' },
      'workspace-path': { type: 'string' },
    },
    strict: true,
  });
  const url = values.url ?? process.env.API_URL_INTERNAL ?? DEFAULT_URL;
  const cases = selectCases(values.case);
  const repositoryId = values['repository-id'] ?? null;
  const workspacePath = values['workspace-path'] ?? process.cwd();
  const scope: Scope = {
    repositoryId,
    workspacePath: repositoryId === null ? workspacePath : null,
  };

  if (cases.length === 0) {
    process.stderr.write(`no case matches --case ${values.case ?? ''}\n`);

    return 2;
  }

  const token = process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
  const scores: CodeCaseScore[] = [];
  const returned: Record<string, readonly string[]> = {};
  let isAvailable = true;

  for (const evalCase of cases) {
    // eslint-disable-next-line no-await-in-loop -- deliberate: the embedder is one in-process model
    const answer = await search(url, token, evalCase.query, scope);

    isAvailable = isAvailable && answer.available;
    returned[evalCase.id] = answer.matches.map((match) => match.path);
    scores.push(scoreCodeCase(evalCase, answer.matches));
  }

  const summary = summarizeCodeScores(scores);
  const gate = scores.find(
    (score) => score.caseId === CODE_SEARCH_GATE_CASE_ID,
  );
  const isGatePassing = isAvailable && (gate === undefined || gate.hitAtK);
  const file = join(RESULTS_DIR, `${new Date().toISOString()}.json`);

  mkdirSync(RESULTS_DIR, { recursive: true });
  writeFileSync(
    file,
    JSON.stringify(
      {
        dataset: CODE_SEARCH_DATASET_ID,
        datasetVersion: CODE_SEARCH_DATASET_VERSION,
        graderVersion: CODE_SEARCH_GRADER_VERSION,
        returned,
        scope,
        scores,
        summary,
        url,
      },
      null,
      2,
    ),
  );

  const lines = [
    ...scores.map((score) => formatScore(score)),
    '',
    `${summary.cases} cases  MRR ${summary.mrr.toFixed(3)}  hit@${CODE_SEARCH_K} ${summary.hitAtK.toFixed(3)}  precision@${CODE_SEARCH_K} ${summary.meanPrecisionAtK.toFixed(3)}`,
    isAvailable ? '' : 'code search reported available=false',
    `${isGatePassing ? 'PASS' : 'FAIL'}: gate ${CODE_SEARCH_GATE_CASE_ID}; wrote ${file}`,
  ];
  process.stdout.write(`${lines.join('\n')}\n`);

  return isGatePassing ? 0 : 1;
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    const message = toErrorMessage(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 2;
  },
);
