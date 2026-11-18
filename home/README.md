# Tend (shared household)

The shared version of Tend: the same app, plus sign-in, one household list for everyone in the home, and live sync between phones.

- `index.html` is the app; `cloud.js` adds sign-in, household, invites and sync; `supabase.js` is the Supabase client (v2.117.3), kept here so the app works offline.
- `supabase/schema.sql` sets up the database. Paste it into Supabase's SQL Editor and run it (it's safe to run again).
- The publishable key in `cloud.js` is meant to be public. Row-level security in the database keeps each household's data private.
