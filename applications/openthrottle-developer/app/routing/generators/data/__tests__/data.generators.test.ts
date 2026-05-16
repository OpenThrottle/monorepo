import { describe, expect, test } from 'vitest';
import {
  GENERATOR_DOCS_AGENT_USAGE,
  GENERATOR_DOCS_AGENTS,
  GENERATOR_DOCS_NX_LOCAL_GENERATORS,
  GENERATOR_DOCS_PERSONAL_GENERATORS,
  GENERATOR_DOCS_TOOLS_PACKAGE_README,
} from '~/routing/generators/constants/generator-nx-docs';
import { generators } from '../data.generators';

describe('generators data', () => {
  test('lists documentation links in a stable order with canonical targets', () => {
    expect(generators).toHaveLength(5);

    const hrefs = generators.map((g) => (typeof g.to === 'string' ? g.to : ''));

    expect(hrefs[0]).toBe(GENERATOR_DOCS_NX_LOCAL_GENERATORS);
    expect(hrefs[1]).toBe(GENERATOR_DOCS_TOOLS_PACKAGE_README);
    expect(hrefs[2]).toBe(GENERATOR_DOCS_PERSONAL_GENERATORS);
    expect(hrefs[3]).toBe(GENERATOR_DOCS_AGENTS);
    expect(hrefs[4]).toBe(GENERATOR_DOCS_AGENT_USAGE);
  });

  test('each entry has link text for the UI', () => {
    for (const entry of generators) {
      expect(entry.children).toEqual(expect.any(String));
      expect((entry.children as string).length).toBeGreaterThan(0);
    }
  });
});
