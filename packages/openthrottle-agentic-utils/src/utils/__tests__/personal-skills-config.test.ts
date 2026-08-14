import { homedir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  PERSONAL_SKILLS_DIR_ENV,
  PERSONAL_SKILLS_ENABLED_ENV,
  resolvePersonalSkillsDir,
} from '../foreign-skill-injection/index.ts';

describe('resolvePersonalSkillsDir', () => {
  it('is off by default (no env)', () => {
    expect(resolvePersonalSkillsDir({})).toBeUndefined();
  });

  it('stays off when the toggle is a non-truthy value', () => {
    expect(
      resolvePersonalSkillsDir({ [PERSONAL_SKILLS_ENABLED_ENV]: 'false' }),
    ).toBeUndefined();
    expect(
      resolvePersonalSkillsDir({ [PERSONAL_SKILLS_ENABLED_ENV]: '0' }),
    ).toBeUndefined();
  });

  it('defaults to ~/.openthrottle/skills when enabled without an override', () => {
    expect(
      resolvePersonalSkillsDir({ [PERSONAL_SKILLS_ENABLED_ENV]: 'true' }),
    ).toBe(join(homedir(), '.openthrottle', 'skills'));
  });

  it('honors an explicit override when enabled', () => {
    expect(
      resolvePersonalSkillsDir({
        [PERSONAL_SKILLS_DIR_ENV]: '/custom/skills',
        [PERSONAL_SKILLS_ENABLED_ENV]: 'yes',
      }),
    ).toBe('/custom/skills');
  });

  it('ignores an override when the toggle is off', () => {
    expect(
      resolvePersonalSkillsDir({
        [PERSONAL_SKILLS_DIR_ENV]: '/custom/skills',
      }),
    ).toBeUndefined();
  });

  it('accepts assorted truthy spellings case-insensitively', () => {
    for (const value of ['1', 'ON', 'Yes', 'TRUE']) {
      expect(
        resolvePersonalSkillsDir({ [PERSONAL_SKILLS_ENABLED_ENV]: value }),
      ).toBe(join(homedir(), '.openthrottle', 'skills'));
    }
  });
});
