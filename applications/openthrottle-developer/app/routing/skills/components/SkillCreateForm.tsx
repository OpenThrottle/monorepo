import * as React from 'react';
import clsx from 'clsx';
import { Link } from 'react-router';
import { EditorWindow } from '@openthrottle/react-router-editor';
import { Button, Input, Label } from '@openthrottle/react-router-shadcn';
import { SkillCreateDestinationField } from '~/routing/skills/components/SkillCreateDestinationField';
import { SKILL_CREATE_COPY } from '~/routing/skills/data/data.copy';
import type { UseSkillCreateFormResult } from '~/routing/skills/hooks/useSkillCreateForm';

export interface SkillCreateFormProps {
  className?: string;
  /** Structured refusal from the route action; rendered inline, never thrown. */
  error?: string;
  form: UseSkillCreateFormResult;
}

/**
 * @description Create-skill form body: the metadata fields, the destination
 * choice, and the SKILL.md editor. All state and handlers come from
 * `useSkillCreateForm` via `form`, per route-primitive-shape R4.
 */
export const SkillCreateForm = (
  props: SkillCreateFormProps,
): React.ReactElement => {
  const { className, error, form } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={clsx('flex h-full w-full flex-col gap-6', className)}
      data-testid="SkillCreateForm"
    >
      {/*
      <p className="text-muted-foreground text-sm">
        {SKILL_CREATE_COPY.introduction}
      </p>
      */}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="skill-create-slug">
            {SKILL_CREATE_COPY.nameFieldLabel}
          </Label>
          <Input
            aria-describedby="skill-create-slug-description"
            aria-invalid={form.slugError !== undefined}
            id="skill-create-slug"
            onChange={(event) => form.setSlug(event.target.value)}
            placeholder="my-new-skill"
            required={true}
            type="text"
            value={form.slug}
          />
          {form.slugError === undefined ? (
            <p
              className="text-muted-foreground text-xs"
              id="skill-create-slug-description"
            >
              {SKILL_CREATE_COPY.nameFieldDescription}
            </p>
          ) : (
            <p
              className="text-destructive text-xs"
              id="skill-create-slug-description"
              role="alert"
            >
              {form.slugError}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 md:col-span-2">
          <Label htmlFor="skill-create-description">
            {SKILL_CREATE_COPY.descriptionFieldLabel}
          </Label>
          <Input
            aria-describedby="skill-create-description-description"
            id="skill-create-description"
            onChange={(event) => form.setDescription(event.target.value)}
            required={true}
            type="text"
            value={form.description}
          />
          <p
            className="text-muted-foreground text-xs"
            id="skill-create-description-description"
          >
            {SKILL_CREATE_COPY.descriptionFieldDescription}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="skill-create-tags">
            {SKILL_CREATE_COPY.tagsFieldLabel}
          </Label>
          <Input
            aria-describedby="skill-create-tags-description"
            id="skill-create-tags"
            onChange={(event) => form.setTags(event.target.value)}
            placeholder="backend, testing"
            type="text"
            value={form.tags}
          />
          <p
            className="text-muted-foreground text-xs"
            id="skill-create-tags-description"
          >
            {SKILL_CREATE_COPY.tagsFieldDescription}
          </p>
        </div>

        <SkillCreateDestinationField
          betaPreviewEnabled={form.betaPreviewEnabled}
          className="md:col-span-2"
          onChange={form.setDestination}
          value={form.destination}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <Label>{SKILL_CREATE_COPY.editorLabel}</Label>
          <span className="text-muted-foreground text-xs">
            {form.editorPath}
          </span>
        </div>
        <div
          className="ui-border flex h-[50vh] flex-col overflow-hidden rounded-lg border"
          data-testid="skill-create-editor"
        >
          {/* Both `path` and `value` — Monaco keys one text model per path, so
              swapping the document without the path bleeds undo/redo state. */}
          <EditorWindow
            className="flex-1"
            language="markdown"
            onChange={form.handleEditorChange}
            path={form.editorPath}
            value={form.content}
          />
        </div>
      </div>

      {error === undefined ? null : (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        <Button asChild={true} variant="ghost">
          <Link to="/skills">{SKILL_CREATE_COPY.cancelLabel}</Link>
        </Button>
        <Button
          disabled={!form.canSubmit || form.isSubmitting}
          onClick={form.handleSubmit}
        >
          {form.isSubmitting
            ? SKILL_CREATE_COPY.submittingLabel
            : SKILL_CREATE_COPY.submitLabel}
        </Button>
      </div>
    </div>
  );
};
