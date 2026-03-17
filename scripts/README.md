# Scripts

## clear-public-schema.sql

**Purpose:** Delete all data from every table in the `public` schema so you can test the app with a clean database.

**How to run:**

1. Open your Supabase project.
2. Go to **SQL Editor**.
3. Paste the contents of `clear-public-schema.sql`.
4. Run the script.

**Warning:** This is destructive and cannot be undone. Use only for development or test environments. It does **not** clear `auth.users` or other non-`public` schemas.
