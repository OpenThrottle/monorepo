/**
 * The operator-run backfill: walk THIS repository's Claude Code transcripts and
 * recover what live capture missed — skill invocations inside a time window,
 * and per-request token usage. Two phases so counts exist before anything is
 * written: `scanBackfill` reads transcripts and builds the rows (no network, no
 * writes), `sendBackfill` posts them.
 *
 * Idempotent by construction, not by bookkeeping: every row carries the same
 * server-side idempotency key live capture uses, so a re-run is a no-op.
 *   - tokens: (source, session_id, request_id), one row per unique `requestId`.
 *   - skills: the LIVE `hook_event_name` and the transcript's own `tool_use_id`
 *     (Skill tool) or `prompt_id` + skill (slash command). Reusing the live
 *     event name is the point: the unique index then dedupes a backfilled row
 *     against a live capture of the same invocation, which a distinct event name
 *     would never do. What marks a row as backfilled is `invocation_path`
 *     (`skill_tool:backfill` / `slash:backfill`), which is not part of any key.
 *
 * Reading is bounded: files are consumed in chunks through `readNewBytes`, and
 * only the extracted rows are kept, never the lines.
 */
import fs from 'node:fs';
import path from 'node:path';

import type {
  HookFetch,
  PersistTokenUsageResult,
  TokenUsageRecord,
  UsageEvent,
} from '../../index.ts';
import {
  appendDeadLetters,
  appendJsonl,
  buildUsageEvent,
  defaultJsonlPath,
  persistTokenUsage,
  postSkillUsageEvent,
  readNewBytes,
  resolveAuthToken,
  resolveGraphqlUrl,
} from '../../index.ts';
import { CLAUDE_SOURCE } from './payload.ts';
import { parseTranscriptLines } from './transcript.ts';
import type { OwnedProject } from './transcript-projects.ts';
import {
  resolveCheckouts,
  resolveOwnedProjects,
  transcriptBelongsTo,
} from './transcript-projects.ts';
import type { SkillCandidate } from './transcript-skills.ts';
import {
  createSkillScanState,
  finishSkillScan,
  scanSkillLines,
} from './transcript-skills.ts';
import { listSubagentTranscripts } from './transcript-usage.ts';

/**
 * Appended to `invocation_path` on every backfilled skill row. Not part of any
 * unique key, so it distinguishes backfilled rows without defeating the dedupe
 * against live ones. @public
 */
export const BACKFILL_PATH_SUFFIX = ':backfill';

/** The day live skill capture went dark (OT plan e7b74d81). @public */
export const DEFAULT_BACKFILL_SINCE = '2026-09-23T00:00:00.000Z';

/** Bytes consumed from a transcript per read. */
const CHUNK_BYTES = 8 * 1024 * 1024;

/** Skill events in flight at once. */
const SKILL_CONCURRENCY = 8;

/** A session's main transcript: a top-level `<session id>.jsonl`. */
const MAIN_FILE = /\.jsonl$/;

/** Day-keyed or project-keyed counts, sorted by key when printed. @public */
export type CountMap = Readonly<Record<string, number>>;

/**
 * Per-project tallies.
 *
 * @public
 */
export interface ProjectStats {
  readonly files: number;
  readonly skills: number;
  readonly tokens: number;
}

/**
 * Everything a scan found, ready to print or send.
 *
 * @public
 */
export interface BackfillPlan {
  readonly checkouts: readonly string[];
  readonly files: number;
  readonly projects: readonly OwnedProject[];
  /** Transcript files skipped because their recorded cwd is outside the repo. */
  readonly refusedFiles: readonly string[];
  readonly since: string;
  readonly skills: {
    readonly byDay: CountMap;
    readonly byPath: CountMap;
    readonly byProject: CountMap;
    /** Same invocation seen twice (resumed sessions copy history). */
    readonly duplicates: number;
    readonly events: readonly UsageEvent[];
    /** Slash commands keyed by their line uuid, which cannot match a live row. */
    readonly keyedByFallback: number;
    /** Lines with a missing or unparseable timestamp. */
    readonly noTimestamp: number;
    readonly outsideWindow: number;
  };
  readonly stats: Readonly<Record<string, ProjectStats>>;
  readonly tokens: {
    readonly byDay: CountMap;
    readonly byProject: CountMap;
    readonly records: readonly TokenUsageRecord[];
  };
  readonly until: string;
}

const dayOf = (iso: string): string => iso.slice(0, 10);

const bump = (counts: Record<string, number>, key: string): void => {
  counts[key] = (counts[key] ?? 0) + 1;
};

const listMainTranscripts = (projectDir: string): readonly string[] => {
  try {
    return fs
      .readdirSync(projectDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && MAIN_FILE.test(entry.name))
      .map((entry) => path.join(projectDir, entry.name))
      .sort();
  } catch {
    return [];
  }
};

/** The session a transcript belongs to, from its path alone. */
const sessionIdOf = (filePath: string): string => {
  const { dir, name } = path.parse(filePath);
  return path.basename(dir) === 'subagents'
    ? path.basename(path.dirname(dir))
    : name;
};

const firstCwd = (lines: readonly string[]): string | null => {
  for (const line of lines.slice(0, 200)) {
    if (!line.includes('"cwd"')) {
      continue;
    }
    try {
      const parsed: unknown = JSON.parse(line);
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        'cwd' in parsed &&
        typeof parsed.cwd === 'string' &&
        parsed.cwd !== ''
      ) {
        return parsed.cwd;
      }
    } catch {
      // a truncated line has no cwd worth reading
    }
  }
  return null;
};

interface FileScan {
  readonly candidates: readonly SkillCandidate[];
  readonly records: readonly TokenUsageRecord[];
  readonly refused: boolean;
}

const scanFile = ({
  checkouts,
  filePath,
  seenRequests,
}: {
  checkouts: readonly string[];
  filePath: string;
  seenRequests: Set<string>;
}): FileScan => {
  const fallbackSessionId = sessionIdOf(filePath);
  const state = createSkillScanState();
  const records: TokenUsageRecord[] = [];
  let offset = 0;
  let checked = false;

  for (;;) {
    const { lines, nextOffset } = readNewBytes({
      filePath,
      maxBytes: CHUNK_BYTES,
      offset,
    });
    if (nextOffset === offset) {
      break;
    }
    if (!checked) {
      checked = true;
      if (!transcriptBelongsTo({ checkouts, cwd: firstCwd(lines) })) {
        return { candidates: [], records: [], refused: true };
      }
    }
    records.push(
      ...parseTranscriptLines({
        fallbackSessionId,
        lines,
        seen: seenRequests,
      }),
    );
    scanSkillLines({ fallbackSessionId, lines, state });
    offset = nextOffset;
  }

  return { candidates: finishSkillScan(state), records, refused: false };
};

const dedupeKey = (candidate: SkillCandidate): string => {
  const { normalized } = candidate;
  const head = `${normalized.session_id ?? ''}|${normalized.hook_event_name ?? ''}`;
  return normalized.tool_use_id === undefined
    ? `${head}|${normalized.prompt_id ?? ''}|${normalized.skill_name ?? ''}`
    : `${head}|${normalized.tool_use_id}`;
};

/**
 * Read this repository's transcripts and build the rows a backfill would send.
 * Touches nothing but the transcript files it is allowed to read; sends and
 * writes nothing. Never throws on an unreadable file.
 *
 * @public
 */
export const scanBackfill = ({
  includeWorktrees,
  listWorktrees,
  projectsDir,
  repoRoot,
  since,
  until,
}: {
  includeWorktrees: boolean;
  listWorktrees?: (repoRoot: string) => readonly string[];
  projectsDir: string;
  repoRoot: string;
  since: string;
  until: string;
}): BackfillPlan => {
  const sinceMs = Date.parse(since);
  const untilMs = Date.parse(until);
  const checkouts = resolveCheckouts({
    includeWorktrees,
    listWorktrees,
    repoRoot,
  });
  const projects = resolveOwnedProjects({ checkouts, projectsDir });

  const seenRequests = new Set<string>();
  const seenSkills = new Set<string>();
  const refusedFiles: string[] = [];
  const events: UsageEvent[] = [];
  const records: TokenUsageRecord[] = [];
  const stats: Record<string, ProjectStats> = {};
  const skillDays: Record<string, number> = {};
  const skillPaths: Record<string, number> = {};
  const skillProjects: Record<string, number> = {};
  const tokenDays: Record<string, number> = {};
  const tokenProjects: Record<string, number> = {};
  let duplicates = 0;
  let files = 0;
  let keyedByFallback = 0;
  let noTimestamp = 0;
  let outsideWindow = 0;

  for (const project of projects) {
    let projectFiles = 0;
    let projectSkills = 0;
    let projectTokens = 0;

    const targets = listMainTranscripts(project.dir).flatMap((main) => [
      main,
      ...listSubagentTranscripts(main),
    ]);
    for (const filePath of targets) {
      const scan = scanFile({ checkouts, filePath, seenRequests });
      if (scan.refused) {
        refusedFiles.push(filePath);
        continue;
      }
      files += 1;
      projectFiles += 1;

      for (const record of scan.records) {
        records.push(record);
        projectTokens += 1;
        bump(tokenDays, dayOf(record.occurred_at));
        bump(tokenProjects, project.slug);
      }

      for (const candidate of scan.candidates) {
        const at = Date.parse(candidate.occurredAt);
        if (Number.isNaN(at)) {
          noTimestamp += 1;
          continue;
        }
        if (at < sinceMs || at >= untilMs) {
          outsideWindow += 1;
          continue;
        }
        const key = dedupeKey(candidate);
        if (seenSkills.has(key)) {
          duplicates += 1;
          continue;
        }
        seenSkills.add(key);

        const { normalized } = candidate;
        const invocationPath = `${normalized.invocation_path ?? 'unknown'}${BACKFILL_PATH_SUFFIX}`;
        const event = buildUsageEvent({
          gitBranch: candidate.gitBranch,
          normalized: { ...normalized, invocation_path: invocationPath },
          repoRoot: project.checkout,
          source: CLAUDE_SOURCE,
          timestamp: new Date(at).toISOString(),
        });
        if (event === null) {
          continue;
        }
        events.push(event);
        projectSkills += 1;
        if (candidate.keyedByFallback) {
          keyedByFallback += 1;
        }
        bump(skillDays, dayOf(event.timestamp));
        bump(skillPaths, invocationPath);
        bump(skillProjects, project.slug);
      }
    }
    stats[project.slug] = {
      files: projectFiles,
      skills: projectSkills,
      tokens: projectTokens,
    };
  }

  return {
    checkouts,
    files,
    projects,
    refusedFiles,
    since,
    skills: {
      byDay: skillDays,
      byPath: skillPaths,
      byProject: skillProjects,
      duplicates,
      events,
      keyedByFallback,
      noTimestamp,
      outsideWindow,
    },
    stats,
    tokens: { byDay: tokenDays, byProject: tokenProjects, records },
    until,
  };
};

/**
 * Where a backfill posts to. `null` when there is no endpoint to post to or
 * telemetry is switched offline: a backfill must not quietly turn into a pile
 * of buffered rows, so the caller refuses instead.
 *
 * @public
 */
export const resolveBackfillEndpoint = ({
  authToken,
  graphqlUrl,
  repoRoot,
}: {
  authToken?: string;
  graphqlUrl?: string | null;
  repoRoot: string;
}): { readonly authToken: string; readonly graphqlUrl: string } | null => {
  if (process.env.OPENTHROTTLE_TELEMETRY_OFFLINE === '1') {
    return null;
  }
  const url = graphqlUrl ?? resolveGraphqlUrl(repoRoot);
  if (!url) {
    return null;
  }
  return {
    authToken: authToken ?? resolveAuthToken(repoRoot),
    graphqlUrl: url,
  };
};

/**
 * What a send did. `recordSkillUsage` answers with the surviving row on a
 * conflict, so a skill event the server already had is indistinguishable from a
 * new one from here: `accepted` counts both. The token stream reports true
 * inserted/skipped counts.
 *
 * @public
 */
export interface BackfillSendResult {
  readonly skills: {
    readonly accepted: number;
    readonly buffered: number;
    readonly rejected: number;
  };
  readonly tokens: PersistTokenUsageResult;
}

const sendSkillEvents = async ({
  authToken,
  events,
  fetchImpl,
  graphqlUrl,
  jsonlPath,
  timeoutMs,
}: {
  authToken: string;
  events: readonly UsageEvent[];
  fetchImpl: HookFetch | undefined;
  graphqlUrl: string;
  jsonlPath: string;
  timeoutMs: number;
}): Promise<BackfillSendResult['skills']> => {
  const tally = { accepted: 0, buffered: 0, rejected: 0 };
  let serverDown = false;

  for (let start = 0; start < events.length; start += SKILL_CONCURRENCY) {
    const group = events.slice(start, start + SKILL_CONCURRENCY);
    if (serverDown) {
      for (const event of group) {
        appendJsonl(jsonlPath, event);
        tally.buffered += 1;
      }
      continue;
    }

    // eslint-disable-next-line no-await-in-loop -- bounded groups on purpose: stop contacting a failing server after the first transient failure
    const results = await Promise.all(
      group.map(async (event) => ({
        event,
        result: await postSkillUsageEvent({
          authToken,
          event,
          fetchImpl,
          graphqlUrl,
          timeoutMs,
        }),
      })),
    );
    for (const { event, result } of results) {
      if (result.ok) {
        tally.accepted += 1;
      } else if (result.permanent) {
        // Re-sending can never succeed; keep the evidence, do not retry.
        appendDeadLetters({
          filePath: jsonlPath,
          reason: result.reason,
          records: [event],
        });
        tally.rejected += 1;
      } else {
        serverDown = true;
        appendJsonl(jsonlPath, event);
        tally.buffered += 1;
      }
    }
  }
  return tally;
};

/**
 * Post a plan's rows: skill events one mutation each (bounded concurrency),
 * token rows through `persistTokenUsage` in batches of at most 500. Transient
 * failures buffer to the telemetry directory for `skill-usage-drain`; permanent
 * rejections are dead-lettered. Never reads transcripts.
 *
 * @public
 */
export const sendBackfill = async ({
  authToken,
  fetchImpl,
  graphqlUrl,
  jsonlPath,
  plan,
  repoRoot,
  timeoutMs,
  tokenJsonlPath,
}: {
  authToken: string;
  fetchImpl?: HookFetch;
  graphqlUrl: string;
  jsonlPath?: string;
  plan: BackfillPlan;
  repoRoot: string;
  timeoutMs: number;
  tokenJsonlPath?: string;
}): Promise<BackfillSendResult> => {
  const skills = await sendSkillEvents({
    authToken,
    events: plan.skills.events,
    fetchImpl,
    graphqlUrl,
    jsonlPath: jsonlPath ?? defaultJsonlPath(),
    timeoutMs,
  });
  const tokens = await persistTokenUsage({
    authToken,
    fetchImpl,
    graphqlUrl,
    jsonlPath: tokenJsonlPath,
    records: plan.tokens.records,
    repoRoot,
    timeoutMs,
  });
  return { skills, tokens };
};
