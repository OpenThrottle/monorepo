import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CanActivate, ExecutionContext } from '@nestjs/common';
import {
  Controller,
  Injectable,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import {
  AgentConversationMessageAttachment,
  AgentConversationMessageAttachmentsRepository,
} from '@openthrottle/nestjs-repositories-server';
import { createAgentConversationMessageAttachmentsRepositoryMock } from '@openthrottle/nestjs-repositories-server/testing';
import { isRecord } from '@openthrottle/nodejs-utils';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { configureBodyParsers } from '../../body-parsers/body-parsers.utils.ts';
import { ATTACHMENT_MAX_BYTES } from '../../services/attachment-store/attachment-store.constants.ts';
import { AttachmentStoreService } from '../../services/attachment-store/attachment-store.service.ts';
import { AttachmentsController } from './attachments.controller.ts';

const FIXED_NOW = new Date('2026-01-01T00:00:00.000Z');
const ALICE = randomUUID();
const BOB = randomUUID();
const SERVICE_ACCOUNT = randomUUID();

/** Stands in for the global auth guard: `x-test-user` / `x-test-sa` pick the principal, else 401. */
@Injectable()
class FakeAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req: unknown = context.switchToHttp().getRequest();
    if (!isRecord(req)) throw new UnauthorizedException();
    const headers = req.headers;
    const user = isRecord(headers) ? headers['x-test-user'] : undefined;
    const sa = isRecord(headers) ? headers['x-test-sa'] : undefined;

    if (typeof user === 'string') {
      Reflect.set(req, 'user', { kind: 'user', sub: user });
      return true;
    }
    if (typeof sa === 'string') {
      Reflect.set(req, 'user', {
        kind: 'service_account',
        sub: sa,
      });
      return true;
    }
    throw new UnauthorizedException();
  }
}

@Controller('other')
class OtherJsonController {
  @Post()
  echo(@Req() req: { readonly body?: unknown }): unknown {
    return { body: req.body ?? null };
  }
}

const pngBytes = (seed: number): Buffer => {
  const bytes = Buffer.alloc(40, seed);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(bytes);
  bytes.writeUInt32BE(13, 8);
  bytes.write('IHDR', 12, 'latin1');
  bytes.writeUInt32BE(64, 16);
  bytes.writeUInt32BE(32, 20);
  return bytes;
};

const uploadForm = (bytes: Uint8Array, name = 'shot.png'): FormData => {
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(bytes)]), name);
  return form;
};

describe('AttachmentsController', () => {
  let app: NestExpressApplication;
  let baseUrl = '';
  let home: string;
  let rows: AgentConversationMessageAttachment[];

  const repository = createAgentConversationMessageAttachmentsRepositoryMock();

  beforeAll(async () => {
    home = await mkdtemp(join(tmpdir(), 'attachments-controller-'));
    vi.stubEnv('HOME', home);
    vi.stubEnv('OPENTHROTTLE_ATTACHMENTS_DIR', '');
    repository.create.mockImplementation(async (input) => {
      const row = Object.assign(new AgentConversationMessageAttachment(), {
        createdAt: FIXED_NOW,
        updatedAt: FIXED_NOW,
        ...input,
        id: randomUUID(),
        messageId: null,
      });
      rows.push(row);
      return row;
    });
    repository.findOwnedById.mockImplementation(async (id, userId) => {
      return rows.find((row) => row.id === id && row.userId === userId) ?? null;
    });

    const moduleRef = await Test.createTestingModule({
      controllers: [AttachmentsController, OtherJsonController],
      providers: [
        AttachmentStoreService,
        { provide: APP_GUARD, useClass: FakeAuthGuard },
        {
          provide: AgentConversationMessageAttachmentsRepository,
          useValue: repository,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication<NestExpressApplication>({
      logger: false,
    });
    configureBodyParsers(app);
    await app.listen(0, '127.0.0.1');
    const address: AddressInfo | string | null = app.getHttpServer().address();
    if (address === null || typeof address === 'string') {
      throw new Error('test server did not bind a port');
    }
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await app.close();
    vi.unstubAllEnvs();
    await rm(home, { force: true, recursive: true });
  });

  beforeEach(() => {
    rows = [];
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /attachments', () => {
    it('refuses a request without a principal with 401', async () => {
      const response = await fetch(`${baseUrl}/attachments`, {
        body: uploadForm(pngBytes(1)),
        method: 'POST',
      });

      expect(response.status).toBe(401);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('refuses a service account with 403', async () => {
      const response = await fetch(`${baseUrl}/attachments`, {
        body: uploadForm(pngBytes(1)),
        headers: { 'x-test-sa': SERVICE_ACCOUNT },
        method: 'POST',
      });

      expect(response.status).toBe(403);
    });

    it('stores a png and answers with its metadata', async () => {
      const response = await fetch(`${baseUrl}/attachments`, {
        body: uploadForm(pngBytes(2), '../../etc/shot.png'),
        headers: { 'x-test-user': ALICE },
        method: 'POST',
      });
      const body: unknown = await response.json();

      expect(response.status).toBe(201);
      expect(body).toEqual({
        byteSize: 40,
        height: 32,
        id: rows[0]?.id,
        mimeType: 'image/png',
        sha256: expect.stringMatching(/^[0-9a-f]{64}$/),
        width: 64,
      });
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ originalName: 'shot.png', userId: ALICE }),
      );
    });

    it('answers 400 when no file part is sent', async () => {
      const form = new FormData();
      form.append('note', 'no file here');

      const response = await fetch(`${baseUrl}/attachments`, {
        body: form,
        headers: { 'x-test-user': ALICE },
        method: 'POST',
      });

      expect(response.status).toBe(400);
    });

    it('answers 413 when the file is over the parser limit', async () => {
      const response = await fetch(`${baseUrl}/attachments`, {
        body: uploadForm(Buffer.alloc(ATTACHMENT_MAX_BYTES + 1, 1)),
        headers: { 'x-test-user': ALICE },
        method: 'POST',
      });

      expect(response.status).toBe(413);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('answers 415 for bytes that are not an image', async () => {
      const response = await fetch(`${baseUrl}/attachments`, {
        body: uploadForm(Buffer.from('<svg></svg>'), 'x.png'),
        headers: { 'x-test-user': ALICE },
        method: 'POST',
      });

      expect(response.status).toBe(415);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('GET /attachments/:id', () => {
    const upload = async (userId: string): Promise<string> => {
      const response = await fetch(`${baseUrl}/attachments`, {
        body: uploadForm(pngBytes(3)),
        headers: { 'x-test-user': userId },
        method: 'POST',
      });
      const body: unknown = await response.json();
      if (!isRecord(body) || typeof body.id !== 'string') {
        throw new Error('upload failed');
      }
      return body.id;
    };

    it('refuses a request without a principal with 401', async () => {
      const response = await fetch(`${baseUrl}/attachments/${randomUUID()}`);

      expect(response.status).toBe(401);
    });

    it('streams the owner their bytes with the hardening headers', async () => {
      const id = await upload(ALICE);

      const response = await fetch(`${baseUrl}/attachments/${id}`, {
        headers: { 'x-test-user': ALICE },
      });
      const bytes = Buffer.from(await response.arrayBuffer());

      expect(response.status).toBe(200);
      expect(bytes.equals(pngBytes(3))).toBe(true);
      expect(response.headers.get('content-type')).toBe('image/png');
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
      expect(response.headers.get('cache-control')).toBe(
        'private, max-age=31536000, immutable',
      );
      expect(response.headers.get('content-disposition')).toMatch(/^inline/);
    });

    it("answers 404 for another user's id", async () => {
      const id = await upload(ALICE);

      const response = await fetch(`${baseUrl}/attachments/${id}`, {
        headers: { 'x-test-user': BOB },
      });

      expect(response.status).toBe(404);
    });

    it('answers 404, not 400, for a malformed id', async () => {
      const response = await fetch(`${baseUrl}/attachments/not-a-uuid`, {
        headers: { 'x-test-user': ALICE },
      });

      expect(response.status).toBe(404);
    });
  });

  describe('body parsers', () => {
    it('still parses a JSON POST on another route', async () => {
      const response = await fetch(`${baseUrl}/other`, {
        body: JSON.stringify({ hello: 'world' }),
        headers: {
          'content-type': 'application/json',
          'x-test-user': ALICE,
        },
        method: 'POST',
      });

      expect(await response.json()).toEqual({ body: { hello: 'world' } });
    });
  });
});
