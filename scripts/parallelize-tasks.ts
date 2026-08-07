import { execSync } from 'child_process';

const distributeEvenly = (projects, chunkCount) => {
  const { applications: apps, packages } = splitProjects(projects);
  const chunks: string[][] = new Array(chunkCount).fill([]).map((_) => []);

  while (apps.length) {
    const app = apps.shift();
    const insertInto = getChunkIndex(chunks, chunkCount);

    if (app) chunks[insertInto].push(app);
  }

  while (packages.length) {
    const pkg = packages.shift();
    const insertInto = getChunkIndex(chunks, chunkCount);

    if (pkg) chunks[insertInto].push(pkg);
  }

  return chunks;
};

const getIsPackage = (name) => {
  const prefix = '@';
  const isPackage = name.startsWith(prefix);

  return isPackage;
};

const getChunkIndex = (chunks, chunkCount) => {
  const count = [...chunks].flat().length;
  const insertAt = count % chunkCount;

  return insertAt;
};

const splitProjects = (projects: string[]) => {
  const applications: string[] = projects.filter(
    (project) => !getIsPackage(project),
  );

  const packages: string[] = projects.filter((project) =>
    getIsPackage(project),
  );

  return { applications, packages };
};

const target = process.argv[2];
const jobIndex = Number(process.argv[3]); // TODO: Set this value for testing locally
const jobCount = Number(process.argv[4]); // TODO: Set this value for testing locally

/**
 * First we want to figure out which projects are affected by the changes in the PR.
 */
const affectedCMD = `pnpm nx show projects --affected --json --silent`;
const affectedResult = execSync(affectedCMD, { env: process.env });
const affectedStr = affectedResult.toString('utf-8');

/**
 * Then we want to split the projects into chunks and run them in parallel.
 */
const affected = JSON.parse(affectedStr).sort();
const groups = distributeEvenly(affected, jobCount);
const grouping = groups[jobIndex - 1];

/**
 * Now that we have support for tags, we can exclude the projects that are
 * not a part of this chunk of work.
 *
 * @external https://nx.dev/nx-api/nx/documents/affected#examples (see dotnet example)
 */
if (grouping.length > 0) {
  const tags = grouping.map((project) => `!tag:name:${project}`).join(',');

  console.log(`${tags} codegen-graphql,codegen-react-router`);
  console.log(`${tags} ${target}`);
}
