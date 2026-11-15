import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import type { LucideIcon } from 'lucide-react';
import * as React from 'react';

export interface UsagePageIntroductionProps {
  readonly children: React.ReactNode;
  readonly className?: string;
  readonly icon: LucideIcon;
  readonly title: string;
}

export const UsagePageIntroduction = (
  props: UsagePageIntroductionProps,
): React.ReactElement => {
  const { children, className, icon, title } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={className} data-testid="UsagePageIntroduction">
      <GlobalHeading className="mb-4" heading="h3" icon={icon} title={title} />
      <p className="text-muted-foreground text-sm">{children}</p>
    </div>
  );
};
