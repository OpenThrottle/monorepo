import * as React from 'react';
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
import { githubOpenThrottleMainBlob } from '~/routing/agents/constants/github-repo-paths';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';
import { SKILLS_MODEL_INVOCATION_COPY } from '~/routing/skills/data/data.copy';
import { getModelInvocationBadge } from '~/routing/skills/utils/model-invocation-badge';
import { describeProvenance } from '~/routing/skills/utils/provenance';

export interface AgentsSkillsRegistryGridProps {
  entries: readonly RepoSkillEntry[];
}

/**
 * @description Card grid of repo skill entries (slug, summary, path,
 * availability badges, copy/GitHub actions). Split out of AgentsSkillsRegistry
 * to keep that component under the R6 size cap.
 */
export const AgentsSkillsRegistryGrid = (
  props: AgentsSkillsRegistryGridProps,
): React.ReactElement => {
  const { entries } = props;

  // Hooks

  // Setup

  // Handlers
  const handleCopyPath = async (path: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(path);
    } catch {
      // ignore
    }
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {entries.map((entry) => {
        const staticBadge = getModelInvocationBadge(
          entry.disableModelInvocation,
        );
        const hasResolved = entry.effectiveDisableModelInvocation !== undefined;
        const effectiveBadge = hasResolved
          ? getModelInvocationBadge(entry.effectiveDisableModelInvocation)
          : undefined;

        return (
          <li key={`${entry.layout}-${entry.slug}-${entry.repoRelativePath}`}>
            <Card className="h-full bg-transparent">
              <CardHeader className="pb-2">
                <CardTitle className="font-mono text-base">
                  {entry.slug}
                </CardTitle>
                <CardDescription className="text-sm">
                  {entry.summary}
                </CardDescription>
                <p className="text-muted-foreground pt-1 font-mono text-xs break-all">
                  {entry.repoRelativePath}
                </p>
                {entry.tags !== undefined && entry.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1 pt-2">
                    {entry.tags.map((tag) => (
                      <Badge color="slate" key={tag} size="xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : null}
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
                  {effectiveBadge !== undefined ? (
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
                  ) : null}
                  {entry.provenance !== undefined ? (
                    <div>
                      <dt className="text-muted-foreground">
                        {SKILLS_MODEL_INVOCATION_COPY.provenanceLabel}:{' '}
                        {describeProvenance(entry.provenance)}
                      </dt>
                      <dd
                        className="text-muted-foreground/80 font-mono break-all"
                        title={entry.provenance}
                      >
                        {entry.provenance}
                      </dd>
                    </div>
                  ) : null}
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
          </li>
        );
      })}
    </ul>
  );
};
