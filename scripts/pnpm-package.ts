import path from 'path';
import { fileURLToPath } from 'url';
import { readFile, writeFile } from 'fs/promises';
import { createExportableManifest } from '@pnpm/exportable-manifest';
import { readProjectManifestOnly } from '@pnpm/read-project-manifest';
import { createLogger } from './lib/index.ts';

const logger = createLogger();

/**
 * pnpm catalogs, keyed by catalog name. The unnamed `catalog:` protocol
 * resolves against the `default` key; named catalogs (`catalog:<name>`) use
 * their own key. Shape matches @pnpm/catalogs.types' `Catalogs`.
 */
type Catalogs = Record<string, Record<string, string>>;

/**
 * @link https://github.com/pnpm/pnpm/issues/5094#issuecomment-1976893401
 * @example
 *
 *      node --experimental-strip-types ./scripts/pnpm-package.ts <PACKAGE_NAME>
 *
 *      NOTE: we're not using the org namespace here
 *            node --experimental-strip-types ./scripts/pnpm-package.ts @visormatt/tester
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const [_first, _second, name] = process.argv;

const parts = name.split('/');
const isTools = parts[0] === 'tools';
const basePath = isTools ? `tools` : `packages`;
const projectName = name.split('/').slice(1).join('/');
const modulesDir = path.join(__dirname, `../node_modules`); // Our "node_modules" folder
const projectDir = path.join(__dirname, `../${basePath}/${projectName}`); // folder of "package.json" to be translated
const distDir = path.join(__dirname, `../${basePath}/${projectName}/dist`); // folder to save the translated one

const workspaceFile = path.join(__dirname, `../pnpm-workspace.yaml`); // catalog source of truth

const _data = { distDir, modulesDir, projectDir, projectName };
logger.step(`Updating "${name}" package.json`);

/**
 * Read the pnpm catalogs from pnpm-workspace.yaml so `catalog:` specs resolve
 * to concrete versions when we build the publishable manifest. Without this,
 * `createExportableManifest` receives no catalogs and throws
 * CATALOG_ENTRY_NOT_FOUND_FOR_SPEC for any dependency that uses `catalog:`.
 *
 * Focused reader (no YAML dependency): parses the top-level `catalog:` (default)
 * and optional `catalogs:` (named) blocks of KEY: VALUE scalars. The whole
 * workspace uses `catalogMode: strict`, so this must stay in sync with the file.
 */
const readWorkspaceCatalogs = async (): Promise<Catalogs> => {
  const text = await readFile(workspaceFile, 'utf8');
  const catalogs: Catalogs = { default: {} };

  // Match `  'name': 'version'` (quotes optional), stripping any inline comment.
  const entryPattern = /^\s+(['"]?)(.+?)\1\s*:\s*(['"]?)(.+?)\3\s*$/;

  let mode: 'default' | 'named' | null = null;
  let currentNamed: string | null = null;

  for (const rawLine of text.split('\n')) {
    // Blank/comment lines never open or close a section.
    if (/^\s*$/.test(rawLine) || /^\s*#/.test(rawLine)) {
      continue;
    }
    if (/^catalog:\s*$/.test(rawLine)) {
      mode = 'default';
      continue;
    }
    if (/^catalogs:\s*$/.test(rawLine)) {
      mode = 'named';
      currentNamed = null;
      continue;
    }
    // Any other top-level (unindented) key ends the catalog section.
    if (/^\S/.test(rawLine)) {
      mode = null;
      currentNamed = null;
      continue;
    }
    if (mode === null) {
      continue;
    }

    if (mode === 'named') {
      // A 2-space `name:` header opens a named catalog block.
      const header = rawLine.match(/^ {2}([A-Za-z0-9_-]+):\s*$/);
      if (header) {
        currentNamed = header[1];
        catalogs[currentNamed] ??= {};
        continue;
      }
    }

    const entry = rawLine.match(entryPattern);
    if (!entry) {
      continue;
    }
    const [, , dependency, , version] = entry;
    if (mode === 'default') {
      catalogs.default[dependency] = version;
    } else if (currentNamed) {
      catalogs[currentNamed][dependency] = version;
    }
  }

  return catalogs;
};

/**
 * Transform our monorepo -> package -> package.json into something that we
 * can publish. This requires swapping instances of "workspace:^" with the
 * correct version number, after versioning updates have been made. We also
 * make use of a "publishConfig" property that PNPM will use to adjust the
 * package.json before publishing, allowing us to update the "main", "module",
 * and "types" fields to be correct for the consumer.
 *
 *    1. First we need to get the package.json for the project
 *    2. Then we need to create the exportable manifest, this is where the swap
 *       from "workspace:" to "#.#.#" happens ~ after ~ versioning updates
 *    3. Delete the "nx" and "publishConfig" properties from the exportable
 *       manifest as its just noise that our consumers don't need to see
 *    4. Write the exportable manifest to the dist folder, and now we've got
 *       a package.json that can be published as a package
 */
const transformPackageJson = async () => {
  const manifest = await readProjectManifestOnly(projectDir);
  const catalogs = await readWorkspaceCatalogs();
  const exportable = await createExportableManifest(projectDir, manifest, {
    catalogs,
    modulesDir,
  });

  // The `nx` and `publishConfig` keys are workspace-only noise consumers don't
  // need; strip them via a record view so no `as` assertion is required.
  const exportableRecord: Record<string, unknown> = exportable;
  delete exportableRecord.nx;
  delete exportableRecord.publishConfig;

  const jsonFormatted = JSON.stringify(exportable, undefined, 2);
  // console.log('📦 Publishable package.json created', jsonFormatted);

  try {
    await writeFile(`${distDir}/package.json`, jsonFormatted);
  } catch (error) {
    logger.fail(`Error "writing" package.json: ${error}`);

    process.exit(1);
  }

  logger.success('Publishable package.json written');
};

/**
 * Run the script
 */
try {
  transformPackageJson();
} catch (error) {
  logger.fail(`Error "transforming" package.json: ${error}`);

  process.exit(1);
}
