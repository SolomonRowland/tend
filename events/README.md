# The Ministry Table

A phone-friendly web app for running a ministry's events. One ministry account (up to 10 people) holds many events, from the annual tent revival to a monthly board meeting, and each event uses only the sections it needs:

- Speakers, worship team (with set lists), counselors and team, agenda and meeting notes
- Volunteers and food sign-ups, with day-of check-in
- Vendors, setup and teardown tasks, equipment packing
- Giving (offerings with two counters, deposits, costs) and follow-up on connection cards
- Share links and QR codes for the public pages

The **Directory** is shared by every event: people, vendors, contacts, equipment inventory and the yearly budget.

Volunteers and guests use two public pages with no account: `#/e/<event>` to sign up and `#/c/<event>` for a connection card.

## Files

- `index.html` is the app. It uses `../home/supabase.js` (the same Supabase client as Tend Home) and `qrcode.js` (MIT, Kazuhiko Arase) for QR codes.
- `supabase/schema.sql` sets up the database. Paste it into Supabase's SQL Editor and run it; it is safe to run again. Every table starts with `ed_`, so it can share the Tend Home project without touching Tend's data.
- Add `?demo` to the URL, or tap **Try the demo** on the sign-in screen, to explore with sample data kept in the browser.
