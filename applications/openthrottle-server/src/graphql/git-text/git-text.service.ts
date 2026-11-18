import { Injectable, NotFoundException } from '@nestjs/common';
import {
  PlansRepository,
  TasksRepository,
} from '@openthrottle/nestjs-repositories-server';

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
    private readonly plansRepository: PlansRepository,
    private readonly tasksRepository: TasksRepository,
  ) {}

  async draft(input: GitTextDraftInput): Promise<GitTextDraftObject> {
    const plan = await this.plansRepository.findOne({
      where: { id: input.planId },
    });

    if (plan == null) {
      throw new NotFoundException(`Plan ${input.planId} not found`);
    }

    const rows = await this.tasksRepository.findBy({
      where: { planId: plan.id },
    });
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
      pullRequestBody: pullRequestBodyFor(
        plan,
        tasks,
        input.pullRequestTemplate,
      ),
      pullRequestTitle: pullRequestTitleFor(plan, scope),
    };
  }

  /** A scope commitlint could accept, or none: a malformed one is dropped, never put in the header. */
  private resolveScope(scope: string | null): string | null {
    const trimmed = scope?.trim() ?? '';

    return SCOPE_PATTERN.test(trimmed) ? trimmed : null;
  }
}
