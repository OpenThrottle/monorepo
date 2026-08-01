import * as React from 'react';
import { Link } from 'react-router';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@openthrottle/react-router-shadcn';
import type { RolloutFlagFieldsFragment } from '~/__generated__/graphql';
import { ROLLOUT_COPY } from '~/routing/settings/data/data.copy';
import { formatRolloutTimestamp } from '~/routing/settings/utils/rollout-flag-format';

export interface RolloutFlagDetailProps {
  editTo: string;
  flag: RolloutFlagFieldsFragment;
}

/**
 * @description Read-only detail card for a single rollout feature flag.
 */
export const RolloutFlagDetail = (
  props: RolloutFlagDetailProps,
): React.ReactElement => {
  const { editTo, flag } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card data-testid="RolloutFlagDetail">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="font-mono text-base">{flag.key}</CardTitle>
            <CardDescription>
              {flag.description ?? 'No description.'}
            </CardDescription>
          </div>
          <Button asChild={true} type="button" variant="outline">
            <Link to={editTo}>{ROLLOUT_COPY.editButton}</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs">
            {ROLLOUT_COPY.enabledLabel}
          </p>
          <Badge variant={flag.enabled ? 'default' : 'secondary'}>
            {flag.enabled ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>

        <div className="space-y-1">
          <p className="text-muted-foreground text-xs">
            {ROLLOUT_COPY.targetRolesLabel}
          </p>
          {flag.targetRoles.length === 0 ? (
            <span className="text-sm">Everyone (untargeted)</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {flag.targetRoles.map((role) => (
                <Badge key={role} variant="outline">
                  {role}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="text-muted-foreground text-xs">
          Updated {formatRolloutTimestamp(flag.updatedAt)} · Created{' '}
          {formatRolloutTimestamp(flag.createdAt)}
        </div>
      </CardContent>
    </Card>
  );
};
