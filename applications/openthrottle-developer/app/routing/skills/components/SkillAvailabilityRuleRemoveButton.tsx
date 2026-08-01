import * as React from 'react';
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
  Button,
} from '@openthrottle/react-router-shadcn';
import { SKILL_AVAILABILITY_COPY } from '~/routing/skills/data/data.copy';

const COPY = SKILL_AVAILABILITY_COPY.rules;

export interface SkillAvailabilityRuleRemoveButtonProps {
  /** Persisted id of the rule the confirm dialog removes. */
  ruleId: string;
}

/**
 * @description Confirm-gated `removeRule` control for a persisted rule. Split
 * out of SkillAvailabilityRuleForm (component-primitive-shape R6); owns its
 * own fetcher so removal stays independent of the edit form submission.
 */
export const SkillAvailabilityRuleRemoveButton = (
  props: SkillAvailabilityRuleRemoveButtonProps,
): React.ReactElement => {
  const { ruleId } = props;

  // Hooks
  const removeFetcher = useFetcher();

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild={true}>
        <Button type="button" variant="outline">
          {COPY.removeLabel}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{COPY.removeLabel}</AlertDialogTitle>
          <AlertDialogDescription>
            {COPY.removeLabel} — this cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <removeFetcher.Form method="post">
          <input name="intent" type="hidden" value="removeRule" />
          <input name="ruleId" type="hidden" value={ruleId} />
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <Button type="submit" variant="destructive">
              {COPY.removeLabel}
            </Button>
          </AlertDialogFooter>
        </removeFetcher.Form>
      </AlertDialogContent>
    </AlertDialog>
  );
};
