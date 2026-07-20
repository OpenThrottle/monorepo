import * as React from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@openthrottle/react-router-shadcn';
import { ExternalLink } from 'lucide-react';
import { githubOpenThrottleMainBlob } from '~/routing/agents/constants/github-repo-paths';
import {
  getRepoSkillsRegistryCounts,
  type RepoSkillEntry,
} from '~/routing/agents/data/repo-skills-registry';
import { SKILLS_MODEL_INVOCATION_COPY } from '~/routing/skills/data/data.copy';
import { getModelInvocationBadge } from '~/routing/skills/utils/model-invocation-badge';
import { describeProvenance } from '~/routing/skills/utils/provenance';

export interface AgentsSkillsRegistryProps {
  className?: string;
  entries?: ReadonlyArray<RepoSkillEntry>;
}

export function filterEntries(
  entries: ReadonlyArray<RepoSkillEntry>,
  query: string,
): RepoSkillEntry[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) {
    return [...entries];
  }
  return entries.filter(
    (e) =>
      e.slug.toLowerCase().includes(q) ||
      e.repoRelativePath.toLowerCase().includes(q) ||
      e.summary.toLowerCase().includes(q),
  );
}

/**
 * @description Lists repo skills discovered under `.agents/skills` (the SSOT view)
 * with GitHub links and copy-friendly paths for debugging misaligned skill picks.
 */
export const AgentsSkillsRegistry = (
  props: AgentsSkillsRegistryProps,
): React.ReactElement => {
  const { className, entries = [] } = props;

  // Hooks
  const [filterQuery, setFilterQuery] = React.useState('');

  // Setup
  const filtered = React.useMemo(
    () => filterEntries(entries, filterQuery),
    [entries, filterQuery],
  );

  const layoutCounts = React.useMemo(
    () => getRepoSkillsRegistryCounts(entries),
    [entries],
  );

  // Handlers
  const handleCopyPath = async (path: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(path);
    } catch {
      // ignore
    }
  };

  // Markup
  const renderGrid = (items: readonly RepoSkillEntry[]): React.ReactElement => (
    <ul className="grid gap-3 md:grid-cols-2">
      {items.map((entry) => {
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

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={className ? `space-y-6 ${className}` : 'space-y-6'}>
      <Card className="bg-transparent">
        <CardHeader>
          <CardTitle className="text-base">Skill paths vs repo</CardTitle>
          <CardDescription>
            This table lists the{' '}
            <span className="text-foreground font-medium">
              {layoutCounts.agents} skills under{' '}
              <code className="text-xs">.agents/skills</code>
            </span>{' '}
            — OpenThrottle&rsquo;s source-of-truth view combining authored{' '}
            <code className="text-xs">skills/</code> and lockfile-installed
            external skills. Match these against files on disk when debugging a
            missing or misrouted skill. Every skill lives at{' '}
            <code className="text-xs">
              .agents/skills/&lt;slug&gt;/SKILL.md
            </code>
            ; per-editor fan-out (e.g.{' '}
            <code className="text-xs">.claude/skills</code>) is generated by
            skill-sync and mirrors this set.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          <Label
            className="text-muted-foreground text-xs"
            htmlFor="skills-registry-filter"
          >
            Filter by slug, path, or summary
          </Label>
          <Input
            autoComplete="off"
            id="skills-registry-filter"
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="e.g. nx-workspace or .agents/skills"
            type="search"
            value={filterQuery}
          />
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-1 text-sm font-semibold tracking-tight">
          .agents/skills (OpenThrottle SSOT)
        </h2>
        <p className="text-muted-foreground mb-3 text-sm">
          Primary registry for automation tied to this monorepo—use when a model
          picks the wrong skill slug or path.
        </p>
        {filtered.length > 0 ? (
          renderGrid(filtered)
        ) : (
          <p className="text-muted-foreground text-sm">
            No matching entries in this section.
          </p>
        )}
      </section>
    </div>
  );
};
