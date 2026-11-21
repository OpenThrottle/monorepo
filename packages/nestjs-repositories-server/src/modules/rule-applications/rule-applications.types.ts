import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { EntityManager } from 'typeorm';
import type { Mock } from 'vitest';

import type { RuleApplication } from './rule-application.entity.ts';
import type { RULE_APPLICATION_STATES } from './rule-applications.constants.ts';
import type { RuleApplicationsRepository } from './rule-applications.repository.ts';

/**
 * @public
 */
export type RuleApplicationState =
  (typeof RULE_APPLICATION_STATES)[keyof typeof RULE_APPLICATION_STATES];

/**
 * @description Scalar/column fields of {@link RuleApplication} (no relations). Use to type DTOs
 * that mirror the entity.
 * @public
 */
export type RuleApplicationData = Omit<
  RuleApplication,
  'plan' | 'rule' | 'task'
>;

/**
 * @description What {@link RuleApplicationsRepository.record} and `upsertApplication` write for
 * one (rule, plan) ledger row.
 * @public
 */
export interface RecordRuleApplicationInput {
  readonly details?: unknown;
  readonly planId: string;
  readonly ruleId: string;
  readonly state: RuleApplicationState;
  readonly taskId?: string | null;
}

/**
 * @description Parameters {@link OrphanedTaskStatusCapture} receives for one soft-closed task.
 * `fromStatus` is that task's own real prior status (never a guess).
 * @public
 */
export interface OrphanedTaskStatusCaptureParams {
  readonly fromStatus: string;
  readonly manager: EntityManager;
  readonly planId: string;
  readonly taskId: string;
}

/**
 * @description Work-ledger capture hook for {@link RuleApplicationsRepository.orphanUnmatchedApplications}'s
 * task soft-close, supplied by the caller as a plain function rather than resolved via DI.
 *
 * This package cannot depend on `WorkLedgerCaptureService` (it lives in `openthrottle-server`, a
 * layer above this package), so the capture itself is delegated back to the caller instead of a
 * DI-injected port: the caller already has the concrete service and the actor/fatality policy to
 * apply. `params.manager` is the SAME transactional manager the soft-close update runs under, so
 * the ledger-row flip, the task status write, and every capture the caller performs here commit
 * or roll back together.
 * @public
 */
export type OrphanedTaskStatusCapture = (
  params: OrphanedTaskStatusCaptureParams,
) => Promise<void>;

/**
 * @description One injected task of a plan's edge placement group, as read for reconciling.
 * @public
 */
export interface EdgePlacementSibling {
  readonly sortOrder: number;
  readonly taskId: string;
}

/**
 * @description A {@link RuleApplicationsRepository} mock: every inherited `BaseRepository`
 * method plus the rule-application ones.
 * @public
 */
export interface RuleApplicationsRepositoryMock extends BaseRepositoryMock<
  RuleApplication,
  CreateModelInput<RuleApplication>
> {
  readonly findAppliedAttachPrompt: Mock<
    RuleApplicationsRepository['findAppliedAttachPrompt']
  >;
  readonly findByRuleAndPlan: Mock<
    RuleApplicationsRepository['findByRuleAndPlan']
  >;
  readonly listEdgePlacementSiblings: Mock<
    RuleApplicationsRepository['listEdgePlacementSiblings']
  >;
  readonly listForPlan: Mock<RuleApplicationsRepository['listForPlan']>;
  readonly listForRule: Mock<RuleApplicationsRepository['listForRule']>;
  readonly orphanUnmatchedApplications: Mock<
    RuleApplicationsRepository['orphanUnmatchedApplications']
  >;
  readonly record: Mock<RuleApplicationsRepository['record']>;
  readonly upsertApplication: Mock<
    RuleApplicationsRepository['upsertApplication']
  >;
}
