import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import type {
  RuleFormProjectOption,
  RuleFormRepositoryOption,
} from '~/routing/rules/components/RuleForm';
import { RULES_COPY } from '~/routing/rules/data/copy';
import { ANY } from '~/routing/rules/data/rule-form-options';

export interface RuleFormScopeSelectsProps {
  readonly onProjectChange: (projectId: string) => void;
  readonly onRepositoryChange: (repositoryId: string) => void;
  readonly projectId: string;
  readonly projects: RuleFormProjectOption[];
  readonly repositories: RuleFormRepositoryOption[];
  readonly repositoryId: string;
}

/**
 * @description The Repository and Project selects of the rules form's Match
 * fieldset. Each posts a hidden input (blank for Any) and says in a hint that
 * Any matches every value. The two scopes are independent: a rule may name one,
 * both or neither.
 */
export const RuleFormScopeSelects = (
  props: RuleFormScopeSelectsProps,
): React.ReactElement => {
  const {
    onProjectChange,
    onRepositoryChange,
    projectId,
    projects,
    repositories,
    repositoryId,
  } = props;

  // Hooks

  // Setup
  // Select labels render as SelectValue children, so they are present in the SSR markup.
  const selectedRepository = repositories.find(
    (repository) => repository.id === repositoryId,
  );
  const repositoryLabel =
    repositoryId === ANY ? RULES_COPY.anyOption : selectedRepository?.name;
  const selectedProject = projects.find((project) => project.id === projectId);
  const projectLabel =
    projectId === ANY ? RULES_COPY.anyOption : selectedProject?.name;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="space-y-4" data-testid="RuleFormScopeSelects">
      <div className="space-y-1.5">
        <input
          name="repositoryId"
          type="hidden"
          value={repositoryId === ANY ? '' : repositoryId}
        />
        <Label htmlFor="rule-repository">{RULES_COPY.repositoryLabel}</Label>
        <Select onValueChange={onRepositoryChange} value={repositoryId}>
          <SelectTrigger
            aria-label={RULES_COPY.repositoryLabel}
            id="rule-repository"
          >
            <SelectValue>{repositoryLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>{RULES_COPY.anyOption}</SelectItem>
            {repositories.map((repository) => (
              <SelectItem key={repository.id} value={repository.id}>
                {repository.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">
          {RULES_COPY.repositoryAnyHint}
        </p>
      </div>

      <div className="space-y-1.5">
        <input
          name="projectId"
          type="hidden"
          value={projectId === ANY ? '' : projectId}
        />
        <Label htmlFor="rule-project">{RULES_COPY.projectLabel}</Label>
        <Select onValueChange={onProjectChange} value={projectId}>
          <SelectTrigger aria-label={RULES_COPY.projectLabel} id="rule-project">
            <SelectValue>{projectLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>{RULES_COPY.anyOption}</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">
          {RULES_COPY.projectAnyHint}
        </p>
      </div>
    </div>
  );
};
