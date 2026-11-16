-- Tag plan output chunks with the kind of producer that wrote them.
--
-- kind:
--   loop       -- narration from the OT Loop job itself
--   worker     -- output of the agent CLI worker
--   tool       -- tool call output
--   validation -- validation (lint / typecheck / test) output
--
-- Nullable: every existing row (and any writer that does not tag its chunks) stays NULL, meaning
-- "untagged". No backfill.
--
-- Idempotent: guarded ADD COLUMN, CHECK dropped and recreated, COMMENT ON is re-runnable.

ALTER TABLE plan_output_stream ADD COLUMN IF NOT EXISTS kind TEXT;

ALTER TABLE plan_output_stream
    DROP CONSTRAINT IF EXISTS chk_plan_output_stream_kind;

ALTER TABLE plan_output_stream
    ADD CONSTRAINT chk_plan_output_stream_kind CHECK (
        kind IS NULL OR kind IN ('loop', 'worker', 'tool', 'validation')
    );

COMMENT ON COLUMN plan_output_stream.kind IS 'Producer of the chunk: loop (OT Loop job narration), worker (agent CLI output), tool (tool call output) or validation (lint/typecheck/test output). NULL for untagged chunks and rows that predate the column.';
