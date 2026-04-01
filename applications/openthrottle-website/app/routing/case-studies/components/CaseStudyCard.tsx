import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
} from '@openthrottle/react-router-shadcn';
import classnames from 'classnames';
import type { CaseStudyListItem } from '../types';

export interface CaseStudyCardProps {
  readonly className?: string;
  readonly item: CaseStudyListItem;
}

export const CaseStudyCard = (props: CaseStudyCardProps) => {
  const { className, item } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card
      className={cn(
        'h-full overflow-hidden bg-card border-border transition-colors hover:bg-card/80',
        classnames(className),
      )}
      data-testid="CaseStudyCard"
    >
      <CardHeader className="space-y-2">
        <CardTitle className="text-xl">{item.title}</CardTitle>
        <CardDescription>
          {item.company}
          {item.tags && item.tags.length > 0 && (
            <span className="ml-2 text-muted-foreground">
              · {item.tags.join(', ')}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground line-clamp-3">{item.excerpt}</p>
      </CardContent>
    </Card>
  );
};
