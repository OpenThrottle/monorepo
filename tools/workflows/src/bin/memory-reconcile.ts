#!/usr/bin/env node

/**
 * @description Reconciles a memory index (`MEMORY.md`) against the world: PR state via
 * `gh`, plan status via the OT GraphQL API. Reports ONLY disagreements, and states
 * explicitly what it did not check. See tools/workflows/README.md.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import {
  parseIndexClaims,
  parseIndexEntries,
} from '../memory-reconcile/claims';
import { findDemotionCandidates } from '../memory-reconcile/demotion';
import {
  checkIndexIntegrity,
  formatIntegrityReport,
} from '../memory-reconcile/integrity';
import {
  formatReconcileReport,
  reconcile,
  type ObservedPlan,
  type ObservedPr,
} from '../memory-reconcile/reconcile';
import { listAllPlansGraphql } from '../utils/openthrottle-ralph-graphql';

interface Args {
  readonly index: string;
  readonly repo: string | null;
}

const parseArgs = (): Args => {
  const argv = process.argv.slice(2);
  let index = '';
  let repo: string | null = null;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: workflow-memory-reconcile --index <path/to/MEMORY.md> [--repo <owner/repo>]

Reconciles a memory index against observed reality and reports only the
disagreements. Requires \`gh\` on PATH for PR state, and OT GraphQL env for plan
status (see tools/workflows/README.md).

Exit codes:
  0  no disagreements
  1  disagreements found (or a usage error)

Options:
  --index <path>  Path to MEMORY.md (required)
  --repo <repo>   owner/repo for PR lookup; defaults to the gh-resolved repo
`);
      process.exit(0);
    }
    if (arg === '--index' && i + 1 < argv.length) {
      index = argv[++i] ?? '';
      continue;
    }
    if (arg === '--repo' && i + 1 < argv.length) {
      repo = argv[++i] ?? null;
      continue;
    }
  }

  if (!index) {
    console.error('workflow-memory-reconcile: --index <path> is required');
    process.exit(1);
  }
  return { index, repo };
};

interface GhPr {
  readonly isDraft?: boolean;
  readonly number?: number;
  readonly state?: string;
}

const isGhPr = (value: unknown): value is GhPr =>
  typeof value === 'object' && value !== null;

/**
 * Fetch every PR once rather than per reference. One `gh` call is both faster and
 * far less likely to trip rate limiting than 50 of them.
 */
const fetchPrs = (repo: string | null): ReadonlyMap<number, ObservedPr> => {
  const args = [
    'pr',
    'list',
    '--state',
    'all',
    '--limit',
    '1000',
    '--json',
    'number,state,isDraft',
  ];
  if (repo !== null) args.push('--repo', repo);

  const raw = execFileSync('gh', args, {
    encoding: 'utf8',
    maxBuffer: 1 << 26,
  });
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) return new Map();

  const out = new Map<number, ObservedPr>();
  for (const item of parsed) {
    if (!isGhPr(item)) continue;
    const { isDraft, number, state } = item;
    if (typeof number !== 'number' || typeof state !== 'string') continue;
    out.set(number, {
      isDraft: isDraft === true,
      // `gh` reports MERGED as its own state; there is no separate merged flag
      // on this projection, so derive it rather than inventing one.
      merged: state.toUpperCase() === 'MERGED',
      number,
      state,
    });
  }
  return out;
};

/**
 * Fetch every plan once and let the reconciler match by id prefix.
 *
 * The index writes plan ids in the 8-hex short form, which is not addressable by
 * `get_plan` — a first version fetched by id and resolved 0 of 60 references,
 * reporting them all as "not found". Listing once and matching locally is the
 * same shape as the PR lookup and costs one call either way.
 */
const fetchPlans = async (): Promise<readonly ObservedPlan[] | null> => {
  try {
    const plans = await listAllPlansGraphql();
    return plans.map((plan) => ({ id: plan.id, status: plan.status }));
  } catch (error: unknown) {
    // Returning null, not throwing, and not an empty array. Empty would make
    // every plan reference read as "not found" — a confident claim about plans
    // this run never actually looked at. Null lets the report say the plan half
    // was skipped, which is the true statement.
    const detail = error instanceof Error ? error.message : String(error);
    console.error(
      `workflow-memory-reconcile: OT GraphQL unreachable, SKIPPING the plan half (${detail})`,
    );
    return null;
  }
};

/**
 * Read the index's sibling `*.md` files and any archive among them.
 *
 * An archive is recognised by name suffix rather than a hardcoded filename, so a
 * second archive can be added without editing this tool — and without every file
 * it holds immediately reporting as an orphan.
 */
const readMemoryDirectory = (
  indexPath: string,
): {
  archives: ReadonlyMap<string, string>;
  files: readonly string[];
  indexName: string;
} => {
  const dir = path.dirname(indexPath);
  const indexName = path.basename(indexPath);
  const files = fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .sort();

  const archives = new Map<string, string>();
  for (const name of files) {
    if (!name.endsWith('-archive.md')) continue;
    archives.set(name, fs.readFileSync(path.join(dir, name), 'utf8'));
  }

  return { archives, files, indexName };
};

const main = async (): Promise<number> => {
  const { index, repo } = parseArgs();

  if (!fs.existsSync(index)) {
    console.error(`workflow-memory-reconcile: no such index: ${index}`);
    return 1;
  }

  const indexContent = fs.readFileSync(index, 'utf8');
  const claims = parseIndexClaims(indexContent);
  const entries = parseIndexEntries(indexContent);

  // Integrity first, and unconditionally: it is local, needs no network, and is
  // the check that catches memories being LOST rather than merely being stale.
  // Running it before anything that can fail means it always gets run.
  const { archives, files, indexName } = readMemoryDirectory(index);
  const integrity = checkIndexIntegrity({
    archives,
    files,
    indexContent,
    indexName,
  });
  console.log(formatIntegrityReport(integrity));
  console.log('');

  let prs: ReadonlyMap<number, ObservedPr>;
  try {
    prs = fetchPrs(repo);
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`workflow-memory-reconcile: gh pr list failed: ${detail}`);
    return 1;
  }

  const plans = await fetchPlans();
  const report = reconcile({
    // With the plan half skipped, drop the plan claims entirely rather than
    // reconciling them against nothing — see `fetchPlans`.
    claims: plans === null ? { plans: [], prs: claims.prs } : claims,
    plans: plans ?? [],
    prs,
  });

  console.log(
    formatReconcileReport(report, {
      planRefs: plans === null ? 0 : claims.plans.length,
      prRefs: claims.prs.length,
    }),
  );

  if (plans === null) {
    console.log('');
    console.log(
      `ALSO NOT checked: all ${claims.plans.length} plan reference(s) — OT GraphQL was unreachable.`,
    );
  } else {
    const demotions = findDemotionCandidates({
      entries: entries.map((entry) => ({
        hook: entry.hook,
        line: entry.line,
        title: entry.title,
      })),
      planClaims: claims.plans,
      plans,
      prClaims: claims.prs,
      prs,
    });

    console.log('');
    console.log(
      `Archive candidates (${demotions.candidates.length}) — plan(s) COMPLETED, PR(s) settled, nothing owed:`,
    );
    if (demotions.candidates.length === 0) {
      console.log('  none');
    } else {
      for (const item of demotions.candidates) {
        console.log(`  line ${item.line} — ${item.title}`);
      }
    }
    console.log('');
    console.log(
      `Held back (${demotions.held.length}) — looked landed, kept in the index:`,
    );
    if (demotions.held.length === 0) {
      console.log('  none');
    } else {
      for (const item of demotions.held) {
        console.log(`  line ${item.line} — ${item.title}: ${item.reason}`);
      }
    }
    console.log('');
    console.log(
      'Demotion is a PROPOSAL, never applied here. Moving an entry to the archive',
    );
    console.log(
      'removes it from what every future session is shown — that is a judgement call.',
    );
  }

  return report.disagreements.length === 0 ? 0 : 1;
};

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(error);
    process.exit(1);
  },
);
