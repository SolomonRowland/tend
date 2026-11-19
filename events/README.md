# Tent & Table

A phone-friendly web app for running a ministry's events, from the annual tent revival to a monthly board meeting.

## How It's Organized

- **One login, one ministry.** A ministry account holds up to 10 logins. Each login (email) belongs to exactly one ministry; someone who serves with two ministries signs up for each with a different email. The database enforces this (`ed_members.user_id` is unique).
- **Directory** (the ministry's pool), in tabs: People (team members with titles, worship, speakers, volunteers; status Current or Previous), Vendors, Contacts, Equipment inventory, and Budget by year. Every person, vendor and contact can be called, texted, emailed, mapped or visited from their card.
- **New events** start with a short walkthrough: name, dates and times, place and address, a yes or no for each part the event will have (guests, volunteers, speakers, worship, team, meals, vendors, equipment, money, connection cards, schedule, agenda; tasks are on for every event), goals (volunteers needed, seats, budget) and the text for the share pages. Saving builds the event, a general volunteer spot sized to the goal, and an RSVP for each day, so the QR codes work right away. The volunteer goal is tracked on the event and shown on the volunteer page.
- **Events.** Each event opens in its own workspace organized into five areas: Overview (countdown, at-a-glance numbers, what needs attention, what is coming up), Plan (schedule, tasks, agenda, set lists), Directory (the people, volunteers and meal sign-ups, vendors, contacts and equipment on this event), Money, and Guests (who is attending, with RSVPs and party sizes, check-in, follow-up). Each list carries its own share link and QR code: volunteers and meals, guest RSVP, and the connection card. An event pulls what it needs from the Directory: the people serving and their role, vendors with cost, payment status, who pays and when it's due, contacts, and how many of each equipment item. Equipment that is double-booked across overlapping events is flagged.
- **Tasks.** Every event has a task list (Plan > Tasks) for everything from planning and prep to setup, the event itself, teardown and after. Each task has two categories: a segment (Planning, Prep, Setup, During The Event, Teardown, After The Event) and an area it affects (Hospitality, Food, Stage, AV And Sound, Worship, Kids, Parking, Security, Prayer, Decor, Setup Crew, Admin, or your own). View the list by segment or by area, filter to one area, and print or copy it from the Share page, all of it or just one team's list.
- **Share and print.** The share button in an event's header opens one page with every link and QR code (volunteers, guest RSVP, connection card) and printable sheets: event summary, task list, run of show, volunteer roster, meal sign-ups, guest list, contact sheet, equipment checklist and payments owed. Each can be copied as text or printed or saved as a PDF.
- **Ministry logo.** The owner uploads it in Settings. It is resized in the browser and shows in the app header, on share pages, on printed sheets and QR posters.
- **Annual events.** Open last year's event and choose **Start Next Year**: dates move to the new year, tasks and checklists reset, vendor payments reset, and sign-ups, volunteers and money are cleared (each is a checkbox). **Duplicate As A New Event** uses an event as a template for another.
- **Public pages** (no account): `#/v/<event>` for volunteer and meal sign-ups, `#/r/<event>` for guest RSVPs, `#/c/<event>` for a connection card. Older `#/e/<event>` links still show everything.

## Files

- `index.html` holds the styles and loads the scripts.
- `data.js` is the data layer: `CloudDB` (Supabase) and `DemoDB` (browser storage, same API) plus the demo ministry.
- `app.js` is the screens.
- `supabase/schema.sql` sets up the database. Paste it into Supabase's SQL Editor and run it; it is safe to run again. Every table starts with `ed_`, so it can share the Tend Home project without touching Tend's data. Row-level security keeps each ministry's rows to its own members, and the public pages go through a few `security definer` functions.
- `../home/supabase.js` is the Supabase client shared with Tend Home, and `qrcode.js` (MIT, Kazuhiko Arase) draws QR codes.
- Add `?demo` to the URL, or tap **Try The Demo** on the sign-in screen, to explore with sample data kept in the browser.
