import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  blogSeedRefusal,
  defaultBlogSeedPath,
  postgresHostname,
} from '../openthrottle-database-seed-blog.ts';

const LOCAL_URL = 'postgresql://u:p@localhost:6010/openthrottle';

describe('postgresHostname', () => {
  it('extracts the host, unwrapping IPv6 brackets', () => {
    expect(postgresHostname('postgresql://u:p@db.example.com:5432/x')).toBe('db.example.com'); // prettier-ignore
    expect(postgresHostname('postgresql://u:p@[::1]:5432/x')).toBe('::1');
  });

  it('returns undefined for an unparseable string', () => {
    expect(postgresHostname('not a url')).toBeUndefined();
  });
});

describe('blogSeedRefusal', () => {
  it('allows loopback hosts and the compose service name', () => {
    for (const host of ['localhost', '127.0.0.1', '[::1]', 'postgres']) {
      expect(
        blogSeedRefusal(`postgresql://u:p@${host}:5432/x`, {}),
      ).toBeUndefined();
    }
  });

  it('refuses NODE_ENV=production even for a local host', () => {
    expect(blogSeedRefusal(LOCAL_URL, { NODE_ENV: 'production' })).toMatch(/production/); // prettier-ignore
    expect(blogSeedRefusal(LOCAL_URL, { NODE_ENV: ' Production ' })).toMatch(/production/); // prettier-ignore
  });

  it('refuses a remote host', () => {
    expect(blogSeedRefusal('postgresql://u:p@10.0.0.5:5432/x', {})).toMatch(/not local/); // prettier-ignore
    expect(blogSeedRefusal('postgresql://u:p@db.prod.example.com/x', {})).toMatch(/not local/); // prettier-ignore
  });

  it('refuses an unparseable connection string', () => {
    expect(blogSeedRefusal('garbage', {})).toMatch(/not local/);
  });
});

describe('blog seed file', () => {
  const sql = readFileSync(defaultBlogSeedPath(), 'utf-8');

  it('lives under databases/seeds, never databases/migrations', () => {
    expect(defaultBlogSeedPath()).toBe(join(process.cwd(), 'databases', 'seeds', 'blog.sql')); // prettier-ignore
  });

  it('upserts by slug and never uses now()-relative dates', () => {
    expect(sql).toContain('ON CONFLICT (slug) DO UPDATE');
    expect(sql).toContain('IS DISTINCT FROM');
    const code = sql.replace(/^\s*--.*$/gm, '');

    expect(code).not.toMatch(/now\(\)|interval/i);
  });
});
