import * as React from 'react';
import { Input, Label } from '@openthrottle/react-router-shadcn';

export interface PlanFormOptionalFieldsProps {
  assignee: string;
  project: string;
  projectId: string;
  status: string;
}

/**
 * @description The plan form's optional single-line inputs. Split out of
 * PlanForm to keep that file under the 210-line cap.
 */
export const PlanFormOptionalFields = (
  props: PlanFormOptionalFieldsProps,
): React.ReactElement => {
  const { assignee, project, projectId, status } = props;

  // Hooks

  // Setup
  const markupOptional = (
    <span className="text-muted-foreground italic">(optional)</span>
  );

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <React.Fragment>
      <div>
        <Label htmlFor="plan-assignee">Assignee {markupOptional}</Label>
        <Input
          defaultValue={assignee}
          id="plan-assignee"
          name="assignee"
          placeholder="e.g. visormatt"
          type="text"
        />
      </div>

      <div>
        <Label htmlFor="plan-project">Project {markupOptional}</Label>
        <Input
          defaultValue={project}
          id="plan-project"
          name="project"
          placeholder="Project name"
          type="text"
        />
      </div>

      <div>
        <Label htmlFor="plan-project-id">Project ID {markupOptional}</Label>
        <Input
          defaultValue={projectId}
          id="plan-project-id"
          name="projectId"
          placeholder="Project UUID"
          type="text"
        />
      </div>

      <div>
        <Label htmlFor="plan-status">Status {markupOptional}</Label>
        <Input
          defaultValue={status}
          id="plan-status"
          name="status"
          placeholder="e.g. PENDING"
          type="text"
        />
      </div>
    </React.Fragment>
  );
};
