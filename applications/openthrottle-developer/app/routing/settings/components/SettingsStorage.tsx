import * as React from 'react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@openthrottle/react-router-shadcn';
import { readStorageEntries } from '~/routing/settings/utils/settings.debug';

export interface SettingsStorageProps {
  className?: string;
}

type StorageEntryRow = {
  key: string;
  preview: string;
};

export const SettingsStorage = (props: SettingsStorageProps) => {
  const { className } = props;

  // Hooks
  const [localEntries, setLocalEntries] = React.useState<StorageEntryRow[]>([]);
  const [sessionEntries, setSessionEntries] = React.useState<StorageEntryRow[]>(
    [],
  );

  // Setup

  // Handlers
  const handleRefreshStorage = (): void => {
    setLocalEntries(readStorageEntries(globalThis.localStorage));
    setSessionEntries(readStorageEntries(globalThis.sessionStorage));
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">Storage: local & session</CardTitle>
        <Button
          onClick={handleRefreshStorage}
          size="sm"
          type="button"
          variant="outline"
        >
          Refresh
        </Button>
      </CardHeader>

      <CardContent className="space-y-4 text-sm">
        <div>
          <p className="mb-2 font-medium text-foreground">local storage</p>
          {localEntries.length === 0 ? (
            <p className="text-muted-foreground">No keys.</p>
          ) : (
            <div className="max-h-48 overflow-auto rounded-md border">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-muted/80">
                  <tr>
                    <th className="p-2 font-medium">Key</th>
                    <th className="p-2 font-medium">Preview</th>
                  </tr>
                </thead>
                <tbody>
                  {localEntries.map((row) => (
                    <tr className="border-t" key={row.key}>
                      <td className="align-top p-2 font-mono text-muted-foreground">
                        {row.key}
                      </td>
                      <td className="break-all p-2 font-mono">{row.preview}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div>
          <p className="mb-2 font-medium text-foreground">session storage</p>
          {sessionEntries.length === 0 ? (
            <p className="text-muted-foreground">No keys.</p>
          ) : (
            <div className="max-h-48 overflow-auto rounded-md border">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-muted/80">
                  <tr>
                    <th className="p-2 font-medium">Key</th>
                    <th className="p-2 font-medium">Preview</th>
                  </tr>
                </thead>
                <tbody>
                  {sessionEntries.map((row) => (
                    <tr className="border-t" key={row.key}>
                      <td className="align-top p-2 font-mono text-muted-foreground">
                        {row.key}
                      </td>
                      <td className="break-all p-2 font-mono">{row.preview}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
