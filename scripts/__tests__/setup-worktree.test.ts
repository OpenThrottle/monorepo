import { describe, expect, it } from 'vitest';

import { portsForBase } from '../lib/worktree-ports.ts';
import {
  firstEnvMatch,
  isSyncableSecret,
  rewritePortsInContent,
  upsertEnvLine,
} from '../setup_worktree.ts';

describe('rewritePortsInContent', () => {
  const ports = portsForBase(7100);

  it('remaps every canonical app port onto the block', () => {
    const input = [
      'OPENTHROTTLE_DEVELOPER_PORT=6020',
      'OPENTHROTTLE_SERVER_PORT=6021',
      'ADMIN=6022 CMS=6023 EMAIL=6024 WEBSITE=6025 MCP=6026',
      'URL=http://localhost:6021/graphql',
    ].join('\n');

    const output = rewritePortsInContent(input, ports);

    expect(output).toContain('OPENTHROTTLE_DEVELOPER_PORT=7100');
    expect(output).toContain('OPENTHROTTLE_SERVER_PORT=7101');
    expect(output).toContain('ADMIN=7102 CMS=7103 EMAIL=7104 WEBSITE=7105 MCP=7106'); // prettier-ignore
    expect(output).toContain('http://localhost:7101/graphql');
  });

  it('leaves Postgres/Redis and larger numbers containing 602x alone', () => {
    const input = 'POSTGRES=6010 REDIS=6011 TTL=604800000 OTHER=16020';

    expect(rewritePortsInContent(input, ports)).toBe(input);
  });

  it('is idempotent (a re-run finds no canonical ports left)', () => {
    const once = rewritePortsInContent('A=6020 B=6026', ports);

    expect(rewritePortsInContent(once, ports)).toBe(once);
  });
});

describe('firstEnvMatch', () => {
  it('returns the FIRST assignment (shell head -n1 semantics)', () => {
    expect(firstEnvMatch('KEY=one\nKEY=two\n', 'KEY')).toBe('one');
  });

  it('returns undefined when absent and ignores prefixed keys', () => {
    expect(firstEnvMatch('OTHER=1\nMY_KEY=2\n', 'KEY')).toBeUndefined();
  });
});

describe('upsertEnvLine', () => {
  it('replaces an existing assignment in place', () => {
    expect(upsertEnvLine('A=1\nKEY=old\nB=2\n', 'KEY', 'new')).toBe(
      'A=1\nKEY=new\nB=2\n',
    );
  });

  it('appends when the key is absent, keeping a clean trailing newline', () => {
    expect(upsertEnvLine('A=1\n', 'KEY', 'v')).toBe('A=1\nKEY=v\n');
    expect(upsertEnvLine('A=1', 'KEY', 'v')).toBe('A=1\nKEY=v\n');
    expect(upsertEnvLine('', 'KEY', 'v')).toBe('KEY=v\n');
  });
});

describe('isSyncableSecret', () => {
  it('rejects empties and placeholder tokens', () => {
    expect(isSyncableSecret(undefined)).toBe(false);
    expect(isSyncableSecret('')).toBe(false);
    expect(isSyncableSecret('ot_sa_xxxxxxxxxxxx')).toBe(false);
  });

  it('accepts a real token', () => {
    expect(isSyncableSecret('ot_sa_1234567890abcdef')).toBe(true);
  });
});
