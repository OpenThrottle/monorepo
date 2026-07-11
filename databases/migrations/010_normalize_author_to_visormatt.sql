-- Normalize author to visormatt
-- Updates all plans and notes so existing author values are set to visormatt.
-- Guarded to only touch rows that would actually change, so a re-run is a true
-- no-op and does not fire the BEFORE UPDATE updated_at trigger.
UPDATE plans
SET author = 'visormatt'
WHERE author IS DISTINCT FROM 'visormatt';

UPDATE notes
SET author = 'visormatt'
WHERE author IS DISTINCT FROM 'visormatt';
