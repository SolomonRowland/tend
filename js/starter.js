'use strict';
/* Tend: The "What Do You Tend To?" starter picker and its task library. */
/* ---------- starter picker: "What Do You Tend To?" ----------
   Each suggestion: [name, category, who, how often, flags, early days, MM-DD, tip]
   flags: F fixed date · ! often forgotten · - unchecked to start · ? you set the date
          C per vehicle · K per child · P per pet · A per adult · H links to your home */
var ROLES = [
  { k: 'home', t: 'Homeowner', d: 'Furnace, filters, alarms, gutters', ic: 'home', s: [
    ['Replace furnace filter', 'Home', 'HVAC', 'Every 3 months', '!H', 14, '', 'A clogged filter strains the furnace and A/C. The size is printed on the filter’s edge.'],
    ['Furnace tune-up (heating season)', 'Home', 'HVAC', 'Yearly', 'F', 30, '09-15', 'Book before the first cold snap, when HVAC companies get busy.'],
    ['A/C tune-up (cooling season)', 'Home', 'HVAC', 'Yearly', 'F', 30, '04-15', 'Book in spring, before the first hot week.'],
    ['Test smoke & CO alarms', 'Home', 'Whole house', 'Monthly', '', 7, '', 'Press the test button on each alarm.'],
    ['Replace smoke & CO alarm batteries', 'Home', 'Whole house', 'Yearly', 'F', 30, '11-01', 'An easy habit: do it when the clocks change in the fall.'],
    ['Clean dishwasher filter', 'Home', 'Kitchen', 'Monthly', '!', 7, '', 'Twist out the filter under the bottom rack and rinse it. Most people don’t know it’s there.'],
    ['Replace refrigerator water filter', 'Home', 'Kitchen', 'Every 6 months', '!H', 14, '', 'The part number is printed on the old filter.'],
    ['Clean range hood grease filter', 'Home', 'Kitchen', 'Every 3 months', '!', 14, '', 'Soak it in hot soapy water, or run it through the dishwasher.'],
    ['Vacuum refrigerator coils', 'Home', 'Kitchen', 'Yearly', '!', 14, '', 'Dusty coils make the fridge work harder and wear out sooner.'],
    ['Flush water heater', 'Home', 'Basement', 'Yearly', '!H', 14, '', 'Draining a few gallons clears sediment and adds years to its life.'],
    ['Clean full dryer vent duct', 'Home', 'Laundry', 'Yearly', '!', 30, '', 'Lint in the duct is a leading cause of house fires.'],
    ['Test sump pump', 'Home', 'Basement', 'Every 3 months', '!-', 14, '', 'Pour a bucket of water into the pit and make sure it kicks on.'],
    ['Clean gutters & downspouts', 'Home', 'Exterior', 'Every 6 months', 'F', 14, '10-15', 'Spring, and fall after the leaves drop.'],
    ['Shut off & drain outdoor faucets', 'Home', 'Exterior', 'Yearly', 'F!', 14, '10-20', 'Prevents frozen, burst pipes.'],
    ['Lubricate garage door & test auto-reverse', 'Home', 'Garage', 'Every 6 months', '!', 14, '', 'Lay a board under the door: it should reverse when it touches it.']] },
  { k: 'car', t: 'Car Owner', d: 'Oil, tires, plates, insurance', ic: 'car', s: [
    ['Oil change', 'Vehicle', '', 'Every 6 months', 'C', 14, '', 'Or by the mileage on your windshield sticker, whichever comes first.'],
    ['Rotate tires', 'Vehicle', '', 'Every 6 months', 'C!', 14, '', 'Most shops will do it with an oil change if you ask.'],
    ['Replace engine & cabin air filters', 'Vehicle', '', 'Yearly', 'C!', 30, '', 'The cabin filter sits behind the glove box and often goes years without a change.'],
    ['Renew registration & put on new sticker', 'Vehicle', '', 'Yearly', 'CF?!', 90, '', 'Set the due date to your plate sticker’s expiration.'],
    ['Emissions test', 'Vehicle', '', 'Every 2 years', 'CF?-', 45, '', 'Only if your state requires it. The notice comes with your renewal.'],
    ['Check tire pressure & tread', 'Vehicle', 'All vehicles', 'Monthly', '!', 7, '', 'Use the pressure on the sticker inside the driver’s door, not the number on the tire.'],
    ['Replace wiper blades', 'Vehicle', 'All vehicles', 'Yearly', 'F', 14, '10-01', ''],
    ['Test car battery', 'Vehicle', 'All vehicles', 'Yearly', 'F!', 30, '10-15', 'Auto parts stores test them free. Batteries usually die on the first cold morning.'],
    ['Restock winter emergency kit', 'Vehicle', 'All vehicles', 'Yearly', 'F', 14, '11-01', 'Blanket, ice scraper, flashlight, snacks and a phone charger.'],
    ['Auto insurance renewal', 'Vehicle', 'All vehicles', 'Every 6 months', 'F?', 30, '', 'Set the due date to your policy renewal date.'],
    ['Shop auto insurance rates', 'Vehicle', 'All vehicles', 'Yearly', '!', 45, '', 'Comparing quotes once a year often saves hundreds.'],
    ['Brake fluid & coolant service', 'Vehicle', 'All vehicles', 'Every 2 years', '!', 30, '', ''],
    ['Check spare tire, jack & roadside kit', 'Vehicle', 'All vehicles', 'Yearly', '!', 30, '', 'Spare tires slowly lose air sitting unused.']] },
  { k: 'kids', t: 'Parent', d: 'Well visits, school, car seats', ic: 'kid', s: [
    ['Well-child visit', 'Health', '', 'Well-child (by age)', 'K', 45, '', 'Follows the pediatric checkup schedule from the birth date.'],
    ['{n}’s birthday', 'Celebrations', '', 'Yearly', 'KF', 30, '', 'Opens a month early to plan a party or gift.'],
    ['Dentist cleaning', 'Health', 'Kids', 'Every 6 months', '', 30, '', ''],
    ['Kids’ school / sports physicals & forms', 'Health', 'Kids', 'Yearly', 'F', 45, '07-15', ''],
    ['Update immunization records for school', 'Health', 'Kids', 'Yearly', 'F', 30, '07-15', ''],
    ['Check car seat fit & expiration dates', 'Vehicle', 'Kids\' car seats', 'Yearly', '!', 30, '', 'Car seats expire, usually 6 to 10 years after they’re made. The date is on a sticker.'],
    ['Book summer camps & activities', 'Personal', 'Kids', 'Yearly', 'F!', 45, '02-15', 'Popular camps fill up by early spring.'],
    ['School registration / enrollment', 'Personal', 'Kids', 'Yearly', 'F', 45, '05-01', ''],
    ['Back-to-school supplies & clothes', 'Personal', 'Kids', 'Yearly', 'F', 21, '08-01', ''],
    ['Donate outgrown kids’ clothes & toys', 'Personal', 'Kids', 'Every 6 months', '', 14, '', ''],
    ['Review kids’ devices & parental controls', 'Tech & Digital', 'Kids', 'Every 6 months', '!', 14, '', ''],
    ['Practice fire escape plan with kids', 'Personal', 'Family', 'Every 6 months', '!', 14, '', 'Pick a meeting spot outside and walk the route together.'],
    ['Sanitize kids’ toys, high chairs & car seats', 'Cleaning', 'Kids', 'Monthly', '-', 7, '', ''],
    ['Renew passports (kids under 16)', 'Personal', 'Kids', 'Every 5 years', 'F?-', 180, '', 'Kids’ passports last only 5 years. Set the due date to the expiration.']] },
  { k: 'pet', t: 'Pet Owner', d: 'Vet, prevention, tags', ic: 'paw', s: [
    ['Annual vet checkup & vaccines', 'Pets', '', 'Yearly', 'P', 30, '', ''],
    ['Flea, tick & heartworm prevention', 'Pets', '', 'Monthly', 'P!', 5, '', 'Easy to miss a month, and a missed dose can let heartworm in.'],
    ['Renew pet license / rabies tag', 'Pets', '', 'Yearly', 'PF?!', 30, '', 'Set the due date to the tag’s expiration.'],
    ['Update microchip contact info', 'Pets', '', 'Yearly', 'P!', 30, '', 'A chip only helps if the phone number on file is current.'],
    ['Trim nails', 'Pets', 'Pets', 'Monthly', '', 7, '', ''],
    ['Bath & grooming', 'Pets', 'Pets', 'Every 2 months', '', 14, '', ''],
    ['Wash pet beds, bowls & toys', 'Pets', 'Pets', 'Monthly', '!', 7, '', ''],
    ['Pet dental cleaning', 'Pets', '', 'Yearly', 'P-', 30, '', ''],
    ['Restock pet food & meds', 'Pets', 'Pets', 'Monthly', '-', 7, '', '']] },
  { k: 'yard', t: 'Yard & Pool', d: 'Lawn, sprinklers, mower, grill', ic: 'leaf', s: [
    ['Lawn mower service (blade, oil, plug)', 'Yard & Pool', 'Garage', 'Yearly', 'F', 30, '03-15', 'Sharp blades cut cleaner and keep grass healthier.'],
    ['Spring lawn fertilizer & pre-emergent', 'Yard & Pool', 'Yard', 'Yearly', 'F', 14, '04-15', 'Apply when the soil warms up, around when forsythia blooms.'],
    ['Fall lawn fertilizer (winterizer)', 'Yard & Pool', 'Yard', 'Yearly', 'F!', 14, '10-15', 'The most important feeding of the year.'],
    ['Aerate & overseed lawn', 'Yard & Pool', 'Yard', 'Yearly', 'F', 14, '09-01', ''],
    ['Trim trees & shrubs', 'Yard & Pool', 'Yard', 'Yearly', 'F', 30, '03-01', ''],
    ['Refresh mulch beds', 'Yard & Pool', 'Yard', 'Yearly', 'F', 14, '05-01', ''],
    ['Deep-clean grill & check propane', 'Yard & Pool', 'Patio', 'Yearly', 'F!', 14, '04-15', ''],
    ['Store patio furniture & cover grill', 'Yard & Pool', 'Patio', 'Yearly', 'F', 14, '10-31', ''],
    ['Start up sprinkler system', 'Yard & Pool', 'Yard', 'Yearly', 'F-', 14, '04-20', ''],
    ['Blow out / winterize sprinklers', 'Yard & Pool', 'Yard', 'Yearly', 'F-', 30, '10-15', 'Must happen before the first hard freeze.'],
    ['Snow blower service & fuel', 'Yard & Pool', 'Garage', 'Yearly', 'F-', 14, '10-31', ''],
    ['Open pool', 'Yard & Pool', 'Pool', 'Yearly', 'F-', 30, '05-15', ''],
    ['Close / winterize pool', 'Yard & Pool', 'Pool', 'Yearly', 'F-', 30, '09-15', '']] },
  { k: 'clean', t: 'Keeping House', d: 'The deep-clean jobs that slip', ic: 'spark', s: [
    ['Clean washing machine (tub + gasket)', 'Cleaning', 'Laundry', 'Monthly', '!', 7, '', 'Run an empty hot cycle with cleaner and wipe the door seal.'],
    ['Clean garbage disposal', 'Cleaning', 'Kitchen', 'Monthly', '', 7, '', 'Ice cubes and a little dish soap, then citrus peels.'],
    ['Descale coffee maker', 'Cleaning', 'Kitchen', 'Monthly', '!', 7, '', ''],
    ['Clean out fridge & freezer', 'Cleaning', 'Kitchen', 'Every 3 months', '', 14, '', ''],
    ['Deep-clean oven', 'Cleaning', 'Kitchen', 'Every 6 months', '', 14, '', ''],
    ['Descale showerheads & faucets', 'Cleaning', 'Bathrooms', 'Every 3 months', '!', 14, '', 'Soak them in vinegar for an hour.'],
    ['Wash / replace shower curtain liner', 'Cleaning', 'Bathrooms', 'Every 3 months', '!', 14, '', ''],
    ['Wash pillows & comforters', 'Cleaning', 'Bedrooms', 'Every 6 months', '!', 14, '', ''],
    ['Rotate mattresses 180°', 'Cleaning', 'All beds', 'Every 6 months', '!', 14, '', 'Spreads wear evenly so mattresses last longer.'],
    ['Dust baseboards, vents & ceiling fans', 'Cleaning', 'Whole house', 'Every 3 months', '', 14, '', ''],
    ['Clean bathroom exhaust fans', 'Cleaning', 'Bathrooms', 'Yearly', '!', 14, '', ''],
    ['Clean trash & recycling bins', 'Cleaning', 'Garage', 'Every 3 months', '!', 14, '', ''],
    ['Wash windows & screens', 'Cleaning', 'Whole house', 'Yearly', 'F', 30, '05-01', ''],
    ['Shampoo carpets & rugs', 'Cleaning', 'Whole house', 'Yearly', '', 30, '', '']] },
  { k: 'health', t: 'Your Health', d: 'Dentist, physicals, checkups', ic: 'heart', s: [
    ['Dentist cleaning', 'Health', '', 'Every 6 months', 'A', 30, '', ''],
    ['Annual physical', 'Health', '', 'Yearly', 'A', 30, '', 'Preventive visits are usually free with insurance.'],
    ['Eye exam', 'Health', 'Family', 'Yearly', '', 30, '', ''],
    ['Skin check (dermatology)', 'Health', 'Adults', 'Yearly', '!', 30, '', ''],
    ['Flu shots', 'Health', 'Family', 'Yearly', 'F', 30, '10-01', ''],
    ['Replace toothbrushes', 'Health', 'Family', 'Every 3 months', '!', 7, '', 'And after anyone has been sick.'],
    ['Restock first-aid kit & toss expired meds', 'Health', 'Home', 'Yearly', '!', 14, '', ''],
    ['Review prescriptions & refills', 'Health', 'Family', 'Every 3 months', '-', 14, '', '']] },
  { k: 'money', t: 'Money & Paperwork', d: 'Bills, taxes, insurance, IDs', ic: 'money', s: [
    ['Pay mortgage or rent', 'Bills & Finance', 'Home', 'Monthly', 'F?H', 5, '', 'Set the due date to your payment date. Add the amount by editing the task.'],
    ['Pay car payment', 'Bills & Finance', '', 'Monthly', 'F?C', 5, '', 'Set the due date to your payment date.'],
    ['Pay utilities (electric, gas, water)', 'Bills & Finance', 'Home', 'Monthly', 'F?', 5, '', ''],
    ['Pay credit cards', 'Bills & Finance', 'Adults', 'Monthly', 'F?', 5, '', 'Even on autopay, a quick check catches surprise charges.'],
    ['Gather tax documents', 'Bills & Finance', 'Family', 'Yearly', 'F', 14, '02-15', ''],
    ['File taxes', 'Bills & Finance', 'Family', 'Yearly', 'F', 45, '04-15', ''],
    ['Homeowners insurance renewal', 'Bills & Finance', 'Home', 'Yearly', 'F?H', 45, '', 'Set the due date to your policy renewal. It opens early so you can shop rates.'],
    ['Benefits open enrollment / FSA-HSA', 'Bills & Finance', 'Family', 'Yearly', 'F!', 21, '11-01', 'Check your employer’s dates. Use-it-or-lose-it FSA money is easy to forget.'],
    ['Pull free credit report', 'Bills & Finance', 'Family', 'Every 4 months', '!', 14, '', 'Free at annualcreditreport.com.'],
    ['Audit subscriptions & autopays', 'Bills & Finance', 'Family', 'Every 6 months', '!', 14, '', ''],
    ['Review life & umbrella insurance', 'Bills & Finance', 'Family', 'Yearly', '', 30, '', ''],
    ['Review will, guardianship & beneficiaries', 'Personal', 'Family', 'Every 3 years', '!', 30, '', 'Update after any birth, move or marriage.'],
    ['Renew driver’s license', 'Personal', '', 'Every 4 years', 'AF?', 90, '', 'Set the due date to the expiration printed on the license.'],
    ['Renew passports (adults)', 'Personal', 'Adults', 'Every 10 years', 'F?-', 180, '', 'Many countries want 6 months left on it before you travel.'],
    ['Update home inventory (photos/video)', 'Bills & Finance', 'Whole house', 'Yearly', '!', 30, '', 'A quick video of every room makes insurance claims much easier.'],
    ['Review retirement contributions & rebalance', 'Bills & Finance', 'Family', 'Yearly', 'F-', 30, '01-15', '']] },
  { k: 'tech', t: 'Tech & Digital', d: 'Backups, passwords, router', ic: 'laptop', s: [
    ['Back up phones, photos & computers', 'Tech & Digital', 'Family', 'Every 3 months', '!', 14, '', ''],
    ['Update router firmware & reboot', 'Tech & Digital', 'Home network', 'Every 6 months', '!', 14, '', ''],
    ['Review passwords & 2-factor', 'Tech & Digital', 'Family', 'Yearly', '', 14, '', ''],
    ['Clear phone storage & old apps', 'Tech & Digital', 'Family', 'Every 6 months', '', 14, '', ''],
    ['Replace batteries (thermostat, locks, remotes)', 'Tech & Digital', 'Whole house', 'Yearly', 'F!', 14, '11-01', 'Smart locks and thermostats always die at the worst time.'],
    ['Test security cameras, doorbell & alarm', 'Tech & Digital', 'Home', 'Every 6 months', '-', 14, '', ''],
    ['Renew software & antivirus subscriptions', 'Tech & Digital', 'Family', 'Yearly', 'F?-', 30, '', '']] },
  { k: 'celebrate', t: 'Celebrations', d: 'Birthdays, holidays, anniversaries', ic: 'gift', s: [
    ['{n}', 'Celebrations', 'Family', 'Yearly', 'BF', 14, '', 'Opens 2 weeks early so there’s time for a card or gift.'],
    ['Valentine’s Day', 'Celebrations', 'Family', 'Yearly', 'F', 14, '02-14', ''],
    ['Mother’s Day', 'Celebrations', 'Family', 'Yearly', 'F', 14, 'H:mothers', 'The date moves each year. Tend works it out.'],
    ['Father’s Day', 'Celebrations', 'Family', 'Yearly', 'F', 14, 'H:fathers', 'The date moves each year. Tend works it out.'],
    ['Easter', 'Celebrations', 'Family', 'Yearly', 'F-', 14, 'H:easter', ''],
    ['Fourth of July plans', 'Celebrations', 'Family', 'Yearly', 'F-', 14, '07-04', ''],
    ['Halloween costumes & candy', 'Celebrations', 'Family', 'Yearly', 'F', 30, '10-31', 'Popular costumes sell out early.'],
    ['Thanksgiving plans', 'Celebrations', 'Family', 'Yearly', 'F', 21, 'H:thanksgiving', ''],
    ['Holiday gifts & cards', 'Celebrations', 'Family', 'Yearly', 'F', 45, '12-25', 'Opens in early November so shopping isn’t last-minute.'],
    ['New Year’s Eve plans', 'Celebrations', 'Family', 'Yearly', 'F-', 21, '12-31', '']] },
  { k: 'partner', t: 'Spouse / Partner', d: 'Anniversary, date night, plans', ic: 'ring', s: [
    ['Plan anniversary (gift & reservation)', 'Personal', 'Adults', 'Yearly', 'F?', 30, '', 'Set the due date to your anniversary. It opens a month early so you can plan.'],
    ['Date night', 'Personal', 'Adults', 'Monthly', '', 7, '', ''],
    ['Budget & goals check-in', 'Bills & Finance', 'Adults', 'Every 3 months', '', 14, '', ''],
    ['Update family emergency plan & contacts', 'Personal', 'Family', 'Yearly', '!', 14, '', ''],
    ['Plan & book family vacation', 'Personal', 'Family', 'Yearly', 'F', 45, '02-01', ''],
    ['Order holiday cards & family photo', 'Personal', 'Family', 'Yearly', 'F-', 21, '11-01', ''],
    ['Renew memberships (Costco, zoo, etc.)', 'Misc', 'Family', 'Yearly', 'F?-', 30, '', '']] }
];
function tgName(s, tg) { return tg.name || s.name.replace('{n}', tg.who); }
function sug(r, i) { var s = r.s[i]; return { key: r.k + ':' + i, name: s[0], cat: s[1], who: s[2], freq: s[3], fl: s[4], early: s[5], when: s[6], tip: s[7] }; }
function taskKey(name, who) { return (name + '|' + (who || '')).toLowerCase(); }
function existingKeys() { var k = {}; db.tasks.forEach(function (t) { k[taskKey(t.name, t.who)] = 1; }); return k; }
function stEntities(kind) {
  var st = ui.st;
  if (kind === 'car') return st.cars.map(function (n, i) { return (n || '').trim() || 'Vehicle ' + (i + 1); });
  if (kind === 'pet') return st.pets.map(function (n, i) { return (n || '').trim() || (st.pets.length > 1 ? 'Pet ' + (i + 1) : 'Pet'); });
  if (kind === 'kid') return st.kids.map(function (k, i) { return (k.n || '').trim() || 'Child ' + (i + 1); });
  return db.members.slice();
}
/* who each suggestion becomes, one per vehicle / child / pet / adult */
function sugTargets(s) {
  if (s.fl.indexOf('B') >= 0) return ui.st.bdays.filter(function (x) { return (x.n || '').trim() && parse(x.b); }).map(function (x) { return { who: s.who, name: x.n.trim(), per: 'bday', birth: x.b }; });
  var per = s.fl.indexOf('C') >= 0 ? 'car' : s.fl.indexOf('K') >= 0 ? 'kid' : s.fl.indexOf('P') >= 0 ? 'pet' : s.fl.indexOf('A') >= 0 ? 'adult' : '';
  if (!per) return [{ who: s.who }];
  var names = stEntities(per);
  return names.map(function (n, i) { return { who: n, per: per, birth: per === 'kid' ? (ui.st.kids[i].b || '') : '' }; });
}
function startStarter(fresh) {
  ui.st = { fresh: !!fresh, roles: {}, picks: {}, seen: {}, cars: null, kids: null, pets: null, bdays: [{ n: '', b: '' }] };
  if (fresh) { db = blank(); ui.stack = []; go('starter'); } else go('starter', {}, true);
}
function stPrefill() {
  var st = ui.st;
  if (!st.cars) {
    var v = db.items.filter(function (b) { return b.type === 'Vehicle'; }).map(function (b) { return b.name; });
    if (!v.length) db.tasks.forEach(function (t) { if (t.cat === 'Vehicle' && /^vehicle \d+$/i.test(t.who) && v.indexOf(t.who) < 0) v.push(t.who); });
    st.cars = v.length ? v.sort() : [''];
  }
  if (!st.kids) {
    var k = db.tasks.filter(function (t) { return t.freq === 'Well-child (by age)'; }).map(function (t) { return { n: t.who, b: t.first || '' }; });
    st.kids = k.length ? k : [{ n: '', b: '' }];
  }
  if (!st.pets) { var p = db.items.filter(function (b) { return b.type === 'Pet'; }).map(function (b) { return b.name; }); st.pets = p.length ? p : ['']; }
  ROLES.forEach(function (r) {
    if (!st.roles[r.k] || st.seen[r.k]) return;
    st.seen[r.k] = 1; r.s.forEach(function (x, i) { st.picks[r.k + ':' + i] = x[4].indexOf('-') < 0; });
  });
}
/* count of tasks that would be added, skipping ones already on the list or chosen in another group */
function stPlan() {
  var have = existingKeys(), out = [], seen = {};
  ROLES.forEach(function (r) {
    if (!ui.st.roles[r.k]) return;
    r.s.forEach(function (x, i) {
      var s = sug(r, i); if (!ui.st.picks[s.key]) return;
      sugTargets(s).forEach(function (tg) { var k = taskKey(tgName(s, tg), tg.who); if (have[k] || seen[k]) return; seen[k] = 1; out.push({ s: s, tg: tg }); });
    });
  });
  return out;
}
function scrStarter() {
  var st = ui.st, n = ROLES.filter(function (r) { return st.roles[r.k]; }).length;
  var h = '<header class="head round" style="gap:8px">' + (st.fresh ? '<div class="headrow"><button class="backbtn" data-act="st-cancel">' + ic('back', 18, 2.2) + 'Back</button></div>' : '<div class="headrow">' + backBtn() + '</div>') +
    '<span class="eyebrow">Step 1 of 2</span><h1>What Do You Tend To?</h1><span class="sub">Pick everything that fits. Next, you’ll choose from tasks people often forget.</span></header>';
  h += '<div class="roles">' + ROLES.map(function (r) {
    return '<button class="role" data-act="st-role" data-k="' + r.k + '" aria-pressed="' + !!st.roles[r.k] + '"><span class="ri">' + ic(r.ic, 22) + '</span><span class="ck">' + ic('check', 14, 3) + '</span><b>' + esc(r.t) + '</b><small>' + esc(r.d) + '</small></button>';
  }).join('') + '</div>';
  h += '<div class="stickybar"><button class="btn primary" data-act="st-next"' + (n ? '' : ' disabled') + '>' + (n ? 'Next: Choose Tasks' : 'Pick at Least One') + '</button></div>';
  return h;
}
function entEditor(kind) {
  var st = ui.st, list = kind === 'car' ? st.cars : kind === 'pet' ? st.pets : kind === 'bday' ? st.bdays : st.kids;
  var title = kind === 'car' ? 'Your Vehicles' : kind === 'pet' ? 'Your Pets' : kind === 'bday' ? 'Birthdays & Anniversaries' : 'Your Kids';
  var help = kind === 'bday' ? 'Add anyone you want to celebrate, like “Mom’s birthday” or “Our anniversary”. Each gets a yearly reminder.' : kind === 'car' ? 'Each vehicle gets its own oil, tire and plate reminders, and is saved under Belongings.' : kind === 'pet' ? 'Each pet gets its own vet and prevention reminders, and is saved under Belongings.' : 'Birthdays set up each child’s well-visit schedule.';
  var h = '<div class="card ents"><span class="enth">' + title + '</span><span class="note" style="text-align:left;padding:0">' + help + '</span>';
  list.forEach(function (v, i) {
    var del = list.length > 1 ? '<button type="button" class="entx" data-act="st-del" data-kind="' + kind + '" data-i="' + i + '" aria-label="Remove">' + ic('x', 16) + '</button>' : '';
    if (kind === 'kid' || kind === 'bday') h += '<div class="ent"><input class="input" data-st="' + kind + '" data-i="' + i + '" data-f="n" value="' + esc(v.n) + '" placeholder="' + (kind === 'bday' ? 'e.g. Mom\u2019s birthday' : 'Name') + '"><input class="input" type="date" data-st="' + kind + '" data-i="' + i + '" data-f="b" value="' + esc(v.b) + '" aria-label="Date"' + (kind === 'kid' ? ' max="' + iso(today()) + '"' : '') + '>' + del + '</div>';
    else h += '<div class="ent"><input class="input" data-st="' + kind + '" data-i="' + i + '" value="' + esc(v) + '" placeholder="' + (kind === 'car' ? 'Year and model, e.g. 2020 Honda CR-V' : 'Name') + '">' + del + '</div>';
  });
  if (list.length < 8) h += '<button type="button" class="link" style="align-self:flex-start" data-act="st-add" data-kind="' + kind + '">+ Add ' + (kind === 'car' ? 'a Vehicle' : kind === 'pet' ? 'a Pet' : kind === 'bday' ? 'Another' : 'a Child') + '</button>';
  return h + '</div>';
}
function freqLabel(f) { return f === 'Well-child (by age)' ? 'By age' : f; }
function scrStarterPick() {
  var st = ui.st, have = existingKeys(), plan = stPlan();
  var h = '<header class="head" style="gap:8px"><div class="headrow">' + backBtn() + '</div><span class="eyebrow">Step 2 of 2</span><h1>Choose Your Tasks</h1><span class="sub">Uncheck anything that doesn’t apply. You can change any task later.</span></header>';
  ROLES.forEach(function (r) {
    if (!st.roles[r.k]) return;
    var picked = r.s.filter(function (x, i) { return st.picks[r.k + ':' + i]; }).length;
    h += '<div class="section"><h2 style="font-size:19px;display:flex;align-items:center;gap:8px"><span style="color:var(--rose);display:flex">' + ic(r.ic, 20) + '</span>' + esc(r.t) + '</h2><button class="link" data-act="st-all" data-k="' + r.k + '">' + (picked === r.s.length ? 'Uncheck All' : 'Check All') + '</button></div>';
    if (r.k === 'car') h += entEditor('car');
    if (r.k === 'kids') h += entEditor('kid');
    if (r.k === 'pet') h += entEditor('pet');
    if (r.k === 'celebrate') h += entEditor('bday');
    h += '<div class="listcard">' + r.s.map(function (x, i) {
      var s = sug(r, i), tg = sugTargets(s), fresh = tg.filter(function (t) { return !have[taskKey(tgName(s, t), t.who)]; }).length, on = !!st.picks[s.key];
      var label = s.name.indexOf('{n}') === 0 && s.fl.indexOf('B') >= 0 ? 'Birthdays & anniversaries you add above' : s.name.replace('{n}', s.fl.indexOf('K') >= 0 ? 'Each child' : '');
      if (s.fl.indexOf('B') >= 0 && !tg.length) return '<button class="pick" data-act="st-pick" data-key="' + s.key + '" aria-pressed="' + on + '"><span class="box">' + ic('check', 14, 3) + '</span><span class="col"><span class="pn">' + esc(label) + '</span><span class="pm">Add names and dates above</span></span></button>';
      var per = tg.length > 1 || tg[0].per ? (fresh < tg.length ? fresh + ' of ' + tg.length + ' new' : tg.length > 1 ? '× ' + tg.length : 'for ' + tg[0].who) : '';
      var meta = [freqLabel(s.freq), s.fl.indexOf('?') >= 0 ? 'you set the date' : '', per].filter(Boolean).join(' · ');
      if (!fresh) return '<div class="pick" aria-disabled="true"><span class="box done">' + ic('check', 14, 3) + '</span><span class="col"><span class="pn">' + esc(label) + '</span><span class="pm">Already on Your List</span></span></div>';
      return '<button class="pick" data-act="st-pick" data-key="' + s.key + '" aria-pressed="' + on + '"><span class="box">' + ic('check', 14, 3) + '</span><span class="col"><span class="pn">' + esc(label) + (s.fl.indexOf('!') >= 0 ? '<span class="tag">Often Forgotten</span>' : '') + '</span><span class="pm">' + esc(meta) + '</span>' + (s.tip ? '<span class="pt">' + esc(s.tip) + '</span>' : '') + '</span></button>';
    }).join('') + '</div>';
  });
  h += '<div class="pad-b"></div><div class="stickybar"><button class="btn primary" data-act="st-apply"' + (plan.length ? '' : ' disabled') + '>' + (plan.length ? 'Add ' + plan.length + (plan.length === 1 ? ' Task' : ' Tasks') : 'Nothing New Selected') + '</button></div>';
  return h;
}
function starterFirst(s, n, birth) {
  var T = today();
  if (s.freq === 'Well-child (by age)') return parse(birth) ? birth : null;
  if (s.fl.indexOf('B') >= 0 || (s.fl.indexOf('K') >= 0 && s.cat === 'Celebrations')) return parse(birth) ? iso(nextAnniv(birth)) : null;
  if (s.when && s.when.indexOf('H:') === 0) return iso(T);
  if (s.fl.indexOf('?') >= 0) return null;
  var f = FREQ[s.freq];
  if (s.when) {
    var p = s.when.split('-'), d = new Date(T.getFullYear(), +p[0] - 1, +p[1]);
    if (f.mo && f.mo < 12) { while (d > T) d = addMonths(d, -f.mo); while (d < T) d = addMonths(d, f.mo); }
    else if (d < T) d = new Date(T.getFullYear() + 1, +p[0] - 1, +p[1]);
    return iso(d);
  }
  /* no known last date: spread first due dates over the coming weeks so they don't all land at once */
  var span = f.dy || f.mo * 30;
  return iso(addDays(T, 3 + (n * 7) % Math.min(span, 90)));
}
function applyStarter() {
  var plan = stPlan(); if (!plan.length) return;
  var madeItems = 0;
  function ensureItem(type, name) {
    var b = db.items.find(function (x) { return x.type === type && x.name.toLowerCase() === name.toLowerCase(); });
    if (!b) { b = { id: newId('b'), type: type, name: name, fields: {}, notes: '', contacts: [] }; db.items.push(b); madeItems++; }
    return b.id;
  }
  plan.forEach(function (p, n) {
    var s = p.s, tg = p.tg, item = null;
    if (tg.per === 'car') item = ensureItem('Vehicle', tg.who);
    else if (tg.per === 'pet') item = ensureItem('Pet', tg.who);
    else if (s.fl.indexOf('H') >= 0) { var hm = db.items.find(function (x) { return x.type === 'Home'; }); item = hm ? hm.id : ensureItem('Home', 'Home'); }
    db.tasks.push({ id: newId('t'), name: tgName(s, tg), cat: CATS.indexOf(s.cat) >= 0 ? s.cat : 'Misc', who: tg.who, freq: s.freq, fixed: s.fl.indexOf('F') >= 0, holiday: s.when && s.when.indexOf('H:') === 0 ? s.when.slice(2) : '', auto: '',
      first: starterFirst(s, n, tg.birth), last: null, early: s.early, active: true, notes: s.tip || '', contact: null, item: item, snooze: null, history: [] });
  });
  save(); ui.st = null; ui.stack = []; go('home');
  var nod = db.tasks.slice(-plan.length).filter(function (t) { return !t.first; }).length;
  toast('Added ' + plan.length + (plan.length === 1 ? ' task' : ' tasks') + (madeItems ? ' and ' + madeItems + (madeItems === 1 ? ' belonging' : ' belongings') : '') + '.' + (nod ? ' ' + nod + ' need a date from you.' : ''));
}

