import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Public } from '@openthrottle/nestjs-auth';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { parseCspReportPayload } from './csp-reports.parser';

/**
 * @description Public sink for browser Content-Security-Policy violation
 * reports (plan bd397d4e). The shared `buildCsp` builder in
 * `@openthrottle/react-router-utils` points every app's `report-uri` /
 * `Reporting-Endpoints` at this route.
 *
 * Public by design: browsers deliver violation reports unauthenticated and
 * credential-less. No persistence for now — each parsed violation is logged
 * as one structured line and the server logs are the review surface for the
 * per-app enforce flips; the controller is deliberately small enough to swap
 * in storage later. Malformed payloads are logged (truncated) and swallowed:
 * this endpoint never 5xxs at noise.
 */
@Public()
@Controller('csp-reports')
export class CspReportsController {
  constructor(private readonly logger: LoggerService) {}

  @HttpCode(204)
  @Post()
  report(@Body() body: unknown): void {
    const violations = parseCspReportPayload(body);

    if (violations.length === 0) {
      this.logger.warn('CSP report payload not recognized', {
        payload: JSON.stringify(body)?.slice(0, 500),
      });
      return;
    }

    for (const violation of violations) {
      this.logger.warn('CSP violation', violation);
    }
  }
}
