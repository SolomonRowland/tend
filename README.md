# Tend

A household maintenance app for the phone: recurring home, vehicle, health and family tasks, kids' well visits, a calendar, and the contacts you call for them. One shared list for everyone in the household, with live sync between phones, photos, and a daily heads-up notification.

It lives at https://solomonrowland.github.io/tend/ and installs to the iPhone Home Screen (Safari › Share › Add to Home Screen). No personal data lives in this repository.

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
- `app/` packages Tend as an iPhone app (Capacitor). See `app/README.md`.
- `home/` only forwards the old Tend Home address (and invite links sent to it) here.

## Supabase
- `supabase/schema.sql` sets up the database, the photo storage and the notification tables. Paste it into the SQL Editor and run it. It's safe to run again.
- `supabase/functions/tend-notify/index.ts` sends the daily heads-up. Deploy it as an Edge Function named `tend-notify`, with JWT verification off. It checks callers itself: the hourly job must show the secret in `push_config.cron_secret` (only the database knows it), and a test must come from a signed-in person. Each person hears about the tasks assigned to them plus the shared ones.
- `supabase/notifications.sql` runs that function every hour. Run it once, after the function is deployed.
- The publishable key in `js/cloud.js` is meant to be public. Row-level security keeps each household's data, photos and phones private.

## Tests
Run `tests/run.sh` from the repository root. It needs Postgres, Node and Playwright. It covers the database rules, two phones syncing, photos, notifications, swiping, task assignment, moving over from the original Tend, every screen in every theme, the scheduling rules (including thousands of random tasks), damaged backup files, and a random-tap stress test that types, taps and swipes for a few thousand steps. It also checks the iPhone app's own daily heads-up. A GitHub Action runs it on each push.

## Earlier versions
The first, phone-only Tend kept its list on the phone. On a phone that still has that list, a new household's welcome screen offers to bring it over. The shared version was briefly called Tend Home and lived at `/home/`; that address now forwards here.
