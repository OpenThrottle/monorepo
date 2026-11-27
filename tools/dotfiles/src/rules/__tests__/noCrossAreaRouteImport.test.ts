import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';

import { noCrossAreaRouteImport } from '../noCrossAreaRouteImport.ts';

// Wire the framework hooks the RuleTester calls to Vitest's.
RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

const SKILLS_FILE = `/repo/applications/dev/app/routing/skills/components/SkillRow.tsx`;

ruleTester.run('no-cross-area-route-import', noCrossAreaRouteImport, {
  invalid: [
    // The aliased form the review keeps catching by eye.
    {
      code: `import { AGENT_COPY } from '~/routing/agents/data/copy';\n`,
      errors: [
        {
          data: {
            from: 'skills',
            source: '~/routing/agents/data/copy',
            target: 'agents',
          },
          messageId: 'crossArea',
        },
      ],
      filename: SKILLS_FILE,
    },
    // A relative path that climbs into a sibling area.
    {
      code: `import { formatUsage } from '../../usage/utils/format';\n`,
      errors: [
        {
          data: {
            from: 'skills',
            source: '../../usage/utils/format',
            target: 'usage',
          },
          messageId: 'crossArea',
        },
      ],
      filename: SKILLS_FILE,
    },
    // Re-exports, type-only imports and dynamic imports count too.
    {
      code: `export { X } from '~/routing/home/data/copy';\nexport * from '~/routing/home/utils/x';\nimport type { Row } from '~/routing/plans/utils/rows';\nconst load = (): Promise<unknown> => { return import('~/routing/plans/utils/lazy'); };\n`,
      errors: [
        { messageId: 'crossArea' },
        { messageId: 'crossArea' },
        { messageId: 'crossArea' },
        { messageId: 'crossArea' },
      ],
      filename: SKILLS_FILE,
    },
  ],
  valid: [
    // The same area, aliased or relative.
    {
      code: `import { SKILL_COPY } from '~/routing/skills/data/copy';\nimport { format } from '../utils/format';\n`,
      filename: SKILLS_FILE,
    },
    // Promoted code and packages are fine.
    {
      code: `import { Button } from '@openthrottle/react-router-shadcn';\nimport { useViewer } from '~/global/hooks/useViewer';\n`,
      filename: SKILLS_FILE,
    },
    // A file outside app/routing/ is not checked.
    {
      code: `import { AGENT_COPY } from '~/routing/agents/data/copy';\n`,
      filename: '/repo/applications/dev/app/routes/skills.tsx',
    },
  ],
});
