import {
  Badge,
  cn,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@openthrottle/react-router-shadcn';
import {
  GlobalHeading,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { FlaskConicalIcon } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router';

import type { EvalRunListRowFragment } from '~/__generated__/graphql';
import { EVAL_RUNS_COPY } from '~/routing/evals/data/data.copy';
import {
  describeRunConfig,
  formatEvalTimestamp,
} from '~/routing/evals/utils/report-format';

export interface EvalRunsDataset {
  readonly id: string;
  readonly name: string;
  readonly runs: readonly EvalRunListRowFragment[];
  readonly version: number;
}

export interface EvalRunsRepository {
  readonly displayName: string;
  readonly id: string;
}

export interface EvalRunsRouteProps {
  readonly className?: string;
  /** Null until a repository is picked. */
  readonly datasets: readonly EvalRunsDataset[] | null;
  readonly repositories: readonly EvalRunsRepository[];
  readonly selectedRepositoryId: string | null;
}

/**
 * @description The evals index. Without a repository it lists the repositories to
 * pick from; with one it lists each dataset with its runs and a link to each
 * run's report.
 */
export const EvalRunsRoute = (
  props: EvalRunsRouteProps,
): React.ReactElement => {
  const { className, datasets, repositories, selectedRepositoryId } = props;

  // Hooks

  // Setup
  const copy = EVAL_RUNS_COPY;
  const columns = copy.runColumns;
  const hasDatasets = (datasets ?? []).length > 0;
  const hasRepositories = repositories.length > 0;

  // Handlers

  // Markup
  const noRepositories = (
    <p className="text-muted-foreground text-sm">{copy.emptyRepositories}</p>
  );
  const repositoryLinks = (
    <ul className="flex flex-col gap-1 text-sm">
      {repositories.map((repository) => {
        return (
          <li key={repository.id}>
            <Link
              className="underline-offset-4 hover:underline"
              to={`/evals?repositoryId=${repository.id}`}
            >
              {repository.displayName}
            </Link>
          </li>
        );
      })}
    </ul>
  );
  const repositoryList = (
    <section
      aria-labelledby="eval-repositories-heading"
      className="flex flex-col gap-2"
    >
      <h2 className="text-sm font-medium" id="eval-repositories-heading">
        {copy.repositoryHeading}
      </h2>
      <p className="text-muted-foreground text-sm">{copy.pickRepository}</p>
      {hasRepositories ? repositoryLinks : noRepositories}
    </section>
  );
  const noRuns = (
    <p className="text-muted-foreground text-sm">{copy.emptyRuns}</p>
  );
  const renderRunsTable = (
    runs: readonly EvalRunListRowFragment[],
  ): React.ReactElement => {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{columns.config}</TableHead>
            <TableHead>{columns.k}</TableHead>
            <TableHead>{columns.status}</TableHead>
            <TableHead>{columns.started}</TableHead>
            <TableHead>{columns.report}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.map((run) => {
            return (
              <TableRow key={run.id}>
                <TableCell>{describeRunConfig(run)}</TableCell>
                <TableCell className="tabular-nums">{run.k}</TableCell>
                <TableCell>
                  <Badge color="slate">{run.status}</Badge>
                </TableCell>
                <TableCell>{formatEvalTimestamp(run.createdAt)}</TableCell>
                <TableCell>
                  <Link
                    className="underline-offset-4 hover:underline"
                    to={`/evals/runs/${run.id}`}
                  >
                    {copy.openReport}
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };
  const datasetSections = (datasets ?? []).map((dataset) => {
    const hasRuns = dataset.runs.length > 0;

    return (
      <section
        aria-label={dataset.name}
        className="flex flex-col gap-2"
        key={dataset.id}
      >
        <h2 className="text-sm font-medium">
          {dataset.name}{' '}
          <span className="text-muted-foreground">
            {copy.datasetVersion}
            {dataset.version}
          </span>
        </h2>
        {hasRuns ? renderRunsTable(dataset.runs) : noRuns}
      </section>
    );
  });
  const noDatasets = (
    <p className="text-muted-foreground text-sm">{copy.emptyDatasets}</p>
  );
  const datasetList = (
    <div className="flex flex-col gap-6">
      {hasDatasets ? datasetSections : noDatasets}
    </div>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen
      className={cn('flex w-full flex-col gap-6 p-4 md:p-8 lg:p-12', className)}
    >
      <GlobalHeading
        heading="h1"
        icon={FlaskConicalIcon}
        title={copy.pageTitle}
      />
      <div data-testid="EvalRunsRoute">
        {selectedRepositoryId === null ? repositoryList : datasetList}
      </div>
    </GlobalScreen>
  );
};
