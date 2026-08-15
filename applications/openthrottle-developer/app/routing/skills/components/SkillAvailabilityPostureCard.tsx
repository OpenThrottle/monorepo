import * as React from 'react';
import clsx from 'clsx';
import { useFetcher } from 'react-router';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Badge,
  Button,
  Card,
  Input,
  Label,
  ToggleGroup,
  ToggleGroupItem,
} from '@openthrottle/react-router-shadcn';
import { getActionError } from '@openthrottle/react-router-utils';
import { SKILL_AVAILABILITY_COPY } from '~/routing/skills/data/data.copy';
import {
  isSkillAvailabilityPosture,
  type SkillAvailabilityPosture,
} from '~/routing/skills/utils/skill-availability';

const COPY = SKILL_AVAILABILITY_COPY.posture;

export interface SkillAvailabilityPostureCardProps {
  readonly className?: string;
  /** True when the project already has a rule set (enables reset-to-passthrough). */
  readonly hasRuleSet: boolean;
  /** The saved posture, or null when the project is in passthrough (no rule set). */
  readonly posture: SkillAvailabilityPosture | null;
}

/**
 * @description The per-project posture control (design rung 3). Explains passthrough vs. allow vs.
 * default-deny, lets the author save a posture (`upsertRuleSet`), and — when a rule set exists —
 * reset the project back to passthrough (`deleteRuleSet`). Posture is not environment-qualified in
 * v1, so exactly one value applies per project.
 */
export const SkillAvailabilityPostureCard = (
  props: SkillAvailabilityPostureCardProps,
): React.ReactElement => {
  const { className, hasRuleSet, posture } = props;

  // Hooks
  const fetcher = useFetcher();
  const [selected, setSelected] = React.useState<SkillAvailabilityPosture>(
    posture ?? 'allow',
  );

  // Setup
  const isSubmitting = fetcher.state !== 'idle';
  const error = getActionError(fetcher.data);
  const postureNote =
    selected === 'deny' ? COPY.postureDenyNote : COPY.postureAllowNote;

  // Handlers
  const handleValueChange = (value: string): void => {
    if (isSkillAvailabilityPosture(value)) {
      setSelected(value);
    }
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card
      className={clsx('flex flex-col gap-4 p-6', className)}
      data-testid="SkillAvailabilityPostureCard"
    >
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">{COPY.heading}</h2>
        {hasRuleSet ? (
          <Badge variant="secondary">{posture}</Badge>
        ) : (
          <Badge variant="outline">passthrough</Badge>
        )}
      </div>

      {hasRuleSet ? null : (
        <p className="text-muted-foreground text-sm">{COPY.passthroughNote}</p>
      )}

      <fetcher.Form className="flex flex-col gap-3" method="post">
        <input name="intent" type="hidden" value="upsertRuleSet" />
        <input name="posture" type="hidden" value={selected} />

        <Label>{COPY.heading}</Label>
        <ToggleGroup
          aria-label={COPY.heading}
          onValueChange={handleValueChange}
          type="single"
          value={selected}
        >
          <ToggleGroupItem value="allow">{COPY.allowLabel}</ToggleGroupItem>
          <ToggleGroupItem value="deny">{COPY.denyLabel}</ToggleGroupItem>
        </ToggleGroup>

        <p className="text-muted-foreground text-sm">{postureNote}</p>

        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}

        <div>
          <Button disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Saving…' : COPY.saveLabel}
          </Button>
        </div>
      </fetcher.Form>

      {hasRuleSet ? (
        <AlertDialog>
          <AlertDialogTrigger asChild={true}>
            <Button type="button" variant="outline">
              {COPY.resetLabel}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{COPY.resetConfirmTitle}</AlertDialogTitle>
              <AlertDialogDescription>
                {COPY.resetConfirmBody}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <fetcher.Form method="post">
              <Input name="intent" type="hidden" value="deleteRuleSet" />
              <AlertDialogFooter>
                <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
                <Button
                  disabled={isSubmitting}
                  type="submit"
                  variant="destructive"
                >
                  {COPY.resetLabel}
                </Button>
              </AlertDialogFooter>
            </fetcher.Form>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </Card>
  );
};
