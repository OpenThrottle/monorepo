import { createProjectGraphAsync } from '@nx/devkit';
import { throwGeneratorError } from './generator-errors';

const PREFIX = 'NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators';

const TAG_APPLICATION = 'type:application';
const TAG_REACT = 'technology:react';

interface ResolvedProject {
  readonly name: string;
  readonly tags: readonly string[];
}

/**
 * Resolves a user-supplied project reference against the Nx project graph.
 * Falls back to a scope-insensitive match so `react-router-chat` resolves to
 * `@openthrottle/react-router-chat` — the shape agents actually type.
 */
const resolveProject = (
  nodes: Record<string, { data?: { tags?: string[] } }>,
  value: string,
): ResolvedProject | undefined => {
  const exact = nodes[value];
  if (exact) return { name: value, tags: exact.data?.tags ?? [] };

  const suffix = `/${value}`;
  const match = Object.keys(nodes).find((name) => name.endsWith(suffix));
  if (!match) return undefined;

  return { name: match, tags: nodes[match]?.data?.tags ?? [] };
};

const listProjectsByTag = (
  nodes: Record<string, { data?: { tags?: string[] } }>,
  tag: string,
): string[] => {
  return Object.keys(nodes)
    .filter((name) => (nodes[name]?.data?.tags ?? []).includes(tag))
    .sort();
};

/**
 * Fails fast when `--application` is not an application, naming the generator
 * that does scaffold into the supplied target.
 *
 * Without this the generator reaches `applications/<package>/app/routing` and
 * dies with an ENOENT, which reads as "packages are unsupported" rather than
 * "wrong generator" — the exact wrong conclusion this guard exists to prevent.
 *
 * @public
 */
export const assertReactRouterApplication = async (
  application: string,
): Promise<void> => {
  const { nodes } = await createProjectGraphAsync();
  const applications = listProjectsByTag(nodes, TAG_APPLICATION);

  if (applications.includes(application)) return;

  const project = resolveProject(nodes, application);

  if (project && project.tags.includes(TAG_REACT)) {
    throwGeneratorError({
      code: 'wrong_generator',
      field: 'application',
      hint: `Use: ${PREFIX}:react --subGenerator=component --destination=${project.name} --name=<Name>`,
      message: `"${application}" is a package, not an application. @tools/generators:react-router scaffolds inside applications/<app>/app; components in a package are scaffolded by @tools/generators:react with --destination.`,
      validValues: applications,
    });
  }

  throwGeneratorError({
    code: 'invalid_option',
    field: 'application',
    hint: `Enumerate applications with: ${PREFIX}:react-router --list=applications`,
    message: `Invalid --application "${application}". It is not an Nx project tagged ${TAG_APPLICATION}.`,
    validValues: applications,
  });
};

/**
 * Fails a `--destination` that is not a valid React target, listing the valid
 * ones and the discovery command instead of a bare "invalid destination".
 * Mirror of assertReactRouterApplication.
 *
 * @public
 */
export const throwInvalidDestinationError = async (
  destination: string,
): Promise<never> => {
  const { nodes } = await createProjectGraphAsync();
  const destinations = listProjectsByTag(nodes, TAG_REACT);
  const match = resolveProject(nodes, destination);

  const didYouMean =
    match && match.tags.includes(TAG_REACT)
      ? ` Did you mean "${match.name}"?`
      : '';

  return throwGeneratorError({
    code: 'invalid_option',
    field: 'destination',
    hint: `Enumerate destinations with: ${PREFIX}:react --list=destinations`,
    message: `Invalid --destination "${destination}". It is not an Nx project tagged ${TAG_REACT}.${didYouMean}`,
    validValues: destinations,
  });
};

/**
 * Rejects a `--folder` that points outside `applications/<app>/app`, with a
 * directed message rather than an ENOENT further down.
 *
 * @public
 */
export const throwInvalidFolderError = ({
  application,
  folder,
  listKey,
  suffix,
}: {
  readonly application: string;
  readonly folder: string;
  readonly listKey: string;
  readonly suffix?: string;
}): never => {
  const isPackagePath = folder.startsWith('packages/');
  const isRepoRelative =
    folder.startsWith('applications/') || folder.startsWith('/');

  const hint = isPackagePath
    ? `"${folder}" is a path inside packages/. @tools/generators:react-router only writes under applications/${application}/app. Use: ${PREFIX}:react --subGenerator=component --destination=<package> --name=<Name>`
    : isRepoRelative
      ? `--folder is relative to applications/${application}/app, not the repo root. Enumerate valid values with: ${PREFIX}:react-router --list=${listKey} --application=${application}`
      : `Enumerate valid values with: ${PREFIX}:react-router --list=${listKey} --application=${application}`;

  return throwGeneratorError({
    code: isPackagePath ? 'wrong_generator' : 'invalid_option',
    field: 'folder',
    hint,
    message: `Invalid folder "${folder}" for application "${application}".${
      suffix ? ` ${suffix}` : ''
    }`,
  });
};
