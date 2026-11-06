/**
 * @description Maps the EvalDataset and EvalCase entities to their GraphQL objects, serializing the
 * JSONB `input` and `gold` columns into JSON strings.
 */

import type { EvalCase, EvalDataset } from '@openthrottle/nestjs-repositories';

import type { EvalCaseObject } from './eval-case.object.ts';
import type { EvalDatasetObject } from './eval-dataset.object.ts';

export const toEvalDatasetObject = (row: EvalDataset): EvalDatasetObject => {
  return {
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    description: row.description,
    id: row.id,
    name: row.name,
    repositoryId: row.repositoryId,
    target: row.target,
    updatedAt: row.updatedAt,
    version: row.version,
  };
};

export const toEvalCaseObject = (row: EvalCase): EvalCaseObject => {
  return {
    createdAt: row.createdAt,
    datasetId: row.datasetId,
    goldJson: JSON.stringify(row.gold),
    id: row.id,
    inputJson: JSON.stringify(row.input),
    sourceTrajectoryId: row.sourceTrajectoryId,
    split: row.split,
  };
};
