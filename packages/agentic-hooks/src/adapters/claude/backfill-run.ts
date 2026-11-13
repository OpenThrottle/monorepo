/**
 * The backfill's control flow and its plain-text report, separated from
 * `process` so they can be driven from a test: scan, print the counts, and send
 * only when this is not a dry run. `backfill.ts` is the thin entrypoint that
 * feeds it argv and stdio.
 */
import type { HookFetch } from '../../index.ts';
import type { BackfillOptions } from './backfill-args.ts';
import type {
  BackfillPlan,
  BackfillSendResult,
  CountMap,
} from './transcript-backfill.ts';
import {
  resolveBackfillEndpoint,
  scanBackfill,
  sendBackfill,
} from './transcript-backfill.ts';

const table = (counts: CountMap, indent: string): readonly string[] => {
  const entries = Object.entries(counts).sort(([left], [right]) =>
    left.localeCompare(right),
  );
  return entries.length === 0
    ? [`${indent}(none)`]
    : entries.map(([key, count]) => `${indent}${key}  ${count}`);
};

/**
 * The counts a backfill is about to act on. Printed before anything is sent,
 * and the whole output of `--dry-run`.
 *
 * @public
 */
export const formatBackfillPlan = ({
  dryRun,
  plan,
}: {
  dryRun: boolean;
  plan: BackfillPlan;
}): string => {
  const { skills, tokens } = plan;
  const lines = [
    dryRun
      ? 'skill-usage-backfill: DRY RUN, nothing will be sent'
      : 'skill-usage-backfill: about to send',
    `skill window: ${plan.since} (inclusive) to ${plan.until} (exclusive)`,
    `checkouts: ${plan.checkouts.length}; project directories: ${plan.projects.length}; transcript files read: ${plan.files}`,
  ];
  for (const project of plan.projects) {
    const stat = plan.stats[project.slug];
    lines.push(
      `  ${project.slug}  files ${stat?.files ?? 0}  skill events ${stat?.skills ?? 0}  token rows ${stat?.tokens ?? 0}`,
    );
  }
  if (plan.refusedFiles.length > 0) {
    lines.push(
      `refused ${plan.refusedFiles.length} transcript file(s) whose recorded cwd is outside this repository:`,
      ...plan.refusedFiles.map((file) => `  ${file}`),
    );
  }

  lines.push(
    '',
    `skill events to send: ${skills.events.length}`,
    ...table(skills.byPath, '  by path     '),
    `  outside window: ${skills.outsideWindow}; duplicate in transcripts: ${skills.duplicates}; no timestamp: ${skills.noTimestamp}`,
    `  slash commands keyed by line uuid (cannot match a live row): ${skills.keyedByFallback}`,
    '  by day:',
    ...table(skills.byDay, '    '),
    '  by project directory:',
    ...table(skills.byProject, '    '),
    '',
    `token rows to send (one per unique requestId): ${tokens.records.length}`,
    '  by day:',
    ...table(tokens.byDay, '    '),
    '  by project directory:',
    ...table(tokens.byProject, '    '),
  );
  return `${lines.join('\n')}\n`;
};

/**
 * What a send did.
 *
 * @public
 */
export const formatBackfillResult = (result: BackfillSendResult): string => {
  const { skills, tokens } = result;
  return `${[
    `skill events: accepted ${skills.accepted} (new or already present: the server answers with the surviving row), buffered ${skills.buffered}, rejected ${skills.rejected}`,
    `token rows: inserted ${tokens.inserted}, skipped as already present ${tokens.skipped}, buffered ${tokens.buffered}, dead-lettered ${tokens.deadLettered}${tokens.detail === null ? '' : ` (${tokens.detail})`}`,
    skills.buffered + tokens.buffered > 0
      ? 'buffered rows stay in ~/.openthrottle/skill-usage/; run skill-usage-drain.cjs once the server is reachable'
      : 'nothing buffered',
  ].join('\n')}\n`;
};

const pickEndpoint = (
  injected: { authToken: string; graphqlUrl: string } | null | undefined,
  repoRoot: string,
): { authToken: string; graphqlUrl: string } | null => {
  if (injected === undefined) {
    return resolveBackfillEndpoint({ repoRoot });
  }
  return injected;
};

/**
 * Run one backfill and return the process exit code. The plan's counts are
 * written BEFORE any request, so an operator who interrupts has already seen
 * what was about to go out. A dry run returns right after printing them and
 * never builds an endpoint, a request or a buffer file.
 *
 * `endpoint` and `fetchImpl` are injectable for tests; by default the endpoint
 * is resolved like the hooks resolve theirs.
 *
 * @public
 */
export const runBackfill = async ({
  endpoint,
  fetchImpl,
  options,
  stderr,
  stdout,
}: {
  endpoint?: { authToken: string; graphqlUrl: string } | null;
  fetchImpl?: HookFetch;
  options: BackfillOptions;
  stderr: (text: string) => void;
  stdout: (text: string) => void;
}): Promise<number> => {
  const plan = scanBackfill(options);
  stdout(formatBackfillPlan({ dryRun: options.dryRun, plan }));
  if (options.dryRun) {
    return 0;
  }

  const target = pickEndpoint(endpoint, options.repoRoot);
  if (target === null) {
    stderr(
      'no OpenThrottle endpoint to send to (set OPENTHROTTLE_GRAPHQL_URL, and unset OPENTHROTTLE_TELEMETRY_OFFLINE); nothing was sent or buffered\n',
    );
    return 1;
  }

  const result = await sendBackfill({
    ...target,
    fetchImpl,
    plan,
    repoRoot: options.repoRoot,
    timeoutMs: options.timeoutMs,
  });
  stdout(formatBackfillResult(result));
  return 0;
};
