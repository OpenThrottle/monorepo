import * as React from 'react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@openthrottle/react-router-shadcn';

export interface SettingsEnvironmentProps {
  className?: string;
  envSnapshot: Record<string, string>;
}

export const SettingsEnvironment = (props: SettingsEnvironmentProps) => {
  const { envSnapshot } = props;

  // Hooks

  // Setup

  // Handlers
  const handleCopyEnv = async (): Promise<void> => {
    const text = JSON.stringify(envSnapshot, null, 2);

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">Sanitized env snapshot</CardTitle>
        <Button
          onClick={handleCopyEnv}
          size="sm"
          type="button"
          variant="outline"
        >
          Copy JSON
        </Button>
      </CardHeader>

      <CardContent>
        <div className="max-h-64 overflow-auto rounded-md border">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-muted/80">
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
      </CardContent>
    </Card>
  );
};
