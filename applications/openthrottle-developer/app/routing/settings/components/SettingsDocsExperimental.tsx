import * as React from 'react';
import { BookOpenIcon } from 'lucide-react';
import { Label, Separator, Switch } from '@openthrottle/react-router-shadcn';
import { OpenThrottleFieldset } from '@openthrottle/react-router-ui';
import { DOCS_EXPERIMENTAL_ROWS } from '~/routing/settings/config/docs-experimental';
import { useDocsFeatureFlags } from '~/global/hooks/useDocsFeatureFlags';

export interface SettingsDocsExperimentalProps {
  className?: string;
}

/**
 * @description Settings panel that toggles the per-user docs & FAQ presentation
 * upgrades (search, on-page TOC, prev/next, code-copy, rich landing). Each row
 * is a labeled {@link Switch} bound to a {@link useDocsFeatureFlags} flag; a
 * change persists immediately and survives reloads / syncs across tabs.
 */
export const SettingsDocsExperimental = (
  props: SettingsDocsExperimentalProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks
  const [flags, setFlag] = useDocsFeatureFlags();

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <OpenThrottleFieldset
      className={className}
      icon={BookOpenIcon}
      id="docs-experimental"
      legend="Docs (experimental)"
    >
      <div className="space-y-0">
        {DOCS_EXPERIMENTAL_ROWS.map((row, index) => (
          <React.Fragment key={row.key}>
            {index > 0 ? <Separator className="my-4" /> : null}
            <div
              className="flex flex-row items-center justify-between gap-4"
              data-testid={`docs-flag-${row.key}`}
            >
              <div className="space-y-1">
                <Label htmlFor={`docs-flag-${row.key}`}>{row.label}</Label>
                <p className="text-muted-foreground text-sm">
                  {row.description}
                </p>
              </div>
              <Switch
                aria-label={row.label}
                checked={flags[row.key]}
                id={`docs-flag-${row.key}`}
                onCheckedChange={(checked) => setFlag(row.key, checked)}
              />
            </div>
          </React.Fragment>
        ))}
      </div>
    </OpenThrottleFieldset>
  );
};
