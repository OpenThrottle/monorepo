import * as React from 'react';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { BlocksIcon } from 'lucide-react';

export interface SettingsMcpIntroductionProps {
  className?: string;
}

/**
 * @description Explains the curated MCP connectors catalog and the connect flow.
 */
export const SettingsMcpIntroduction = (
  _props: SettingsMcpIntroductionProps,
): React.ReactElement => {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div>
      <GlobalHeading
        className="mb-4"
        heading="h1"
        icon={BlocksIcon}
        title="MCP connectors"
      />
      <p className="text-muted-foreground text-sm">
        Connect external MCP servers — GitHub, Linear, Notion, and more — so
        OpenThrottle can reach them. Browse the curated catalog below, then
        connect and enable the ones you need.
      </p>
    </div>
  );
};
