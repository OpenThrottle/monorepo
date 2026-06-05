import { OPEN_THROTTLE_GITHUB_URL } from '@openthrottle/react-router-utils';
import {
  BookOpenTextIcon,
  GaugeCircleIcon,
  InfinityIcon,
  ListIcon,
  NotepadTextIcon,
  SearchIcon,
} from 'lucide-react';

interface HomeFeature {
  description: string;
  icon: React.ElementType;
  title: string;
}

export const HOME_FEATURES_DOC_URL = `${OPEN_THROTTLE_GITHUB_URL}/blob/main/docs/openthrottle/features.md`;
export const HOME_FEATURES: HomeFeature[] = [
  {
    description: `Create and manage plans with tasks; track status (pending, in progress, completed, blocked, skipped). List by status and see remaining tasks per plan.`,
    icon: ListIcon,
    title: 'Plans and tasks',
  },
  {
    description: `Semantic search over plans and tasks with pgvector. Ask questions in natural language and get relevant plan and task content.`,
    icon: SearchIcon,
    title: 'Semantic search',
  },
  {
    description: `Ingest docs and NX project READMEs; search documentation semantically.`,
    icon: BookOpenTextIcon,
    title: 'Documentation search',
  },
  {
    description: `Activity by date: see what was worked on or shipped. Commit links associate a git commit with a plan and optional task.`,
    icon: ListIcon,
    title: 'Activity and commit links',
  },
  {
    description: `Turn an idea or PRD into a plan and tasks in OpenThrottle, then execute one task at a time. Progress lives in OpenThrottle; commit with Plan-Id and Task-Id.`,
    icon: InfinityIcon,
    title: 'Ralph (agentic execution)',
  },
  {
    description: `openthrottle-mcp in VSCode or Cursor: ask OpenThrottle, list plans by status, create or edit plans and tasks, semantic search, activity by date, output stream, commit links.`,
    icon: ListIcon,
    title: 'IDE (MCP) integration',
  },
  {
    description: `Web app: view plans (all, in progress), plan counts by status, remaining tasks per plan, recent activity. Sign in and work from the browser.`,
    icon: GaugeCircleIcon,
    title: 'Dashboard',
  },
  {
    description: `Quick notes (unstructured thoughts) with optional author; foundation for planning (e.g. create plan from note). Exposed via MCP.`,
    icon: NotepadTextIcon,
    title: 'Notes',
  },
] as const;
