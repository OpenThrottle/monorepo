/**
 * @description Reads affected project names as JSON on stdin (from
 * `nx show projects --affected --json`), intersects with INPUT_APPS, and
 * appends step outputs to GITHUB_OUTPUT. Emits one `build-<app>` boolean per
 * configured app (no hardcoded project names).
 */
import { appendFileSync, readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

/**
 * @description Parses `apps` input: comma-separated list or JSON array string.
 */
const parseAppsInput = (input) => {
  const trimmed = (input ?? '').trim();
  if (!trimmed) {
    return [];
  }
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed
        .map((item) => String(item).trim())
        .filter(Boolean);
    } catch {
      return [];
    }
  }
  return trimmed
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};

const configuredApps = parseAppsInput(process.env.INPUT_APPS);

const rawAffected = (() => {
  try {
    const raw = readFileSync(0, 'utf8').trim();
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
})();

const affected = Array.isArray(rawAffected) ? rawAffected : [];

const affectedSet = new Set(affected);
const hit = configuredApps.filter((a) => affectedSet.has(a));

const appsJson = JSON.stringify(hit);
const matrixJson = JSON.stringify({
  include: hit.map((app) => ({ app })),
});

const buildFlags = Object.fromEntries(
  configuredApps.map((app) => [app, affectedSet.has(app)]),
);
const buildFlagsSerialized = JSON.stringify(buildFlags);

const out = process.env.GITHUB_OUTPUT;
if (!out) {
  console.error('GITHUB_OUTPUT is not set');
  process.exit(1);
}

/**
 * @description Writes a multiline value to GITHUB_OUTPUT (required when the
 * value may contain newlines or special characters).
 */
const writeMultiline = (name, value) => {
  const delim = randomUUID();
  appendFileSync(out, `${name}<<${delim}\n${value}\n${delim}\n`);
};

writeMultiline('affected-apps-json', appsJson);
writeMultiline('matrix-json', matrixJson);
writeMultiline('build-flags-json', buildFlagsSerialized);

for (const app of configuredApps) {
  appendFileSync(out, `build-${app}=${affectedSet.has(app)}\n`);
}
