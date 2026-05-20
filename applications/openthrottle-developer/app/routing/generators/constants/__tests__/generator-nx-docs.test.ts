import { describe, expect, test } from 'vitest';
import {
  GENERATOR_DOCS_AGENT_USAGE,
  GENERATOR_DOCS_AGENTS,
  GENERATOR_DOCS_NX_LOCAL_GENERATORS,
  GENERATOR_DOCS_PERSONAL_GENERATORS,
  GENERATOR_DOCS_TOOLS_PACKAGE_README,
} from '../generator-nx-docs';

describe('generator-nx-docs', () => {
  test('exports stable GitHub and nx.dev URLs', () => {
    const urls = [
      GENERATOR_DOCS_AGENT_USAGE,
      GENERATOR_DOCS_AGENTS,
      GENERATOR_DOCS_NX_LOCAL_GENERATORS,
      GENERATOR_DOCS_PERSONAL_GENERATORS,
      GENERATOR_DOCS_TOOLS_PACKAGE_README,
    ];

    for (const url of urls) {
      expect(url).toMatch(/^https:\/\//);
    }

    expect(GENERATOR_DOCS_NX_LOCAL_GENERATORS).toContain('nx.dev');
    expect(GENERATOR_DOCS_TOOLS_PACKAGE_README).toContain(
      'github.com/OpenThrottle/monorepo',
    );
  });
});
