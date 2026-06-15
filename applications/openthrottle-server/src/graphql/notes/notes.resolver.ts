/**
 * @description Resolver for Note queries and mutations. Injects NotesService from @openthrottle/nestjs-repositories and maps entities to NoteObject.
 */

import type { Note } from '@openthrottle/nestjs-repositories';
import { NotesService } from '@openthrottle/nestjs-repositories';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CreateNoteInput, UpdateNoteInput } from './note.input';
import { NoteObject } from './note.object';

// @authz-stance: authenticated-only (Path A — see docs/openthrottle/resolver-authorization-model-adr.md)
@Resolver(() => NoteObject)
export class NotesResolver {
  constructor(private readonly notesService: NotesService) {}

  @Query(() => NoteObject, {
    description: `Get a note by ID`,
    nullable: true,
  })
  async note(@Args('id', { type: () => ID }) id: string): Promise<Note | null> {
    const entity = await this.notesService
      .getRepository()
      .findOne({ where: { id } });

    return entity;
  }

  @Query(() => [NoteObject], {
    description: `List all notes, ordered by createdAt descending`,
  })
  async notes(): Promise<Note[]> {
    const entities = await this.notesService.getRepository().find({
      order: { createdAt: 'DESC' },
    });

    return entities;
  }

  @Mutation(() => NoteObject, {
    description: `Create a note`,
  })
  async createNote(
    @Args('input', { type: () => CreateNoteInput }) input: CreateNoteInput,
  ): Promise<Note> {
    const repo = this.notesService.getRepository();
    const entity = repo.create({
      author: input.author ?? null,
      content: input.content,
    });
    const saved = await repo.save(entity);

    return saved;
  }

  @Mutation(() => NoteObject, {
    description: `Update a note`,
    nullable: true,
  })
  async updateNote(
    @Args('input', { type: () => UpdateNoteInput }) input: UpdateNoteInput,
  ): Promise<Note | null> {
    const repo = this.notesService.getRepository();
    const entity = await repo.findOne({ where: { id: input.id } });

    if (!entity) return null;
    if (input.content != null) entity.content = input.content;
    if (input.author !== undefined) entity.author = input.author;

    const saved = await repo.save(entity);

    return saved;
  }

  @Mutation(() => Boolean, {
    description: `Delete a note by ID`,
  })
  async deleteNote(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    const repo = this.notesService.getRepository();
    const result = await repo.delete({ id });

    return (result.affected ?? 0) > 0;
  }
}
