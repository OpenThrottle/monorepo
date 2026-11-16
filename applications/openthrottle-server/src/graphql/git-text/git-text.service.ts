import { Injectable, NotFoundException } from '@nestjs/common';
import { PlansService, TasksService } from '@openthrottle/nestjs-repositories';

import { DEFAULT_COMMIT_SCOPE } from './git-text.constants.ts';
import type { GitTextDraftInput } from './git-text.input.ts';
import type { GitTextDraftObject } from './git-text.object.ts';
import {
  branchNameFor,
  commitMessageFor,
  pullRequestBodyFor,
  pullRequestTitleFor,
} from './git-text.utils.ts';

const SCOPE_PATTERN = /^[a-z0-9@][a-z0-9@/._-]*$/u;

/**
 * @description Drafts branch, commit and PR text from what OT already knows about a plan, so an agent
 * stops composing it ad hoc. Pure templating over the plan and its tasks — no model call — and
 * every field passes the attribution guard's pattern on the way out.
 */
@Injectable()
export class GitTextService {
  constructor(
    private readonly plansService: PlansService,
    private readonly tasksService: TasksService,
  ) {}

  async draft(input: GitTextDraftInput): Promise<GitTextDraftObject> {
    const plan = await this.plansService
      .getRepository()
      .findOne({ where: { id: input.planId } });

    if (plan == null) {
      throw new NotFoundException(`Plan ${input.planId} not found`);
    }

    const rows = await this.tasksService
      .getRepository()
      .find({ where: { planId: plan.id } });
    // Canonical task order is sortOrder, then createdAt. Sorted here rather than in `order`,
    // because TypeORM takes precedence from key order and keys are kept alphabetical.
    const tasks = [...rows].sort(
      (a, b) =>
        a.sortOrder - b.sortOrder ||
        a.createdAt.getTime() - b.createdAt.getTime(),
    );
    const scope = this.resolveScope(input.scope);
    const task =
      tasks.find((candidate) => candidate.id === input.taskId) ?? null;

    if (input.taskId != null && task == null) {
      throw new NotFoundException(
        `Task ${input.taskId} is not a task of plan ${plan.id}`,
      );
    }

    return {
      branchName: branchNameFor(plan),
      commitMessage: task == null ? null : commitMessageFor(plan, task, scope),
      pullRequestBody: pullRequestBodyFor(plan, tasks),
      pullRequestTitle: pullRequestTitleFor(plan, scope),
    };
  }

  /** A scope commitlint could accept; anything else falls back to the default, never into the header. */
  private resolveScope(scope: string | null): string {
    const trimmed = scope?.trim() ?? '';

    return SCOPE_PATTERN.test(trimmed) ? trimmed : DEFAULT_COMMIT_SCOPE;
  }
}
