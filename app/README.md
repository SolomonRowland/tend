# Tend for iPhone

Tend packaged as an iPhone app with [Capacitor](https://capacitorjs.com) 8. It's the same website, copied into the app, plus one app-only piece: the daily heads-up is scheduled on the phone as local notifications (the website gets it by web push).

- `build.js` copies the site from the repository root into `www/`, adds `js/digest.js` (the heads-up wording, taken from `supabase/functions/tend-notify/index.ts`) and `native/native-notify.js`.
- `ios/` is the Xcode project. Capacitor comes in through Swift Package Manager, so there's no CocoaPods step.
- Links in emails and invites point to the website (`appUrl()` in `js/cloud.js`).

## On a Mac (Xcode and Node.js installed)
```
cd app
npm install
npm run sync    # build www/ and copy it into the Xcode project
npm run open    # open in Xcode, pick your iPhone, press Play
```
Edit the website files at the repository root, never `www/`. Run `npm run sync` after each change.

Signing: Xcode → App target → Signing & Capabilities → your Personal Team (free Apple ID: installs last 7 days) or a paid Apple Developer team.
