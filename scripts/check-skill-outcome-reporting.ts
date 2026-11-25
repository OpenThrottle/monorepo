/**
 * @description Fails when an OpenThrottle-owned skill (`skills/<name>/SKILL.md`)
 * neither reports its outcome nor says it deliberately does not.
 *
 * Outcome and duration on `/skills` exist only when a skill runs the
 * `skill-usage-outcome.cjs` reporter itself: no hook can tell how a skill's
 * work went (docs/monorepo/skill-usage-telemetry-scope.md). A skill that
 * forgets shows "Not measured" forever and nobody notices, so every owned skill
 * must do one of two things:
 *
 * - call the reporter with `--skill <its own name>`, or
 * - declare `outcome-telemetry: 'none'` under `metadata` in its frontmatter,
 *   for a skill with no finish line of its own (a convention reference read
 *   partway through other work).
 *
 * Vendored skills under `.agents/skills/` are out of scope: we do not edit them.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createLogger } from './utils/logger.ts';

const logger = createLogger();

/** The frontmatter declaration for a skill that deliberately does not report. */
export const OPT_OUT_LINE = `outcome-telemetry: 'none'`;

const REPORTER = 'skill-usage-outcome.cjs';

export const SKILL_OUTCOME_STATUS = {
  MISSING: 'missing',
  OPTED_OUT: 'opted-out',
  REPORTS: 'reports',
  WRONG_NAME: 'wrong-name',
} as const;

export type SkillOutcomeStatusKey = keyof typeof SKILL_OUTCOME_STATUS;
export type SkillOutcomeStatusValue =
  (typeof SKILL_OUTCOME_STATUS)[SkillOutcomeStatusKey];

export interface SkillOutcomeReport {
  readonly name: string;
  readonly status: SkillOutcomeStatusValue;
}

/**
 * @description The frontmatter block of a SKILL.md (between the first two
 * `---` lines), or an empty string when it has none.
 */
const frontmatterOf = (text: string): string => {
  const match = /^---\n([\s\S]*?)\n---/.exec(text);
  return match?.[1] ?? '';
};

/** Classify one skill's SKILL.md text. */
export const classifySkill = (
  name: string,
  text: string,
): SkillOutcomeReport => {
  const optedOut = frontmatterOf(text)
    .split('\n')
    .some((line) => line.trim() === OPT_OUT_LINE);
  if (optedOut) {
    return { name, status: SKILL_OUTCOME_STATUS.OPTED_OUT };
  }
  if (!text.includes(REPORTER)) {
    return { name, status: SKILL_OUTCOME_STATUS.MISSING };
  }
  if (!text.includes(`--skill ${name} `)) {
    return { name, status: SKILL_OUTCOME_STATUS.WRONG_NAME };
  }
  return { name, status: SKILL_OUTCOME_STATUS.REPORTS };
};

/** Classify every `skills/<name>/SKILL.md` under `repoRoot`, sorted by name. */
export const classifySkills = (repoRoot: string): SkillOutcomeReport[] => {
  const skillsDir = join(repoRoot, 'skills');
  if (!existsSync(skillsDir)) {
    return [];
  }
  return readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(skillsDir, entry.name, 'SKILL.md'))
    .filter((path) => existsSync(path))
    .map((path) => {
      const name = path.split('/').at(-2) ?? '';
      return classifySkill(name, readFileSync(path, 'utf8'));
    })
    .sort((a, b) => a.name.localeCompare(b.name));
};

export const main = (repoRoot: string = process.cwd()): number => {
  const reports = classifySkills(repoRoot);
  const failing = reports.filter((report) => {
    return (
      report.status === SKILL_OUTCOME_STATUS.MISSING ||
      report.status === SKILL_OUTCOME_STATUS.WRONG_NAME
    );
  });

  if (failing.length === 0) {
    const optedOut = reports.filter((report) => {
      return report.status === SKILL_OUTCOME_STATUS.OPTED_OUT;
    });
    logger.success(`Skill outcome reporting: ${reports.length - optedOut.length} report, ${optedOut.length} opted out`); // prettier-ignore
    return 0;
  }

  logger.fail(`${failing.length} skill(s) neither report an outcome nor opt out:`); // prettier-ignore
  for (const report of failing) {
    const isWrongName = report.status === SKILL_OUTCOME_STATUS.WRONG_NAME;
    const why = isWrongName ? `calls ${REPORTER} without --skill ${report.name}` : `never calls ${REPORTER}`; // prettier-ignore
    logger.info(`  skills/${report.name}/SKILL.md: ${why}`);
  }
  logger.blank();
  logger.info(`Report from the step that confirms the skill's work (see the ot-skill-guide skill), or, for a skill with no finish line, add ${OPT_OUT_LINE} under metadata.`); // prettier-ignore

  return 1;
};

if (process.argv[1]?.endsWith('check-skill-outcome-reporting.ts')) {
  process.exit(main());
}
