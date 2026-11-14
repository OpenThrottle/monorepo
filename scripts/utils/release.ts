/**
 * @description Pure helpers behind `scripts/release-applications.ts`: tag
 * names, manifest parsing and the decisions the release CLI makes, kept free
 * of git and Nx so they are unit-testable.
 */

/** The Nx release group in nx.json that versions the applications. */
export const RELEASE_GROUP = 'applications';

export interface ReleaseProject {
  readonly name: string;
  readonly root: string;
  readonly version: string;
}

export interface BaselinePlan {
  readonly existing: readonly string[];
  readonly missing: readonly string[];
}

/** The release tag for a project version, matching nx.json `releaseTag.pattern`. */
export const releaseTagName = (project: string, version: string): string => {
  return `${project}@${version}`;
};

/** The `version` field of a package.json's contents, or undefined. */
export const readManifestVersion = (contents: string): string | undefined => {
  let manifest: unknown;

  try {
    manifest = JSON.parse(contents);
  } catch {
    return undefined;
  }

  if (
    typeof manifest === 'object' &&
    manifest !== null &&
    'version' in manifest &&
    typeof manifest.version === 'string' &&
    manifest.version !== ''
  ) {
    return manifest.version;
  }

  return undefined;
};

/** The project patterns of a release group in nx.json's contents. */
export const readGroupPatterns = (
  nxJsonContents: string,
  group: string,
): readonly string[] => {
  const nxJson: unknown = JSON.parse(nxJsonContents);

  if (
    typeof nxJson !== 'object' ||
    nxJson === null ||
    !('release' in nxJson) ||
    typeof nxJson.release !== 'object' ||
    nxJson.release === null ||
    !('groups' in nxJson.release) ||
    typeof nxJson.release.groups !== 'object' ||
    nxJson.release.groups === null ||
    !(group in nxJson.release.groups)
  ) {
    return [];
  }

  const entry: unknown = Object.entries(nxJson.release.groups).find(
    ([name]) => name === group,
  )?.[1];

  if (
    typeof entry !== 'object' ||
    entry === null ||
    !('projects' in entry) ||
    !Array.isArray(entry.projects)
  ) {
    return [];
  }

  return entry.projects.filter(
    (pattern): pattern is string => typeof pattern === 'string',
  );
};

/** Which baseline tags already exist and which still need creating. */
export const planBaselineTags = (
  projects: readonly ReleaseProject[],
  existingTags: ReadonlySet<string>,
): BaselinePlan => {
  const tags = projects.map((project) => {
    return releaseTagName(project.name, project.version);
  });

  return {
    existing: tags.filter((tag) => existingTags.has(tag)),
    missing: tags.filter((tag) => !existingTags.has(tag)),
  };
};

/** The root project whose version is the product (release train) version. */
export const PRODUCT_PROJECT = 'monorepo';

/** The bot branch the release PR is opened from. */
export const RELEASE_BRANCH = 'release/next';

export interface ProjectVersionData {
  readonly currentVersion: string;
  readonly newVersion: string | null;
}

export interface VersionChange {
  readonly from: string;
  readonly name: string;
  readonly to: string;
}

/** The projects Nx bumped, sorted with the product project first. */
export const collectVersionChanges = (
  data: Readonly<Record<string, ProjectVersionData>>,
): readonly VersionChange[] => {
  const changes: VersionChange[] = [];

  for (const [name, entry] of Object.entries(data)) {
    if (
      entry.newVersion !== null &&
      entry.newVersion !== entry.currentVersion
    ) {
      changes.push({ from: entry.currentVersion, name, to: entry.newVersion });
    }
  }

  return changes.sort((left, right) => {
    if (left.name === PRODUCT_PROJECT) {
      return -1;
    }

    if (right.name === PRODUCT_PROJECT) {
      return 1;
    }

    return left.name.localeCompare(right.name);
  });
};

/** The product version a release carries: the bumped root version, else its current one. */
export const resolveProductVersion = (
  changes: readonly VersionChange[],
  currentProductVersion: string,
): string => {
  return changes.find((change) => change.name === PRODUCT_PROJECT)?.to ?? currentProductVersion; // prettier-ignore
};

/** The release PR title; the `release` scope is allowed by commitlint. */
export const releasePrTitle = (productVersion: string): string => {
  return `chore(release): openthrottle ${productVersion}`;
};

/** Whether a commit subject is a merged release PR. */
export const isReleaseCommit = (subject: string): boolean => {
  return subject.startsWith('chore(release): openthrottle ');
};

/** A Markdown table of the versions in a release. */
export const renderVersionTable = (
  changes: readonly VersionChange[],
): string => {
  const rows = changes.map((change) => {
    return `| \`${change.name}\` | ${change.from} | **${change.to}** |`;
  });

  return ['| Project | From | To |', '| --- | --- | --- |', ...rows].join('\n');
};

/**
 * Insert the version table under a changelog's `## <version>` heading. Returns
 * the changelog unchanged when the heading is absent.
 */
export const insertVersionTable = (
  changelog: string,
  version: string,
  table: string,
): string => {
  const lines = changelog.split('\n');
  const index = lines.findIndex((line) => line.startsWith(`## ${version}`));

  if (index === -1) {
    return changelog;
  }

  return [...lines.slice(0, index + 1), '', table, ...lines.slice(index + 1)].join('\n'); // prettier-ignore
};

/** The release PR body. */
export const renderReleasePrBody = (
  productVersion: string,
  changes: readonly VersionChange[],
): string => {
  return [
    `## OpenThrottle ${productVersion}`,
    '',
    'Opened by the release workflow, which rewrites this branch on every push to `main`. Merging it tags each project below and publishes its GitHub release.', // prettier-ignore
    '',
    renderVersionTable(changes),
    '',
    'Each project’s `CHANGELOG.md` in this diff carries the release notes. Do not edit this branch by hand: the next push to `main` overwrites it.', // prettier-ignore
    '',
  ].join('\n');
};

/**
 * The body of a changelog's `## <version>` section (heading excluded), up to
 * the next `## ` heading. Undefined when the section is absent.
 */
export const extractChangelogSection = (
  changelog: string,
  version: string,
): string | undefined => {
  const lines = changelog.split('\n');
  const start = lines.findIndex((line) => line.startsWith(`## ${version}`));

  if (start === -1) {
    return undefined;
  }

  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith('## '));

  return (end === -1 ? rest : rest.slice(0, end)).join('\n').trim();
};

/** The GitHub release title for a tag: the product reads as OpenThrottle. */
export const releaseTitle = (project: string, version: string): string => {
  if (project === PRODUCT_PROJECT) {
    return `OpenThrottle ${version}`;
  }

  return releaseTagName(project, version);
};
