import * as React from 'react';
import { OpenThrottleFieldset } from '@openthrottle/react-router-ui';
import { Button, toast } from '@openthrottle/react-router-shadcn';
import { SquareAsteriskIcon } from 'lucide-react';

export interface SettingsEnvironmentProps {
  className?: string;
  envSnapshot: Record<string, string>;
}

export const SettingsEnvironment = (
  props: SettingsEnvironmentProps,
): React.ReactElement => {
  const { envSnapshot } = props;

  // Hooks

  // Setup

  // Handlers
  const handleCopyEnv = async (): Promise<void> => {
    const text = JSON.stringify(envSnapshot, null, 2);

    try {
      await navigator.clipboard.writeText(text);

      toast.success('Env snapshot copied to clipboard');
    } catch {
      toast.error('Failed to copy env snapshot to clipboard');
    }
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <OpenThrottleFieldset
      icon={SquareAsteriskIcon}
      id="sanitized-env-snapshot"
      legend="Sanitized env snapshot"
    >
      <div>
        <Button
          onClick={handleCopyEnv}
          size="sm"
          type="button"
          variant="outline"
        >
          Copy JSON
        </Button>
        <div className="max-h-64-- overflow-auto rounded-md border">
          <table className="w-full text-left text-xs">
            <thead>
              <tr>
                <th className="p-2 font-medium">Key</th>
                <th className="p-2 font-medium">Value</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(envSnapshot).map(([key, value]) => (
                <tr className="border-t" key={key}>
                  <td className="align-top p-2 font-mono text-muted-foreground">
                    {key}
                  </td>
                  <td className="break-all p-2 font-mono">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </OpenThrottleFieldset>
  );
};
