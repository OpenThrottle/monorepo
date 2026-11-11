-- Interval and run-once schedule kinds for scheduled agent jobs, alongside cron.
--
-- schedule_kind:
--   cron     -- cron_pattern (+ timezone) drives a BullMQ job scheduler, as before. The default, so
--               every existing row keeps its meaning.
--   interval -- interval_ms of elapsed time after the previous fire FINISHES. Elapsed milliseconds,
--               never wall-clock arithmetic, so DST cannot shift or double a fire. At least 60000.
--   once     -- a single fire at run_at (an instant; the API takes ISO 8601 with an offset).
--
-- interval and once are not BullMQ job schedulers: each pending fire is one delayed job, armed after
-- the previous fire finishes (interval) or on save (once). A fire the server was down for runs once,
-- late, and the misfire policy does not apply to them (it is a cron concept: there is no train of
-- slots to skip along).
--
-- cron_pattern becomes nullable: only a cron schedule has one. The shape CHECK pins each kind to the
-- column it needs.
--
-- Idempotent: guarded ADD COLUMNs, CHECKs dropped and recreated. No existing row changes meaning.

ALTER TABLE scheduled_agent_jobs ADD COLUMN IF NOT EXISTS schedule_kind TEXT NOT NULL DEFAULT 'cron';
ALTER TABLE scheduled_agent_jobs ADD COLUMN IF NOT EXISTS interval_ms INTEGER;
ALTER TABLE scheduled_agent_jobs ADD COLUMN IF NOT EXISTS run_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE scheduled_agent_jobs ALTER COLUMN cron_pattern DROP NOT NULL;

ALTER TABLE scheduled_agent_jobs
    DROP CONSTRAINT IF EXISTS chk_scheduled_agent_jobs_schedule_kind;

ALTER TABLE scheduled_agent_jobs
    ADD CONSTRAINT chk_scheduled_agent_jobs_schedule_kind CHECK (
        (schedule_kind = 'cron' AND cron_pattern IS NOT NULL)
        OR (schedule_kind = 'interval' AND interval_ms IS NOT NULL)
        OR (schedule_kind = 'once' AND run_at IS NOT NULL)
    );

ALTER TABLE scheduled_agent_jobs
    DROP CONSTRAINT IF EXISTS chk_scheduled_agent_jobs_interval_ms;

ALTER TABLE scheduled_agent_jobs
    ADD CONSTRAINT chk_scheduled_agent_jobs_interval_ms CHECK (
        interval_ms IS NULL OR interval_ms >= 60000
    );

COMMENT ON COLUMN scheduled_agent_jobs.schedule_kind IS 'How the schedule fires: cron (cron_pattern in timezone, a BullMQ job scheduler; the default), interval (interval_ms after the previous fire finishes), or once (a single fire at run_at). interval and once fires are single delayed BullMQ jobs; one the server was down for runs once, late, and misfire_policy does not apply to them.';
COMMENT ON COLUMN scheduled_agent_jobs.cron_pattern IS '5- or 6-field cron pattern, interpreted in timezone (UTC when null). Required when schedule_kind = cron; null for interval and once schedules.';
COMMENT ON COLUMN scheduled_agent_jobs.interval_ms IS 'For schedule_kind = interval: elapsed milliseconds from the end of one fire to the start of the next (DST-safe, at least 60000). Null for other kinds.';
COMMENT ON COLUMN scheduled_agent_jobs.run_at IS 'For schedule_kind = once: the instant the single fire is due. The schedule is disabled after that fire finishes. Null for other kinds.';
