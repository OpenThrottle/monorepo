import * as React from 'react';
import classnames from 'classnames';
import { Button, Input } from '@openthrottle/react-router-shadcn';

export interface SkillsToolbarProps {
  readonly className?: string;
}

export const SkillsToolbar = (props: SkillsToolbarProps) => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={classnames('flex gap-2', className)}
      data-testid="SkillsToolbar"
    >
      <Input placeholder="Filter by slug, path, or summary" />
      <Button type="submit" variant="outline">
        Search
      </Button>
    </div>
  );
};
