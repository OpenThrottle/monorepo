import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';

import {
  GetSkillDetailUsageDocument,
  GetUsageSkillUsageDocument,
} from '~/__generated__/graphql';
import { SKILL_USAGE_RANGE_DAYS } from '~/routing/skills/config/skill-usage';
import type {
  SkillDetailUsageData,
  SkillsIndexUsageData,
} from '~/routing/skills/types';
import { toSkillDetailUsageData } from '~/routing/skills/utils/toSkillDetailUsageData';
import { toSkillsIndexUsageData } from '~/routing/skills/utils/toSkillsIndexUsageData';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * @description Fixed trailing usage window as YYYY-MM-DD strings, matching the
 * /usage contract.
 */
export const getSkillUsageWindow = (
  now: Date = new Date(),
): { readonly end: string; readonly start: string } => {
  const start = new Date(now.getTime() - SKILL_USAGE_RANGE_DAYS * DAY_MS);

  return {
    end: now.toISOString().slice(0, 10),
    start: start.toISOString().slice(0, 10),
  };
};

/**
 * @description Aggregate usage over the fixed window (all skills, no
 * scope/branch/cwd filter). `skillUsage` is guarded by SETTINGS_READ; any
 * failure resolves to the unavailable sentinel so the route still renders 200.
 * Callers stream the returned promise unawaited (RR8 Single Fetch).
 */
export const loadSkillsIndexUsage = async (
  request: Request,
): Promise<SkillsIndexUsageData> => {
  const { end, start } = getSkillUsageWindow();

  try {
    const { skillUsage } = await executeGraphqlWithAuth(
      request,
      GetUsageSkillUsageDocument,
      {
        cwd: null,
        end,
        gitBranch: null,
        scope: null,
        start,
      },
    );

    return toSkillsIndexUsageData(skillUsage);
  } catch {
    return { available: false };
  }
};

/**
 * @description Per-skill usage over the fixed window; same failure contract as
 * {@link loadSkillsIndexUsage}.
 */
export const loadSkillDetailUsage = async (
  request: Request,
  skillName: string,
): Promise<SkillDetailUsageData> => {
  const { end, start } = getSkillUsageWindow();

  try {
    const { skillUsage } = await executeGraphqlWithAuth(
      request,
      GetSkillDetailUsageDocument,
      {
        end,
        skillName,
        start,
      },
    );

    return toSkillDetailUsageData(skillUsage);
  } catch {
    return { available: false };
  }
};
