/**
 * Unit tests for the tool-neutral skill-usage core (node:test, no Nx project).
 * Run: node --test .agents/hooks/skill-usage/lib.test.cjs
 */
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { describe, it, before, after } = require('node:test');

const {
  PRIVACY_LEVELS,
  SKILL_USAGE_OUTCOMES,
  appendJsonl,
  applyPrivacy,
  buildOutcomeEvent,
  buildUsageEvent,
  completeOpenStartsForSession,
  detectScope,
  drainBufferedUsage,
  drainJsonlFile,
  drainStartsForSession,
  listStartsForSession,
  persistOutcomeEvent,
  persistUsageEvent,
  postSkillUsageEvent,
  postSkillUsageOutcome,
  recordSkillStart,
  resolveGraphqlUrl,
  startCorrelationKey,
  startsFilePathForSession,
  sweepAbandonedStarts,
  toRecordSkillUsageInput,
  toRecordSkillUsageOutcomeInput,
} = require('./lib.cjs');

describe('applyPrivacy', () => {
  it('name-only returns null', () => {
    assert.equal(applyPrivacy(PRIVACY_LEVELS.NAME_ONLY, 'hello world'), null);
  });

  it('truncated caps length and appends ellipsis', () => {
    const long = 'a'.repeat(300);
    const out = applyPrivacy(PRIVACY_LEVELS.TRUNCATED, long, { maxLen: 256 });
    assert.equal(out.length, 257);
    assert.ok(out.endsWith('…'));
    assert.equal(out.slice(0, 256), 'a'.repeat(256));
  });

  it('truncated redacts bearer tokens', () => {
    const out = applyPrivacy(
      PRIVACY_LEVELS.TRUNCATED,
      'Authorization: Bearer abcdefghijklmnop',
    );
    assert.ok(out.includes('[REDACTED]'));
    assert.ok(!out.includes('abcdefghijklmnop'));
  });

  it('full keeps long args but still redacts secrets', () => {
    const long = `prefix sk-${'x'.repeat(40)} ${'y'.repeat(300)}`;
    const out = applyPrivacy(PRIVACY_LEVELS.FULL, long);
    assert.ok(out.includes('[REDACTED]'));
    assert.ok(out.includes('prefix'));
    assert.ok(out.includes('y'.repeat(300)));
    assert.ok(out.length > 256);
    assert.ok(!out.includes(`sk-${'x'.repeat(40)}`));
  });

  it('stringifies object args', () => {
    const out = applyPrivacy(PRIVACY_LEVELS.TRUNCATED, { foo: 'bar' });
    assert.equal(out, '{"foo":"bar"}');
  });
});

describe('detectScope', () => {
  /** @type {string} */
  let tmpRoot;

  before(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-usage-scope-'));
    fs.mkdirSync(path.join(tmpRoot, 'skills', 'ot-plans'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpRoot, 'skills-lock.json'),
      JSON.stringify({
        version: 1,
        skills: { 'nx-workspace': { source: 'nrwl/nx' } },
      }),
    );
  });

  after(() => {
    fs.rmSync(tmpRoot, { force: true, recursive: true });
  });

  it('labels skills/ directory as ours', () => {
    assert.equal(detectScope('ot-plans', tmpRoot), 'ours');
  });

  it('labels plugin-namespaced names as third-party', () => {
    assert.equal(detectScope('vercel:deploy', tmpRoot), 'third-party');
    assert.equal(
      detectScope('engineering:code-review', tmpRoot),
      'third-party',
    );
  });

  it('labels skills-lock installs as third-party', () => {
    assert.equal(detectScope('nx-workspace', tmpRoot), 'third-party');
  });

  it('labels unknown names as third-party', () => {
    assert.equal(detectScope('totally-unknown-skill', tmpRoot), 'third-party');
  });
});

describe('buildUsageEvent + appendJsonl', () => {
  /** @type {string} */
  let tmpRoot;

  before(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-usage-event-'));
    fs.mkdirSync(path.join(tmpRoot, 'skills', 'ot-plans'), { recursive: true });
  });

  after(() => {
    fs.rmSync(tmpRoot, { force: true, recursive: true });
  });

  it('builds a truncated ours event, stamps source, and appends JSONL', () => {
    const normalized = {
      skill_name: 'ot-plans',
      args: `Bearer secret-token-value ${'z'.repeat(300)}`,
      session_id: 'sess-3',
      cwd: tmpRoot,
      invocation_path: 'skill_tool',
    };
    const event = buildUsageEvent({
      gitBranch: 'example-usage-tracking',
      normalized,
      privacyLevel: PRIVACY_LEVELS.TRUNCATED,
      repoRoot: tmpRoot,
      source: 'claude-code',
      timestamp: '2026-08-01T00:00:00.000Z',
    });

    assert.ok(event);
    assert.equal(event.skill_name, 'ot-plans');
    assert.equal(event.source, 'claude-code');
    assert.equal(event.scope, 'ours');
    assert.equal(event.privacy_level, 'truncated');
    assert.equal(event.git_branch, 'example-usage-tracking');
    assert.ok(event.args.includes('[REDACTED]'));
    assert.ok(!event.args.includes('secret-token-value'));
    assert.ok(event.args.length <= 257);

    const jsonlPath = path.join(
      tmpRoot,
      '.cache',
      'skill-usage',
      'events.jsonl',
    );
    appendJsonl(jsonlPath, event);
    appendJsonl(jsonlPath, { ...event, skill_name: 'second' });

    const lines = fs
      .readFileSync(jsonlPath, 'utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    assert.equal(lines.length, 2);
    assert.equal(lines[0].skill_name, 'ot-plans');
    assert.equal(lines[1].skill_name, 'second');
  });
});

describe('toRecordSkillUsageInput', () => {
  it('maps snake_case JSONL event to camelCase GraphQL input', () => {
    assert.deepEqual(
      toRecordSkillUsageInput({
        timestamp: '2026-08-01T00:00:00.000Z',
        source: 'claude-code',
        skill_name: 'ot-plans',
        args: 'hello',
        session_id: 'sess',
        cwd: '/tmp',
        git_branch: 'main',
        scope: 'ours',
        invocation_path: 'skill_tool',
        privacy_level: 'truncated',
        hook_event_name: 'PreToolUse',
        agent_id: 'a1',
        agent_type: 'general-purpose',
        tool_use_id: 't1',
        prompt_id: 'p1',
      }),
      {
        agentId: 'a1',
        agentType: 'general-purpose',
        args: 'hello',
        cwd: '/tmp',
        gitBranch: 'main',
        hookEventName: 'PreToolUse',
        invocationPath: 'skill_tool',
        occurredAt: '2026-08-01T00:00:00.000Z',
        privacyLevel: 'truncated',
        promptId: 'p1',
        scope: 'ours',
        sessionId: 'sess',
        skillName: 'ot-plans',
        source: 'claude-code',
        toolUseId: 't1',
      },
    );
  });
});

describe('resolveGraphqlUrl', () => {
  /** @type {string} */
  let tmpRoot;
  const prev = {
    GRAPHQL: process.env.OPENTHROTTLE_GRAPHQL_URL,
    WORKER: process.env.OPENTHROTTLE_WORKER_GRAPHQL_URL,
    APP: process.env.OPENTHROTTLE_SERVER_APP_URL,
    SKILL: process.env.SKILL_USAGE_GRAPHQL_URL,
  };

  before(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-usage-url-'));
    fs.writeFileSync(
      path.join(tmpRoot, '.env'),
      'OPENTHROTTLE_SERVER_APP_URL="http://localhost:7231"\n',
    );
  });

  after(() => {
    fs.rmSync(tmpRoot, { force: true, recursive: true });
    for (const [key, envKey] of [
      ['GRAPHQL', 'OPENTHROTTLE_GRAPHQL_URL'],
      ['WORKER', 'OPENTHROTTLE_WORKER_GRAPHQL_URL'],
      ['APP', 'OPENTHROTTLE_SERVER_APP_URL'],
      ['SKILL', 'SKILL_USAGE_GRAPHQL_URL'],
    ]) {
      if (prev[key] === undefined) {
        delete process.env[envKey];
      } else {
        process.env[envKey] = prev[key];
      }
    }
  });

  it('prefers worktree .env APP_URL over stale process.env', () => {
    delete process.env.OPENTHROTTLE_GRAPHQL_URL;
    delete process.env.OPENTHROTTLE_WORKER_GRAPHQL_URL;
    delete process.env.SKILL_USAGE_GRAPHQL_URL;
    process.env.OPENTHROTTLE_SERVER_APP_URL = 'http://localhost:6021';
    assert.equal(resolveGraphqlUrl(tmpRoot), 'http://localhost:7231/graphql');
  });

  it('SKILL_USAGE_GRAPHQL_URL overrides .env', () => {
    process.env.SKILL_USAGE_GRAPHQL_URL = 'http://localhost:9/graphql';
    assert.equal(resolveGraphqlUrl(tmpRoot), 'http://localhost:9/graphql');
  });
});

describe('postSkillUsageEvent + persistUsageEvent', () => {
  /** @type {string} */
  let tmpRoot;
  /** @type {string} */
  let jsonlPath;

  before(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-usage-persist-'));
    jsonlPath = path.join(tmpRoot, 'events.jsonl');
  });

  after(() => {
    fs.rmSync(tmpRoot, { force: true, recursive: true });
  });

  const sampleEvent = {
    timestamp: '2026-08-01T00:00:00.000Z',
    skill_name: 'ot-plans',
    args: 'ping',
    session_id: 'sess-p',
    cwd: '/tmp',
    git_branch: 'example-usage-tracking',
    scope: 'ours',
    invocation_path: 'skill_tool',
    privacy_level: 'truncated',
    hook_event_name: 'PreToolUse',
  };

  it('posts successfully and returns server id', async () => {
    const fetchImpl = async (_url, init) => {
      const body = JSON.parse(init.body);
      assert.equal(body.variables.input.skillName, 'ot-plans');
      assert.equal(body.variables.input.occurredAt, sampleEvent.timestamp);
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            data: { recordSkillUsage: { id: 'evt-1', skillName: 'ot-plans' } },
          };
        },
      };
    };

    const result = await postSkillUsageEvent({
      event: sampleEvent,
      fetchImpl,
      graphqlUrl: 'http://example.test/graphql',
      authToken: 'tok',
      timeoutMs: 200,
    });
    assert.deepEqual(result, { ok: true, id: 'evt-1' });
  });

  it('persistUsageEvent uses server sink on success (no JSONL)', async () => {
    const fetchImpl = async () => ({
      ok: true,
      status: 200,
      async json() {
        return {
          data: { recordSkillUsage: { id: 'evt-2', skillName: 'ot-plans' } },
        };
      },
    });

    const result = await persistUsageEvent({
      authToken: 'tok',
      event: sampleEvent,
      fetchImpl,
      graphqlUrl: 'http://example.test/graphql',
      jsonlPath,
      repoRoot: tmpRoot,
      timeoutMs: 200,
    });

    assert.equal(result.sink, 'server');
    assert.equal(result.id, 'evt-2');
    assert.equal(fs.existsSync(jsonlPath), false);
  });

  it('falls back to JSONL when fetch fails', async () => {
    const offlinePath = path.join(tmpRoot, 'offline.jsonl');
    const fetchImpl = async () => {
      throw new Error('ECONNREFUSED');
    };

    const result = await persistUsageEvent({
      event: sampleEvent,
      fetchImpl,
      graphqlUrl: 'http://127.0.0.1:1/graphql',
      jsonlPath: offlinePath,
      repoRoot: tmpRoot,
      timeoutMs: 50,
    });

    assert.equal(result.sink, 'jsonl');
    assert.match(result.detail || '', /ECONNREFUSED/);
    const line = JSON.parse(fs.readFileSync(offlinePath, 'utf8').trim());
    assert.equal(line.skill_name, 'ot-plans');
  });

  it('falls back to JSONL when GraphQL returns errors', async () => {
    const errPath = path.join(tmpRoot, 'gql-err.jsonl');
    const fetchImpl = async () => ({
      ok: true,
      status: 200,
      async json() {
        return { errors: [{ message: 'Unauthorized' }] };
      },
    });

    const result = await persistUsageEvent({
      event: sampleEvent,
      fetchImpl,
      graphqlUrl: 'http://example.test/graphql',
      jsonlPath: errPath,
      repoRoot: tmpRoot,
      timeoutMs: 200,
    });

    assert.equal(result.sink, 'jsonl');
    assert.match(result.detail || '', /Unauthorized/);
    assert.ok(fs.existsSync(errPath));
  });

  it('SKILL_USAGE_DISABLE_SERVER forces JSONL without calling fetch', async () => {
    const forcedPath = path.join(tmpRoot, 'forced.jsonl');
    let called = false;
    const prev = process.env.SKILL_USAGE_DISABLE_SERVER;
    process.env.SKILL_USAGE_DISABLE_SERVER = '1';
    try {
      const result = await persistUsageEvent({
        event: sampleEvent,
        fetchImpl: async () => {
          called = true;
          throw new Error('should not run');
        },
        jsonlPath: forcedPath,
        repoRoot: tmpRoot,
      });
      assert.equal(result.sink, 'jsonl');
      assert.equal(called, false);
      assert.ok(fs.existsSync(forcedPath));
    } finally {
      if (prev === undefined) {
        delete process.env.SKILL_USAGE_DISABLE_SERVER;
      } else {
        process.env.SKILL_USAGE_DISABLE_SERVER = prev;
      }
    }
  });
});

describe('buildOutcomeEvent', () => {
  let tmpRoot;
  before(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-outcome-'));
    fs.mkdirSync(path.join(tmpRoot, 'skills', 'ot-plans'), { recursive: true });
  });
  after(() => {
    fs.rmSync(tmpRoot, { force: true, recursive: true });
  });

  it('builds an ours-scoped outcome correlated by session + skill', () => {
    const event = buildOutcomeEvent({
      durationMs: 4200.6,
      outcome: SKILL_USAGE_OUTCOMES.SUCCESS,
      repoRoot: tmpRoot,
      sessionId: 'sess-1',
      skillName: 'ot-plans',
      timestamp: '2026-08-01T12:00:00.000Z',
      toolUseId: 'tool-1',
    });
    assert.equal(event.skill_name, 'ot-plans');
    assert.equal(event.session_id, 'sess-1');
    assert.equal(event.tool_use_id, 'tool-1');
    assert.equal(event.outcome, 'success');
    assert.equal(event.duration_ms, 4201);
    assert.equal(event.scope, 'ours');
    assert.equal(event.event_kind, 'outcome');
  });

  it('rejects invalid outcome values', () => {
    assert.equal(
      buildOutcomeEvent({
        outcome: 'done',
        repoRoot: tmpRoot,
        skillName: 'ot-plans',
      }),
      null,
    );
  });
});

describe('toRecordSkillUsageOutcomeInput / persistOutcomeEvent', () => {
  let tmpRoot;
  let jsonlPath;
  before(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-outcome-post-'));
    jsonlPath = path.join(tmpRoot, 'outcomes.jsonl');
  });
  after(() => {
    fs.rmSync(tmpRoot, { force: true, recursive: true });
  });

  const sampleOutcome = {
    timestamp: '2026-08-01T12:00:00.000Z',
    skill_name: 'ot-plans',
    session_id: 'sess-1',
    tool_use_id: 'tool-1',
    outcome: 'success',
    duration_ms: 4200,
    cwd: '/tmp',
    git_branch: 'example-usage-tracking',
    scope: 'ours',
    event_kind: 'outcome',
  };

  it('maps snake_case outcome event to GraphQL input', () => {
    assert.deepEqual(toRecordSkillUsageOutcomeInput(sampleOutcome), {
      cwd: '/tmp',
      durationMs: 4200,
      gitBranch: 'example-usage-tracking',
      occurredAt: '2026-08-01T12:00:00.000Z',
      outcome: 'success',
      scope: 'ours',
      sessionId: 'sess-1',
      skillName: 'ot-plans',
      toolUseId: 'tool-1',
    });
  });

  it('posts successfully and returns server id', async () => {
    const fetchImpl = async (_url, init) => {
      const body = JSON.parse(init.body);
      assert.equal(body.variables.input.skillName, 'ot-plans');
      assert.equal(body.variables.input.outcome, 'success');
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            data: {
              recordSkillUsageOutcome: {
                id: 'out-1',
                outcome: 'success',
                skillName: 'ot-plans',
              },
            },
          };
        },
      };
    };

    const result = await postSkillUsageOutcome({
      authToken: 'tok',
      event: sampleOutcome,
      fetchImpl,
      graphqlUrl: 'http://example.test/graphql',
      timeoutMs: 200,
    });
    assert.deepEqual(result, { ok: true, id: 'out-1' });
  });

  it('falls back to outcomes JSONL when fetch fails', async () => {
    const result = await persistOutcomeEvent({
      event: sampleOutcome,
      fetchImpl: async () => {
        throw new Error('ECONNREFUSED');
      },
      graphqlUrl: 'http://127.0.0.1:1/graphql',
      jsonlPath,
      repoRoot: tmpRoot,
      timeoutMs: 50,
    });

    assert.equal(result.sink, 'jsonl');
    const line = JSON.parse(fs.readFileSync(jsonlPath, 'utf8').trim());
    assert.equal(line.event_kind, 'outcome');
    assert.equal(line.skill_name, 'ot-plans');
  });
});

describe('start-correlation store', () => {
  let startsDir;
  before(() => {
    startsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-starts-'));
  });
  after(() => {
    fs.rmSync(startsDir, { force: true, recursive: true });
  });

  it('records a start (identifiers + timestamp only, no args)', () => {
    const res = recordSkillStart({
      repoRoot: startsDir,
      scope: 'ours',
      sessionId: 'sess-A',
      skillName: 'ot-plans',
      startedAt: '2026-08-01T00:00:00.000Z',
      startsDir,
      toolUseId: 'toolu_1',
    });
    assert.equal(res.ok, true);

    const entries = listStartsForSession({
      repoRoot: startsDir,
      sessionId: 'sess-A',
      startsDir,
    });
    assert.equal(entries.length, 1);
    assert.deepEqual(entries[0], {
      scope: 'ours',
      session_id: 'sess-A',
      skill_name: 'ot-plans',
      started_at: '2026-08-01T00:00:00.000Z',
      tool_use_id: 'toolu_1',
    });
    // Privacy: no args key ever persisted here.
    assert.equal('args' in entries[0], false);
  });

  it('skips (does not error) when session_id is missing', () => {
    const res = recordSkillStart({
      repoRoot: startsDir,
      sessionId: null,
      skillName: 'ot-plans',
      startsDir,
    });
    assert.equal(res.ok, false);
    assert.match(res.reason, /missing session_id/);
  });

  it('lists [] for an unknown session and skips malformed lines', () => {
    assert.deepEqual(
      listStartsForSession({
        repoRoot: startsDir,
        sessionId: 'nope',
        startsDir,
      }),
      [],
    );

    const filePath = startsFilePathForSession(startsDir, 'sess-malformed');
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(
      filePath,
      `{"session_id":"sess-malformed","skill_name":"a","started_at":"t","tool_use_id":null}\nnot-json\n`,
      'utf8',
    );
    const entries = listStartsForSession({
      repoRoot: startsDir,
      sessionId: 'sess-malformed',
      startsDir,
    });
    assert.equal(entries.length, 1);
    assert.equal(entries[0].skill_name, 'a');
  });

  it('startCorrelationKey prefers tool_use_id, falls back to started_at', () => {
    assert.equal(
      startCorrelationKey({
        session_id: 's',
        skill_name: 'k',
        started_at: 't',
        tool_use_id: 'tid',
      }),
      's::k::tid',
    );
    assert.equal(
      startCorrelationKey({
        session_id: 's',
        skill_name: 'k',
        started_at: 't',
        tool_use_id: null,
      }),
      's::k::t',
    );
  });

  it('drains only resolved keys, retaining the rest, then unlinks when empty', () => {
    const sessionId = 'sess-drain';
    recordSkillStart({
      repoRoot: startsDir,
      sessionId,
      skillName: 'alpha',
      startedAt: 't1',
      startsDir,
      toolUseId: 'tu-1',
    });
    recordSkillStart({
      repoRoot: startsDir,
      sessionId,
      skillName: 'beta',
      startedAt: 't2',
      startsDir,
      toolUseId: 'tu-2',
    });

    const drained = drainStartsForSession({
      repoRoot: startsDir,
      resolvedKeys: new Set([`${sessionId}::alpha::tu-1`]),
      sessionId,
      startsDir,
    });
    assert.equal(drained, 1);

    const remaining = listStartsForSession({
      repoRoot: startsDir,
      sessionId,
      startsDir,
    });
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].skill_name, 'beta');

    // Draining all (no resolvedKeys) removes the file entirely.
    const drainedAll = drainStartsForSession({
      repoRoot: startsDir,
      sessionId,
      startsDir,
    });
    assert.equal(drainedAll, 1);
    assert.equal(fs.existsSync(startsFilePathForSession(startsDir, sessionId)), false);
    assert.equal(
      drainStartsForSession({ repoRoot: startsDir, sessionId, startsDir }),
      0,
    );
  });
});

describe('completeOpenStartsForSession', () => {
  let tmpRoot;
  let startsDir;
  before(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-complete-'));
    fs.mkdirSync(path.join(tmpRoot, 'skills', 'ot-plans'), { recursive: true });
    startsDir = path.join(tmpRoot, 'starts');
  });
  after(() => {
    fs.rmSync(tmpRoot, { force: true, recursive: true });
  });

  /** A fetchImpl that records posted outcome inputs and returns a server id. */
  const recordingFetch = (sink) => async (_url, init) => {
    const body = JSON.parse(init.body);
    sink.push(body.variables.input);
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          data: { recordSkillUsageOutcome: { id: `out-${sink.length}` } },
        };
      },
    };
  };

  it('emits one success outcome per open start with computed duration, then drains', async () => {
    const sessionId = 'sess-complete';
    recordSkillStart({
      repoRoot: tmpRoot,
      scope: 'ours',
      sessionId,
      skillName: 'ot-plans',
      startedAt: '2026-08-01T00:00:00.000Z',
      startsDir,
      toolUseId: 'tu-a',
    });
    recordSkillStart({
      repoRoot: tmpRoot,
      scope: 'ours',
      sessionId,
      skillName: 'create-readme',
      startedAt: '2026-08-01T00:00:03.000Z',
      startsDir,
      toolUseId: 'tu-b',
    });

    const posted = [];
    const res = await completeOpenStartsForSession({
      fetchImpl: recordingFetch(posted),
      finishedAt: '2026-08-01T00:00:05.000Z',
      graphqlUrl: 'http://example.test/graphql',
      repoRoot: tmpRoot,
      sessionId,
      startsDir,
    });

    assert.equal(res.resolved, 2);
    assert.equal(posted.length, 2);
    const bySkill = Object.fromEntries(posted.map((p) => [p.skillName, p]));
    assert.equal(bySkill['ot-plans'].outcome, 'success');
    assert.equal(bySkill['ot-plans'].durationMs, 5000);
    assert.equal(bySkill['ot-plans'].sessionId, sessionId);
    assert.equal(bySkill['ot-plans'].toolUseId, 'tu-a');
    assert.equal(bySkill['create-readme'].durationMs, 2000);

    // Drained → a repeated Stop fire is a no-op (no double emit).
    assert.deepEqual(
      listStartsForSession({ repoRoot: tmpRoot, sessionId, startsDir }),
      [],
    );
    const posted2 = [];
    const res2 = await completeOpenStartsForSession({
      fetchImpl: recordingFetch(posted2),
      graphqlUrl: 'http://example.test/graphql',
      repoRoot: tmpRoot,
      sessionId,
      startsDir,
    });
    assert.equal(res2.resolved, 0);
    assert.equal(posted2.length, 0);
  });

  it('dedupes duplicate correlation lines (same key emits once)', async () => {
    const sessionId = 'sess-dupe';
    for (let i = 0; i < 3; i += 1) {
      recordSkillStart({
        repoRoot: tmpRoot,
        sessionId,
        skillName: 'ot-plans',
        startedAt: '2026-08-01T00:00:00.000Z',
        startsDir,
        toolUseId: 'tu-dupe',
      });
    }
    const posted = [];
    const res = await completeOpenStartsForSession({
      fetchImpl: recordingFetch(posted),
      finishedAt: '2026-08-01T00:00:01.000Z',
      graphqlUrl: 'http://example.test/graphql',
      repoRoot: tmpRoot,
      sessionId,
      startsDir,
    });
    assert.equal(res.resolved, 1);
    assert.equal(posted.length, 1);
  });

  it('falls back to outcomes JSONL when the server is down, still draining starts', async () => {
    const sessionId = 'sess-offline';
    recordSkillStart({
      repoRoot: tmpRoot,
      sessionId,
      skillName: 'ot-plans',
      startedAt: '2026-08-01T00:00:00.000Z',
      startsDir,
      toolUseId: 'tu-off',
    });
    const jsonlPath = path.join(tmpRoot, 'offline-outcomes.jsonl');
    const res = await completeOpenStartsForSession({
      fetchImpl: async () => {
        throw new Error('ECONNREFUSED');
      },
      finishedAt: '2026-08-01T00:00:02.000Z',
      graphqlUrl: 'http://127.0.0.1:1/graphql',
      jsonlPath,
      repoRoot: tmpRoot,
      sessionId,
      startsDir,
      timeoutMs: 50,
    });
    assert.equal(res.resolved, 1);
    assert.equal(res.results[0].sink, 'jsonl');
    const line = JSON.parse(fs.readFileSync(jsonlPath, 'utf8').trim());
    assert.equal(line.outcome, 'success');
    assert.equal(line.duration_ms, 2000);
    assert.deepEqual(
      listStartsForSession({ repoRoot: tmpRoot, sessionId, startsDir }),
      [],
    );
  });
});

describe('sweepAbandonedStarts', () => {
  let tmpRoot;
  let startsDir;
  before(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-abandoned-'));
    fs.mkdirSync(path.join(tmpRoot, 'skills', 'ot-plans'), { recursive: true });
    startsDir = path.join(tmpRoot, 'starts');
  });
  after(() => {
    fs.rmSync(tmpRoot, { force: true, recursive: true });
  });

  it('emits abandoned for stale foreign sessions, skips current + fresh files', async () => {
    const now = Date.parse('2026-08-02T00:00:00.000Z');
    const maxAgeMs = 6 * 60 * 60 * 1000;

    // Stale foreign session (mtime 1 day old) → should be swept.
    recordSkillStart({
      repoRoot: tmpRoot,
      sessionId: 'sess-stale',
      skillName: 'ot-plans',
      startedAt: '2026-08-01T00:00:00.000Z',
      startsDir,
      toolUseId: 'tu-stale',
    });
    const stalePath = startsFilePathForSession(startsDir, 'sess-stale');
    const oldMs = now - 24 * 60 * 60 * 1000;
    fs.utimesSync(stalePath, new Date(oldMs), new Date(oldMs));

    // Current session → must NOT be swept even if old.
    recordSkillStart({
      repoRoot: tmpRoot,
      sessionId: 'sess-current',
      skillName: 'ot-plans',
      startedAt: '2026-08-01T00:00:00.000Z',
      startsDir,
      toolUseId: 'tu-cur',
    });
    fs.utimesSync(
      startsFilePathForSession(startsDir, 'sess-current'),
      new Date(oldMs),
      new Date(oldMs),
    );

    // Fresh foreign session → within window, must NOT be swept.
    recordSkillStart({
      repoRoot: tmpRoot,
      sessionId: 'sess-fresh',
      skillName: 'ot-plans',
      startedAt: '2026-08-01T23:59:00.000Z',
      startsDir,
      toolUseId: 'tu-fresh',
    });
    const freshMs = now - 60 * 1000;
    fs.utimesSync(
      startsFilePathForSession(startsDir, 'sess-fresh'),
      new Date(freshMs),
      new Date(freshMs),
    );

    const posted = [];
    const fetchImpl = async (_url, init) => {
      posted.push(JSON.parse(init.body).variables.input);
      return {
        ok: true,
        status: 200,
        async json() {
          return { data: { recordSkillUsageOutcome: { id: 'a-1' } } };
        },
      };
    };

    const res = await sweepAbandonedStarts({
      currentSessionId: 'sess-current',
      fetchImpl,
      graphqlUrl: 'http://example.test/graphql',
      maxAgeMs,
      now,
      repoRoot: tmpRoot,
      startsDir,
    });

    assert.equal(res.swept, 1);
    assert.equal(posted.length, 1);
    assert.equal(posted[0].outcome, 'abandoned');
    assert.equal(posted[0].skillName, 'ot-plans');
    assert.equal(posted[0].durationMs, undefined); // null duration → omitted

    // Stale file removed; current + fresh retained.
    assert.equal(fs.existsSync(stalePath), false);
    assert.equal(
      fs.existsSync(startsFilePathForSession(startsDir, 'sess-current')),
      true,
    );
    assert.equal(
      fs.existsSync(startsFilePathForSession(startsDir, 'sess-fresh')),
      true,
    );
  });
});

describe('drainJsonlFile', () => {
  let tmpRoot;
  before(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-drain-'));
  });
  after(() => {
    fs.rmSync(tmpRoot, { force: true, recursive: true });
  });

  const seed = (name, lines) => {
    const p = path.join(tmpRoot, name);
    fs.writeFileSync(p, lines.map((l) => `${l}\n`).join(''), 'utf8');
    return p;
  };
  const readLines = (p) =>
    fs.existsSync(p)
      ? fs
          .readFileSync(p, 'utf8')
          .split('\n')
          .filter((l) => l.trim())
      : [];

  it('sends every line and removes the file on full success', async () => {
    const filePath = seed('ok.jsonl', ['{"a":1}', '{"a":2}']);
    const res = await drainJsonlFile({
      filePath,
      post: async () => ({ ok: true }),
    });
    assert.deepEqual(res, { retained: 0, sent: 2, skipped: 0 });
    assert.equal(fs.existsSync(filePath), false);
  });

  it('retains everything when the server is down (nothing lost)', async () => {
    const filePath = seed('down.jsonl', ['{"a":1}', '{"a":2}']);
    const res = await drainJsonlFile({
      filePath,
      post: async () => ({ ok: false, reason: 'timeout' }),
    });
    assert.deepEqual(res, { retained: 2, sent: 0, skipped: 0 });
    assert.deepEqual(readLines(filePath), ['{"a":1}', '{"a":2}']);
  });

  it('retains only the failed lines on partial success', async () => {
    const filePath = seed('partial.jsonl', ['{"a":1}', '{"a":2}', '{"a":3}']);
    const res = await drainJsonlFile({
      filePath,
      // Succeed for a===1, fail otherwise.
      post: async (event) => ({ ok: event.a === 1 }),
    });
    assert.equal(res.sent, 1);
    assert.equal(res.retained, 2);
    assert.deepEqual(readLines(filePath).map((l) => JSON.parse(l).a).sort(), [
      2, 3,
    ]);
  });

  it('skips (drops) malformed lines, logs, and is not fatal', async () => {
    const filePath = seed('malformed.jsonl', ['{"a":1}', 'not-json', '{"a":2}']);
    const res = await drainJsonlFile({
      filePath,
      post: async () => ({ ok: true }),
    });
    assert.equal(res.sent, 2);
    assert.equal(res.skipped, 1);
    assert.equal(res.retained, 0);
    assert.equal(fs.existsSync(filePath), false);
  });

  it('honors the deadline, retaining not-yet-posted lines', async () => {
    const filePath = seed('deadline.jsonl', ['{"a":1}', '{"a":2}']);
    let posted = 0;
    const res = await drainJsonlFile({
      // Deadline already passed → post is never called.
      deadlineMs: 1000,
      filePath,
      nowFn: () => 2000,
      post: async () => {
        posted += 1;
        return { ok: true };
      },
    });
    assert.equal(posted, 0);
    assert.equal(res.sent, 0);
    assert.equal(res.retained, 2);
    assert.deepEqual(readLines(filePath), ['{"a":1}', '{"a":2}']);
  });

  it('returns zeros when the file does not exist', async () => {
    const res = await drainJsonlFile({
      filePath: path.join(tmpRoot, 'missing.jsonl'),
      post: async () => ({ ok: true }),
    });
    assert.deepEqual(res, { retained: 0, sent: 0, skipped: 0 });
  });
});

describe('drainBufferedUsage', () => {
  let tmpRoot;
  before(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-drainall-'));
  });
  after(() => {
    fs.rmSync(tmpRoot, { force: true, recursive: true });
  });

  it('drains both events + outcomes via the right mutations', async () => {
    const eventsPath = path.join(tmpRoot, 'events.jsonl');
    const outcomesPath = path.join(tmpRoot, 'outcomes.jsonl');
    fs.writeFileSync(
      eventsPath,
      `${JSON.stringify({ occurredAt: 't', scope: 'ours', skill_name: 'ot-plans', timestamp: 't' })}\n`,
      'utf8',
    );
    fs.writeFileSync(
      outcomesPath,
      `${JSON.stringify({ outcome: 'success', skill_name: 'ot-plans', timestamp: 't' })}\n`,
      'utf8',
    );

    const seenMutations = [];
    const fetchImpl = async (_url, init) => {
      const body = JSON.parse(init.body);
      const isOutcome = body.query.includes('recordSkillUsageOutcome');
      seenMutations.push(isOutcome ? 'outcome' : 'usage');
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            data: isOutcome
              ? { recordSkillUsageOutcome: { id: 'o1' } }
              : { recordSkillUsage: { id: 'e1' } },
          };
        },
      };
    };

    const res = await drainBufferedUsage({
      eventsPath,
      fetchImpl,
      graphqlUrl: 'http://example.test/graphql',
      outcomesPath,
      repoRoot: tmpRoot,
    });

    assert.equal(res.events.sent, 1);
    assert.equal(res.outcomes.sent, 1);
    assert.deepEqual(seenMutations.sort(), ['outcome', 'usage']);
    assert.equal(fs.existsSync(eventsPath), false);
    assert.equal(fs.existsSync(outcomesPath), false);
  });

  it('is a no-op when SKILL_USAGE_DISABLE_SERVER=1 (buffer left intact)', async () => {
    const eventsPath = path.join(tmpRoot, 'events-disabled.jsonl');
    fs.writeFileSync(eventsPath, `${JSON.stringify({ a: 1 })}\n`, 'utf8');
    const prev = process.env.SKILL_USAGE_DISABLE_SERVER;
    process.env.SKILL_USAGE_DISABLE_SERVER = '1';
    try {
      const res = await drainBufferedUsage({
        eventsPath,
        fetchImpl: async () => {
          throw new Error('should not be called');
        },
        graphqlUrl: 'http://example.test/graphql',
        repoRoot: tmpRoot,
      });
      assert.equal(res.events.sent, 0);
      assert.equal(fs.existsSync(eventsPath), true);
    } finally {
      if (prev === undefined) {
        delete process.env.SKILL_USAGE_DISABLE_SERVER;
      } else {
        process.env.SKILL_USAGE_DISABLE_SERVER = prev;
      }
    }
  });
});
