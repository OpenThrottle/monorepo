/**
 * @description Push locally built OpenThrottle app images to Google Artifact
 * Registry using the same repository layout as CI
 * (.github/workflows/openthrottle-docker.yml, .github/actions/docker-build-push).
 *
 * Prerequisites:
 *   - Images exist locally (e.g. from monorepo root:
 *     docker compose -f applications/openthrottle/docker-compose.yml build openthrottle-server openthrottle-developer
 *     This tags the same refs as CI (applications/<app>/Dockerfile; see docker-build-push).
 *     Alternative: nx run openthrottle-server:docker-build tags openthrottle-server:local — set
 *     SOURCE_OPENTHROTTLE_SERVER=openthrottle-server:local or docker tag … :latest before push.
 *   Default sources match compose image: lines: openthrottle-server:latest and openthrottle-developer:latest.
 *   - gcloud authenticated for the target GCP project; docker credential helper:
 *     gcloud auth configure-docker us-west2-docker.pkg.dev
 *
 * This script does NOT use GCS for Nx remote cache; it only docker-push'es to
 * Artifact Registry (*.pkg.dev).
 */
import { fileURLToPath } from 'node:url';

import { createLogger, run } from './lib/index.ts';

const logger = createLogger();

export interface ProjectResolution {
  /** Set on refusal/invalid input; the script exits 1 with this message. */
  error?: string;
  projectId?: string;
}

/**
 * Resolve the GCP project from PRODUCTION/OPENTHROTTLE_CONFIRM_PRODUCTION —
 * production requires explicit confirmation
 * (openthrottle-docker.yml: production on main uses
 * GOOGLE_PROJECT_ID_PRODUCTION; else staging).
 */
export const resolveProjectId = (
  env: Record<string, string | undefined>,
): ProjectResolution => {
  const staging = env.GCP_PROJECT_ID_STAGING ?? 'openthrottle-staging';
  const production = env.GCP_PROJECT_ID_PRODUCTION ?? 'openthrottle-production'; // prettier-ignore
  const normalized = (env.PRODUCTION ?? 'false').toLowerCase();

  if (['1', 'true', 'yes'].includes(normalized)) {
    if (env.OPENTHROTTLE_CONFIRM_PRODUCTION !== 'yes') {
      return {
        error: `Refusing to push to production Artifact Registry without OPENTHROTTLE_CONFIRM_PRODUCTION=yes. Set PRODUCTION=true and OPENTHROTTLE_CONFIRM_PRODUCTION=yes only when you intend to push to ${production}.`,
      };
    }

    return { projectId: production };
  }

  if (['', '0', 'false', 'no'].includes(normalized)) {
    return { projectId: staging };
  }

  return { error: `Invalid PRODUCTION='${env.PRODUCTION}' (use true or false).` }; // prettier-ignore
};

const dryRun = (): boolean => process.env.OPENTHROTTLE_DRY_RUN === '1';

const runCmd = (command: string, args: string[]): void => {
  if (dryRun()) {
    logger.detail(`$ ${command} ${args.join(' ')}`);

    return;
  }

  run(command, args, { stdio: 'inherit' });
};

const main = (): void => {
  // Align with openthrottle-docker.yml (ARTIFACT_REGISTRY_REGION).
  const region = process.env.ARTIFACT_REGISTRY_REGION ?? 'us-west2';
  const registryHost = `${region}-docker.pkg.dev`;

  const resolution = resolveProjectId(process.env);

  if (resolution.error !== undefined || resolution.projectId === undefined) {
    logger.fail(resolution.error ?? 'could not resolve a GCP project id');
    process.exit(1);
  }

  // Optional: override the entire registry prefix (no trailing slash).
  const registryPrefix =
    process.env.OPENTHROTTLE_REGISTRY_PREFIX ??
    `${registryHost}/${resolution.projectId}/openthrottle`;

  const shortSha = run('git', ['rev-parse', '--short=7', 'HEAD']).stdout;

  // Source images (local tags) — same names as
  // applications/openthrottle/docker-compose.yml image: lines.
  const sourceServer = process.env.SOURCE_OPENTHROTTLE_SERVER ?? 'openthrottle-server:latest'; // prettier-ignore

  logger.blank();
  logger.info(`Artifact Registry host: ${registryHost}`);
  logger.info(`GCP project:            ${resolution.projectId}`);
  logger.info(`Registry prefix:        ${registryPrefix}`);
  logger.info(`Git short SHA (7):      tags: latest + ${shortSha}`);
  logger.info(`PRODUCTION:             ${process.env.PRODUCTION ?? 'false'}`);
  logger.blank();

  if (dryRun()) {
    logger.step('OPENTHROTTLE_DRY_RUN=1 — printing actions only.');
  }

  // Ensure docker can push to Artifact Registry.
  runCmd('gcloud', ['auth', 'configure-docker', registryHost, '-q']);

  const processApp = (appName: string, sourceRef: string): void => {
    if (!dryRun()) {
      const inspect = run('docker', ['image', 'inspect', sourceRef], { allowFailure: true }); // prettier-ignore

      if (inspect.exitCode !== 0) {
        logger.fail(`Local image not found: ${sourceRef}`);
        logger.detail('Build from repo root, e.g.:');
        logger.detail('  docker compose -f applications/openthrottle/docker-compose.yml build openthrottle-server openthrottle-developer'); // prettier-ignore
        process.exit(1);
      }
    }

    const destBase = `${registryPrefix}/${appName}`;
    const latestRef = `${destBase}:latest`;
    const shaRef = `${destBase}:${shortSha}`;

    logger.step(`Tagging ${sourceRef} → ${latestRef} and ${shaRef}`);
    runCmd('docker', ['tag', sourceRef, latestRef]);
    runCmd('docker', ['tag', sourceRef, shaRef]);

    logger.step(`Pushing ${latestRef}`);
    runCmd('docker', ['push', latestRef]);

    logger.step(`Pushing ${shaRef}`);
    runCmd('docker', ['push', shaRef]);

    logger.blank();
  };

  processApp('openthrottle-server', sourceServer);
  // processApp('openthrottle-developer', process.env.SOURCE_OPENTHROTTLE_DEVELOPER ?? 'openthrottle-developer:latest');

  logger.success(`Done. Images available at ${registryPrefix}/<app>:latest and :${shortSha}`); // prettier-ignore
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
