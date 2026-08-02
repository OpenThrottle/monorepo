import * as React from 'react';
import { Button } from '@openthrottle/react-router-shadcn';
import { readStorageEntries } from '~/routing/settings/utils/settings.debug';
import { OpenThrottleFieldset } from '@openthrottle/react-router-ui';
import { DatabaseIcon } from 'lucide-react';

export interface SettingsStorageProps {
  className?: string;
}

type StorageEntryRow = {
  key: string;
  preview: string;
};

export const SettingsStorage = (
  _props: SettingsStorageProps,
): React.ReactElement => {
  // const { className } = props;

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
    <OpenThrottleFieldset
      icon={DatabaseIcon}
      id="storage"
      legend="Storage: local & session"
    >
      <Button
        onClick={handleRefreshStorage}
        size="sm"
        type="button"
        variant="outline"
      >
        Refresh
      </Button>

      <div className="space-y-4 text-sm">
        <div>
          <p className="text-foreground mb-2 font-medium">Local storage</p>
          {localEntries.length === 0 ? (
            <p className="text-muted-foreground">No keys.</p>
          ) : (
            <div className="overflow-auto rounded-md border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/80 sticky top-0">
                  <tr>
                    <th className="p-2 font-medium">Key</th>
                    <th className="p-2 font-medium">Preview</th>
                  </tr>
                </thead>
                <tbody>
                  {localEntries.map((row) => (
                    <tr className="border-t" key={row.key}>
                      <td className="text-muted-foreground p-2 align-top font-mono">
                        {row.key}
                      </td>
                      <td className="p-2 font-mono break-all">{row.preview}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div>
          <p className="text-foreground mb-2 font-medium">Session storage</p>
          {sessionEntries.length === 0 ? (
            <p className="text-muted-foreground">No keys.</p>
          ) : (
            <div className="overflow-auto rounded-md border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/80 sticky top-0">
                  <tr>
                    <th className="p-2 font-medium">Key</th>
                    <th className="p-2 font-medium">Preview</th>
                  </tr>
                </thead>
                <tbody>
                  {sessionEntries.map((row) => (
                    <tr className="border-t" key={row.key}>
                      <td className="text-muted-foreground p-2 align-top font-mono">
                        {row.key}
                      </td>
                      <td className="p-2 font-mono break-all">{row.preview}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </OpenThrottleFieldset>
  );
};
