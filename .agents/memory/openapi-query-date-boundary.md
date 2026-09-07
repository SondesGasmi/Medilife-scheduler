---
name: OpenAPI query date boundary
description: Generated Zod query schemas can require native Date values even though Express query parameters arrive as strings.
---

When an OpenAPI `format: date` query parameter is generated as `z.date()`, parse and validate the `YYYY-MM-DD` string at the HTTP route boundary instead of passing `req.query` directly to the generated schema.

**Why:** JSON request bodies can be coerced with `z.coerce.date()`, but URL query strings are never native `Date` objects; direct parsing otherwise rejects valid browser requests with 400.

**How to apply:** Keep the public query format as `YYYY-MM-DD`, validate the format and calendar value in the route, and convert to the representation expected by the downstream database.