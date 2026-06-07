import { OPEN_THROTTLE_GITHUB_URL } from '@openthrottle/react-router-utils';
import {
  BookOpenTextIcon,
  BotIcon,
  BotMessageSquareIcon,
  Code2Icon,
  GaugeCircleIcon,
  InfinityIcon,
  ListIcon,
  NotepadTextIcon,
  SearchIcon,
} from 'lucide-react';

export interface DataFeature {
  description: string;
  icon: React.ElementType;
  link: string;
  title: string;
}

export const FEATURES_DOC_URL = `${OPEN_THROTTLE_GITHUB_URL}/blob/main/docs/openthrottle/features.md`;
export const FEATURES: DataFeature[] = [
  {
    description: `Agentic skills, rules, and commands all in one place, available any sized organization.`,
    icon: BotIcon,
    link: `https://github.com/OpenThrottle/monorepo/tree/main/packages/openthrottle-mcp#readme`,
    title: 'Agentic Tooling',
  },
  {
    description: `Turn an idea or PRD into a plan and tasks in OpenThrottle, then execute one task at a time. Progress lives in OpenThrottle; commit with Plan-Id and Task-Id.`,
    icon: InfinityIcon,
    link: `https://github.com/OpenThrottle/monorepo/tree/main/packages/openthrottle-agentic-workflow#readme`,
    title: 'Agentic Workflows',
  },
  {
    description: `openthrottle-mcp in VSCode or Cursor: ask OpenThrottle, list plans by status, create or edit plans and tasks, semantic search, activity by date, output stream, commit links.`,
    icon: BotMessageSquareIcon,
    link: `https://github.com/OpenThrottle/monorepo/tree/main/packages/openthrottle-mcp#readme`,
    title: 'IDE (MCP) integration',
  },
  {
    description: `Create and manage plans with tasks; track status (pending, in progress, completed, blocked, skipped). List by status and see remaining tasks per plan.`,
    icon: ListIcon,
    link: `https://github.com/OpenThrottle/monorepo/tree/main/packages/openthrottle-mcp#readme`,
    title: 'Plans, tasks, and requirements',
  },
  {
    description: `Semantic search over plans and tasks with pgvector. Ask questions in natural language and get relevant plan and task content.`,
    icon: SearchIcon,
    link: `https://github.com/OpenThrottle/monorepo/tree/main/packages/openthrottle-mcp#readme`,
    title: 'Semantic search',
  },
  {
    description: `Ingest docs and NX project READMEs; search documentation semantically.`,
    icon: BookOpenTextIcon,
    link: `https://github.com/OpenThrottle/monorepo/tree/main/packages/openthrottle-mcp#readme`,
    title: 'Documentation search',
  },
  {
    description: `Activity by date: see what was worked on or shipped. Commit links associate a git commit with a plan and optional task.`,
    icon: ListIcon,
    link: `https://github.com/OpenThrottle/monorepo/tree/main/packages/openthrottle-mcp#readme`,
    title: 'Activity and commit links',
  },
  {
    description: `Web app: view plans (all, in progress), plan counts by status, remaining tasks per plan, recent activity. Sign in and work from the browser.`,
    icon: GaugeCircleIcon,
    link: `https://github.com/OpenThrottle/monorepo/tree/main/packages/openthrottle-mcp#readme`,
    title: 'Dashboard',
  },
  {
    description: `Generate code predictable code with a single command and guide the Agent through the process.`,
    icon: Code2Icon,
    link: `https://github.com/OpenThrottle/monorepo/tree/main/tools/generators#readme`,
    title: 'Generators',
  },
  {
    description: `Quick notes (unstructured thoughts) with optional author; foundation for planning (e.g. create plan from note). Exposed via MCP.`,
    icon: NotepadTextIcon,
    link: `https://github.com/OpenThrottle/monorepo/tree/main/packages/nestjs-repositories#readme`,
    title: 'Notes',
  },
] as const;
