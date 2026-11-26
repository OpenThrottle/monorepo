/**
 * @description Computes a registered checkout's diff against its base branch: the merge-base of
 * HEAD and the repo's default branch, measured against the working tree, so committed work,
 * uncommitted edits and untracked files all show. The checkout is resolved by id and owner through
 * `CheckoutPathService`; the client never supplies a filesystem path.
 */

import { Injectable } from '@nestjs/common';

import { CheckoutPathService } from '../../services/checkout-path/checkout-path.service.ts';
import { SourceControlService } from '../../services/source-control/source-control.service.ts';
import {
  DIFF_ARGS,
  MAX_DIFF_FILES,
  MAX_PATCH_CHARS,
  MAX_UNTRACKED_FILES,
} from './checkout-diff.constants.ts';
import { CHECKOUT_DIFF_FILE_STATUS } from './checkout-diff.enum.ts';
import type {
  CheckoutDiffObject,
  CheckoutDiffPullRequestObject,
  CheckoutFileDiffObject,
} from './checkout-diff.object.ts';
import type { CheckoutDiffFile } from './checkout-diff.types.ts';
import {
  buildAddedFilePatch,
  candidateBaseRefs,
  capPatch,
  countTextLines,
  isSafeRelativePath,
  mergeDiffEntries,
  parseNameStatusZ,
  parseNulSeparated,
  parseNumstatZ,
} from './checkout-diff.utils.ts';
import { CheckoutDiffGitService } from './checkout-diff-git/checkout-diff-git.service.ts';

interface DiffContext {
  readonly baseRef: string;
  readonly headBranch: string | null;
  readonly mergeBase: string;
  readonly root: string;
}

interface DiffFiles {
  readonly files: CheckoutDiffFile[];
  readonly filesTruncated: boolean;
  readonly untracked: ReadonlySet<string>;
}

type Prepared =
  | { readonly context: DiffContext; readonly kind: 'ready' }
  | { readonly kind: 'unavailable'; readonly reason: string };

@Injectable()
export class CheckoutDiffService {
  constructor(
    private readonly checkoutPath: CheckoutPathService,
    private readonly git: CheckoutDiffGitService,
    private readonly sourceControl: SourceControlService,
  ) {}

  /** @description The changed-file list, totals and pull request for one owned checkout. */
  async diff(userId: string, checkoutId: string): Promise<CheckoutDiffObject> {
    const prepared = await this.prepare(userId, checkoutId);

    if (prepared.kind === 'unavailable') {
      return unavailableDiff(prepared.reason);
    }

    const { context } = prepared;
    const [{ files, filesTruncated }, pullRequest] = await Promise.all([
      this.listFiles(context),
      this.findPullRequest(context),
    ]);

    return {
      additions: files.reduce((sum, file) => sum + file.additions, 0),
      available: true,
      baseRef: context.baseRef,
      deletions: files.reduce((sum, file) => sum + file.deletions, 0),
      files,
      filesTruncated,
      headBranch: context.headBranch,
      pullRequest,
      reason: null,
    };
  }

  /** @description The unified patch of one file of the diff; `path` must be one of its paths. */
  async fileDiff(
    userId: string,
    checkoutId: string,
    path: string,
  ): Promise<CheckoutFileDiffObject> {
    if (!isSafeRelativePath(path)) {
      return unavailableFileDiff(path, `Not a path inside the checkout.`);
    }

    const prepared = await this.prepare(userId, checkoutId);

    if (prepared.kind === 'unavailable') {
      return unavailableFileDiff(path, prepared.reason);
    }

    const { context } = prepared;
    const { files, untracked } = await this.listFiles(context);
    const file = files.find((candidate) => candidate.path === path);

    if (file === undefined) {
      return unavailableFileDiff(path, `That file is not part of the diff.`);
    }

    if (file.binary) return binaryFileDiff(path);

    if (untracked.has(path)) return this.untrackedPatch(context.root, path);

    const result = await this.git.run(context.root, [
      ...DIFF_ARGS,
      context.mergeBase,
      '--',
      ...(file.previousPath === null ? [path] : [file.previousPath, path]),
    ]);

    if (!result.ok && result.stdout === '') {
      return unavailableFileDiff(path, `git could not produce the patch.`);
    }

    const capped = capPatch(result.stdout, MAX_PATCH_CHARS);

    return {
      available: true,
      binary: false,
      patch: capped.patch,
      path,
      reason: null,
      truncated: capped.truncated || !result.ok,
    };
  }

  private async findPullRequest(
    context: DiffContext,
  ): Promise<CheckoutDiffPullRequestObject | null> {
    const { headBranch, root } = context;

    if (headBranch === null) return null;

    const remote = await this.git.run(root, ['remote', 'get-url', 'origin']);
    const repo = this.sourceControl.parseRemote(
      remote.ok ? remote.stdout.trim() : null,
    );

    if (repo === null) return null;

    const forge = this.sourceControl.forge(repo.forge);

    if (forge === null) return null;

    try {
      const pull = await forge.findPullRequestForBranch(
        repo.fullName,
        headBranch,
      );

      if (pull === null) return null;

      return {
        number: pull.number,
        state: pull.mergedAt === null ? pull.state : 'merged',
        url: forge.pullRequestUrl(repo.fullName, pull.number),
      };
    } catch {
      // A forge outage or missing token must not hide the diff itself.
      return null;
    }
  }

  private async listFiles(context: DiffContext): Promise<DiffFiles> {
    const { mergeBase, root } = context;
    const [numstat, nameStatus, others] = await Promise.all([
      this.git.run(root, [...DIFF_ARGS, '--numstat', '-z', mergeBase]),
      this.git.run(root, [...DIFF_ARGS, '--name-status', '-z', mergeBase]),
      this.git.run(root, ['ls-files', '--others', '--exclude-standard', '-z']),
    ]);
    const tracked = mergeDiffEntries(
      parseNameStatusZ(nameStatus.stdout),
      parseNumstatZ(numstat.stdout),
    );
    const untrackedPaths = parseNulSeparated(others.stdout);
    const untrackedFiles = await Promise.all(
      untrackedPaths.map((path, index) => {
        return this.describeUntracked(root, path, index);
      }),
    );
    const all = [...tracked, ...untrackedFiles].sort((a, b) =>
      a.path.localeCompare(b.path),
    );

    return {
      files: all.slice(0, MAX_DIFF_FILES),
      filesTruncated: all.length > MAX_DIFF_FILES,
      untracked: new Set(untrackedPaths),
    };
  }

  private async describeUntracked(
    root: string,
    path: string,
    index: number,
  ): Promise<CheckoutDiffFile> {
    const added: CheckoutDiffFile = {
      additions: 0,
      binary: false,
      deletions: 0,
      path,
      previousPath: null,
      status: CHECKOUT_DIFF_FILE_STATUS.ADDED,
    };

    if (index >= MAX_UNTRACKED_FILES) return added;

    const read = await this.git.readWorkingFile(root, path);

    if (read.kind === 'binary') return { ...added, binary: true };
    if (read.kind === 'missing') return added;

    return { ...added, additions: countTextLines(read.text) };
  }

  private async untrackedPatch(
    root: string,
    path: string,
  ): Promise<CheckoutFileDiffObject> {
    const read = await this.git.readWorkingFile(root, path);

    if (read.kind === 'missing') {
      return unavailableFileDiff(path, `The file no longer exists.`);
    }

    if (read.kind === 'binary') return binaryFileDiff(path);

    const capped = capPatch(
      buildAddedFilePatch(path, read.text),
      MAX_PATCH_CHARS,
    );

    return {
      available: true,
      binary: false,
      patch: capped.patch,
      path,
      reason: null,
      truncated: capped.truncated,
    };
  }

  private async prepare(userId: string, checkoutId: string): Promise<Prepared> {
    const resolved = await this.checkoutPath.resolve({
      checkoutId,
      ownerUserId: userId,
    });

    if ('error' in resolved) {
      return { kind: 'unavailable', reason: `Checkout not found.` };
    }

    const root = resolved.path;
    const inside = await this.git.run(root, [
      'rev-parse',
      '--is-inside-work-tree',
    ]);

    if (!inside.ok || inside.stdout.trim() !== 'true') {
      return { kind: 'unavailable', reason: `Not a git repository.` };
    }

    const baseRef = await this.resolveBaseRef(root);

    if (baseRef === null) {
      return { kind: 'unavailable', reason: `No base branch found.` };
    }

    const mergeBase = await this.git.run(root, ['merge-base', 'HEAD', baseRef]);

    if (!mergeBase.ok || mergeBase.stdout.trim() === '') {
      return {
        kind: 'unavailable',
        reason: `No common ancestor with ${baseRef}.`,
      };
    }

    const branch = await this.git.run(root, ['branch', '--show-current']);
    const headBranch = branch.ok ? branch.stdout.trim() : '';

    return {
      context: {
        baseRef,
        headBranch: headBranch === '' ? null : headBranch,
        mergeBase: mergeBase.stdout.trim(),
        root,
      },
      kind: 'ready',
    };
  }

  private async resolveBaseRef(root: string): Promise<string | null> {
    const originHead = await this.git.run(root, [
      'symbolic-ref',
      '--short',
      'refs/remotes/origin/HEAD',
    ]);
    const candidates = candidateBaseRefs(
      originHead.ok ? originHead.stdout : null,
    );
    const verified = await Promise.all(
      candidates.map(async (ref) => {
        const result = await this.git.run(root, [
          'rev-parse',
          '--verify',
          '--quiet',
          `${ref}^{commit}`,
        ]);

        return result.ok ? ref : null;
      }),
    );

    return verified.find((ref) => ref !== null) ?? null;
  }
}

function binaryFileDiff(path: string): CheckoutFileDiffObject {
  return {
    available: true,
    binary: true,
    patch: ``,
    path,
    reason: null,
    truncated: false,
  };
}

function unavailableDiff(reason: string): CheckoutDiffObject {
  return {
    additions: 0,
    available: false,
    baseRef: null,
    deletions: 0,
    files: [],
    filesTruncated: false,
    headBranch: null,
    pullRequest: null,
    reason,
  };
}

function unavailableFileDiff(
  path: string,
  reason: string,
): CheckoutFileDiffObject {
  return {
    available: false,
    binary: false,
    patch: ``,
    path,
    reason,
    truncated: false,
  };
}
