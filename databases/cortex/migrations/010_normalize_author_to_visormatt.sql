-- Normalize author to visormatt
-- Updates all plans and notes so existing author values are set to visormatt.
UPDATE plans
SET author = 'visormatt';

UPDATE notes
SET author = 'visormatt'
WHERE author IS NULL
   OR author <> 'visormatt';
