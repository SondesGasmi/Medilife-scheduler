---
name: Supabase schema prerequisite
description: MediLife's Supabase connector exposes PostgREST data access, but it does not create the application tables.
---

The MediLife SQL schema must be applied in the connected Supabase project before the Personnel CRUD can return data.

**Why:** The connected Supabase project can be reached through PostgREST, but requests to `public.staff` fail until the table and its supporting types exist.

**How to apply:** Run the provided MediLife schema SQL in the Supabase SQL editor, then refresh the Personnel view. Keep the API's schema-missing response because it gives administrators a clear recovery path.