import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  cmsDatabaseUrl,
  cmsSeedRefusal,
  defaultCmsSeedPath,
} from '../openthrottle-database-seed-cms.ts';

const LOCAL_URL = 'postgresql://u:p@localhost:6010/cms';
const PRIMARY_URL = 'postgresql://u:p@localhost:6010/openthrottle';

describe('cmsDatabaseUrl', () => {
  it('swaps the primary database for cms by default', () => {
    expect(cmsDatabaseUrl(PRIMARY_URL, {})).toBe('postgresql://u:p@localhost:6010/cms'); // prettier-ignore
  });

  it('honours CMS_POSTGRES_DB', () => {
    expect(cmsDatabaseUrl(PRIMARY_URL, { CMS_POSTGRES_DB: 'cms_wt' })).toBe('postgresql://u:p@localhost:6010/cms_wt'); // prettier-ignore
  });

  it('prefers an explicit CMS_POSTGRES_URL', () => {
    const explicit = 'postgresql://x:y@127.0.0.1:7248/other';

    expect(cmsDatabaseUrl(PRIMARY_URL, { CMS_POSTGRES_URL: explicit })).toBe(explicit); // prettier-ignore
  });
});

describe('cmsSeedRefusal', () => {
  it('allows loopback hosts and the compose service name', () => {
    for (const host of ['localhost', '127.0.0.1', '[::1]', 'postgres']) {
      expect(
        cmsSeedRefusal(`postgresql://u:p@${host}:5432/cms`, {}),
      ).toBeUndefined();
    }
  });

  it('refuses NODE_ENV=production even for a local host', () => {
    expect(cmsSeedRefusal(LOCAL_URL, { NODE_ENV: 'production' })).toMatch(/production/); // prettier-ignore
    expect(cmsSeedRefusal(LOCAL_URL, { NODE_ENV: ' Production ' })).toMatch(/production/); // prettier-ignore
  });

  it('refuses a remote host', () => {
    expect(cmsSeedRefusal('postgresql://u:p@10.0.0.5:5432/cms', {})).toMatch(/not local/); // prettier-ignore
    expect(cmsSeedRefusal('postgresql://u:p@db.prod.example.com/cms', {})).toMatch(/not local/); // prettier-ignore
  });

  it('refuses an unparseable connection string', () => {
    expect(cmsSeedRefusal('garbage', {})).toMatch(/not local/);
  });
});

describe('cms seed file', () => {
  const sql = readFileSync(defaultCmsSeedPath(), 'utf-8');
  const code = sql.replace(/^\s*--.*$/gm, '');

  it('lives under databases/cms/seeds, never databases/cms/migrations', () => {
    expect(defaultCmsSeedPath()).toBe(join(process.cwd(), 'databases', 'cms', 'seeds', 'cms.sql')); // prettier-ignore
  });

  it('makes every INSERT a no-op on conflict', () => {
    const inserts = code.match(/INSERT INTO/g) ?? [];
    const guards = code.match(/ON CONFLICT DO NOTHING;/g) ?? [];

    expect(inserts.length).toBeGreaterThan(0);
    expect(guards).toHaveLength(inserts.length);
  });

  it('never uses now()-relative dates', () => {
    expect(code).not.toMatch(/now\(\)|interval/i);
  });

  it('seeds no people: no profiles and no email addresses', () => {
    expect(code).not.toMatch(/INSERT INTO profiles/i);
    expect(sql).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
  });

  it('writes no schemas of its own: fragments use the synced generated ones', () => {
    expect(code).not.toMatch(/INSERT INTO schemas/i);
    expect(code).toMatch(/s\.status = 'ACTIVE'/);
  });

  it('seeds a LayoutGrid container', () => {
    expect(code).toContain("'LayoutGrid'");
  });

  it('seeds the welcome layout', () => {
    expect(code).toContain("'welcome'");
  });
});
