/**
 * @description Lucide icon per catalog `iconHint`. Lucide ships no brand marks,
 * so each connector gets the glyph closest to what it does.
 */

import type { LucideIcon } from 'lucide-react';
import {
  BugIcon,
  CreditCardIcon,
  DatabaseIcon,
  FileTextIcon,
  GitPullRequestIcon,
  HardDriveIcon,
  ListChecksIcon,
  MessageSquareIcon,
  PenToolIcon,
  PlugIcon,
  SquareKanbanIcon,
} from 'lucide-react';

/** Icon for each known catalog `iconHint`. */
export const MCP_CONNECTOR_ICON: Record<string, LucideIcon> = {
  atlassian: SquareKanbanIcon,
  figma: PenToolIcon,
  github: GitPullRequestIcon,
  'google-drive': HardDriveIcon,
  linear: ListChecksIcon,
  notion: FileTextIcon,
  postgres: DatabaseIcon,
  sentry: BugIcon,
  slack: MessageSquareIcon,
  stripe: CreditCardIcon,
};

/** Icon for an `iconHint` the map does not know. */
export const MCP_CONNECTOR_FALLBACK_ICON: LucideIcon = PlugIcon;
