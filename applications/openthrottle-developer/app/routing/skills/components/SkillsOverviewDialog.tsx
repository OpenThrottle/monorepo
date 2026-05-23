import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@openthrottle/react-router-shadcn';
import { AgentsSkillsRegistry } from '~/routing/agents/components/AgentsSkillsRegistry';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';

export interface SkillsOverviewDialogProps {
  children: React.ReactNode;
  entries?: RepoSkillEntry[];
}

export const SkillsOverviewDialog = (
  props: SkillsOverviewDialogProps,
): React.ReactElement => {
  const { children, entries } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Dialog>
      <DialogTrigger className="cursor-help">{children}</DialogTrigger>
      <DialogContent>
        <AgentsSkillsRegistry entries={entries} />
      </DialogContent>
    </Dialog>
  );
};
