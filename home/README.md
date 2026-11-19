# Tend Home (shared household)

The shared version of Tend: one household list for everyone in the home, live sync between phones, photos, and a daily heads-up notification.

## Files
- `index.html` is the page. Styles are in `css/app.css`.
- `js/core.js`: lists, dates, storage and the scheduling rules.
- `js/screens.js`: every screen and form.
- `js/starter.js`: the "What Do You Tend To?" picker and its task library.
- `js/photos.js`: photos on tasks and belongings.
- `js/notify.js`: turning the daily heads-up on and off.
- `js/actions.js`: drawing the screen and handling every tap.
- `js/swipe.js`: swipe a task right to finish it, left to snooze it a week.
- `js/data.js`: example data and the household list.
- `js/cloud.js`: sign-in, household, invites and sync with Supabase.
- `js/main.js`: start-up.
- `vendor/supabase.js` is the Supabase client (v2.117.3), kept here so the app works offline.
- `sw.js` keeps the app working offline and shows notifications.

## Supabase
- `supabase/schema.sql` sets up the database, the photo storage and the notification tables. Paste it into the SQL Editor and run it. It's safe to run again.
- `supabase/functions/tend-notify/index.ts` sends the daily heads-up. Deploy it as an Edge Function named `tend-notify`, with JWT verification off. It checks callers itself: the hourly job must show the secret in `push_config.cron_secret` (only the database knows it), and a test must come from a signed-in person. Each person hears about the tasks assigned to them plus the shared ones.
- `supabase/notifications.sql` runs that function every hour. Run it once, after the function is deployed.
- The publishable key in `js/cloud.js` is meant to be public. Row-level security keeps each household's data, photos and phones private.

## Tests
Run `tests/run.sh` from the repository root. It needs Postgres, Node and Playwright. It covers the database rules, two phones syncing, photos, notifications, swiping, task assignment, moving over from the original Tend, and every screen in every theme. A GitHub Action runs it on each push.

## The original Tend
The first, phone-only Tend used to live at the top of this site. That address now opens Tend Home, which offers to bring over the list the original app kept on the phone. The original app is kept at `/classic/` as a backup.
