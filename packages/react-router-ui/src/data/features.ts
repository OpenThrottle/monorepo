import {
  getFeatureLink,
  getPublicFeatures,
  isLandedFeature,
  PRODUCT_FEATURES,
} from '@openthrottle/openthrottle-product';
import { OPENTHROTTLE_GITHUB_URL_MONOREPO } from '@openthrottle/react-router-utils';
import {
  BotIcon,
  BotMessageSquareIcon,
  CalendarClockIcon,
  Code2Icon,
  FlaskConicalIcon,
  GaugeCircleIcon,
  GaugeIcon,
  GitBranchIcon,
  GitCommitHorizontalIcon,
  HouseIcon,
  InfinityIcon,
  ListIcon,
  MessageSquareIcon,
  MonitorIcon,
  NotepadTextIcon,
  SearchIcon,
  TerminalIcon,
} from 'lucide-react';

export interface DataFeature {
  description: string;
  icon: React.ElementType;
  link: string;
  title: string;
}

/**
 * @description Icons stay in the UI layer, keyed by registry feature `id`, so
 * `@openthrottle/openthrottle-product` stays dependency-free. An id missing
 * here renders {@link BotIcon}.
 */
const FEATURE_ICONS: Readonly<Record<string, React.ElementType>> = {
  'agent-clis': TerminalIcon,
  'desktop-app': MonitorIcon,
  'developer-app': GaugeCircleIcon,
  evals: FlaskConicalIcon,
  generators: Code2Icon,
  'knowledge-search': SearchIcon,
  'local-first': HouseIcon,
  mcp: BotMessageSquareIcon,
  notes: NotepadTextIcon,
  'plan-runners': InfinityIcon,
  'plans-and-tasks': ListIcon,
  'scheduled-runs': CalendarClockIcon,
  skills: BotIcon,
  'steer-runs': MessageSquareIcon,
  'token-usage': GaugeIcon,
  'work-ledger': GitCommitHorizontalIcon,
  'worktree-isolation': GitBranchIcon,
};

/**
 * @description The public, landed (shipped or preview) entries of the feature
 * registry, shaped for `OpenThrottleProductFeatures`. The registry in
 * `@openthrottle/openthrottle-product` is the source of truth; never add an
 * entry here.
 * @public
 */
export const FEATURES: DataFeature[] = getPublicFeatures(PRODUCT_FEATURES)
  .filter(isLandedFeature)
  .map((feature) => {
    return {
      description: feature.oneLiner,
      icon: FEATURE_ICONS[feature.id] ?? BotIcon,
      link: getFeatureLink(feature, OPENTHROTTLE_GITHUB_URL_MONOREPO),
      title: feature.name,
    };
  });
