import * as React from 'react';
import {
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

export interface AgentsSkillsRegistryProps {
  readonly className?: string;
  readonly entries?: ReadonlyArray<RepoSkillEntry>;
}

function groupByLayout(entries: ReadonlyArray<RepoSkillEntry>): {
  readonly agents: RepoSkillEntry[];
  readonly cursor: RepoSkillEntry[];
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
export function AgentsSkillsRegistry(
  props: AgentsSkillsRegistryProps,
): React.ReactElement {
  const { className, entries = [] } = props;
  const { agents, cursor } = groupByLayout(entries);

  const handleCopyPath = async (path: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(path);
    } catch {
      // ignore
    }
  };

  const renderGrid = (items: readonly RepoSkillEntry[]): React.ReactElement => (
    <ul className="grid gap-3 md:grid-cols-2">
      {items.map((entry) => (
        <li key={`${entry.layout}-${entry.slug}-${entry.repoRelativePath}`}>
          <Card className="h-full bg-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-mono">
                {entry.slug}
              </CardTitle>
              <CardDescription className="text-sm">
                {entry.summary}
              </CardDescription>
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

  return (
    <div className={className ? `space-y-6 ${className}` : 'space-y-6'}>
      <Card className="bg-transparent">
        <CardHeader>
          <CardTitle className="text-base">Skill paths vs repo</CardTitle>
          <CardDescription>
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
      </Card>

      <section className="space-y-4">
        <div>
          <h2 className="mb-1 text-sm font-semibold tracking-tight">
            .agents/skills (OpenThrottle / Ralph)
          </h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Primary registry for automation tied to this monorepo—use when a
            model picks the wrong skill slug or path.
          </p>
          {renderGrid(agents)}
        </div>

        <div>
          <h2 className="mb-1 text-sm font-semibold tracking-tight">
            .cursor/skills (Cursor IDE, in-repo)
          </h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Smaller mirror for Cursor&rsquo;s skill routing; overlapping slugs
            may exist in both trees—compare paths when debugging which file was
            loaded.
          </p>
          {renderGrid(cursor)}
        </div>
      </section>
    </div>
  );
}
