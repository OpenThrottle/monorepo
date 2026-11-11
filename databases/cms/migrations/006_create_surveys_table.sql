-- OpenThrottle CMS: survey definitions.
-- Ported from RocketCMS (20240601061330_add_surveys_table.sql).

CREATE TABLE IF NOT EXISTS surveys (
    uuid       UUID                     NOT NULL DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN                           DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    data       JSONB                    NOT NULL DEFAULT '{}'::jsonb,
    name       CHARACTER VARYING        NOT NULL,

    CONSTRAINT surveys_pkey PRIMARY KEY (uuid)
);

COMMENT ON TABLE surveys IS 'OpenThrottle CMS surveys: a named survey whose questions and settings live in data.';
COMMENT ON COLUMN surveys.data IS 'The survey definition (questions, options, settings) as a JSON object.';

CREATE INDEX IF NOT EXISTS idx_surveys_name ON surveys (name);
