/**
 * @description Type icon per artifact view-model `iconKey`, for
 * {@link LinkedArtifactRowItem}. Keyed off the parsed view model rather than
 * the raw `type` so an unrecognized type still resolves to the fallback icon.
 * Hoisted out of the component per component-primitive-shape R4.
 */

import type { LucideIcon } from 'lucide-react';
import {
  ArrowRightLeftIcon,
  FileTextIcon,
  GitCommitHorizontalIcon,
  GitPullRequestIcon,
  RocketIcon,
  SplitIcon,
  TagIcon,
} from 'lucide-react';

export const LINKED_ARTIFACT_ICONS: Readonly<Record<string, LucideIcon>> = {
  deployment: RocketIcon,
  document: FileTextIcon,
  git_commit: GitCommitHorizontalIcon,
  plan_promotion: SplitIcon,
  pull_request: GitPullRequestIcon,
  status_change: ArrowRightLeftIcon,
  unknown: TagIcon,
};

/** Fallback for a view model whose icon key is not in the map. */
export const LINKED_ARTIFACT_FALLBACK_ICON: LucideIcon = TagIcon;
