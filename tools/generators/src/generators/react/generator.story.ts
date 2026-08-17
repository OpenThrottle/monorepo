import { join } from 'path';
import type { Tree } from '@nx/devkit';
import {
  createProjectGraphAsync,
  formatFiles,
  generateFiles,
  logger,
} from '@nx/devkit';
import { getCommonVariables, getGeneratorOverview } from '../../utils';
import { acceptsChildren, extractCvaVariants } from '../../utils/cva-variants';
import type { CvaVariantGroup } from '../../utils/cva-variants';
import {
  getComponentNames,
  getConfigConfirmation,
  getReactComponentDestination,
  parsePossibleNames,
} from '../../utils/questions';

export interface ReactStoryGeneratorSchema {
  readonly destination?: string;
  readonly interactive?: boolean;
  readonly name?: string;
}

/** A variant group plus the constant name the template declares it under. */
interface TemplateVariantGroup extends CvaVariantGroup {
  readonly constName: string;
}

/**
 * `size` -> `SIZES`, `variant` -> `VARIANTS`. Any cva prop name yields a valid
 * identifier; the plural is cosmetic.
 */
const toConstName = (propName: string): string =>
  `${propName.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase()}S`;

/**
 * Components take one of two shapes: a flat `<Name>.tsx`, or a compound family
 * folder holding `<Name>.tsx` beside its parts (`CardHeader`, `DialogContent`,
 * …) plus an `index` barrel.
 *
 * Order matters. `<Name>/<Name>.tsx` is tried BEFORE the barrel because the
 * barrel is pure re-exports — reading it finds no `cva` call, so a compound
 * family would silently generate with no variant matrix at all.
 */
const resolveComponentSource = (
  tree: Tree,
  componentsRoot: string,
  name: string,
): { readonly directory: string; readonly source?: string } => {
  const flat = join(componentsRoot, `${name}.tsx`);

  if (tree.exists(flat)) {
    return {
      directory: componentsRoot,
      source: tree.read(flat, 'utf-8') ?? undefined,
    };
  }

  const folder = join(componentsRoot, name);
  const candidates = [`${name}.tsx`, 'index.tsx', 'index.ts'];

  for (const candidate of candidates) {
    const nested = join(folder, candidate);

    if (tree.exists(nested)) {
      return {
        directory: folder,
        source: tree.read(nested, 'utf-8') ?? undefined,
      };
    }
  }

  return { directory: componentsRoot };
};

/**
 * The matrix element's JSX attributes, alphabetised. The repo lints
 * `react/jsx-sort-props` at error, and the ordering depends on the component's
 * own prop names — so it is computed here rather than hardcoded in the
 * template, which would emit unlintable code for most components.
 */
const buildMatrixAttributes = (
  groups: readonly TemplateVariantGroup[],
): string => {
  const keyed = groups.length > 1 ? groups[1].propName : groups[0]?.propName;

  if (!keyed) {
    return '';
  }

  const attributes = [
    `key={${keyed}}`,
    ...groups
      .slice(0, 2)
      .map((group) => `${group.propName}={${group.propName}}`),
  ];

  return attributes.sort((a, b) => (a < b ? -1 : 1)).join(' ');
};

export async function storyGenerator(
  tree: Tree,
  schema: ReactStoryGeneratorSchema,
): Promise<void> {
  const interactive = schema.interactive === true;

  if (interactive) {
    const overview = `This generator will create a Storybook story beside an existing component.`;
    await getGeneratorOverview('React Story', overview);
  }

  const destination = schema.destination;

  const project = destination
    ? (await createProjectGraphAsync()).nodes[destination]
    : interactive
      ? await getReactComponentDestination()
      : undefined;

  if (!project) {
    throw new Error(
      destination
        ? `Invalid destination "${destination}". Use --list=destinations to enumerate valid values.`
        : `Missing required option: "destination". Re-run with --interactive or pass --destination=<nx-project>.`,
    );
  }

  const nameString =
    schema.name ?? (interactive ? await getComponentNames() : undefined);

  if (!nameString) {
    throw new Error(
      `Missing required option: "name". Re-run with --interactive or pass --name=<PascalCase[,MoreNames]>.`,
    );
  }

  const names = parsePossibleNames(nameString);
  const componentsRoot = join(project.data.root, 'src/components');

  for await (const name of names) {
    const { directory, source } = resolveComponentSource(
      tree,
      componentsRoot,
      name,
    );

    if (!source) {
      logger.warn(
        `⚠️  No component source found for "${name}" under ${componentsRoot} — writing a story with no variant matrix.`,
      );
    }

    const variantGroups: readonly TemplateVariantGroup[] = (
      source ? extractCvaVariants(source) : []
    ).map((group) => ({ ...group, constName: toConstName(group.propName) }));

    const templates = join(__dirname, 'files/story');
    const variables = getCommonVariables(name);

    const data = {
      ...variables,
      destination: directory,
      hasChildren: source ? acceptsChildren(source) : false,
      matrixAttributes: buildMatrixAttributes(variantGroups),
      name,
      templates,
      variantGroups,
    };

    if (interactive) {
      await getConfigConfirmation(data);
    }

    generateFiles(tree, templates, directory, data);
  }

  await formatFiles(tree);

  logger.info(`\n✅ Story generated!\n`);
}
