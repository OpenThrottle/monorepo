/**
 * Phase 1 unit tests for skill-usage-lib (node:test, no Nx project).
 * Run: node --test .claude/hooks/skill-usage-lib.test.cjs
 */
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { describe, it, before, after } = require('node:test');

const {
  PRIVACY_LEVELS,
  appendJsonl,
  applyPrivacy,
  buildUsageEvent,
  detectScope,
  normalizeHookPayload,
  persistUsageEvent,
  postSkillUsageEvent,
  resolveGraphqlUrl,
  toRecordSkillUsageInput,
} = require('./skill-usage-lib.cjs');

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
    assert.equal(detectScope('engineering:code-review', tmpRoot), 'third-party');
  });

  it('labels skills-lock installs as third-party', () => {
    assert.equal(detectScope('nx-workspace', tmpRoot), 'third-party');
  });

  it('labels unknown names as third-party', () => {
    assert.equal(detectScope('totally-unknown-skill', tmpRoot), 'third-party');
  });
});

describe('normalizeHookPayload', () => {
  it('maps PreToolUse Skill tool_input', () => {
    const normalized = normalizeHookPayload({
      hook_event_name: 'PreToolUse',
      tool_name: 'Skill',
      tool_input: { skill: 'create-readme', args: 'with logo' },
      session_id: 'sess-1',
      cwd: '/tmp/repo',
      tool_use_id: 'toolu_1',
      prompt_id: 'p1',
    });
    assert.deepEqual(normalized, {
      skill_name: 'create-readme',
      args: 'with logo',
      session_id: 'sess-1',
      cwd: '/tmp/repo',
      invocation_path: 'skill_tool',
      tool_use_id: 'toolu_1',
      prompt_id: 'p1',
      hook_event_name: 'PreToolUse',
    });
  });

  it('maps UserPromptExpansion slash_command', () => {
    const normalized = normalizeHookPayload({
      hook_event_name: 'UserPromptExpansion',
      expansion_type: 'slash_command',
      command_name: 'nx-workspace',
      command_args: 'PONG',
      session_id: 'sess-2',
      cwd: '/tmp/repo',
    });
    assert.equal(normalized?.skill_name, 'nx-workspace');
    assert.equal(normalized?.args, 'PONG');
    assert.equal(normalized?.invocation_path, 'slash');
  });

  it('returns null for unrelated payloads', () => {
    assert.equal(normalizeHookPayload({ hook_event_name: 'Stop' }), null);
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

  it('builds a truncated ours event and appends JSONL', () => {
    const normalized = normalizeHookPayload({
      hook_event_name: 'PreToolUse',
      tool_name: 'Skill',
      tool_input: {
        skill: 'ot-plans',
        args: `Bearer secret-token-value ${'z'.repeat(300)}`,
      },
      session_id: 'sess-3',
      cwd: tmpRoot,
    });
    const event = buildUsageEvent({
      gitBranch: 'example-usage-tracking',
      normalized,
      privacyLevel: PRIVACY_LEVELS.TRUNCATED,
      repoRoot: tmpRoot,
      timestamp: '2026-08-01T00:00:00.000Z',
    });

    assert.ok(event);
    assert.equal(event.skill_name, 'ot-plans');
    assert.equal(event.scope, 'ours');
    assert.equal(event.privacy_level, 'truncated');
    assert.equal(event.git_branch, 'example-usage-tracking');
    assert.ok(event.args.includes('[REDACTED]'));
    assert.ok(!event.args.includes('secret-token-value'));
    assert.ok(event.args.length <= 257);

    const jsonlPath = path.join(tmpRoot, '.cache', 'skill-usage', 'events.jsonl');
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
