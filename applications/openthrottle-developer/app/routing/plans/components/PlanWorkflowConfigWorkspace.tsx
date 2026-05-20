import * as React from 'react';
import classnames from 'classnames';
import {
  Button,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@openthrottle/react-router-shadcn';
import { FolderOpen, History, X } from 'lucide-react';
import {
  getRecentWorkspacePaths,
  removeRecentWorkspacePath,
  validateWorkspacePathClient,
} from '~/routing/plans/utils/workspace-path';

export interface PlanWorkflowConfigWorkspaceProps {
  className?: string;
  onChange: (path: string) => void;
  value: string;
}

export const PlanWorkflowConfigWorkspace = (
  props: PlanWorkflowConfigWorkspaceProps,
) => {
  const { className, onChange, value } = props;

  // Hooks
  const [recentPaths, setRecentPaths] = React.useState<string[]>([]);
  const [recentOpen, setRecentOpen] = React.useState(false);

  // Setup
  const validationError = validateWorkspacePathClient(value);
  const hasValue = value.trim() !== '';

  // Handlers
  const handleSelectRecent = (path: string): void => {
    onChange(path);
    setRecentOpen(false);
  };

  const handleRemoveRecent = (e: React.MouseEvent, path: string): void => {
    e.stopPropagation();
    removeRecentWorkspacePath(path);
    setRecentPaths(getRecentWorkspacePaths());
  };

  const handleClear = (): void => {
    onChange('');
  };

  // Markup

  // Life Cycle
  React.useEffect(() => {
    setRecentPaths(getRecentWorkspacePaths());
  }, []);

  const handleRecentOpenChange = (open: boolean): void => {
    if (open) {
      setRecentPaths(getRecentWorkspacePaths());
    }
    setRecentOpen(open);
  };

  // 🔌 Short Circuit

  return (
    <fieldset
      aria-labelledby="workflow-run-workspace-legend"
      className={classnames(
        'space-y-3 rounded-md border border-border p-4',
        className,
      )}
      data-testid="PlanWorkflowConfigWorkspace"
    >
      <legend
        className="px-1 text-sm font-medium text-foreground"
        id="workflow-run-workspace-legend"
      >
        Workspace directory
      </legend>
      <p className="text-muted-foreground text-xs">
        Absolute path to a local project folder for multi-workspace runs. When
        empty, the worker uses the monorepo root (
        <code className="text-xs">WORKSPACE_ROOT</code> or{' '}
        <code className="text-xs">process.cwd()</code>). Server validates the
        path exists and is a directory.
      </p>

      <div className="space-y-2">
        <Label htmlFor="workflow-run-workspace-path">Working directory</Label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <FolderOpen
              aria-hidden={true}
              className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              aria-describedby="workflow-run-workspace-path-hint"
              aria-invalid={validationError != null}
              aria-label="Absolute path to workspace directory"
              autoComplete="off"
              className="pl-9 pr-9 font-mono text-xs"
              data-testid="workflow-run-workspace-path-input"
              id="workflow-run-workspace-path"
              onChange={(e) => onChange(e.target.value)}
              placeholder="/Users/matt/Development/my-project"
              spellCheck={false}
              value={value}
            />
            {hasValue && (
              <Button
                aria-label="Clear workspace path"
                className="absolute right-1 top-1/2 -translate-y-1/2 size-7"
                onClick={handleClear}
                size="icon"
                type="button"
                variant="ghost"
              >
                <X aria-hidden={true} className="size-3.5" />
              </Button>
            )}
          </div>

          <Popover onOpenChange={handleRecentOpenChange} open={recentOpen}>
            <PopoverTrigger asChild={true}>
              <Button
                aria-label="Recent workspace paths"
                className="shrink-0"
                data-testid="workflow-run-workspace-recent-trigger"
                size="icon"
                type="button"
                variant="outline"
              >
                <History aria-hidden={true} className="size-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-96 max-w-[90vw] p-0">
              {recentPaths.length === 0 ? (
                <p className="p-3 text-center text-muted-foreground text-xs">
                  No recent workspace paths
                </p>
              ) : (
                <ul className="max-h-60 overflow-y-auto py-1" role="listbox">
                  {recentPaths.map((path) => (
                    <li
                      aria-selected={path === value.trim()}
                      className={classnames(
                        'flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer hover:bg-accent',
                        path === value.trim() && 'bg-accent/50',
                      )}
                      key={path}
                      onClick={() => handleSelectRecent(path)}
                      role="option"
                    >
                      <FolderOpen
                        aria-hidden={true}
                        className="size-3.5 shrink-0 text-muted-foreground"
                      />
                      <span className="flex-1 truncate font-mono">{path}</span>
                      <Button
                        aria-label={`Remove ${path} from recents`}
                        className="size-5 shrink-0 opacity-50 hover:opacity-100"
                        onClick={(e) => handleRemoveRecent(e, path)}
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <X aria-hidden={true} className="size-3" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </PopoverContent>
          </Popover>
        </div>

        <p
          className="text-muted-foreground text-xs"
          id="workflow-run-workspace-path-hint"
        >
          {validationError != null ? (
            <span className="text-destructive">{validationError}</span>
          ) : hasValue ? (
            'Custom workspace directory; server validates on enqueue.'
          ) : (
            'Empty = monorepo root (default).'
          )}
        </p>
      </div>
    </fieldset>
  );
};
