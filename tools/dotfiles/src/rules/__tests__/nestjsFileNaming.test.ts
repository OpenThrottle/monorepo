import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, expect, it } from 'vitest';

import { FOLDER_KINDS, SUBJECT_KINDS } from '../nestjs-file-shared.ts';
import { nestjsFileNaming } from '../nestjsFileNaming.ts';

// Wire the framework hooks the RuleTester calls to Vitest's.
RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

// The rule reads only the path; the source is irrelevant to it.
const CODE = 'export const value = 1;\n';

// The kind list both messages print, built the way the rule builds it.
const KINDS = [...FOLDER_KINDS, ...SUBJECT_KINDS]
  .map((kind) => `.${kind}.ts`)
  .join(', ');

describe('the kind list in the messages', () => {
  it('names the provider kind', () => {
    expect(KINDS).toContain('.provider.ts');
  });

  it('does not name a plural providers kind', () => {
    expect(KINDS).not.toContain('.providers.ts');
  });
});

ruleTester.run('nestjs-file-naming', nestjsFileNaming, {
  invalid: [
    // A free-form name with no kind in a module folder.
    {
      code: CODE,
      errors: [{ messageId: 'missingKind' }],
      filename: 'src/queues/usage-limit/usage-limit-resume-policy.ts',
    },
    // A kind that is not in the contract.
    {
      code: CODE,
      errors: [{ messageId: 'unknownKind' }],
      filename: 'src/queues/daily-stats/daily-stats.dates.ts',
    },
    // Provider is singular only: the plural spelling is not a kind, and the
    // message lists `.provider.ts` among the kinds to use instead.
    {
      code: CODE,
      errors: [
        {
          data: {
            basename: 'database.providers.ts',
            kind: 'providers',
            kinds: KINDS,
          },
          messageId: 'unknownKind',
        },
      ],
      filename: 'src/modules/database/database.providers.ts',
    },
    // A kindless file's message lists the provider kind too.
    {
      code: CODE,
      errors: [
        {
          data: {
            basename: 'tagging-model-providers.ts',
            folder: 'tagging',
            kinds: KINDS,
          },
          messageId: 'missingKind',
        },
      ],
      filename: 'src/queues/tagging/tagging-model-providers.ts',
    },
    // The multi-module folder: a second service stacked on a qualifier. Option
    // (a) — it belongs in its own sub-folder.
    {
      code: CODE,
      errors: [
        {
          data: {
            basename: 'plan-cancel-channel.service.ts',
            expected: 'plans.service.ts',
            kind: 'service',
            subfolder: 'plan-cancel-channel/plan-cancel-channel.service.ts',
          },
          messageId: 'folderMismatch',
        },
      ],
      filename: 'src/queues/plans/plan-cancel-channel.service.ts',
    },
    // A second module prefixed with the folder name is still a mismatch.
    {
      code: CODE,
      errors: [{ messageId: 'folderMismatch' }],
      filename: 'src/queues/plans/plans-queue-producer.module.ts',
    },
    // A repository is folder-named like a service.
    {
      code: CODE,
      errors: [{ messageId: 'folderMismatch' }],
      filename: 'src/plans/plan-records.repository.ts',
    },
    // A test file is checked as its source, and the expected name keeps the
    // test extension.
    {
      code: CODE,
      errors: [
        {
          data: {
            basename: 'usage-limit-resume.service.test.ts',
            expected: 'plans.service.test.ts',
            kind: 'service',
            subfolder: 'usage-limit-resume/usage-limit-resume.service.test.ts',
          },
          messageId: 'folderMismatch',
        },
      ],
      filename: 'src/queues/plans/usage-limit-resume.service.test.ts',
    },
    // A file directly in a package's `src/` is named for the package.
    {
      code: CODE,
      errors: [{ messageId: 'folderMismatch' }],
      filename: 'packages/nestjs-auth/src/auth.module.ts',
    },
    // `app.module.ts` is only exempt for the root module, not a nested one.
    {
      code: CODE,
      errors: [{ messageId: 'folderMismatch' }],
      filename: 'src/graphql/app.module.ts',
    },
  ],
  valid: [
    // A conforming folder-named kind.
    { code: CODE, filename: 'src/queues/usage-limit/usage-limit.service.ts' },
    { code: CODE, filename: 'src/queues/usage-limit/usage-limit.utils.ts' },
    { code: CODE, filename: 'src/queues/usage-limit/usage-limit.constants.ts' },
    {
      code: CODE,
      filename: 'src/base-repository/base-repository.repository.ts',
    },
    // The sub-folder answer to the multi-module folder.
    {
      code: CODE,
      filename: 'src/queues/plans/cancel-channel/cancel-channel.service.ts',
    },
    // Subject-named kinds carry their own stem, many per folder.
    { code: CODE, filename: 'src/graphql/queues/job.object.ts' },
    { code: CODE, filename: 'src/graphql/queues/retry-job.input.ts' },
    { code: CODE, filename: 'src/guards/global-auth.guard.ts' },
    { code: CODE, filename: 'src/config/nestjs-slack.error.ts' },
    { code: CODE, filename: 'src/emit-notification.interceptor.ts' },
    {
      code: CODE,
      filename: 'src/graphql/plans/plan-schedule-conflict.filter.ts',
    },
    // A provider is subject-named: any stem, many per folder, beside the
    // folder's service.
    { code: CODE, filename: 'src/nest/mcp-toolset-pruner.provider.ts' },
    { code: CODE, filename: 'src/modules/database/database.provider.ts' },
    { code: CODE, filename: 'src/nest/mcp-toolset-pruner.provider.test.ts' },
    // A test mirroring its source, in place or under `__tests__`.
    {
      code: CODE,
      filename: 'src/queues/usage-limit/usage-limit.service.test.ts',
    },
    {
      code: CODE,
      filename: 'src/queues/usage-limit/__tests__/usage-limit.utils.test.ts',
    },
    {
      code: CODE,
      filename: 'src/graphql/queues/job.object.integration.test.ts',
    },
    // A folder-level test with no single source.
    { code: CODE, filename: 'src/guards/guards.integration.test.ts' },
    // A file directly in `src/` named for its project, and the root module.
    { code: CODE, filename: 'packages/nestjs-auth/src/nestjs-auth.module.ts' },
    { code: CODE, filename: 'src/app.module.ts' },
    // Exempt basenames.
    { code: CODE, filename: 'src/queues/plans/index.ts' },
    { code: CODE, filename: 'src/main.ts' },
  ],
});
