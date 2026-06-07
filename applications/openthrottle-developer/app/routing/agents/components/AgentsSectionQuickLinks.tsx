import * as React from 'react';
import { Link } from 'react-router';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@openthrottle/react-router-shadcn';
import { BrainCircuitIcon, BrainIcon, FileChartColumn } from 'lucide-react';

export interface AgentsSectionQuickLinksProps {}

/**
 * @deprecated Temporarily removed from skills/prompts index routes; restore when re-enabling commented JSX.
 * @description Cross-links the Agents sidebar routes (Prompts, Skills, Usage) with one-line guidance for analytics gaps, prompt versioning, and repo skill paths.
 */
export const AgentsSectionQuickLinks = (
  _props: AgentsSectionQuickLinksProps,
): React.ReactElement => {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card className="mb-6 bg-transparent">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Agents workspace</CardTitle>
        <CardDescription>
          These three routes answer different questions—use them together when
          debugging automation, skills, and workload.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-4 text-sm sm:grid-cols-3">
          <li>
            <Link
              className="flex items-center gap-2 font-medium text-foreground"
              to="/prompts"
            >
              <BrainIcon aria-hidden={true} className="h-4 w-4 shrink-0" />
              Prompts
            </Link>
            <p className="mt-1 text-muted-foreground">
              Open a prompt for{' '}
              <span className="font-medium text-foreground">Prompt</span>{' '}
              versioning and debug: IDs, content fingerprints, repo{' '}
              <code className="text-xs">filePath</code>, and a JSON snapshot for
              tickets.
            </p>
          </li>
          <li>
            <Link
              className="flex items-center gap-2 font-medium text-foreground"
              to="/skills"
            >
              <BrainCircuitIcon
                aria-hidden={true}
                className="h-4 w-4 shrink-0"
              />
              Skills
            </Link>
            <p className="mt-1 text-muted-foreground">
              In-repo paths under{' '}
              <code className="text-xs">.agents/skills</code> and{' '}
              <code className="text-xs">.cursor/skills</code>—match slugs to
              files when the IDE or runner picks the wrong skill.
            </p>
          </li>
          <li>
            <Link
              className="flex items-center gap-2 font-medium text-foreground"
              to="/usage"
            >
              <FileChartColumn
                aria-hidden={true}
                className="h-4 w-4 shrink-0"
              />
              Usage
            </Link>
            <p className="mt-1 text-muted-foreground">
              Coarse daily OpenThrottle activity only—no per-prompt or token
              metrics. Copy the JSON snapshot to compare environments on a
              support thread.
            </p>
          </li>
        </ul>
      </CardContent>
    </Card>
  );
};
