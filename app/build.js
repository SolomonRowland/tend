// Copies the Tend website into app/www for the iPhone app, then adds the app-only pieces:
//   js/digest.js        the heads-up wording, taken from supabase/functions/tend-notify/index.ts
//   js/native-notify.js the daily heads-up as notifications the phone schedules itself
// The website at the repository root is the source. Edit there, then run `npm run sync`.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(__dirname, 'www');
const COPY = ['index.html', 'css', 'js', 'vendor', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const f of COPY) fs.cpSync(path.join(root, f), path.join(out, f), { recursive: true });

const fn = fs.readFileSync(path.join(root, 'supabase/functions/tend-notify/index.ts'), 'utf8');
const parts = fn.split('// --- digest start');
if (parts.length < 2 || !parts[1].includes('// --- digest end ---')) throw new Error('Couldn’t find the digest block in tend-notify/index.ts');
const digest = parts[1].split('// --- digest end ---')[0].replace(/^[^\n]*\n/, '');
fs.writeFileSync(path.join(out, 'js/digest.js'), "'use strict';\n/* Copied from supabase/functions/tend-notify/index.ts by app/build.js. */\n" + digest);
fs.copyFileSync(path.join(__dirname, 'native/native-notify.js'), path.join(out, 'js/native-notify.js'));

let html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
const anchor = '<script src="js/notify.js"></script>';
if (!html.includes(anchor)) throw new Error('index.html no longer loads js/notify.js');
html = html.replace(anchor, '<script src="js/digest.js"></script>\n' + anchor + '\n<script src="js/native-notify.js"></script>');
// the app has no service worker or web manifest to offer
html = html.replace(/<link rel="manifest"[^>]*>\n?/, '');
fs.writeFileSync(path.join(out, 'index.html'), html);
console.log('Built app/www from the website.');
