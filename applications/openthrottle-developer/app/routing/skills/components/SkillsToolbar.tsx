import * as React from 'react';
import classnames from 'classnames';
import { Button, Input } from '@openthrottle/react-router-shadcn';
import { PlusIcon } from 'lucide-react';

export interface SkillsToolbarProps {
  className?: string;
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
      <div className="flex gap-2">
        <Input placeholder="Filter by slug, path, or summary" />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </div>

      <div className="flex-1" />

      <Button type="submit" variant="outline">
        <PlusIcon className="size-4" />
      </Button>
    </div>
  );
};
