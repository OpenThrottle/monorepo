import * as React from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@openthrottle/react-router-shadcn';
import { PLAN_LIFECYCLE_HOOKS_COPY } from '~/routing/plans/data/data.copy';

export type HookRole = 'after' | 'before';
export type HookScope = 'each' | 'once';
export type HookSource = 'skill' | 'template';

export interface AddHookSubmitPayload {
  role: HookRole;
  scope?: HookScope;
  skillSlug?: string;
  source: HookSource;
  title?: string;
}

export interface AddHookDialogProps {
  /** Plan-level hooks expose the once/each scope toggle; task-level hooks do not. */
  isPlanLevel: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: AddHookSubmitPayload) => void;
  open: boolean;
  pending?: boolean;
  role: HookRole;
}

/**
 * @description Controlled dialog for creating a before/after lifecycle hook.
 * Source (skill|template) and, for plan-level hooks, scope (once|each) are simple
 * segmented buttons; skill hooks require a slug, template hooks take an optional
 * title. Purely presentational — the caller submits the payload via its mutation.
 */
export const AddHookDialog = (
  props: AddHookDialogProps,
): React.ReactElement => {
  // 🪝 Hooks
  const { isPlanLevel, onOpenChange, onSubmit, open, pending, role } = props;
  const [source, setSource] = React.useState<HookSource>('skill');
  const [scope, setScope] = React.useState<HookScope>('once');
  const [skillSlug, setSkillSlug] = React.useState('');
  const [title, setTitle] = React.useState('');

  // ⚙️ Setup
  const copy = PLAN_LIFECYCLE_HOOKS_COPY;
  const submitDisabled =
    pending === true || (source === 'skill' && skillSlug.trim() === '');

  // 🎬 Handlers
  const handleSubmit = React.useCallback(() => {
    if (source === 'skill' && skillSlug.trim() === '') {
      return;
    }

    onSubmit({
      role,
      source,
      ...(isPlanLevel ? { scope } : {}),
      ...(source === 'skill' ? { skillSlug: skillSlug.trim() } : {}),
      ...(source === 'template' && title.trim() !== ''
        ? { title: title.trim() }
        : {}),
    });
  }, [isPlanLevel, onSubmit, role, scope, skillSlug, source, title]);

  // ♻️ Life Cycle
  // Reset the form each time the dialog opens so a prior draft never leaks in.
  React.useEffect(() => {
    if (open) {
      setSource('skill');
      setScope('once');
      setSkillSlug('');
      setTitle('');
    }
  }, [open]);

  // 🔌 Short Circuit

  // 🎨 Markup
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.addDialogTitle}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>{copy.sourceLabel}</Label>
            <div className="flex gap-2">
              <Button
                aria-pressed={source === 'skill'}
                onClick={() => setSource('skill')}
                size="sm"
                type="button"
                variant={source === 'skill' ? 'default' : 'outline'}
              >
                {copy.sourceSkill}
              </Button>
              <Button
                aria-pressed={source === 'template'}
                onClick={() => setSource('template')}
                size="sm"
                type="button"
                variant={source === 'template' ? 'default' : 'outline'}
              >
                {copy.sourceTemplate}
              </Button>
            </div>
          </div>

          {isPlanLevel && (
            <div className="flex flex-col gap-1.5">
              <Label>{copy.scopeLabel}</Label>
              <div className="flex gap-2">
                <Button
                  aria-pressed={scope === 'once'}
                  onClick={() => setScope('once')}
                  size="sm"
                  type="button"
                  variant={scope === 'once' ? 'default' : 'outline'}
                >
                  {copy.scopeOnce}
                </Button>
                <Button
                  aria-pressed={scope === 'each'}
                  onClick={() => setScope('each')}
                  size="sm"
                  type="button"
                  variant={scope === 'each' ? 'default' : 'outline'}
                >
                  {copy.scopeEach}
                </Button>
              </div>
            </div>
          )}

          {source === 'skill' ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="add-hook-skill-slug">{copy.skillSlugLabel}</Label>
              <Input
                id="add-hook-skill-slug"
                onChange={(event) => setSkillSlug(event.target.value)}
                placeholder={copy.skillSlugPlaceholder}
                value={skillSlug}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="add-hook-title">{copy.titleLabel}</Label>
              <Input
                id="add-hook-title"
                onChange={(event) => setTitle(event.target.value)}
                placeholder={copy.titlePlaceholder}
                value={title}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            type="button"
            variant="ghost"
          >
            {copy.cancel}
          </Button>
          <Button
            disabled={submitDisabled}
            onClick={handleSubmit}
            type="button"
          >
            {copy.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
