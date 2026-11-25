import { describe, expect, it } from 'vitest';

import { skillNameFromSkillFilePath } from '../skill-file.ts';

describe('skillNameFromSkillFilePath', () => {
  it('returns the parent directory of a SKILL.md', () => {
    expect(skillNameFromSkillFilePath('skills/ot-plans/SKILL.md')).toBe(
      'ot-plans',
    );
    expect(skillNameFromSkillFilePath('/abs/.agents/skills/x/SKILL.md')).toBe(
      'x',
    );
    expect(skillNameFromSkillFilePath('C:\\repo\\skills\\y\\SKILL.md')).toBe(
      'y',
    );
  });

  it('returns null for anything that is not a SKILL.md', () => {
    expect(skillNameFromSkillFilePath('SKILL.md')).toBeNull();
    expect(skillNameFromSkillFilePath('skills/ot-plans/README.md')).toBeNull();
    expect(
      skillNameFromSkillFilePath('skills/ot-plans/SKILL.md.bak'),
    ).toBeNull();
  });
});
