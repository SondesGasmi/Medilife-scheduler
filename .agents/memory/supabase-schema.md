---
name: Supabase schema prerequisite
description: MediLife's Supabase connector exposes PostgREST data access, but it does not create the application tables.
---

MediLife's SQL must be applied manually in the connected Supabase project before staff CRUD or schedule generation can return data. Use the full schema for a fresh installation and the user-constraints migration for an existing installation.

**Why:** The connected Supabase project can be reached through PostgREST, but requests fail until the required tables and types exist. Existing installations need `user_constraints` populated before the app can enforce typed scheduling limits.

**How to apply:** Run `attached_assets/medilife_schema_1788785548602.sql` for a new database, or `attached_assets/medilife_user_constraints_migration.sql` to upgrade an existing one. The upgrade retains the legacy JSON column for rollback, but the app no longer reads or writes it. Keep the API's schema-missing response as a clear recovery path.