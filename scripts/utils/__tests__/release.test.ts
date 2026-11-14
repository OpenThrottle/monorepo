import { describe, expect, it } from 'vitest';

import {
  collectVersionChanges,
  extractChangelogSection,
  insertVersionTable,
  isReleaseCommit,
  planBaselineTags,
  readGroupPatterns,
  readManifestVersion,
  releasePrTitle,
  releaseTagName,
  releaseTitle,
  renderVersionTable,
  resolveProductVersion,
} from '../release.ts';

const PROJECTS = [
  { name: 'monorepo', root: '.', version: '4.5.0' },
  { name: 'openthrottle-server', root: 'applications/openthrottle-server', version: '1.3.0' }, // prettier-ignore
];

describe('releaseTagName', () => {
  it('joins project and version with @', () => {
    expect(releaseTagName('openthrottle-server', '1.3.0')).toBe('openthrottle-server@1.3.0'); // prettier-ignore
  });
});

describe('readManifestVersion', () => {
  it('reads the version field', () => {
    expect(readManifestVersion('{"name":"x","version":"1.2.3"}')).toBe('1.2.3');
  });

  it.each(['{"name":"x"}', '{"version":""}', '{"version":3}', 'not json'])(
    'returns undefined for %s',
    (contents) => {
      expect(readManifestVersion(contents)).toBeUndefined();
    },
  );
});

describe('readGroupPatterns', () => {
  it('returns the group project patterns', () => {
    const nxJson = JSON.stringify({ release: { groups: { applications: { projects: ['monorepo', 'tag:type:application'] } } } }); // prettier-ignore

    expect(readGroupPatterns(nxJson, 'applications')).toEqual(['monorepo', 'tag:type:application']); // prettier-ignore
  });

  it('returns an empty list when the group is missing', () => {
    expect(readGroupPatterns('{"release":{}}', 'applications')).toEqual([]);
  });
});

describe('planBaselineTags', () => {
  it('splits existing from missing tags', () => {
    const plan = planBaselineTags(PROJECTS, new Set(['monorepo@4.5.0']));

    expect(plan).toEqual({ existing: ['monorepo@4.5.0'], missing: ['openthrottle-server@1.3.0'] }); // prettier-ignore
  });

  it('reports nothing missing when every tag exists', () => {
    const plan = planBaselineTags(PROJECTS, new Set(['monorepo@4.5.0', 'openthrottle-server@1.3.0'])); // prettier-ignore

    expect(plan.missing).toEqual([]);
  });
});

describe('collectVersionChanges', () => {
  it('keeps bumped projects, product first, then alphabetical', () => {
    const changes = collectVersionChanges({
      monorepo: { currentVersion: '4.5.0', newVersion: '4.6.0' },
      'openthrottle-admin': { currentVersion: '1.0.0', newVersion: null },
      'openthrottle-app': { currentVersion: '1.0.0', newVersion: '1.1.0' },
      'openthrottle-cms': { currentVersion: '1.0.0', newVersion: '1.0.1' },
    });

    expect(changes.map((change) => change.name)).toEqual(['monorepo', 'openthrottle-app', 'openthrottle-cms']); // prettier-ignore
  });

  it('drops a project whose new version equals its current one', () => {
    expect(collectVersionChanges({ a: { currentVersion: '1.0.0', newVersion: '1.0.0' } })).toEqual([]); // prettier-ignore
  });
});

describe('resolveProductVersion', () => {
  it('uses the bumped product version', () => {
    expect(resolveProductVersion([{ from: '4.5.0', name: 'monorepo', to: '4.6.0' }], '4.5.0')).toBe('4.6.0'); // prettier-ignore
  });

  it('falls back to the current product version', () => {
    expect(resolveProductVersion([{ from: '1.0.0', name: 'openthrottle-app', to: '1.1.0' }], '4.5.0')).toBe('4.5.0'); // prettier-ignore
  });
});

describe('releasePrTitle and isReleaseCommit', () => {
  it('round-trips, including the squash suffix', () => {
    expect(isReleaseCommit(`${releasePrTitle('4.6.0')} (#801)`)).toBe(true);
  });

  it('rejects other chore commits', () => {
    expect(isReleaseCommit('chore(monorepo): bump deps')).toBe(false);
  });
});

describe('insertVersionTable', () => {
  const table = renderVersionTable([{ from: '1.0.0', name: 'openthrottle-app', to: '1.1.0' }]); // prettier-ignore

  it('inserts the table under the version heading', () => {
    const result = insertVersionTable('## 4.6.0 (2026-11-14)\n\n### Features', '4.6.0', table); // prettier-ignore

    expect(result.split('\n').slice(0, 3)).toEqual(['## 4.6.0 (2026-11-14)', '', '| Project | From | To |']); // prettier-ignore
  });

  it('leaves the changelog alone when the heading is missing', () => {
    expect(insertVersionTable('## 4.5.0', '4.6.0', table)).toBe('## 4.5.0');
  });
});

describe('extractChangelogSection', () => {
  const changelog = ['## 1.4.0 (2026-11-14)', '', '### Fixes', '', '- a fix', '', '## 1.3.0 (2026-10-01)', '', '- old'].join('\n'); // prettier-ignore

  it('returns the section body up to the next heading', () => {
    expect(extractChangelogSection(changelog, '1.4.0')).toBe(
      '### Fixes\n\n- a fix',
    );
  });

  it('returns the last section to the end of the file', () => {
    expect(extractChangelogSection(changelog, '1.3.0')).toBe('- old');
  });

  it('returns undefined for a missing version', () => {
    expect(extractChangelogSection(changelog, '9.9.9')).toBeUndefined();
  });
});

describe('releaseTitle', () => {
  it('names the product release OpenThrottle', () => {
    expect(releaseTitle('monorepo', '4.6.0')).toBe('OpenThrottle 4.6.0');
  });

  it('uses the tag for an application', () => {
    expect(releaseTitle('openthrottle-server', '1.4.0')).toBe('openthrottle-server@1.4.0'); // prettier-ignore
  });
});
