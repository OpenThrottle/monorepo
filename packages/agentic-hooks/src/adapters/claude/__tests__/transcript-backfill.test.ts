/**
 * The backfill end to end, against temp directories, the sanitized transcript
 * fixtures and a fake server that emulates the server's unique indexes. Nothing
 * here reads a real `~/.claude`.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { HookFetch } from '../../../index.ts';
import type { BackfillOptions } from '../backfill-args.ts';
import { runBackfill } from '../backfill-run.ts';
import { BACKFILL_PATH_SUFFIX, scanBackfill } from '../transcript-backfill.ts';
import { claudeProjectSlug } from '../transcript-projects.ts';

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
);

const SESSION = '00000000-0000-4000-8000-000000000001';
const LIVE_SESSION = '00000000-0000-4000-8000-000000000002';
const AGENT_FILE = 'agent-a39ec7aafbeffa589.jsonl';
const URL = 'http://example.test/graphql';
const SINCE = '2026-09-23T00:00:00.000Z';
const UNTIL = '2026-10-29T00:00:00.000Z';

const isRecordValue = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const asRows = (value: unknown): readonly Record<string, unknown>[] =>
  Array.isArray(value) ? value.filter(isRecordValue) : [];

interface FakeServer {
  readonly fetchImpl: HookFetch;
  requests: number;
  /** Skill rows by unique key, as the partial unique indexes would hold them. */
  readonly skills: Map<string, Record<string, unknown>>;
  readonly tokens: Set<string>;
}

const skillKey = (input: Record<string, unknown>): string | null =>
  typeof input.toolUseId === 'string'
    ? `${input.source}|${input.sessionId}|${input.hookEventName}|${input.toolUseId}`
    : typeof input.promptId === 'string'
      ? `${input.source}|${input.sessionId}|${input.hookEventName}|${input.promptId}|${input.skillName}`
      : null;

const fakeServer = (): FakeServer => {
  const skills = new Map<string, Record<string, unknown>>();
  const tokens = new Set<string>();
  const server: FakeServer = {
    fetchImpl: async (_url, init) => {
      server.requests += 1;
      const body: unknown = JSON.parse(init.body);
      const variables =
        isRecordValue(body) && isRecordValue(body.variables)
          ? body.variables
          : {};
      const input = isRecordValue(variables.input) ? variables.input : {};

      if (
        isRecordValue(body) &&
        String(body.query).includes('recordTokenUsage')
      ) {
        let inserted = 0;
        let skipped = 0;
        for (const row of asRows(input.rows)) {
          const key = `${row.source}|${row.sessionId}|${row.requestId}`;
          if (tokens.has(key)) {
            skipped += 1;
          } else {
            tokens.add(key);
            inserted += 1;
          }
        }
        return {
          json: async () => ({
            data: { recordTokenUsage: { inserted, skipped } },
          }),
          ok: true,
          status: 200,
        };
      }

      const key = skillKey(input);
      const surviving = key === null ? undefined : skills.get(key);
      if (surviving === undefined) {
        skills.set(key ?? `unkeyed-${skills.size}`, input);
      }
      return {
        json: async () => ({
          data: {
            recordSkillUsage: {
              id: `row-${skills.size}`,
              skillName: input.skillName,
            },
          },
        }),
        ok: true,
        status: 200,
      };
    },
    requests: 0,
    skills,
    tokens,
  };
  return server;
};

const toolCall = (input: {
  at: string;
  id: string;
  session?: string;
  skill: string;
}): string =>
  JSON.stringify({
    cwd: REPO_PLACEHOLDER,
    gitBranch: 'feat/example',
    message: {
      content: [
        {
          id: input.id,
          input: { skill: input.skill },
          name: 'Skill',
          type: 'tool_use',
        },
      ],
      role: 'assistant',
    },
    sessionId: input.session ?? SESSION,
    timestamp: input.at,
    type: 'assistant',
  });

const slash = (input: {
  at: string;
  name: string;
  promptId: string;
  uuid: string;
}): string =>
  JSON.stringify({
    cwd: REPO_PLACEHOLDER,
    gitBranch: 'feat/example',
    message: {
      content: `<command-message>${input.name}</command-message>\n<command-name>/${input.name}</command-name>\n<command-args></command-args>`,
      role: 'user',
    },
    promptId: input.promptId,
    sessionId: SESSION,
    timestamp: input.at,
    type: 'user',
    uuid: input.uuid,
  });

/** Stand-in swapped for the temp repo path when a transcript is written. */
const REPO_PLACEHOLDER = '__REPO__';

describe('the backfill', () => {
  let tmp: string;
  let repoRoot: string;
  let projectsDir: string;
  let projectDir: string;
  let telemetryDir: string;
  let prevDir: string | undefined;
  let prevOffline: string | undefined;

  const fixture = (name: string): string =>
    fs
      .readFileSync(path.join(fixturesDir, name), 'utf8')
      .replaceAll('"cwd":"/repo"', `"cwd":${JSON.stringify(repoRoot)}`);

  const withRepo = (lines: readonly string[]): string =>
    `${lines.join('\n').replaceAll(JSON.stringify(REPO_PLACEHOLDER), JSON.stringify(repoRoot))}\n`;

  /** The sanitized token fixture, minus its deliberately truncated tail line. */
  const completeFixture = (name: string): string => {
    const raw = fixture(name);
    return raw.slice(0, raw.lastIndexOf('\n') + 1);
  };

  const options = (
    overrides: Partial<BackfillOptions> = {},
  ): BackfillOptions => ({
    dryRun: false,
    includeWorktrees: false,
    projectsDir,
    repoRoot,
    since: SINCE,
    timeoutMs: 500,
    until: UNTIL,
    ...overrides,
  });

  const run = async (
    server: FakeServer,
    overrides: Partial<BackfillOptions> = {},
  ): Promise<{ code: number; err: string; out: string }> => {
    let out = '';
    let err = '';
    const code = await runBackfill({
      endpoint: { authToken: 'tok', graphqlUrl: URL },
      fetchImpl: server.fetchImpl,
      options: options(overrides),
      stderr: (text) => {
        err += text;
      },
      stdout: (text) => {
        out += text;
      },
    });
    return { code, err, out };
  };

  beforeEach(() => {
    tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'backfill-')));
    repoRoot = path.join(tmp, 'work', 'repo');
    fs.mkdirSync(repoRoot, { recursive: true });
    projectsDir = path.join(tmp, 'projects');
    projectDir = path.join(projectsDir, claudeProjectSlug(repoRoot));
    fs.mkdirSync(path.join(projectDir, SESSION, 'subagents'), {
      recursive: true,
    });
    telemetryDir = path.join(tmp, 'telemetry');
    prevDir = process.env.OPENTHROTTLE_TELEMETRY_DIR;
    prevOffline = process.env.OPENTHROTTLE_TELEMETRY_OFFLINE;
    process.env.OPENTHROTTLE_TELEMETRY_DIR = telemetryDir;
    delete process.env.OPENTHROTTLE_TELEMETRY_OFFLINE;

    fs.writeFileSync(
      path.join(projectDir, `${SESSION}.jsonl`),
      completeFixture('transcript.jsonl'),
    );
    fs.writeFileSync(
      path.join(projectDir, SESSION, 'subagents', AGENT_FILE),
      fixture('subagent-transcript.jsonl'),
    );
  });

  afterEach(() => {
    fs.rmSync(tmp, { force: true, recursive: true });
    if (prevDir === undefined) {
      delete process.env.OPENTHROTTLE_TELEMETRY_DIR;
    } else {
      process.env.OPENTHROTTLE_TELEMETRY_DIR = prevDir;
    }
    if (prevOffline === undefined) {
      delete process.env.OPENTHROTTLE_TELEMETRY_OFFLINE;
    } else {
      process.env.OPENTHROTTLE_TELEMETRY_OFFLINE = prevOffline;
    }
  });

  const addSkillTranscript = (lines: readonly string[]): void => {
    fs.writeFileSync(
      path.join(projectDir, `${LIVE_SESSION}.jsonl`),
      withRepo(lines),
    );
  };

  describe('a dry run', () => {
    it('sends and writes nothing, and reports counts per stream, day and project', async () => {
      addSkillTranscript([
        toolCall({
          at: '2026-10-01T10:00:00.000Z',
          id: 'toolu_a',
          skill: 'create-readme',
        }),
        slash({
          at: '2026-10-02T10:00:00.000Z',
          name: 'grilling',
          promptId: 'p1',
          uuid: 'u1',
        }),
      ]);
      const server = fakeServer();
      const { code, out } = await run(server, { dryRun: true });

      expect(code).toBe(0);
      expect(server.requests).toBe(0);
      expect(fs.existsSync(telemetryDir)).toBe(false);
      expect(out).toContain('DRY RUN');
      expect(out).toContain('skill events to send: 2');
      expect(out).toContain('token rows to send (one per unique requestId): 3');
      expect(out).toContain('2026-10-01  1');
      expect(out).toContain('2026-10-02  1');
      expect(out).toContain('2026-10-29  3');
      expect(out).toContain(claudeProjectSlug(repoRoot));
      expect(out).toContain(`skill_tool${BACKFILL_PATH_SUFFIX}  1`);
    });

    it('prints the counts before a real run sends anything', async () => {
      addSkillTranscript([
        toolCall({
          at: '2026-10-01T10:00:00.000Z',
          id: 'toolu_a',
          skill: 'create-readme',
        }),
      ]);
      const server = fakeServer();
      const { out } = await run(server);
      expect(out.indexOf('about to send')).toBeGreaterThanOrEqual(0);
      expect(out.indexOf('about to send')).toBeLessThan(
        out.indexOf('inserted'),
      );
    });
  });

  describe('skill events', () => {
    it('are built from Skill tool calls and slash commands, in the window only', () => {
      addSkillTranscript([
        toolCall({
          at: '2026-09-22T23:59:59.000Z',
          id: 'toolu_before',
          skill: 'early',
        }),
        toolCall({
          at: '2026-09-23T00:00:00.000Z',
          id: 'toolu_edge',
          skill: 'edge',
        }),
        toolCall({
          at: '2026-10-01T10:00:00.000Z',
          id: 'toolu_a',
          skill: 'create-readme',
        }),
        slash({
          at: '2026-10-02T10:00:00.000Z',
          name: 'grilling',
          promptId: 'p1',
          uuid: 'u1',
        }),
        toolCall({
          at: '2026-10-29T00:00:00.000Z',
          id: 'toolu_after',
          skill: 'late',
        }),
      ]);
      const plan = scanBackfill(options());
      expect(
        plan.skills.events.map((event) => event.skill_name).sort(),
      ).toEqual(['create-readme', 'edge', 'grilling']);
      expect(plan.skills.outsideWindow).toBe(2);
      const slashEvent = plan.skills.events.find(
        (event) => event.skill_name === 'grilling',
      );
      expect(slashEvent).toMatchObject({
        hook_event_name: 'UserPromptExpansion',
        invocation_path: `slash${BACKFILL_PATH_SUFFIX}`,
        prompt_id: 'p1',
        source: 'claude-code',
        timestamp: '2026-10-02T10:00:00.000Z',
      });
      expect(
        plan.skills.events.find(
          (event) => event.skill_name === 'create-readme',
        ),
      ).toMatchObject({
        git_branch: 'feat/example',
        hook_event_name: 'PreToolUse',
        invocation_path: `skill_tool${BACKFILL_PATH_SUFFIX}`,
        tool_use_id: 'toolu_a',
      });
    });

    it('count a resumed session that repeats an invocation once', () => {
      const repeated = toolCall({
        at: '2026-10-01T10:00:00.000Z',
        id: 'toolu_a',
        skill: 'create-readme',
      });
      addSkillTranscript([repeated, repeated]);
      const plan = scanBackfill(options());
      expect(plan.skills.events).toHaveLength(1);
      expect(plan.skills.duplicates).toBe(1);
    });

    it('do not double-count an invocation live capture already recorded', async () => {
      addSkillTranscript([
        toolCall({
          at: '2026-10-01T10:00:00.000Z',
          id: 'toolu_live',
          skill: 'create-readme',
        }),
        toolCall({
          at: '2026-10-01T10:05:00.000Z',
          id: 'toolu_missed',
          skill: 'grilling',
        }),
      ]);
      const server = fakeServer();
      // The row the live hook wrote: same event name and tool_use_id, plain path.
      server.skills.set(`claude-code|${SESSION}|PreToolUse|toolu_live`, {
        invocationPath: 'skill_tool',
      });

      await run(server);

      expect(server.skills.size).toBe(2);
      expect(
        server.skills.get(`claude-code|${SESSION}|PreToolUse|toolu_live`),
      ).toEqual({
        invocationPath: 'skill_tool',
      });
      const added = [...server.skills.values()].filter(
        (row) => row.invocationPath === `skill_tool${BACKFILL_PATH_SUFFIX}`,
      );
      expect(added.map((row) => row.toolUseId)).toEqual(['toolu_missed']);
    });
  });

  describe('token rows', () => {
    it('are one per unique requestId across main and subagent transcripts', () => {
      const plan = scanBackfill(options());
      expect(
        plan.tokens.records.map((record) => record.request_id).sort(),
      ).toEqual([
        'req_011CgX32Y1Gy7Y96x6yHPSUS',
        'req_011CgX363EH4ZerFdokkUo5g',
        'req_011CgX4S15DkvVbhqN7exZmg',
      ]);
      expect(
        plan.tokens.records.every((record) => record.source === 'claude-code'),
      ).toBe(true);
    });

    it('are not limited to the skill window', () => {
      const plan = scanBackfill(
        options({
          since: '2030-01-01T00:00:00.000Z',
          until: '2030-01-02T00:00:00.000Z',
        }),
      );
      expect(plan.tokens.records).toHaveLength(3);
      expect(plan.skills.events).toHaveLength(0);
    });
  });

  describe('a second run', () => {
    it('inserts 0 rows against a server that dedupes', async () => {
      addSkillTranscript([
        toolCall({
          at: '2026-10-01T10:00:00.000Z',
          id: 'toolu_a',
          skill: 'create-readme',
        }),
        slash({
          at: '2026-10-02T10:00:00.000Z',
          name: 'grilling',
          promptId: 'p1',
          uuid: 'u1',
        }),
      ]);
      const server = fakeServer();

      const first = await run(server);
      expect(first.out).toContain(
        'token rows: inserted 3, skipped as already present 0',
      );
      const skillRows = server.skills.size;
      const tokenRows = server.tokens.size;
      expect(skillRows).toBe(2);
      expect(tokenRows).toBe(3);

      const second = await run(server);
      expect(second.code).toBe(0);
      expect(second.out).toContain(
        'token rows: inserted 0, skipped as already present 3',
      );
      expect(server.skills.size).toBe(skillRows);
      expect(server.tokens.size).toBe(tokenRows);
    });
  });

  describe('a foreign project', () => {
    const foreignRoot = (): string => path.join(tmp, 'work', 'other-repo');

    it("is never read: only this repo's directory is opened", async () => {
      const foreignDir = path.join(
        projectsDir,
        claudeProjectSlug(foreignRoot()),
      );
      fs.mkdirSync(foreignDir, { recursive: true });
      const foreignText = completeFixture('transcript.jsonl')
        .replaceAll(JSON.stringify(repoRoot), JSON.stringify(foreignRoot()))
        .replaceAll('req_011CgX363EH4ZerFdokkUo5g', 'req_FOREIGN');
      fs.writeFileSync(path.join(foreignDir, `${SESSION}.jsonl`), foreignText);

      const plan = scanBackfill(options());
      expect(plan.projects.map((project) => project.slug)).toEqual([
        claudeProjectSlug(repoRoot),
      ]);
      expect(
        plan.tokens.records.map((record) => record.request_id),
      ).not.toContain('req_FOREIGN');

      const server = fakeServer();
      await run(server);
      expect(
        [...server.tokens].some((key) => key.includes('req_FOREIGN')),
      ).toBe(false);
    });

    it("is refused when it hides in this repo's directory under a colliding slug", () => {
      const rogue = path.join(
        projectDir,
        '99999999-0000-4000-8000-000000000009.jsonl',
      );
      fs.writeFileSync(
        rogue,
        `${JSON.stringify({
          cwd: foreignRoot(),
          message: {
            model: 'claude-opus-5-5',
            usage: { input_tokens: 1, output_tokens: 1 },
          },
          requestId: 'req_COLLIDING',
          sessionId: 'x',
          timestamp: '2026-10-01T00:00:00.000Z',
          type: 'assistant',
        })}\n`,
      );
      const plan = scanBackfill(options());
      expect(plan.refusedFiles).toEqual([rogue]);
      expect(
        plan.tokens.records.map((record) => record.request_id),
      ).not.toContain('req_COLLIDING');
    });

    it('includes a worktree of this repo when git lists it, and nothing else', () => {
      const worktree = path.join(tmp, 'work', 'wt-one');
      const worktreeDir = path.join(projectsDir, claudeProjectSlug(worktree));
      fs.mkdirSync(worktreeDir, { recursive: true });
      fs.writeFileSync(
        path.join(worktreeDir, 'wt-session.jsonl'),
        `${JSON.stringify({
          cwd: worktree,
          message: {
            model: 'claude-opus-5-5',
            usage: { input_tokens: 1, output_tokens: 1 },
          },
          requestId: 'req_WORKTREE',
          sessionId: 'wt-session',
          timestamp: '2026-10-03T00:00:00.000Z',
          type: 'assistant',
        })}\n`,
      );
      const listWorktrees = () => [repoRoot, worktree];

      expect(
        scanBackfill(options({ includeWorktrees: false })).projects,
      ).toHaveLength(1);
      const plan = scanBackfill({
        ...options({ includeWorktrees: true }),
        listWorktrees,
      });
      expect(plan.projects).toHaveLength(2);
      expect(plan.tokens.records.map((record) => record.request_id)).toContain(
        'req_WORKTREE',
      );
    });
  });

  describe('a real run with nowhere to send', () => {
    it('refuses rather than buffering', async () => {
      let err = '';
      const code = await runBackfill({
        endpoint: null,
        options: options(),
        stderr: (text) => {
          err += text;
        },
        stdout: () => {},
      });
      expect(code).toBe(1);
      expect(err).toContain('no OpenThrottle endpoint');
      expect(fs.existsSync(telemetryDir)).toBe(false);
    });
  });
});
