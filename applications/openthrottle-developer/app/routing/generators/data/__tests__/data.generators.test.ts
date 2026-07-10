import { describe, expect, test } from 'vitest';
import {
  GENERATOR_DOCS_AGENT_USAGE,
  GENERATOR_DOCS_AGENTS,
  GENERATOR_DOCS_NX_LOCAL_GENERATORS,
  GENERATOR_DOCS_PERSONAL_GENERATORS,
  GENERATOR_DOCS_TOOLS_PACKAGE_README,
} from '~/routing/generators/constants/generator-nx-docs';
import { generators } from '../data.generators';

function assertIsString(value: unknown): asserts value is string {
  expect(typeof value).toBe('string');
}

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
      const { children } = entry;
      expect(children).toEqual(expect.any(String));
      assertIsString(children);
      expect(children.length).toBeGreaterThan(0);
    }
  });
});
