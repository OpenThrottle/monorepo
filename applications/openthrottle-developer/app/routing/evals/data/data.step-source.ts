import type { BadgeProps } from '@openthrottle/react-router-shadcn';

import { TRAJECTORY_TIMELINE_COPY } from '~/routing/evals/data/data.copy';
import type { AtifStep } from '~/routing/evals/types';

/** The label a timeline step's source badge shows. */
export const STEP_SOURCE_LABEL: Readonly<Record<AtifStep['source'], string>> = {
  agent: TRAJECTORY_TIMELINE_COPY.sourceAgent,
  system: TRAJECTORY_TIMELINE_COPY.sourceSystem,
  user: TRAJECTORY_TIMELINE_COPY.sourceUser,
};

/** The badge color per step source, so user prompts stand out from agent turns. */
export const STEP_SOURCE_BADGE_COLOR: Readonly<
  Record<AtifStep['source'], NonNullable<BadgeProps['color']>>
> = {
  agent: 'default',
  system: 'slate',
  user: 'blue',
};
