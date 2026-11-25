/**
 * @description CLI for the on-demand `eval-search-ranking` Nx target. Runs every case through a live
 * openthrottle-server's GraphQL `search` twice — `mode: "semantic"` (the vector-only baseline) and
 * `mode: "hybrid"` — scores both, and applies the ship rule in ./compareSearchModes.ts. Writes the run to
 * tmp/evals/search-ranking/. Exit codes: 0 hybrid may ship, 1 it may not, 2 usage or connection error. Free
 * (no model tokens), but it needs a server pointed at the knowledge base the cases were labelled against,
 * so it never runs in CI. See ./README.md.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { isRecord, toErrorMessage } from '@openthrottle/nodejs-utils';

import type { ModeComparison } from './compareSearchModes.ts';
import {
  compareSearchModes,
  DEFAULT_COMPARE_OPTIONS,
} from './compareSearchModes.ts';
import { SEARCH_RANKING_CASES } from './data/cases.ts';
import {
  SEARCH_RANKING_DATASET_ID,
  SEARCH_RANKING_DATASET_VERSION,
  SEARCH_RANKING_GRADER_VERSION,
} from './data/dataset.ts';
import type { RankedChunk, SearchRankingCase } from './eval-case.ts';
import type { SearchAnswer, SearchFn } from './runSearchRanking.ts';
import { runSearchMode } from './runSearchRanking.ts';
import type { ScoreSummary } from './scoring.ts';

const RESULTS_DIR = resolve('tmp/evals/search-ranking');
const DEFAULT_URL = 'http://localhost:6021';
const SEARCH_QUERY = `query searchRankingEval($input: SearchInput!) {
  search(input: $input) { chunks { planId source sourcePath taskId } mode }
}`;

function nullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function toRankedChunk(value: unknown): RankedChunk | null {
  if (!isRecord(value) || typeof value.source !== 'string') {
    return null;
  }

  return {
    planId: nullableString(value.planId),
    source: value.source,
    sourcePath: nullableString(value.sourcePath),
    taskId: nullableString(value.taskId),
  };
}

function parseSearchAnswer(body: unknown): SearchAnswer | string {
  if (!isRecord(body)) {
    return 'response is not a JSON object';
  }

  if (Array.isArray(body.errors) && body.errors.length > 0) {
    return JSON.stringify(body.errors);
  }

  const search = isRecord(body.data) ? body.data.search : undefined;
  if (!isRecord(search) || !Array.isArray(search.chunks)) {
    return 'response has no data.search.chunks';
  }

  return {
    chunks: search.chunks.flatMap((chunk) => {
      const ranked = toRankedChunk(chunk);

      return ranked ? [ranked] : [];
    }),
    mode: typeof search.mode === 'string' ? search.mode : 'unknown',
  };
}

function graphqlSearch(url: string, token: string | undefined): SearchFn {
  return async (query, mode, limit) => {
    const response = await fetch(`${url.replace(/\/$/, '')}/graphql`, {
      body: JSON.stringify({
        query: SEARCH_QUERY,
        variables: { input: { limit, mode, query } },
      }),
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      method: 'POST',
    });
    const answer = parseSearchAnswer(await response.json());

    if (typeof answer === 'string') {
      throw new Error(`search "${query}" (${mode}) failed: ${answer}`);
    }

    return answer;
  };
}

function selectCases(filter: string | undefined): SearchRankingCase[] {
  if (!filter) {
    return [...SEARCH_RANKING_CASES];
  }

  const wanted = new Set(filter.split(',').map((part) => part.trim()));

  return SEARCH_RANKING_CASES.filter((c) => {
    return wanted.has(c.id) || wanted.has(c.kind) || wanted.has(c.split);
  });
}

function row(label: string, summary: ScoreSummary): string {
  const cells = [
    label.padEnd(22),
    String(summary.cases).padStart(5),
    summary.mrr.toFixed(3).padStart(7),
    summary.hitAt10.toFixed(3).padStart(8),
    summary.meanRecallAt10.toFixed(3).padStart(11),
  ];

  return cells.join(' ');
}

function report(comparison: ModeComparison): string {
  const lines = [
    `${'run'.padEnd(22)} cases     MRR   hit@10   recall@10`,
    row('vector-only overall', comparison.baseline.overall),
    row('hybrid overall', comparison.candidate.overall),
    row('vector-only identifier', comparison.baseline.identifier),
    row('hybrid identifier', comparison.candidate.identifier),
    row('vector-only topic', comparison.baseline.topic),
    row('hybrid topic', comparison.candidate.topic),
    '',
  ];
  const difference = comparison.hitAt10Difference;

  if (difference.kind === 'ok') {
    lines.push(
      `hit@10 paired difference ${difference.meanDifference.toFixed(3)} ` +
        `(95% CI ${difference.ci.lower.toFixed(3)}..${difference.ci.upper.toFixed(3)}, ` +
        `McNemar p=${difference.mcnemar.pValue.toFixed(3)})`,
    );
  }

  comparison.rankDrops.forEach((drop) => {
    lines.push(
      `  rank drop ${drop.caseId}: ${drop.baselineRank ?? '-'} → ${drop.candidateRank ?? '-'}`,
    );
  });
  lines.push(
    '',
    `${comparison.ship ? 'SHIP' : 'HOLD'}: ${comparison.why.join('; ')}`,
  );

  return lines.join('\n');
}

async function main(): Promise<number> {
  const { values } = parseArgs({
    options: {
      case: { type: 'string' },
      url: { type: 'string' },
    },
    strict: true,
  });
  const url = values.url ?? process.env.API_URL_INTERNAL ?? DEFAULT_URL;
  const cases = selectCases(values.case);

  if (cases.length === 0) {
    process.stderr.write(`no case matches --case ${values.case ?? ''}\n`);

    return 2;
  }

  const search = graphqlSearch(url, process.env.OPENTHROTTLE_MCP_AUTH_TOKEN);
  const baseline = await runSearchMode(cases, 'semantic', search);
  const candidate = await runSearchMode(cases, 'hybrid', search);
  const comparison = compareSearchModes(
    baseline,
    candidate,
    DEFAULT_COMPARE_OPTIONS,
  );
  const file = join(RESULTS_DIR, `${new Date().toISOString()}.json`);

  mkdirSync(RESULTS_DIR, { recursive: true });
  writeFileSync(
    file,
    JSON.stringify(
      {
        comparison,
        dataset: SEARCH_RANKING_DATASET_ID,
        datasetVersion: SEARCH_RANKING_DATASET_VERSION,
        graderVersion: SEARCH_RANKING_GRADER_VERSION,
        runs: { hybrid: candidate, semantic: baseline },
        url,
      },
      null,
      2,
    ),
  );
  process.stdout.write(`${report(comparison)}\n\nwrote ${file}\n`);

  return comparison.ship ? 0 : 1;
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    process.stderr.write(`${toErrorMessage(error)}\n`);
    process.exitCode = 2;
  },
);
