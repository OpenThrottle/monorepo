import * as React from 'react';
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openthrottle/react-router-shadcn';
import { action as roleDetailAction } from '~/routes/roles.$roleId';
import type { useFetcher } from 'react-router';

export interface AddPermissionSelectFormProps {
  readonly availablePermissions: Array<{ id: string; name: string }>;
  readonly fetcher: ReturnType<typeof useFetcher<typeof roleDetailAction>>;
}

/**
 * @description Add-permission form using shadcn-ui Select; syncs selected value to a hidden input for form submission.
 */
export const AddPermissionSelectForm = (
  props: AddPermissionSelectFormProps,
): React.ReactElement => {
  const { availablePermissions, fetcher } = props;

  // Hooks
  const [permissionId, setPermissionId] = React.useState<string>('');

  // Setup
  const Form = fetcher.Form;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Form method="post">
      <input name="intent" type="hidden" value="addPermission" />
      <input name="permissionId" type="hidden" value={permissionId} />
      <div className="flex items-center gap-2">
        <Select
          onValueChange={setPermissionId}
          value={permissionId || undefined}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Add permission…" />
          </SelectTrigger>
          <SelectContent>
            {availablePermissions.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          disabled={fetcher.state !== 'idle' || !permissionId}
          size="sm"
          type="submit"
        >
          Add
        </Button>
      </div>
    </Form>
  );
};
