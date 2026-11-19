# Tent & Table

A phone-friendly web app for running a ministry's events, from the annual tent revival to a monthly board meeting.

## How It's Organized

- **One login, one ministry.** A ministry account holds up to 10 logins. Each login (email) belongs to exactly one ministry; someone who serves with two ministries signs up for each with a different email. The database enforces this (`ed_members.user_id` is unique).
- **Directory** (the ministry's pool), in tabs: People (team members with titles, worship, speakers, volunteers; status Current or Previous), Vendors, Contacts, Equipment inventory, and Budget by year. Every person, vendor and contact can be called, texted, emailed, mapped or visited from their card.
- **Events.** Each event opens in its own workspace organized into five areas: Overview (countdown, at-a-glance numbers, what needs attention, what is coming up), Plan (schedule, tasks, agenda, set lists), Directory (the people, vendors, contacts and equipment on this event), Money, and Guests (sign-ups, check-in, follow-up, share links). An event pulls what it needs from the Directory: the people serving and their role, vendors with cost, payment status, who pays and when it's due, contacts, and how many of each equipment item. Equipment that is double-booked across overlapping events is flagged.
- **Annual events.** Open last year's event and choose **Start Next Year**: dates move to the new year, tasks and checklists reset, vendor payments reset, and sign-ups, volunteers and money are cleared (each is a checkbox). **Duplicate As A New Event** uses an event as a template for another.
- **Public pages** (no account): `#/e/<event>` for volunteer and meal sign-ups, `#/c/<event>` for a connection card.

## Files

- `index.html` holds the styles and loads the scripts.
- `data.js` is the data layer: `CloudDB` (Supabase) and `DemoDB` (browser storage, same API) plus the demo ministry.
- `app.js` is the screens.
- `supabase/schema.sql` sets up the database. Paste it into Supabase's SQL Editor and run it; it is safe to run again. Every table starts with `ed_`, so it can share the Tend Home project without touching Tend's data. Row-level security keeps each ministry's rows to its own members, and the public pages go through a few `security definer` functions.
- `../home/supabase.js` is the Supabase client shared with Tend Home, and `qrcode.js` (MIT, Kazuhiko Arase) draws QR codes.
- Add `?demo` to the URL, or tap **Try The Demo** on the sign-in screen, to explore with sample data kept in the browser.
