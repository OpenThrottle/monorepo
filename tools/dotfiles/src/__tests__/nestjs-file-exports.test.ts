import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';

import { nestjsFileExports } from '../rules/nestjsFileExports.ts';

// Wire the framework hooks the RuleTester calls to Vitest's.
RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

const DIR = 'src/queues/usage-limit';

ruleTester.run('nestjs-file-exports', nestjsFileExports, {
  invalid: [
    // .service.ts — a second, undecorated class next to the service.
    {
      code: `@Injectable()
export class UsageLimitService {}

export class UsageLimitPolicy {}
`,
      errors: [{ messageId: 'wrongExport' }],
      filename: `${DIR}/usage-limit.service.ts`,
    },
    // .service.ts — a type exported beside the service belongs in .types.ts.
    {
      code: `export interface UsageLimitOptions { readonly max: number }

@Injectable()
export class UsageLimitService {}
`,
      errors: [{ messageId: 'wrongExport' }],
      filename: `${DIR}/usage-limit.service.ts`,
    },
    // .module.ts — no @Module() class at all.
    {
      code: `@Injectable()
export class UsageLimitModule {}
`,
      errors: [{ messageId: 'providerCount' }, { messageId: 'wrongExport' }],
      filename: `${DIR}/usage-limit.module.ts`,
    },
    // .module.ts — two modules in one file.
    {
      code: `@Module({})
export class UsageLimitModule {}

@Module({})
export class UsageLimitProducerModule {}
`,
      errors: [
        {
          data: { count: '2', decorator: 'Module', kind: 'module' },
          messageId: 'providerCount',
        },
      ],
      filename: `${DIR}/usage-limit.module.ts`,
    },
    // .processor.ts / .resolver.ts / .controller.ts — wrong decorator.
    {
      code: `@Injectable()
export class UsageLimitProcessor {}
`,
      errors: [{ messageId: 'providerCount' }, { messageId: 'wrongExport' }],
      filename: `${DIR}/usage-limit.processor.ts`,
    },
    {
      code: `export const resolveUsageLimit = () => 1;
`,
      errors: [{ messageId: 'providerCount' }, { messageId: 'wrongExport' }],
      filename: `${DIR}/usage-limit.resolver.ts`,
    },
    {
      code: `@Resolver()
export class UsageLimitController {}
`,
      errors: [{ messageId: 'providerCount' }, { messageId: 'wrongExport' }],
      filename: `${DIR}/usage-limit.controller.ts`,
    },
    // .utils.ts that exports a class (and a constant).
    {
      code: `export class UsageLimitWindow {}

export const MAX_RESUMES = 3;

export const nextResumeAt = (): Date => new Date();
`,
      errors: [{ messageId: 'wrongExport' }, { messageId: 'wrongExport' }],
      filename: `${DIR}/usage-limit.utils.ts`,
    },
    // .types.ts that exports a runtime value, including through a local
    // `export { … }` list.
    {
      code: `export type UsageLimitType = 'hourly' | 'weekly';

const USAGE_LIMIT_TYPES = ['hourly', 'weekly'] as const;

export { USAGE_LIMIT_TYPES };
`,
      errors: [{ messageId: 'wrongExport' }],
      filename: `${DIR}/usage-limit.types.ts`,
    },
    // .constants.ts that exports a function and a `let`.
    {
      code: `export const MAX_RESUMES = 3;

export function maxResumes(): number {
  return MAX_RESUMES;
}

export let resumeCount = 0;
`,
      errors: [{ messageId: 'wrongExport' }, { messageId: 'wrongExport' }],
      filename: `${DIR}/usage-limit.constants.ts`,
    },
    // .repository.ts that exports a constant and a type beside the class.
    {
      code: `export abstract class UsageLimitRepository {}

export const PAGE_SIZE = 25;

export interface UsageLimitPage { readonly total: number }
`,
      errors: [{ messageId: 'wrongExport' }, { messageId: 'wrongExport' }],
      filename: `${DIR}/usage-limit.repository.ts`,
    },
  ],
  valid: [
    // .repository.ts — an undecorated abstract base or an injectable subclass.
    {
      code: `export abstract class UsageLimitRepository {}
`,
      filename: `${DIR}/usage-limit.repository.ts`,
    },
    {
      code: `@Injectable()
export class UsageLimitRepository {}
`,
      filename: `${DIR}/usage-limit.repository.ts`,
    },
    {
      code: `import { Injectable } from '@nestjs/common';

@Injectable()
export class UsageLimitService {}
`,
      filename: `${DIR}/usage-limit.service.ts`,
    },
    {
      code: `@Module({ providers: [] })
export class UsageLimitModule {}
`,
      filename: `${DIR}/usage-limit.module.ts`,
    },
    {
      code: `@Processor('usage-limit')
export class UsageLimitProcessor {}
`,
      filename: `${DIR}/usage-limit.processor.ts`,
    },
    {
      code: `@Resolver(() => Object)
export class UsageLimitResolver {}
`,
      filename: `${DIR}/usage-limit.resolver.ts`,
    },
    {
      code: `@Controller('usage-limit')
export class UsageLimitController {}
`,
      filename: `${DIR}/usage-limit.controller.ts`,
    },
    // A non-exported helper class beside the provider is not an export.
    {
      code: `class Window {}

@Injectable()
export class UsageLimitService {
  readonly window = new Window();
}
`,
      filename: `${DIR}/usage-limit.service.ts`,
    },
    {
      code: `export function nextResumeAt(): Date {
  return new Date();
}

export const isLimited = (count: number): boolean => count > 3;
`,
      filename: `${DIR}/usage-limit.utils.ts`,
    },
    {
      code: `export type UsageLimitType = 'hourly' | 'weekly';

export interface UsageLimit {
  readonly type: UsageLimitType;
}

export type { Job } from 'bullmq';
`,
      filename: `${DIR}/usage-limit.types.ts`,
    },
    {
      code: `export const MAX_RESUMES = 3;

export const USAGE_LIMIT_TYPES = ['hourly', 'weekly'] as const;
`,
      filename: `${DIR}/usage-limit.constants.ts`,
    },
    // Subject-named kinds and tests are not export-checked.
    {
      code: `export class Job {}

export const helper = 1;
`,
      filename: 'src/graphql/queues/job.object.ts',
    },
    {
      code: `export const fixture = 1;
`,
      filename: `${DIR}/usage-limit.service.test.ts`,
    },
  ],
});

// `.provider.ts` is the one subject-named kind with an export check: Nest
// provider values only.
const PROVIDER = 'src/nest/mcp-toolset-pruner.provider.ts';
const PROVIDER_ALLOWED = `Nest provider values (\`const\` provider objects or arrays, or functions returning them)`;

ruleTester.run('nestjs-file-exports: .provider.ts', nestjsFileExports, {
  invalid: [
    // An injectable class is a service, not a provider value.
    {
      code: `@Injectable()
export class McpToolsetPrunerService {}

export const mcpToolsetPrunerProvider = (): FactoryProvider => ({
  provide: McpToolsetPrunerService,
  useFactory: () => new McpToolsetPrunerService(),
});
`,
      errors: [
        {
          data: {
            allowed: PROVIDER_ALLOWED,
            home: 'a `.service.ts` in its own folder',
            kind: 'provider',
            name: 'McpToolsetPrunerService',
          },
          messageId: 'wrongExport',
        },
      ],
      filename: PROVIDER,
    },
    // A type beside the provider goes in `.types.ts`: the misuse the check
    // exists for (a seam's interfaces and token under a provider name).
    {
      code: `export interface TaggingModelProvider {
  readonly tag: (text: string) => Promise<string[]>;
}

export const TAGGING_MODEL_PROVIDER_TOKEN = Symbol('TaggingModelProvider');
`,
      errors: [
        {
          data: {
            allowed: PROVIDER_ALLOWED,
            home: '`<folder>.types.ts`',
            kind: 'provider',
            name: 'TaggingModelProvider',
          },
          messageId: 'wrongExport',
        },
      ],
      filename: 'src/queues/tagging/tagging-model.provider.ts',
    },
    // Neither an enum nor a re-export of everything is a provider value.
    {
      code: `export enum Toolset {
  Core = 'core',
}

export * from './mcp-toolset-pruner.service.ts';
`,
      errors: [{ messageId: 'wrongExport' }, { messageId: 'wrongExport' }],
      filename: PROVIDER,
    },
  ],
  valid: [
    // A factory function returning a FactoryProvider.
    {
      code: `import type { FactoryProvider } from '@nestjs/common';

import { McpToolsetPrunerService } from './mcp-toolset-pruner.service.ts';

export const mcpToolsetPrunerProvider = (
  toolsets: readonly string[],
): FactoryProvider<McpToolsetPrunerService> => {
  return {
    provide: McpToolsetPrunerService,
    useFactory: () => new McpToolsetPrunerService(toolsets),
  };
};

export function legacyPrunerProvider(): FactoryProvider<McpToolsetPrunerService> {
  return mcpToolsetPrunerProvider([]);
}
`,
      filename: PROVIDER,
    },
    // A `const` array of providers, and a single provider object.
    {
      code: `export const databaseProviders = [
  { provide: 'DATA_SOURCE', useFactory: () => ({}) },
];

export const databaseUrlProvider = { provide: 'DATABASE_URL', useValue: '' };
`,
      filename: 'src/modules/database/database.provider.ts',
    },
    // A test of a provider is not export-checked.
    {
      code: `export class FakePruner {}

export interface Fixture {
  readonly toolsets: readonly string[];
}
`,
      filename: 'src/nest/mcp-toolset-pruner.provider.test.ts',
    },
  ],
});
