import path from 'path';
import { fileURLToPath } from 'url';
import { writeFile } from 'fs/promises';
import { createExportableManifest } from '@pnpm/exportable-manifest';
import { readProjectManifestOnly } from '@pnpm/read-project-manifest';

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

const _data = { distDir, modulesDir, projectDir, projectName };
console.log(`📦 Updating "${name}" package.json`);

/**
 * Transform our monorepo -> package -> package.json into something that we
 * can publish. This requires swapping instances of "workspace:*" with the
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
  const exportable = await createExportableManifest(projectDir, manifest, {
    catalogs: [],
    modulesDir,
  });

  if ('nx' in exportable) {
    delete (exportable as { nx?: unknown }).nx;
  }
  if (exportable.publishConfig) delete exportable.publishConfig;

  const jsonFormatted = JSON.stringify(exportable, undefined, 2);
  // console.log('📦 Publishable package.json created', jsonFormatted);

  try {
    await writeFile(`${distDir}/package.json`, jsonFormatted);
  } catch (error) {
    console.error('🚨 Error "writing" package.json', { error });

    process.exit(1);
  }

  console.log('✅ Publishable package.json written');
};

/**
 * Run the script
 */
try {
  transformPackageJson();
} catch (error) {
  console.error('🚨 Error "transforming" package.json', { error });

  process.exit(1);
}
