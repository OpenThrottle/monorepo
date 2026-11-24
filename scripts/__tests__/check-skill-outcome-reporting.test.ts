import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  classifySkill,
  classifySkills,
  main,
  OPT_OUT_LINE,
  SKILL_OUTCOME_STATUS,
} from '../check-skill-outcome-reporting.ts';

const reporterLine = (name: string): string => {
  return `r="$(command -v skill-usage-outcome.cjs)"; node "$r" --skill ${name} --outcome success`;
};

const skillText = ({
  body,
  metadata,
}: {
  readonly body: string;
  readonly metadata: string;
}): string => {
  return `---\nname: x\nmetadata:\n  author: openthrottle\n${metadata}---\n\n${body}\n`;
};

describe('classifySkill', () => {
  describe('when the skill calls the reporter with its own name', () => {
    it('reports', () => {
      const text = skillText({ body: reporterLine('ot-plans'), metadata: '' });

      expect(classifySkill('ot-plans', text).status).toBe(
        SKILL_OUTCOME_STATUS.REPORTS,
      );
    });
  });

  describe('when the skill calls the reporter with another name', () => {
    it('is the wrong name', () => {
      const text = skillText({ body: reporterLine('ot-loop'), metadata: '' });

      expect(classifySkill('ot-plans', text).status).toBe(
        SKILL_OUTCOME_STATUS.WRONG_NAME,
      );
    });
  });

  describe('when the frontmatter declares the opt-out', () => {
    it('is opted out', () => {
      const text = skillText({ body: 'Conventions.', metadata: `  ${OPT_OUT_LINE}\n` }); // prettier-ignore

      expect(classifySkill('ot-stack', text).status).toBe(
        SKILL_OUTCOME_STATUS.OPTED_OUT,
      );
    });
  });

  describe('when the opt-out line appears only in the body', () => {
    it('is missing', () => {
      const text = skillText({ body: OPT_OUT_LINE, metadata: '' });

      expect(classifySkill('ot-stack', text).status).toBe(
        SKILL_OUTCOME_STATUS.MISSING,
      );
    });
  });

  describe('when the skill neither reports nor opts out', () => {
    it('is missing', () => {
      const text = skillText({ body: 'Just guidance.', metadata: '' });

      expect(classifySkill('ot-folders', text).status).toBe(
        SKILL_OUTCOME_STATUS.MISSING,
      );
    });
  });
});

describe('main', () => {
  let repoRoot: string;

  const writeSkill = (name: string, text: string): void => {
    mkdirSync(join(repoRoot, 'skills', name), { recursive: true });
    writeFileSync(join(repoRoot, 'skills', name, 'SKILL.md'), text);
  };

  beforeEach(() => {
    repoRoot = mkdtempSync(join(tmpdir(), 'ot-skill-outcome-'));
    writeSkill('ot-stack', skillText({ body: 'x', metadata: `  ${OPT_OUT_LINE}\n` })); // prettier-ignore
    writeSkill('ot-plans', skillText({ body: reporterLine('ot-plans'), metadata: '' })); // prettier-ignore
  });

  afterEach(() => {
    rmSync(repoRoot, { force: true, recursive: true });
  });

  it('passes when every skill reports or opts out', () => {
    expect(main(repoRoot)).toBe(0);
  });

  it('fails when a skill neither reports nor opts out', () => {
    writeSkill('ot-folders', skillText({ body: 'x', metadata: '' }));

    expect(main(repoRoot)).toBe(1);
    expect(classifySkills(repoRoot).map((report) => report.name)).toStrictEqual(
      ['ot-folders', 'ot-plans', 'ot-stack'],
    );
  });

  it('passes a repo with no skills directory', () => {
    rmSync(join(repoRoot, 'skills'), { force: true, recursive: true });

    expect(main(repoRoot)).toBe(0);
  });
});
