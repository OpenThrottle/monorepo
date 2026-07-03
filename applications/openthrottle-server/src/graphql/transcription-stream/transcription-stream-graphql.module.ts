/**
 * @description GraphQL module for streaming transcription (voice-input spike).
 * Registers the resolver and the in-memory WhisperLive relay service. PUB_SUB
 * is provided by the global PubSubModule registered in app.module.
 */

import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';

import { TranscriptionStreamResolver } from './transcription-stream.resolver';
import { TranscriptionStreamService } from './transcription-stream.service';

@Module({
  imports: [LoggerModule],
  providers: [TranscriptionStreamResolver, TranscriptionStreamService],
})
export class TranscriptionStreamGraphqlModule {}
