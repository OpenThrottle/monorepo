import * as React from 'react';
import classnames from 'classnames';
import { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';

export interface SkillsTableProps {
  readonly className?: string;
  readonly entries?: readonly RepoSkillEntry[];
}

export const SkillsTable = (props: SkillsTableProps) => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={classnames('p-4', className)} data-testid="SkillsTable">
      <h2>SkillsTable</h2>
    </div>
  );
};
