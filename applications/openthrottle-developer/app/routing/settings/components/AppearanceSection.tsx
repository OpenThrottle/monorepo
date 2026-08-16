import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@openthrottle/react-router-shadcn';

export interface AppearanceSectionProps {
  children: React.ReactNode;
  description?: string;
  id: string;
  title: string;
}

/**
 * @description Shared card shell every Settings → Appearance group renders
 * through, so heading treatment and spacing stay consistent as groups are added,
 * reordered, or removed from the `APPEARANCE_SECTIONS` registry.
 */
export const AppearanceSection = (
  props: AppearanceSectionProps,
): React.ReactElement => {
  const { children, description, id, title } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card data-section-id={id} data-testid="AppearanceSection">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description === undefined ? null : (
          <CardDescription>{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-6">{children}</CardContent>
    </Card>
  );
};
