import * as React from 'react';
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openthrottle/react-router-shadcn';
import type { action as userDetailAction } from '~/routes/users.$userId';
import type { useFetcher } from 'react-router';

export interface AssignRoleSelectFormProps {
  readonly availableRoles: Array<{ id: string; name: string }>;
  readonly fetcher: ReturnType<typeof useFetcher<typeof userDetailAction>>;
}

/**
 * @description Assign-role form using shadcn-ui Select; syncs selected value to a hidden input for form submission.
 */
export const AssignRoleSelectForm = (
  props: AssignRoleSelectFormProps,
): React.ReactElement => {
  const { availableRoles, fetcher } = props;

  // Hooks
  const [selectedRoleId, setSelectedRoleId] = React.useState<string>('');

  // Setup
  const Form = fetcher.Form;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Form method="post">
      <input name="intent" type="hidden" value="assignRole" />
      <input name="roleId" type="hidden" value={selectedRoleId} />
      <div className="flex items-center gap-2">
        <Select
          onValueChange={setSelectedRoleId}
          value={selectedRoleId || undefined}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Assign role…" />
          </SelectTrigger>
          <SelectContent>
            {availableRoles.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          disabled={fetcher.state !== 'idle' || !selectedRoleId}
          size="sm"
          type="submit"
        >
          Assign
        </Button>
      </div>
    </Form>
  );
};
