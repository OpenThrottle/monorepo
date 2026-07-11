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

export function groupByLayout(entries: ReadonlyArray<RepoSkillEntry>): {
  agents: RepoSkillEntry[];
  cursor: RepoSkillEntry[];
} {
  const agents: RepoSkillEntry[] = [];
  const cursor: RepoSkillEntry[] = [];

  for (const entry of entries) {
    if (entry.layout === 'cursor') {
      cursor.push(entry);
    } else {
      agents.push(entry);
    }
  }

  return { agents, cursor };
}

/**
 * @description Maps repo `.agents/skills` and `.cursor/skills` layouts to GitHub links and copy-friendly paths for debugging misaligned skill picks.
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

  const { agents, cursor } = groupByLayout(filtered);

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
      {items.map((entry) => (
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
      ))}
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
            This table lists{' '}
            <span className="text-foreground font-medium">
              {layoutCounts.agents} skills under{' '}
              <code className="text-xs">.agents/skills</code>
            </span>{' '}
            and{' '}
            <span className="text-foreground font-medium">
              {layoutCounts.cursor} under{' '}
              <code className="text-xs">.cursor/skills</code>
            </span>{' '}
            —match those counts to files on disk when debugging missing entries.
            Cursor resolves skills from repo-relative paths. OpenThrottle
            registers skills under{' '}
            <code className="text-xs">
              .agents/skills/&lt;slug&gt;/SKILL.md
            </code>{' '}
            (Ralph / OT MCP) and ships a subset under{' '}
            <code className="text-xs">
              .cursor/skills/&lt;slug&gt;/SKILL.md
            </code>{' '}
            for Cursor IDE routing. User-local skills under{' '}
            <code className="text-xs">~/.cursor/skills-cursor</code> are not
            listed here.
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

      <section className="space-y-8">
        <div>
          <h2 className="mb-1 text-sm font-semibold tracking-tight">
            .agents/skills (OpenThrottle / Ralph)
          </h2>
          <p className="text-muted-foreground mb-3 text-sm">
            Primary registry for automation tied to this monorepo—use when a
            model picks the wrong skill slug or path.
          </p>
          {agents.length > 0 ? (
            renderGrid(agents)
          ) : (
            <p className="text-muted-foreground text-sm">
              No matching entries in this section.
            </p>
          )}
        </div>

        <div>
          <h2 className="mb-1 text-sm font-semibold tracking-tight">
            .cursor/skills (Cursor IDE, in-repo)
          </h2>
          <p className="text-muted-foreground mb-3 text-sm">
            Smaller mirror for Cursor&rsquo;s skill routing; overlapping slugs
            may exist in both trees—compare paths when debugging which file was
            loaded.
          </p>
          {cursor.length > 0 ? (
            renderGrid(cursor)
          ) : (
            <p className="text-muted-foreground text-sm">
              No matching entries in this section.
            </p>
          )}
        </div>
      </section>
    </div>
  );
};
