import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import {
  SKILL_USAGE_COPY,
  SKILL_USAGE_TELEMETRY_SCOPE_DOC_HREF,
} from '~/routing/usage/data/data.skill-usage-copy';

export interface SkillUsageNotMeasuredProps {
  readonly className: string | undefined;
  /** Why nobody measured this metric; surfaced as the hover title. */
  readonly title: string;
}

/**
 * @description The quiet empty state for an outcome or duration no skill ever
 * reported. Most rows land here, so it is muted text that links to the
 * telemetry scope doc rather than a badge or a bare dash.
 */
export const SkillUsageNotMeasured = (
  props: SkillUsageNotMeasuredProps,
): React.ReactElement => {
  const { className, title } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <a
      className={cn(
        'text-muted-foreground hover:text-foreground text-xs font-normal underline decoration-dotted underline-offset-2',
        className,
      )}
      data-testid="skill-usage-not-measured"
      href={SKILL_USAGE_TELEMETRY_SCOPE_DOC_HREF}
      rel="noopener noreferrer"
      target="_blank"
      title={title}
    >
      {SKILL_USAGE_COPY.notMeasured}
    </a>
  );
};
