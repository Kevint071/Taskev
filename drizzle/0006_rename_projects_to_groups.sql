-- One DO block so the whole rename is atomic: the neon-http migrator runs
-- each statement on its own, without a transaction.
DO $$
BEGIN
	ALTER TABLE "projects" RENAME TO "groups";
	ALTER TABLE "tasks" RENAME COLUMN "project_id" TO "group_id";
	ALTER TABLE "groups" RENAME CONSTRAINT "projects_pkey" TO "groups_pkey";
	ALTER TABLE "groups" RENAME CONSTRAINT "projects_user_id_users_id_fk" TO "groups_user_id_users_id_fk";
	ALTER TABLE "tasks" RENAME CONSTRAINT "tasks_project_id_projects_id_fk" TO "tasks_group_id_groups_id_fk";
END $$;
