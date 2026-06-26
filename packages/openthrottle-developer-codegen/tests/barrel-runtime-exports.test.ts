import { describe, expect, it } from 'vitest';
import * as codegen from '../src/index';
import { CustomPromptType } from '../src/index';

/**
 * This package exists to emit GraphQL enums as *runtime* objects (no
 * `enumsAsTypes`) so the openthrottle-developer app can consume them as values.
 * If the codegen config ever regressed to `enumsAsTypes: true`, these symbols
 * would erase to type-only declarations and vanish from the JS barrel, breaking
 * every consumer that reads them at runtime. These assertions are the guard.
 */
describe('openthrottle-developer-codegen barrel', () => {
  it('re-exports CustomPromptType as a runtime value, not just a type', () => {
    expect(typeof CustomPromptType).toBe('object');
    expect(CustomPromptType).toBeDefined();
  });

  it('exposes the expected CustomPromptType members as string values', () => {
    expect(CustomPromptType).toMatchObject({
      Agents: 'AGENTS',
      Commands: 'COMMANDS',
      Personas: 'PERSONAS',
      Prompts: 'PROMPTS',
      Rules: 'RULES',
      Skills: 'SKILLS',
    });
  });

  it('surfaces CustomPromptType through the package barrel entry point', () => {
    expect(codegen.CustomPromptType).toBe(CustomPromptType);
  });
});
