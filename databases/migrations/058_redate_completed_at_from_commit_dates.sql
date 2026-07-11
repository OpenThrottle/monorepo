-- High-fidelity re-date of collapsed completed_at from true git commit dates.
--
-- Follows migration 057 (which re-dated plans from plan_output_stream). This
-- migration covers the rows 057 could not: the remaining collapsed plans that
-- have NO output-stream signal but DO carry a commit_link, and the collapsed
-- tasks (tasks have no output stream, so commit_links is their only immune
-- signal). Each row's completed_at is set to the EARLIEST git *committer* date
-- across its linked shas.
--
-- The (id -> date) maps below were precomputed by resolving commit_links.sha
-- against the repo's git history (git show -s --format=%cI) in the session that
-- authored this migration. They are embedded as literal VALUES so the migration
-- is portable and needs no git access at migrate time. commit_links.created_at
-- is deliberately NOT used — it is itself backfill-dated (clustered on
-- 2026-06-25/26/27) and does not reflect true completion.
--
-- Scope guardrails (idempotent, safe to re-run, does not fight 057):
--   * Only rows whose completed_at still lands on the collapse day
--     (2026-07-10 UTC) are eligible. Rows 057 already moved off that day, and
--     organically-dated rows, are never touched.
--   * IS DISTINCT FROM guard => a second run updates 0 rows.
--   * Triggers disabled around the writes so updated_at is not re-stamped.
--
-- Explicitly OUT OF SCOPE: the 2026-06-06 task block (~1897 rows). It has almost
-- no commit-link coverage (~0.6%) and is NOT a migrate-collapse artifact (it is
-- consistent with a legitimate bulk seed/import). Re-dating it would need a
-- separate, human-approved source decision; this migration leaves it untouched.

-- ---------------------------------------------------------------------------
-- Plans: 8 rows with a commit link but no plan_output_stream signal.
-- ---------------------------------------------------------------------------

ALTER TABLE plans DISABLE TRIGGER update_plans_updated_at;

UPDATE plans p
SET completed_at = v.commit_date
FROM (VALUES
  ('200592ea-d7e8-4321-9ea1-0949aed6c267'::uuid, TIMESTAMPTZ '2026-06-14T16:42:34-07:00'),
  ('26594427-3fce-4a44-ad5a-7c00e53b5746'::uuid, TIMESTAMPTZ '2026-06-14T11:05:48-07:00'),
  ('5b13271e-c97d-4cd0-bed5-082bcbad631a'::uuid, TIMESTAMPTZ '2026-07-08T17:25:47-07:00'),
  ('8fd896f1-3d3f-46e3-bb41-4cbc22635411'::uuid, TIMESTAMPTZ '2026-06-13T20:48:33-07:00'),
  ('9ffaf9b3-c9c0-464a-8db7-98701585ffc7'::uuid, TIMESTAMPTZ '2026-07-10T08:26:46-07:00'),
  ('aeb989f4-684d-4e19-b25f-2328e5b687b5'::uuid, TIMESTAMPTZ '2026-06-13T00:47:01-07:00'),
  ('b04d1332-07fa-402d-8c68-74d4255135c9'::uuid, TIMESTAMPTZ '2026-06-14T13:27:51-07:00'),
  ('e09d14f2-1b6a-4484-b72e-6e2af38f4473'::uuid, TIMESTAMPTZ '2026-06-13T01:05:54-07:00')
) AS v(id, commit_date)
WHERE v.id = p.id
  AND p.completed_at IS NOT NULL
  AND (timezone('UTC', p.completed_at))::date = DATE '2026-07-10'
  AND p.completed_at IS DISTINCT FROM v.commit_date;

ALTER TABLE plans ENABLE TRIGGER update_plans_updated_at;

-- ---------------------------------------------------------------------------
-- Tasks: 84 collapsed rows (2026-07-10) that carry a commit link.
-- ---------------------------------------------------------------------------

ALTER TABLE tasks DISABLE TRIGGER update_tasks_updated_at;

UPDATE tasks t
SET completed_at = v.commit_date
FROM (VALUES
  ('0204f662-42e7-498c-b957-4e01d7b59a14'::uuid, TIMESTAMPTZ '2026-07-07T17:43:08-07:00'),
  ('05050889-bfde-4f81-8a53-3f9e66e3697d'::uuid, TIMESTAMPTZ '2026-06-19T14:02:21-07:00'),
  ('053bb164-dff5-443a-91f4-240434ef2a83'::uuid, TIMESTAMPTZ '2026-07-05T17:30:39-07:00'),
  ('05e92db4-85d9-4775-a659-42790469bece'::uuid, TIMESTAMPTZ '2026-07-09T14:22:47-07:00'),
  ('060a5260-9664-44c6-81dc-a427e1683655'::uuid, TIMESTAMPTZ '2026-06-19T14:02:21-07:00'),
  ('079e5d02-01e7-49eb-8048-1ce853d6244b'::uuid, TIMESTAMPTZ '2026-06-23T22:09:12-07:00'),
  ('08b5aea4-00d3-493c-9e05-a11cd55ac86e'::uuid, TIMESTAMPTZ '2026-06-23T22:09:12-07:00'),
  ('0ad977f3-a52a-4465-8937-dec474ed48eb'::uuid, TIMESTAMPTZ '2026-07-09T14:22:47-07:00'),
  ('113c760a-9ef2-4810-80f1-572ee6d7b546'::uuid, TIMESTAMPTZ '2026-07-07T11:48:57-07:00'),
  ('16dedb93-0d1a-48a2-a6a9-230d932eec53'::uuid, TIMESTAMPTZ '2026-07-10T18:27:54-07:00'),
  ('16f9dc3a-1ded-46bd-9140-27395cb47572'::uuid, TIMESTAMPTZ '2026-07-09T21:22:13-07:00'),
  ('1ae47fc7-e8e7-48f3-85ab-644071bd2924'::uuid, TIMESTAMPTZ '2026-06-13T01:05:54-07:00'),
  ('21dd7448-9177-4d55-a47f-66517a5819aa'::uuid, TIMESTAMPTZ '2026-07-10T08:26:46-07:00'),
  ('28f5e520-64be-4ee9-b079-3ba0ccd049ef'::uuid, TIMESTAMPTZ '2026-06-28T22:49:40-07:00'),
  ('2a7dccab-3574-4d64-a4fe-f896238b8a9b'::uuid, TIMESTAMPTZ '2026-07-08T21:23:34-07:00'),
  ('306f9ffb-c397-4de8-ae06-6c054d4287c1'::uuid, TIMESTAMPTZ '2026-07-09T09:58:37-07:00'),
  ('33d3a105-4157-4b13-bedd-fd8c87c1707c'::uuid, TIMESTAMPTZ '2026-06-19T14:02:21-07:00'),
  ('3e644c39-f36f-4e92-8c7b-56860e2a92f0'::uuid, TIMESTAMPTZ '2026-07-09T14:22:47-07:00'),
  ('3fa2d77a-6504-4d31-9c70-afcc4cf3a5d5'::uuid, TIMESTAMPTZ '2026-07-07T12:05:29-07:00'),
  ('41863ac7-0382-42b7-a112-2f926fb784d2'::uuid, TIMESTAMPTZ '2026-07-07T12:05:29-07:00'),
  ('447dc1ea-e802-44ed-af67-0bcda70fa6e5'::uuid, TIMESTAMPTZ '2026-07-07T17:22:58-07:00'),
  ('4708c12f-883c-498e-bd6f-bcb2abb11275'::uuid, TIMESTAMPTZ '2026-07-09T21:22:13-07:00'),
  ('4b13aced-f047-4eb5-afc3-b2915b49b5b9'::uuid, TIMESTAMPTZ '2026-07-07T17:53:21-07:00'),
  ('4e2ab4b0-6853-4ab9-bb67-3814f32a8596'::uuid, TIMESTAMPTZ '2026-07-07T17:22:58-07:00'),
  ('53af07cf-0fbf-451e-96f2-41f16620a743'::uuid, TIMESTAMPTZ '2026-06-13T01:05:54-07:00'),
  ('57cbade9-aa64-4709-a5da-9a82c7cc27a0'::uuid, TIMESTAMPTZ '2026-06-23T22:09:12-07:00'),
  ('58c896ad-9b8e-42d0-bf51-713ba1149864'::uuid, TIMESTAMPTZ '2026-06-19T14:02:21-07:00'),
  ('5f705cf2-0964-4da9-9f24-5cc39e75578b'::uuid, TIMESTAMPTZ '2026-07-08T17:25:47-07:00'),
  ('5fd0a498-edc6-47e6-b477-270082b50c4d'::uuid, TIMESTAMPTZ '2026-06-19T14:02:21-07:00'),
  ('5feca2b7-3495-4024-8508-4079c28a7041'::uuid, TIMESTAMPTZ '2026-06-27T09:37:09-07:00'),
  ('67839962-99a4-493c-aa91-421ffa3ecdb3'::uuid, TIMESTAMPTZ '2026-07-09T21:22:13-07:00'),
  ('6a3acfe9-eeb2-4957-ba62-5f79ad2bae35'::uuid, TIMESTAMPTZ '2026-06-23T22:09:12-07:00'),
  ('6d04505b-f73f-4c29-885b-630496a18675'::uuid, TIMESTAMPTZ '2026-07-07T11:48:57-07:00'),
  ('70b11caf-6280-457c-a0e8-9b6a4b0cbd37'::uuid, TIMESTAMPTZ '2026-07-09T14:22:47-07:00'),
  ('734bc4e9-47ad-4b0f-9b57-3fd1e33825b1'::uuid, TIMESTAMPTZ '2026-06-28T22:49:40-07:00'),
  ('73ca22fc-995f-45d3-85e5-920369a01986'::uuid, TIMESTAMPTZ '2026-06-28T22:49:40-07:00'),
  ('748f9f4b-61b9-49d5-8e06-5cfcc76e0b60'::uuid, TIMESTAMPTZ '2026-06-19T14:02:21-07:00'),
  ('74ec6957-1f72-4ecc-b2d0-b499c14bcf3d'::uuid, TIMESTAMPTZ '2026-06-23T22:09:12-07:00'),
  ('79b3ff0f-a165-4030-8fdd-00b31d2bc1b1'::uuid, TIMESTAMPTZ '2026-06-19T22:24:37-07:00'),
  ('7ad84d80-3bd7-4214-b734-699df821575b'::uuid, TIMESTAMPTZ '2026-07-10T08:26:46-07:00'),
  ('7cd23714-1c2d-4b5a-a73d-bc65440a1604'::uuid, TIMESTAMPTZ '2026-06-23T22:09:12-07:00'),
  ('826e4eda-2c41-4299-b3cc-7653e3eab633'::uuid, TIMESTAMPTZ '2026-07-09T14:22:47-07:00'),
  ('86e71346-cb68-48de-8dcc-37e4da281f3a'::uuid, TIMESTAMPTZ '2026-07-07T17:43:08-07:00'),
  ('8758fd5f-be5a-48e8-8515-2bc5693475dc'::uuid, TIMESTAMPTZ '2026-07-07T17:22:58-07:00'),
  ('8bb60df6-eace-40da-b1a8-d65840234165'::uuid, TIMESTAMPTZ '2026-06-23T22:09:12-07:00'),
  ('9526e7da-116d-4d59-96bc-8379f36fd3bf'::uuid, TIMESTAMPTZ '2026-07-08T22:07:01-07:00'),
  ('975b8fb6-cfd5-4159-8b87-010294812ca4'::uuid, TIMESTAMPTZ '2026-07-10T08:26:46-07:00'),
  ('97a38206-8a0c-4cf3-acd4-bcd27d15132f'::uuid, TIMESTAMPTZ '2026-06-27T09:37:09-07:00'),
  ('97a4e13f-b434-4374-ac3b-0b2e14ef85a2'::uuid, TIMESTAMPTZ '2026-06-19T14:02:21-07:00'),
  ('9bf0f904-b40f-4688-97a1-d01b5528c894'::uuid, TIMESTAMPTZ '2026-07-07T17:53:21-07:00'),
  ('a06532e3-1c47-48fc-987a-0d0a7f07c83b'::uuid, TIMESTAMPTZ '2026-07-07T17:43:08-07:00'),
  ('a7bd14d4-be90-49a0-801a-dfcd848cb34d'::uuid, TIMESTAMPTZ '2026-07-07T17:43:08-07:00'),
  ('b3cd9d8a-aca3-4faa-bcc1-46623242268d'::uuid, TIMESTAMPTZ '2026-07-10T08:26:46-07:00'),
  ('b3e1e176-ecaa-487a-bde3-c77357412e34'::uuid, TIMESTAMPTZ '2026-07-09T00:04:36-07:00'),
  ('ba050a48-230b-4710-9d86-5ba32cc52fa9'::uuid, TIMESTAMPTZ '2026-06-19T14:02:21-07:00'),
  ('bdcd902f-9b59-420f-8bc0-55fe2d1db4e6'::uuid, TIMESTAMPTZ '2026-07-07T17:53:21-07:00'),
  ('c42cdf8b-0a75-4072-8990-c12e853cc533'::uuid, TIMESTAMPTZ '2026-07-07T17:22:58-07:00'),
  ('c4658e82-6c6c-4928-aa08-5a06f60ddb80'::uuid, TIMESTAMPTZ '2026-06-19T14:02:21-07:00'),
  ('c490efcd-5997-4151-8a0b-80414ec93f39'::uuid, TIMESTAMPTZ '2026-06-19T14:02:21-07:00'),
  ('cc917c58-d82f-457e-bfa2-af3283de7eb8'::uuid, TIMESTAMPTZ '2026-07-07T11:48:57-07:00'),
  ('cf293caa-6a52-4ee6-b5da-aa0bc2c29661'::uuid, TIMESTAMPTZ '2026-06-15T22:59:48-07:00'),
  ('cfe2df8f-3bbe-4176-a664-d61351537bff'::uuid, TIMESTAMPTZ '2026-06-23T22:09:12-07:00'),
  ('d459e6f8-4ff1-411b-ba91-e84bfba59654'::uuid, TIMESTAMPTZ '2026-06-23T22:09:12-07:00'),
  ('d85dd419-3bd7-4a15-a56c-24b12b6b5ac9'::uuid, TIMESTAMPTZ '2026-07-07T12:05:29-07:00'),
  ('da31fc71-6287-4ce0-930c-22491290274a'::uuid, TIMESTAMPTZ '2026-07-09T15:00:00-07:00'),
  ('da4b79b5-1922-4ba8-be86-9ab73f59fb40'::uuid, TIMESTAMPTZ '2026-07-09T21:22:13-07:00'),
  ('daa90efe-9b57-438f-828e-d61bf600665e'::uuid, TIMESTAMPTZ '2026-07-07T17:43:08-07:00'),
  ('df87767a-3f73-4a2a-a7c7-4dfa38687a9c'::uuid, TIMESTAMPTZ '2026-06-13T01:05:54-07:00'),
  ('df8d149b-0f9c-4201-bebb-e75a272ee327'::uuid, TIMESTAMPTZ '2026-06-27T09:37:09-07:00'),
  ('e19cf187-7424-49c5-adb3-958b1e891647'::uuid, TIMESTAMPTZ '2026-07-09T14:22:47-07:00'),
  ('e341329d-f381-40ba-95de-17563926ee47'::uuid, TIMESTAMPTZ '2026-06-13T01:05:54-07:00'),
  ('e3ec247c-40dc-4293-a76c-d287051275ec'::uuid, TIMESTAMPTZ '2026-06-27T09:37:09-07:00'),
  ('e9a5e164-ed65-471b-ae02-d51e81e6c1f3'::uuid, TIMESTAMPTZ '2026-07-07T12:05:29-07:00'),
  ('eb26a033-ecc4-4e1c-aafe-176317568ce6'::uuid, TIMESTAMPTZ '2026-07-09T15:00:49-07:00'),
  ('ec65e442-7431-4d9d-a8d5-368cb24b60c5'::uuid, TIMESTAMPTZ '2026-07-09T11:05:21-07:00'),
  ('ee1a2838-812e-4c87-93b2-5f276121fcce'::uuid, TIMESTAMPTZ '2026-06-27T09:37:09-07:00'),
  ('eedbb1a4-4e07-4066-8179-4298e3bfe92c'::uuid, TIMESTAMPTZ '2026-07-07T17:53:21-07:00'),
  ('ef1fa027-298e-459c-a407-c9d22c6134f5'::uuid, TIMESTAMPTZ '2026-07-09T21:22:13-07:00'),
  ('f2ad6264-dba2-4cc4-ad58-a614a666c795'::uuid, TIMESTAMPTZ '2026-07-07T17:43:08-07:00'),
  ('f4e94bbc-6356-4982-86e4-34e1ff445ff2'::uuid, TIMESTAMPTZ '2026-06-13T01:05:54-07:00'),
  ('f8065248-39e6-4062-92fe-fd5068d6359a'::uuid, TIMESTAMPTZ '2026-07-07T12:05:29-07:00'),
  ('fa4c5601-74c8-4bec-8708-2bc383b50df4'::uuid, TIMESTAMPTZ '2026-07-07T11:48:57-07:00'),
  ('fd61e371-2ec9-4f08-a88c-25aeb03fbe41'::uuid, TIMESTAMPTZ '2026-07-10T08:26:46-07:00'),
  ('ff115d79-c653-4f0c-9e41-29bf72c6a87c'::uuid, TIMESTAMPTZ '2026-07-09T15:42:09-07:00')
) AS v(id, commit_date)
WHERE v.id = t.id
  AND t.completed_at IS NOT NULL
  AND (timezone('UTC', t.completed_at))::date = DATE '2026-07-10'
  AND t.completed_at IS DISTINCT FROM v.commit_date;

ALTER TABLE tasks ENABLE TRIGGER update_tasks_updated_at;
