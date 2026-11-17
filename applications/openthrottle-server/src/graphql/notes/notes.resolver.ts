/**
 * @description Resolver for Note queries and mutations. Injects NotesRepository from @openthrottle/nestjs-repositories-server and maps entities to NoteObject. Reads see live rows only; deleteNote soft deletes.
 */

import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { type AuthPrincipal, CurrentUser } from '@openthrottle/nestjs-auth';
import { GlobalClsService } from '@openthrottle/nestjs-modules';
import type { Note } from '@openthrottle/nestjs-repositories-server';
import { NotesRepository } from '@openthrottle/nestjs-repositories-server';

import { CreateNoteInput, UpdateNoteInput } from './note.input.ts';
import { NoteObject } from './note.object.ts';
import { resolveNoteAuthor } from './notes.utils.ts';

// @authz-stance: authenticated-only (Path A — see OT plan 18e16dfc-4f22-43f9-9b77-6fc90309b60a)
@Resolver(() => NoteObject)
export class NotesResolver {
  constructor(
    private readonly notesRepository: NotesRepository,
    private readonly globalCls: GlobalClsService,
  ) {}

  @Query(() => NoteObject, {
    description: `Get a note by ID`,
    nullable: true,
  })
  async note(@Args('id', { type: () => ID }) id: string): Promise<Note | null> {
    return this.notesRepository.findOne({ where: { id } });
  }

  @Query(() => [NoteObject], {
    description: `List all notes, ordered by createdAt descending`,
  })
  async notes(): Promise<Note[]> {
    return this.notesRepository.findAllNewestFirst();
  }

  @Mutation(() => NoteObject, {
    description: `Create a note`,
  })
  async createNote(
    @Args('input', { type: () => CreateNoteInput }) input: CreateNoteInput,
    @CurrentUser() principal: AuthPrincipal | undefined,
  ): Promise<Note> {
    // Attribution is derived server-side so every caller (Developer UI, the OT
    // MCP, raw GraphQL) is stamped identically and cannot spoof it by omission.
    return this.notesRepository.create({
      author: resolveNoteAuthor(
        input.author,
        this.globalCls.get('user'),
        principal,
      ),
      content: input.content,
    });
  }

  @Mutation(() => NoteObject, {
    description: `Update a note`,
    nullable: true,
  })
  async updateNote(
    @Args('input', { type: () => UpdateNoteInput }) input: UpdateNoteInput,
  ): Promise<Note | null> {
    // Look the row up first: a missing note answers null, as it always has,
    // rather than surfacing BaseRepository's NotFoundException.
    const entity = await this.notesRepository.findOne({
      where: { id: input.id },
    });

    if (!entity) return null;

    return this.notesRepository.update(input.id, {
      ...(input.author !== undefined && { author: input.author }),
      ...(input.content != null && { content: input.content }),
    });
  }

  @Mutation(() => Boolean, {
    description: `Delete a note by ID`,
  })
  async deleteNote(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    // Soft delete: stamps deleted_at. A missing or already-deleted note answers false.
    const { removedCount } = await this.notesRepository.removeMany({ id });

    return removedCount > 0;
  }
}
