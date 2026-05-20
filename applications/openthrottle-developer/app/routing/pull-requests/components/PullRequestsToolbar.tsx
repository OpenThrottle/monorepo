import * as React from 'react';
import classnames from 'classnames';
import { Form, Link } from 'react-router';
import { Button, Input, Label } from '@openthrottle/react-router-shadcn';
import type { PullRequestsListFilters } from '~/routing/pull-requests/types/pull-requests-list-filters';
import { Building2Icon, GitGraphIcon } from 'lucide-react';

interface PullRequestsToolbarProps {
  readonly className?: string;
  readonly filters: PullRequestsListFilters;
}

export const PullRequestsToolbar = (props: PullRequestsToolbarProps) => {
  const { className, filters } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Form
      className={classnames(
        // 'mb-8 flex flex-col gap-4 rounded-lg border border-border p-4',
        'flex flex-col gap-4 w-full',
        className,
      )}
      method="get"
    >
      <div className="flex gap-2 w-full">
        <div className="flex items-center gap-2">
          <Building2Icon className="size-4" />
          <Input
            defaultValue={filters.owner}
            id="pr-filter-owner"
            name="owner"
            placeholder="org or user"
            type="text"
          />
        </div>
        <div className="flex items-center gap-2">
          <GitGraphIcon className="size-4" />
          <Input
            defaultValue={filters.repo}
            id="pr-filter-repo"
            name="repo"
            placeholder="repository name"
            type="text"
          />
        </div>
        <div className="flex items-center gap-2">
          <GitGraphIcon className="size-4" />
          <select
            className="border-input bg-background ring-offset-background flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            defaultValue={filters.state ?? ''}
            id="pr-filter-state"
            name="state"
          >
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="all">All</option>
          </select>
        </div>

        <div className="flex flex-1 justify-end gap-2">
          <Button asChild={true} size="sm" variant="outline">
            <Link to="/pull-requests">Reset</Link>
          </Button>
          <Button size="sm" type="submit" variant="secondary">
            Apply
          </Button>
        </div>
      </div>

      <br />
      <br />
      <br />
      <br />
      <br />
      <br />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex items-center gap-2">
          <Building2Icon className="size-4" />
          <Input
            defaultValue={filters.owner}
            id="pr-filter-owner"
            name="owner"
            placeholder="org or user"
            type="text"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="pr-filter-repo">Repo</Label>
          <Input
            defaultValue={filters.repo}
            id="pr-filter-repo"
            name="repo"
            placeholder="repository name"
            type="text"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="pr-filter-state">State</Label>
          <select
            className="border-input bg-background ring-offset-background flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            defaultValue={filters.state ?? ''}
            id="pr-filter-state"
            name="state"
          >
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="all">All</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="pr-filter-base">Base branch (optional)</Label>
          <Input
            defaultValue={filters.base ?? ''}
            id="pr-filter-base"
            name="base"
            placeholder="e.g. main"
            type="text"
          />
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-1">
          <Label htmlFor="pr-filter-author">Author (optional)</Label>
          <Input
            defaultValue={filters.author ?? ''}
            id="pr-filter-author"
            name="author"
            placeholder="GitHub login"
            type="text"
          />
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input
              className="border-input accent-primary h-4 w-4 rounded"
              defaultChecked={filters.authorExact ?? false}
              // disabled={filters.author === ''}
              name="authorExact"
              type="checkbox"
              value="1"
            />
            Exact login match (when author is set)
          </label>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="pr-filter-merged">Merged (optional)</Label>
          <select
            className="border-input bg-background ring-offset-background flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            defaultValue={
              filters.merged === true
                ? 'true'
                : filters.merged === false
                  ? 'false'
                  : ''
            }
            id="pr-filter-merged"
            name="merged"
          >
            <option value="">Any</option>
            <option value="true">Merged only</option>
            <option value="false">Not merged</option>
          </select>
        </div>
      </div>

      <div className="flex gap-2">
        <Button size="sm" type="submit" variant="default">
          Apply filters
        </Button>
        <Button asChild={true} size="sm" variant="outline">
          <Link to="/pull-requests">Reset</Link>
        </Button>
      </div>
    </Form>
  );
};
