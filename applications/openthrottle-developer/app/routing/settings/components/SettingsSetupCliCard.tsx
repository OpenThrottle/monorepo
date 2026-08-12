import * as React from 'react';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@openthrottle/react-router-shadcn';
import type { AgentCliStatus } from '~/routing/settings/data/agent-clis.data';

export interface SettingsSetupCliCardProps {
  /**
   * Install/update controls rendered in the card footer. A seam for the gated follow-up task; the
   * read-only status view leaves it undefined and renders no footer.
   */
  actions?: React.ReactNode;
  status: AgentCliStatus;
}

export const SettingsSetupCliCard = (
  props: SettingsSetupCliCardProps,
): React.ReactElement => {
  const { actions, status } = props;

  // Hooks

  // Setup
  const { backend, installed, label, models, version } = status;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card className="flex flex-col" data-testid="SettingsSetupCliCard">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle>{label}</CardTitle>
          {installed ? (
            <Badge variant="secondary">Installed</Badge>
          ) : (
            <Badge variant="outline">Not installed</Badge>
          )}
        </div>
        <CardDescription>
          <code className="text-xs">{backend}</code>
          {installed && version != null ? (
            <span className="ml-2">{version}</span>
          ) : null}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        {installed ? (
          models.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {models.map((model) => (
                <Badge key={model} variant="outline">
                  {model}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No machine-listable models.
            </p>
          )
        ) : (
          <p className="text-muted-foreground text-sm">
            Not detected on the server host.
          </p>
        )}
      </CardContent>

      {actions != null ? <CardFooter>{actions}</CardFooter> : null}
    </Card>
  );
};
