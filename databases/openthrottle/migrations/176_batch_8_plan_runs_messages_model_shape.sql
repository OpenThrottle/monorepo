-- Give plan_runs and plan_messages the BaseHardDeleteModel shape
-- (@openthrottle/nestjs-postgres): a uuidv7 `id` default and a `created_at`, with no
-- soft-delete column. Runs and inbox messages are history: a row is never user-deleted,
-- and the only deletes are FK cascades from a removed plan.
-- Batch 8 of moving the entities into @openthrottle/nestjs-repositories-server
-- (OT plan ab281c9c-0b6f-446b-bf72-b9321f1d6cdb).
--
-- Existing ids are untouched; only rows inserted from now on get a uuidv7.
-- Both tables already have `created_at` (038, 144). Both keep their `updated_at`
-- (038, 144): a run's status, heartbeat and cancel marker and a message's delivery are
-- written in place, so the column stays meaningful.

ALTER TABLE plan_runs ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE plan_messages ALTER COLUMN id SET DEFAULT uuidv7();
