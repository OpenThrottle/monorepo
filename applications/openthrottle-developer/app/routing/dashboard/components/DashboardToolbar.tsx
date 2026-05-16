import * as React from 'react';
import classnames from 'classnames';
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
  GithubOrg,
  GithubRepo,
} from '~/routing/dashboard/config/config.dashboard';

export interface DashboardToolbarProps {
  readonly className?: string;
}

export const DashboardToolbar = (props: DashboardToolbarProps) => {
  const { className } = props;

  const defaultOrg: GithubOrg = 'openthrottle';
  const defaultRepos: GithubRepo[] = GITHUB_REPOSITORIES[defaultOrg];
  const defaultRepo: GithubRepo = defaultRepos[0];

  // Hooks
  const [orgs, setOrgs] = React.useState<GithubOrg>(defaultOrg);
  const [repo, setRepo] = React.useState<string>(defaultRepo);
  const [repos, setRepos] = React.useState<string[]>(defaultRepos);

  // Setup

  // Handlers
  const onChangeOrg = (value: GithubOrg) => {
    setOrgs(value);
    setRepos(GITHUB_REPOSITORIES[value]);
    setRepo(GITHUB_REPOSITORIES[value][0]);
  };

  const onChangeRepo = (value: GithubOrg) => {
    // setOrgs(value);
    setRepo(value);
    // setRepos(GITHUB_REPOSITORIES[value]);
    // setRepo(GITHUB_REPOSITORIES[value][0]);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={classnames('p-4 flex gap-4', className)}
      data-testid="DashboardToolbar"
    >
      <Select onValueChange={onChangeOrg} value={orgs}>
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
