import { Injectable } from '@nestjs/common';

import { GitHubForgeService } from './github-forge/github-forge.service.ts';
import { GitLabForgeService } from './gitlab-forge/gitlab-forge.service.ts';
import { FORGE_KIND } from './source-control.constants.ts';
import type {
  ForgeKind,
  ForgeRepoRef,
  SourceControlForge,
} from './source-control.types.ts';
import {
  forgeKindOfPayload,
  parseForgeRemote,
} from './source-control.utils.ts';

/**
 * @description The one place the work ledger asks "which forge is this repo on, and how do I talk to
 * it". Callers hold a forge kind (from an artifact payload, or a registered repository's remote) and
 * get back a {@link SourceControlForge}; none of them names GitHub any more.
 */
@Injectable()
export class SourceControlService {
  private readonly forges: ReadonlyMap<ForgeKind, SourceControlForge>;

  constructor(
    githubForge: GitHubForgeService,
    private readonly gitlabForge: GitLabForgeService,
  ) {
    this.forges = new Map<ForgeKind, SourceControlForge>([
      [githubForge.kind, githubForge],
      [gitlabForge.kind, gitlabForge],
    ]);
  }

  /** @description The forge for `kind`; null when no adapter is registered for it. */
  forge(kind: ForgeKind): SourceControlForge | null {
    return this.forges.get(kind) ?? null;
  }

  /**
   * @description The forge an artifact payload belongs to (its `forge` field, GitHub when absent);
   * null for an unknown or unregistered forge, so the caller skips the row.
   */
  forgeForPayload(
    payload: Readonly<Record<string, unknown>>,
  ): SourceControlForge | null {
    const kind = forgeKindOfPayload(payload);

    return kind == null ? null : this.forge(kind);
  }

  /** @description A git remote resolved to a repo on a forge this server has an adapter for. */
  parseRemote(url: string | null): ForgeRepoRef | null {
    return parseForgeRemote(url, this.remoteHosts());
  }

  /** Hostname → forge, for every registered forge. */
  private remoteHosts(): Readonly<Record<string, ForgeKind>> {
    const hosts: Record<string, ForgeKind> = {};

    if (this.forges.has(FORGE_KIND.GITHUB)) {
      hosts['github.com'] = FORGE_KIND.GITHUB;
    }

    if (this.forges.has(FORGE_KIND.GITLAB)) {
      hosts[this.gitlabForge.host] = FORGE_KIND.GITLAB;
    }

    return hosts;
  }
}
