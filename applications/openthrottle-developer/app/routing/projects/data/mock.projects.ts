import { fakerEN as faker } from '@faker-js/faker';
import type { ProjectWithStats } from '~/routing/projects/data/types';

faker.seed(42);

const NX_PROJECT_NAME_PATTERNS = [
  'applications/openthrottle-developer',
  'applications/openthrottle-server',
  'applications/openthrottle',
  'packages/core',
  'packages/shared-ui',
  'tools/workflows',
] as const;

function createMockProject(
  overrides?: Partial<ProjectWithStats>,
): ProjectWithStats {
  const createdAt = faker.date.past({ years: 1 });
  const updatedAt = faker.date.between({ from: createdAt, to: new Date() });
  const lastActivityAt = faker.date.between({
    from: createdAt,
    to: new Date(),
  });

  return {
    __typename: 'ProjectObject',
    createdAt: overrides?.createdAt ?? createdAt,
    description: overrides?.description ?? faker.lorem.sentences(12),
    id: overrides?.id ?? faker.string.uuid(),
    lastActivityAt: overrides?.lastActivityAt ?? lastActivityAt.toISOString(),
    name: overrides?.name ?? faker.commerce.productName(),
    nxProjectName:
      overrides?.nxProjectName ??
      faker.helpers.arrayElement([...NX_PROJECT_NAME_PATTERNS]),
    planCount: overrides?.planCount ?? faker.number.int({ max: 12, min: 0 }),
    updatedAt: overrides?.updatedAt ?? updatedAt,
  };
}

/** Mock projects for UI when GraphQL returns empty. Seeded for reproducible data. Includes optional stats (planCount, lastActivityAt) for future API. */
export const MOCK_PROJECTS: ProjectWithStats[] = faker.helpers.multiple(
  () => createMockProject(),
  { count: 12 },
);
