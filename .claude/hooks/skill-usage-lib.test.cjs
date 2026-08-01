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
