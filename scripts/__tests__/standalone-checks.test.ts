import { describe, expect, it } from 'vitest';

import { collectRuleViolations } from '../check-agent-assets-ssot.ts';
import type { AssetEntry } from '../check-agent-assets-ssot.ts';
import { parseMode } from '../docker-smoke-test.ts';
import { resolveProjectId } from '../gcs-docker-upload.ts';
import { OLLAMA_MODELS } from '../ollama.ts';
import { snapshotMessage } from '../sync-subtree.ts';
import { classifyAuthSmoke, hasEmbeddingConfig } from '../verify-openthrottle-mcp-env.ts'; // prettier-ignore

const entry = (path: string, overrides: Partial<AssetEntry> = {}): AssetEntry => ({ isSymlink: true, path, targetExists: true, ...overrides }); // prettier-ignore

describe('collectRuleViolations', () => {
  it('passes a clean layout', () => {
    expect(
      collectRuleViolations(
        [entry('.cursor/rules/a.mdc')],
        [entry('.agents/rules/a.mdc', { isSymlink: false })],
      ),
    ).toEqual([]);
  });

  it('flags a regular file in .cursor/rules', () => {
    const violations = collectRuleViolations(
      [entry('.cursor/rules/a.mdc', { isSymlink: false })],
      [],
    );

    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatch(/regular file/);
  });

  it('flags a broken .cursor symlink and a symlinked SSOT body', () => {
    const violations = collectRuleViolations(
      [entry('.cursor/rules/a.mdc', { targetExists: false })],
      [entry('.agents/rules/b.mdc', { isSymlink: true })],
    );

    expect(violations).toHaveLength(2);
    expect(violations[0]).toMatch(/broken symlink/);
    expect(violations[1]).toMatch(/SSOT body/);
  });

  it('exempts the gitignored nx-rules.mdc', () => {
    expect(
      collectRuleViolations(
        [entry('.cursor/rules/nx-rules.mdc', { isSymlink: false })],
        [],
      ),
    ).toEqual([]);
  });
});

describe('classifyAuthSmoke', () => {
  it('rejects any body carrying an errors array (the HTTP-200 trap)', () => {
    expect(
      classifyAuthSmoke(200, '{"errors":[{"path":["listSources"]}],"data":null}'), // prettier-ignore
    ).toBe('rejected');
  });

  it('accepts a real sources payload', () => {
    expect(classifyAuthSmoke(200, '{"data":{"listSources":{"sources":[]}}}')).toBe('ok'); // prettier-ignore
  });

  it('rejects 401/403 and is inconclusive otherwise', () => {
    expect(classifyAuthSmoke(401, '')).toBe('rejected');
    expect(classifyAuthSmoke(403, '')).toBe('rejected');
    expect(classifyAuthSmoke(500, '')).toBe('inconclusive');
  });
});

describe('hasEmbeddingConfig', () => {
  it('accepts either provider key, rejects empties', () => {
    expect(hasEmbeddingConfig({ OPENAI_API_KEY: 'sk-x' })).toBe(true);
    expect(hasEmbeddingConfig({ OLLAMA_BASE_URL: 'http://localhost:11434' })).toBe(true); // prettier-ignore
    expect(hasEmbeddingConfig({ OPENAI_API_KEY: '' })).toBe(false);
    expect(hasEmbeddingConfig({})).toBe(false);
  });
});

describe('parseMode', () => {
  it('defaults to prod and validates the matrix', () => {
    expect(parseMode(undefined)).toBe('prod');
    expect(parseMode('dev')).toBe('dev');
    expect(parseMode('consumer')).toBe('consumer');
    expect(parseMode('bogus')).toBeUndefined();
  });
});

describe('resolveProjectId', () => {
  it('defaults to staging', () => {
    expect(resolveProjectId({})).toEqual({ projectId: 'openthrottle-staging' }); // prettier-ignore
    expect(resolveProjectId({ PRODUCTION: 'false' })).toEqual({ projectId: 'openthrottle-staging' }); // prettier-ignore
  });

  it('refuses production without the explicit confirmation', () => {
    expect(resolveProjectId({ PRODUCTION: 'true' }).error).toMatch(/OPENTHROTTLE_CONFIRM_PRODUCTION/); // prettier-ignore
  });

  it('allows production with confirmation and honors overrides', () => {
    expect(
      resolveProjectId({
        GCP_PROJECT_ID_PRODUCTION: 'custom-prod',
        OPENTHROTTLE_CONFIRM_PRODUCTION: 'yes',
        PRODUCTION: 'TRUE',
      }),
    ).toEqual({ projectId: 'custom-prod' });
  });

  it('rejects garbage PRODUCTION values', () => {
    expect(resolveProjectId({ PRODUCTION: 'maybe' }).error).toMatch(/Invalid PRODUCTION/); // prettier-ignore
  });
});

describe('snapshotMessage', () => {
  it('renders the conventional snapshot commit message', () => {
    expect(snapshotMessage('applications/openthrottle', 'abc1234')).toBe(
      'chore: sync applications/openthrottle from monorepo\n\nSnapshot of applications/openthrottle at monorepo main abc1234.',
    );
  });
});

describe('OLLAMA_MODELS', () => {
  it('keeps at least one model per role', () => {
    expect(OLLAMA_MODELS.chat.length).toBeGreaterThan(0);
    expect(OLLAMA_MODELS.coding.length).toBeGreaterThan(0);
    expect(OLLAMA_MODELS.embedding.length).toBeGreaterThan(0);
  });
});
