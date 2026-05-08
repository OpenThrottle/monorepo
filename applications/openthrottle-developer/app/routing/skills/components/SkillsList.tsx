import * as React from 'react';
import classnames from 'classnames';
import { SkillsListItem } from '~/routing/skills/components/SkillsListItem';

export interface SkillsListProps {
  readonly className?: string;
}

export const SkillsList = (props: SkillsListProps) => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={classnames('p-4', className)} data-testid="SkillsList">
      <h2>SkillsList</h2>
      <SkillsListItem />
    </div>
  );
};
