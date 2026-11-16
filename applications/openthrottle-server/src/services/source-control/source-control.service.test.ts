import { createMock } from '@golevelup/ts-vitest';
import type { ConfigService } from '@nestjs/config';
import type { GitHubService } from '@openthrottle/nestjs-github';
import { describe, expect, it } from 'vitest';

import { GitHubForgeService } from './github-forge/github-forge.service.ts';
import { GitLabForgeService } from './gitlab-forge/gitlab-forge.service.ts';
import { FORGE_KIND } from './source-control.constants.ts';
import { SourceControlService } from './source-control.service.ts';

const service = new SourceControlService(
  new GitHubForgeService(createMock<GitHubService>()),
  new GitLabForgeService(createMock<ConfigService>()),
);

describe('SourceControlService', () => {
  it('serves the GitHub forge for a payload that names none', () => {
    expect(service.forgeForPayload({ repo: 'a/b' })?.kind).toBe(
      FORGE_KIND.GITHUB,
    );
  });

  it('returns null for a forge with no registered adapter', () => {
    expect(service.forgeForPayload({ forge: 'bitbucket' })).toBeNull();
  });

  it('resolves a github.com remote', () => {
    expect(service.parseRemote('https://github.com/acme/monorepo')).toEqual({
      forge: FORGE_KIND.GITHUB,
      fullName: 'acme/monorepo',
    });
  });

  it('resolves a nested GitLab remote', () => {
    expect(service.parseRemote('https://gitlab.com/group/sub/project')).toEqual(
      { forge: FORGE_KIND.GITLAB, fullName: 'group/sub/project' },
    );
  });

  it('serves the GitLab forge for a gitlab payload', () => {
    expect(service.forgeForPayload({ forge: 'gitlab' })?.kind).toBe(
      FORGE_KIND.GITLAB,
    );
  });
});
