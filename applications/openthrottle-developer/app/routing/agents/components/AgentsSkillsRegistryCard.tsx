import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@openthrottle/react-router-shadcn';
import { ExternalLink } from 'lucide-react';
import * as React from 'react';

import { githubOpenThrottleMainBlob } from '~/routing/agents/constants/github-repo-paths';
import type { RepoSkillEntry } from '~/routing/agents/data/data.repo-skills-registry';
import {
  SKILLS_MODEL_INVOCATION_COPY,
  SKILLS_SOURCE_COPY,
} from '~/routing/skills/data/data.copy';
import { getModelInvocationBadge } from '~/routing/skills/utils/model-invocation-badge';
import { describeProvenance } from '~/routing/skills/utils/provenance';

export interface AgentsSkillsRegistryCardProps {
  entry: RepoSkillEntry;
}

/**
 * @description One repo skill entry as a card (slug, summary, path,
 * availability badges, copy/GitHub actions).
 */
export const AgentsSkillsRegistryCard = (
  props: AgentsSkillsRegistryCardProps,
): React.ReactElement => {
  const { entry } = props;

  // Hooks

  // Setup
  const staticBadge = getModelInvocationBadge(entry.disableModelInvocation);
  const effectiveBadge = getModelInvocationBadge(
    entry.effectiveDisableModelInvocation,
  );
  const hasEffectiveBadge = entry.effectiveDisableModelInvocation !== undefined;
  const isPersonal = entry.isPersonal === true;
  const tags = entry.tags ?? [];
  const hasTags = tags.length > 0;
  const provenance = entry.provenance ?? '';
  const hasProvenance = entry.provenance !== undefined;

  // Handlers
  const handleCopyPath = async (path: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(path);
    } catch {
      // ignore
    }
  };

  // Markup
  const personalBadge = (
    <div className="pt-1">
      <Badge
        color="amber"
        data-testid="skill-personal-badge"
        size="xs"
        title={SKILLS_SOURCE_COPY.personalTooltip}
      >
        {SKILLS_SOURCE_COPY.personalLabel}
      </Badge>
    </div>
  );
  const tagList = (
    <div className="flex flex-wrap gap-1 pt-2">
      {tags.map((tag) => (
        <Badge color="slate" key={tag} size="xs">
          {tag}
        </Badge>
      ))}
    </div>
  );
  const effectiveRow = (
    <div className="flex items-center gap-1.5">
      <dt className="text-muted-foreground">
        {SKILLS_MODEL_INVOCATION_COPY.effectiveLabel}
      </dt>
      <dd>
        <Badge color={effectiveBadge.color} size="xs">
          {effectiveBadge.label}
        </Badge>
      </dd>
    </div>
  );
  const provenanceRow = (
    <div>
      <dt className="text-muted-foreground">
        {SKILLS_MODEL_INVOCATION_COPY.provenanceLabel}:{' '}
        {describeProvenance(provenance)}
      </dt>
      <dd
        className="text-muted-foreground/80 font-mono break-all"
        title={provenance}
      >
        {provenance}
      </dd>
    </div>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card className="h-full bg-transparent">
      <CardHeader className="pb-2">
        <CardTitle className="font-mono text-base">{entry.slug}</CardTitle>
        <CardDescription className="text-sm">{entry.summary}</CardDescription>
        <p className="text-muted-foreground pt-1 font-mono text-xs break-all">
          {entry.repoRelativePath}
        </p>
        {isPersonal ? personalBadge : null}
        {hasTags ? tagList : null}
        <dl className="space-y-1 pt-2 text-xs">
          <div className="flex items-center gap-1.5">
            <dt className="text-muted-foreground">
              {SKILLS_MODEL_INVOCATION_COPY.staticLabel}
            </dt>
            <dd>
              <Badge color={staticBadge.color} size="xs">
                {staticBadge.label}
              </Badge>
            </dd>
          </div>
          {hasEffectiveBadge ? effectiveRow : null}
          {hasProvenance ? provenanceRow : null}
        </dl>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2 pt-0">
        <Button
          className="font-mono text-xs"
          onClick={() => handleCopyPath(entry.repoRelativePath)}
          size="sm"
          type="button"
          variant="outline"
        >
          Copy path
        </Button>
        <Button asChild={true} size="sm" variant="secondary">
          <a
            href={githubOpenThrottleMainBlob(entry.repoRelativePath)}
            rel="noreferrer"
            target="_blank"
          >
            <ExternalLink className="mr-1 h-3.5 w-3.5" />
            View on GitHub
          </a>
        </Button>
      </CardContent>
    </Card>
  );
};
