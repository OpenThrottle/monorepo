import * as React from 'react';
import classnames from 'classnames';
import { useSearchParams } from 'react-router';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openthrottle/react-router-shadcn';
import {
  GITHUB_ORGS,
  GITHUB_REPOSITORIES,
  type GithubOrg,
  type GithubRepo,
} from '~/routing/dashboard/config/config.dashboard';
import { parseDashboardGithubParams } from '~/routing/dashboard/utils/parsers';

export interface DashboardToolbarProps {
  className?: string;
}

export const DashboardToolbar = (props: DashboardToolbarProps) => {
  const { className } = props;

  // Hooks
  const [searchParams, setSearchParams] = useSearchParams();
  const { owner, repo } = parseDashboardGithubParams(searchParams);
  const repos = GITHUB_REPOSITORIES[owner];

  // Setup

  // Handlers
  const onChangeOrg = (value: GithubOrg): void => {
    const next = new URLSearchParams(searchParams);
    const nextRepos = GITHUB_REPOSITORIES[value];
    const nextRepo = nextRepos[0] as GithubRepo;

    next.set('owner', value);
    next.set('repo', nextRepo);
    setSearchParams(next, { replace: false });
  };

  const onChangeRepo = (value: GithubRepo): void => {
    const next = new URLSearchParams(searchParams);

    next.set('repo', value);
    setSearchParams(next, { replace: false });
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={classnames('p-4 flex gap-4', className)}
      data-testid="DashboardToolbar"
    >
      <Select onValueChange={onChangeOrg} value={owner}>
        <SelectTrigger>
          <SelectValue placeholder="Organization" />
        </SelectTrigger>
        <SelectContent>
          {GITHUB_ORGS.map((organization) => (
            <SelectItem key={organization} value={organization}>
              {organization}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select onValueChange={onChangeRepo} value={repo}>
        <SelectTrigger>
          <SelectValue placeholder="Select a repo" />
        </SelectTrigger>
        <SelectContent>
          {repos.map((repository) => (
            <SelectItem key={repository} value={repository}>
              {repository}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
