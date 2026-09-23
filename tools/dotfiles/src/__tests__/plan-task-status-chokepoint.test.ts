import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';

import { planTaskStatusChokepoint } from '../rules/plan-task-status-chokepoint.ts';

// Wire the framework hooks the RuleTester calls to Vitest's.
RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester();

ruleTester.run('plan-task-status-chokepoint', planTaskStatusChokepoint, {
  invalid: [
    // A bare assignment to a traced Plan entity's `.status`, then `repo.save`
    // — the exact "reintroduce the silent writer" regression this rule exists
    // to catch.
    {
      code: `import { Plan } from '@openthrottle/nestjs-repositories';

async function updatePlanStatus(manager, planId) {
  const repo = manager.getRepository(Plan);
  const entity = await repo.findOne({ where: { id: planId } });
  entity.status = 'COMPLETED';
  return repo.save(entity);
}
`,
      errors: [{ data: { table: 'plans' }, messageId: 'bareStatusAssignment' }],
      filename: 'rogue-plan-writer.ts',
    },
    // A bare repo-scoped `.update(criteria, { status })` on a traced Task repo.
    {
      code: `import { Task } from '@openthrottle/nestjs-repositories';

async function closeTask(manager, taskId) {
  const repo = manager.getRepository(Task);
  return repo.update({ id: taskId }, { status: 'COMPLETED' });
}
`,
      errors: [{ data: { table: 'tasks' }, messageId: 'bareStatusWrite' }],
      filename: 'rogue-task-writer.ts',
    },
    // The 3-arg EntityManager form: `manager.update(Task, criteria, { status })`.
    {
      code: `import { Task } from '@openthrottle/nestjs-repositories';

async function closeTask(manager, taskId) {
  return manager.update(Task, { id: taskId }, { status: 'COMPLETED' });
}
`,
      errors: [{ data: { table: 'tasks' }, messageId: 'bareStatusWrite' }],
      filename: 'rogue-task-manager-update.ts',
    },
    // A query-builder `.set({ status })` chained off a traced Task repo, with
    // an arbitrarily deep `.where()`/`.andWhere()` chain in between — the
    // chain-passthrough resolution must still trace back to the repo.
    {
      code: `import { Task } from '@openthrottle/nestjs-repositories';

async function bulkClose(manager, ids) {
  const taskRepo = manager.getRepository(Task);
  return taskRepo
    .createQueryBuilder()
    .update()
    .set({ status: 'SKIPPED' })
    .where('id IN (:...ids)', { ids })
    .execute();
}
`,
      errors: [{ data: { table: 'tasks' }, messageId: 'bareStatusWrite' }],
      filename: 'rogue-bulk-writer.ts',
    },
    // An explicit `.update(Plan)` entity argument on the query-builder chain.
    {
      code: `import { Plan } from '@openthrottle/nestjs-repositories';

async function resetPlans(manager, ids) {
  return manager
    .createQueryBuilder()
    .update(Plan)
    .set({ status: 'PENDING' })
    .where('id IN (:...ids)', { ids })
    .execute();
}
`,
      errors: [{ data: { table: 'plans' }, messageId: 'bareStatusWrite' }],
      filename: 'rogue-plan-query-builder.ts',
    },
    // An explicit `: Task` type annotation is enough to trace the entity, even
    // with no repository call in sight.
    {
      code: `import { Task } from '@openthrottle/nestjs-repositories';

function touch(entity: Task) {
  entity.status = 'PENDING';
}
`,
      errors: [{ data: { table: 'tasks' }, messageId: 'bareStatusAssignment' }],
      filename: 'typed-param-writer.ts',
    },
    // A write inside an anonymous closure nested in an unlisted function must
    // still be flagged — the closure has no name of its own, but the
    // enclosing named function ("notTheChokepoint") isn't on the allow-list.
    {
      code: `import { Plan } from '@openthrottle/nestjs-repositories';

async function notTheChokepoint(manager, planId) {
  await manager.transaction(async (txManager) => {
    const repo = txManager.getRepository(Plan);
    const entity = await repo.findOne({ where: { id: planId } });
    entity.status = 'CANCELED';
    await repo.save(entity);
  });
}
`,
      errors: [{ data: { table: 'plans' }, messageId: 'bareStatusAssignment' }],
      filename: 'nested-closure-writer.ts',
    },
    // `allowedFunctionNames` is per-name: naming a DIFFERENT function does not
    // exempt this one.
    {
      code: `import { Task } from '@openthrottle/nestjs-repositories';

async function updateTask(manager, taskId) {
  const repo = manager.getRepository(Task);
  const entity = await repo.findOne({ where: { id: taskId } });
  entity.status = 'COMPLETED';
  return repo.save(entity);
}
`,
      errors: [{ data: { table: 'tasks' }, messageId: 'bareStatusAssignment' }],
      filename: 'wrong-allowlist-entry.ts',
      options: [{ allowedFunctionNames: ['applyStatusChange'] }],
    },
    // A directly-injected repository field (`@InjectRepository(Task)
    // private readonly taskRepository: Repository<Task>`, the shape
    // TasksService itself uses) is traced via `this.taskRepository`, not just
    // a bare local variable — the realistic "new method added straight to
    // TasksService" silent writer.
    {
      code: `import { Task } from '@openthrottle/nestjs-repositories';
import type { Repository } from 'typeorm';

class TasksService {
  constructor(private readonly taskRepository: Repository<Task>) {}

  async closeTask(taskId) {
    await this.taskRepository.update({ id: taskId }, { status: 'COMPLETED' });
  }
}
`,
      errors: [{ data: { table: 'tasks' }, messageId: 'bareStatusWrite' }],
      filename: 'this-field-writer.ts',
    },
    // Same injected-field tracing, but a bare assignment + save.
    {
      code: `import { Plan } from '@openthrottle/nestjs-repositories';
import type { Repository } from 'typeorm';

class PlansService {
  constructor(private readonly planRepository: Repository<Plan>) {}

  async closePlan(planId) {
    const entity = await this.planRepository.findOne({ where: { id: planId } });
    entity.status = 'COMPLETED';
    return this.planRepository.save(entity);
  }
}
`,
      errors: [{ data: { table: 'plans' }, messageId: 'bareStatusAssignment' }],
      filename: 'this-field-assignment.ts',
    },
  ],
  valid: [
    // Creation is not a transition: `repo.create({ status: 'PENDING' })` is a
    // plain object-literal argument, never an assignment or an
    // `.update()`/`.set()` call, so it is never flagged.
    {
      code: `import { Task } from '@openthrottle/nestjs-repositories';

async function createTask(manager, planId) {
  const repo = manager.getRepository(Task);
  const entity = repo.create({ status: 'PENDING', planId });
  return repo.save(entity);
}
`,
      filename: 'create-task.ts',
    },
    // A `.status` write on an entity this rule cannot trace to Plan/Task (no
    // `getRepository(Task|Plan)`, no service-name binding, no type
    // annotation) is left alone — the false-positive guard for the many other
    // entities that also happen to carry a `status` column/property
    // (AgentConversation, TagActionRule, the *Object DTO mappers, …).
    {
      code: `async function archive(repo, id) {
  const entity = await repo.findOne({ where: { id } });
  entity.status = 'archived';
  return repo.save(entity);
}
`,
      filename: 'unrelated-status-field.ts',
    },
    // Mapping a loaded row's status onto a plain (non-Task/Plan) DTO/result
    // object is not a database write at all and must never be flagged.
    {
      code: `import { Plan } from '@openthrottle/nestjs-repositories';

function toDto(plan: Plan) {
  const out = new PlanRunObject();
  out.status = plan.status;
  return out;
}
`,
      filename: 'dto-mapping.ts',
    },
    // The plan chokepoint: `applyStatusChange` assigning `.status` directly.
    {
      code: `import { Plan } from '@openthrottle/nestjs-repositories';

class PlanStatusService {
  async applyStatusChange(manager, entity: Plan, requestedStatus) {
    entity.status = requestedStatus;
    return entity;
  }
}
`,
      filename: 'plan-status.service.ts',
      options: [{ allowedFunctionNames: ['applyStatusChange'] }],
    },
    // The plan chokepoint's `cancelRun`, force-normalizing `plan.status`
    // inside a nested `manager.transaction(...)` closure — the allow-list
    // check must resolve through the anonymous closure to the named method.
    {
      code: `import { Plan } from '@openthrottle/nestjs-repositories';

class PlanStatusService {
  async cancelRun(planId) {
    const repo = this.plansService.getRepository();
    const plan = await repo.findOne({ where: { id: planId } });
    await repo.manager.transaction(async (manager) => {
      plan.status = 'PENDING';
      await manager.getRepository(Plan).save(plan);
    });
  }
}
`,
      filename: 'plan-status.service.ts',
      options: [{ allowedFunctionNames: ['cancelRun'] }],
    },
    // The bulk task-status chokepoint's query-builder `.set({ status })`.
    {
      code: `import { Task } from '@openthrottle/nestjs-repositories';

async function applyBulkTaskStatusChange(manager, ids, toStatus) {
  const taskRepo = manager.getRepository(Task);
  return taskRepo
    .createQueryBuilder()
    .update()
    .set({ status: toStatus })
    .where('id IN (:...ids)', { ids })
    .execute();
}
`,
      filename: 'bulk-task-status-change.ts',
      options: [{ allowedFunctionNames: ['applyBulkTaskStatusChange'] }],
    },
    // The inline task-writer shape (updateTask/reviveSoftClosedTask/
    // closeOutSourceTask): a repo-scoped `.update(criteria, { status })`
    // inside the named, allow-listed method.
    {
      code: `import { Task } from '@openthrottle/nestjs-repositories';

class InjectTaskExecutor {
  async reviveSoftClosedTask(planId, task) {
    return this.tasksService
      .getRepository()
      .manager.transaction(async (manager) => {
        await manager.update(Task, { id: task.id }, { status: 'PENDING' });
      });
  }
}
`,
      filename: 'inject-task.executor.ts',
      options: [{ allowedFunctionNames: ['reviveSoftClosedTask'] }],
    },
  ],
});
