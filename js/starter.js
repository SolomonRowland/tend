'use strict';
/* Tend: The "What Do You Tend To?" starter picker and its task library. */
/* ---------- starter picker: "What Do You Tend To?" ----------
   Each suggestion: [name, category, who, how often, flags, early days, MM-DD, tip]
   flags: F fixed date · ! often forgotten · - unchecked to start · ? you set the date
          C per vehicle · K per child · P per pet · A per adult · H links to your home */
var ROLES = [
  { k: 'home', t: 'Homeowner', d: 'Furnace, filters, alarms, gutters', ic: 'home', s: [
    ['Replace Furnace Filter', 'Home', 'HVAC', 'Every 3 months', '!H', 14, '', 'A clogged filter strains the furnace and A/C. The size is printed on the filter’s edge.'],
    ['Furnace Tune-Up (Heating Season)', 'Home', 'HVAC', 'Yearly', 'F', 30, '09-15', 'Book before the first cold snap, when HVAC companies get busy.'],
    ['A/C Tune-Up (Cooling Season)', 'Home', 'HVAC', 'Yearly', 'F', 30, '04-15', 'Book in spring, before the first hot week.'],
    ['Test Smoke & CO Alarms', 'Home', 'Whole house', 'Monthly', '', 7, '', 'Press the test button on each alarm.'],
    ['Replace Smoke & CO Alarm Batteries', 'Home', 'Whole house', 'Yearly', 'F', 30, '11-01', 'An easy habit: do it when the clocks change in the fall.'],
    ['Clean Dishwasher Filter', 'Home', 'Kitchen', 'Monthly', '!', 7, '', 'Twist out the filter under the bottom rack and rinse it. Most people don’t know it’s there.'],
    ['Replace Refrigerator Water Filter', 'Home', 'Kitchen', 'Every 6 months', '!H', 14, '', 'The part number is printed on the old filter.'],
    ['Clean Range Hood Grease Filter', 'Home', 'Kitchen', 'Every 3 months', '!', 14, '', 'Soak it in hot soapy water, or run it through the dishwasher.'],
    ['Vacuum Refrigerator Coils', 'Home', 'Kitchen', 'Yearly', '!', 14, '', 'Dusty coils make the fridge work harder and wear out sooner.'],
    ['Flush Water Heater', 'Home', 'Basement', 'Yearly', '!H', 14, '', 'Draining a few gallons clears sediment and adds years to its life.'],
    ['Clean Full Dryer Vent Duct', 'Home', 'Laundry', 'Yearly', '!', 30, '', 'Lint in the duct is a leading cause of house fires.'],
    ['Test Sump Pump', 'Home', 'Basement', 'Every 3 months', '!-', 14, '', 'Pour a bucket of water into the pit and make sure it kicks on.'],
    ['Clean Gutters & Downspouts', 'Home', 'Exterior', 'Every 6 months', 'F', 14, '10-15', 'Spring, and fall after the leaves drop.'],
    ['Shut Off & Drain Outdoor Faucets', 'Home', 'Exterior', 'Yearly', 'F!', 14, '10-20', 'Prevents frozen, burst pipes.'],
    ['Lubricate Garage Door & Test Auto-Reverse', 'Home', 'Garage', 'Every 6 months', '!', 14, '', 'Lay a board under the door: it should reverse when it touches it.']] },
  { k: 'car', t: 'Car Owner', d: 'Oil, tires, plates, insurance', ic: 'car', s: [
    ['Oil Change', 'Vehicle', '', 'Every 6 months', 'C', 14, '', 'Or by the mileage on your windshield sticker, whichever comes first.'],
    ['Rotate Tires', 'Vehicle', '', 'Every 6 months', 'C!', 14, '', 'Most shops will do it with an oil change if you ask.'],
    ['Replace Engine & Cabin Air Filters', 'Vehicle', '', 'Yearly', 'C!', 30, '', 'The cabin filter sits behind the glove box and often goes years without a change.'],
    ['Renew Registration & Put on New Sticker', 'Vehicle', '', 'Yearly', 'CF?!', 90, '', 'Set the due date to your plate sticker’s expiration.'],
    ['Emissions Test', 'Vehicle', '', 'Every 2 years', 'CF?-', 45, '', 'Only if your state requires it. The notice comes with your renewal.'],
    ['Check Tire Pressure & Tread', 'Vehicle', 'All vehicles', 'Monthly', '!', 7, '', 'Use the pressure on the sticker inside the driver’s door, not the number on the tire.'],
    ['Replace Wiper Blades', 'Vehicle', 'All vehicles', 'Yearly', 'F', 14, '10-01', ''],
    ['Test Car Battery', 'Vehicle', 'All vehicles', 'Yearly', 'F!', 30, '10-15', 'Auto parts stores test them free. Batteries usually die on the first cold morning.'],
    ['Restock Winter Emergency Kit', 'Vehicle', 'All vehicles', 'Yearly', 'F', 14, '11-01', 'Blanket, ice scraper, flashlight, snacks and a phone charger.'],
    ['Auto Insurance Renewal', 'Vehicle', 'All vehicles', 'Every 6 months', 'F?', 30, '', 'Set the due date to your policy renewal date.'],
    ['Shop Auto Insurance Rates', 'Vehicle', 'All vehicles', 'Yearly', '!', 45, '', 'Comparing quotes once a year often saves hundreds.'],
    ['Brake Fluid & Coolant Service', 'Vehicle', 'All vehicles', 'Every 2 years', '!', 30, '', ''],
    ['Check Spare Tire, Jack & Roadside Kit', 'Vehicle', 'All vehicles', 'Yearly', '!', 30, '', 'Spare tires slowly lose air sitting unused.']] },
  { k: 'kids', t: 'Parent', d: 'Well visits, school, car seats', ic: 'kid', s: [
    ['Well-Child Visit', 'Health', '', 'Well-child (by age)', 'K', 45, '', 'Follows the pediatric checkup schedule from the birth date.'],
    ['{n}’s Birthday', 'Celebrations', '', 'Yearly', 'KF', 30, '', 'Opens a month early to plan a party or gift.'],
    ['Dentist Cleaning', 'Health', 'Kids', 'Every 6 months', '', 30, '', ''],
    ['Kids’ School / Sports Physicals & Forms', 'Health', 'Kids', 'Yearly', 'F', 45, '07-15', ''],
    ['Update Immunization Records for School', 'Health', 'Kids', 'Yearly', 'F', 30, '07-15', ''],
    ['Check Car Seat Fit & Expiration Dates', 'Vehicle', 'Kids\' car seats', 'Yearly', '!', 30, '', 'Car seats expire, usually 6 to 10 years after they’re made. The date is on a sticker.'],
    ['Book Summer Camps & Activities', 'Personal', 'Kids', 'Yearly', 'F!', 45, '02-15', 'Popular camps fill up by early spring.'],
    ['School Registration / Enrollment', 'Personal', 'Kids', 'Yearly', 'F', 45, '05-01', ''],
    ['Back-to-School Supplies & Clothes', 'Personal', 'Kids', 'Yearly', 'F', 21, '08-01', ''],
    ['Donate Outgrown Kids’ Clothes & Toys', 'Personal', 'Kids', 'Every 6 months', '', 14, '', ''],
    ['Review Kids’ Devices & Parental Controls', 'Tech & Digital', 'Kids', 'Every 6 months', '!', 14, '', ''],
    ['Practice Fire Escape Plan with Kids', 'Personal', 'Family', 'Every 6 months', '!', 14, '', 'Pick a meeting spot outside and walk the route together.'],
    ['Sanitize Kids’ Toys, High Chairs & Car Seats', 'Cleaning', 'Kids', 'Monthly', '-', 7, '', ''],
    ['Renew Passports (Kids Under 16)', 'Personal', 'Kids', 'Every 5 years', 'F?-', 180, '', 'Kids’ passports last only 5 years. Set the due date to the expiration.']] },
  { k: 'pet', t: 'Pet Owner', d: 'Vet, prevention, tags', ic: 'paw', s: [
    ['Annual Vet Checkup & Vaccines', 'Pets', '', 'Yearly', 'P', 30, '', ''],
    ['Flea, Tick & Heartworm Prevention', 'Pets', '', 'Monthly', 'P!', 5, '', 'Easy to miss a month, and a missed dose can let heartworm in.'],
    ['Renew Pet License / Rabies Tag', 'Pets', '', 'Yearly', 'PF?!', 30, '', 'Set the due date to the tag’s expiration.'],
    ['Update Microchip Contact Info', 'Pets', '', 'Yearly', 'P!', 30, '', 'A chip only helps if the phone number on file is current.'],
    ['Trim Nails', 'Pets', 'Pets', 'Monthly', '', 7, '', ''],
    ['Bath & Grooming', 'Pets', 'Pets', 'Every 2 months', '', 14, '', ''],
    ['Wash Pet Beds, Bowls & Toys', 'Pets', 'Pets', 'Monthly', '!', 7, '', ''],
    ['Pet Dental Cleaning', 'Pets', '', 'Yearly', 'P-', 30, '', ''],
    ['Restock Pet Food & Meds', 'Pets', 'Pets', 'Monthly', '-', 7, '', '']] },
  { k: 'yard', t: 'Yard & Pool', d: 'Lawn, sprinklers, mower, grill', ic: 'leaf', s: [
    ['Lawn Mower Service (Blade, Oil, Plug)', 'Yard & Pool', 'Garage', 'Yearly', 'F', 30, '03-15', 'Sharp blades cut cleaner and keep grass healthier.'],
    ['Spring Lawn Fertilizer & Pre-Emergent', 'Yard & Pool', 'Yard', 'Yearly', 'F', 14, '04-15', 'Apply when the soil warms up, around when forsythia blooms.'],
    ['Fall Lawn Fertilizer (Winterizer)', 'Yard & Pool', 'Yard', 'Yearly', 'F!', 14, '10-15', 'The most important feeding of the year.'],
    ['Aerate & Overseed Lawn', 'Yard & Pool', 'Yard', 'Yearly', 'F', 14, '09-01', ''],
    ['Trim Trees & Shrubs', 'Yard & Pool', 'Yard', 'Yearly', 'F', 30, '03-01', ''],
    ['Refresh Mulch Beds', 'Yard & Pool', 'Yard', 'Yearly', 'F', 14, '05-01', ''],
    ['Deep-Clean Grill & Check Propane', 'Yard & Pool', 'Patio', 'Yearly', 'F!', 14, '04-15', ''],
    ['Store Patio Furniture & Cover Grill', 'Yard & Pool', 'Patio', 'Yearly', 'F', 14, '10-31', ''],
    ['Start Up Sprinkler System', 'Yard & Pool', 'Yard', 'Yearly', 'F-', 14, '04-20', ''],
    ['Blow Out / Winterize Sprinklers', 'Yard & Pool', 'Yard', 'Yearly', 'F-', 30, '10-15', 'Must happen before the first hard freeze.'],
    ['Snow Blower Service & Fuel', 'Yard & Pool', 'Garage', 'Yearly', 'F-', 14, '10-31', ''],
    ['Open Pool', 'Yard & Pool', 'Pool', 'Yearly', 'F-', 30, '05-15', ''],
    ['Close / Winterize Pool', 'Yard & Pool', 'Pool', 'Yearly', 'F-', 30, '09-15', '']] },
  { k: 'clean', t: 'Keeping House', d: 'The deep-clean jobs that slip', ic: 'spark', s: [
    ['Clean Washing Machine (Tub + Gasket)', 'Cleaning', 'Laundry', 'Monthly', '!', 7, '', 'Run an empty hot cycle with cleaner and wipe the door seal.'],
    ['Clean Garbage Disposal', 'Cleaning', 'Kitchen', 'Monthly', '', 7, '', 'Ice cubes and a little dish soap, then citrus peels.'],
    ['Descale Coffee Maker', 'Cleaning', 'Kitchen', 'Monthly', '!', 7, '', ''],
    ['Clean Out Fridge & Freezer', 'Cleaning', 'Kitchen', 'Every 3 months', '', 14, '', ''],
    ['Deep-Clean Oven', 'Cleaning', 'Kitchen', 'Every 6 months', '', 14, '', ''],
    ['Descale Showerheads & Faucets', 'Cleaning', 'Bathrooms', 'Every 3 months', '!', 14, '', 'Soak them in vinegar for an hour.'],
    ['Wash / Replace Shower Curtain Liner', 'Cleaning', 'Bathrooms', 'Every 3 months', '!', 14, '', ''],
    ['Wash Pillows & Comforters', 'Cleaning', 'Bedrooms', 'Every 6 months', '!', 14, '', ''],
    ['Rotate Mattresses 180°', 'Cleaning', 'All beds', 'Every 6 months', '!', 14, '', 'Spreads wear evenly so mattresses last longer.'],
    ['Dust Baseboards, Vents & Ceiling Fans', 'Cleaning', 'Whole house', 'Every 3 months', '', 14, '', ''],
    ['Clean Bathroom Exhaust Fans', 'Cleaning', 'Bathrooms', 'Yearly', '!', 14, '', ''],
    ['Clean Trash & Recycling Bins', 'Cleaning', 'Garage', 'Every 3 months', '!', 14, '', ''],
    ['Wash Windows & Screens', 'Cleaning', 'Whole house', 'Yearly', 'F', 30, '05-01', ''],
    ['Shampoo Carpets & Rugs', 'Cleaning', 'Whole house', 'Yearly', '', 30, '', '']] },
  { k: 'health', t: 'Your Health', d: 'Dentist, physicals, checkups', ic: 'heart', s: [
    ['Dentist Cleaning', 'Health', '', 'Every 6 months', 'A', 30, '', ''],
    ['Annual Physical', 'Health', '', 'Yearly', 'A', 30, '', 'Preventive visits are usually free with insurance.'],
    ['Eye Exam', 'Health', 'Family', 'Yearly', '', 30, '', ''],
    ['Skin Check (Dermatology)', 'Health', 'Adults', 'Yearly', '!', 30, '', ''],
    ['Flu Shots', 'Health', 'Family', 'Yearly', 'F', 30, '10-01', ''],
    ['Replace Toothbrushes', 'Health', 'Family', 'Every 3 months', '!', 7, '', 'And after anyone has been sick.'],
    ['Restock First-Aid Kit & Toss Expired Meds', 'Health', 'Home', 'Yearly', '!', 14, '', ''],
    ['Review Prescriptions & Refills', 'Health', 'Family', 'Every 3 months', '-', 14, '', '']] },
  { k: 'money', t: 'Money & Paperwork', d: 'Bills, taxes, insurance, IDs', ic: 'money', s: [
    ['Pay Mortgage or Rent', 'Bills & Finance', 'Home', 'Monthly', 'F?H', 5, '', 'Set the due date to your payment date. Add the amount by editing the task.'],
    ['Pay Car Payment', 'Bills & Finance', '', 'Monthly', 'F?C', 5, '', 'Set the due date to your payment date.'],
    ['Pay Utilities (Electric, Gas, Water)', 'Bills & Finance', 'Home', 'Monthly', 'F?', 5, '', ''],
    ['Pay Credit Cards', 'Bills & Finance', 'Adults', 'Monthly', 'F?', 5, '', 'Even on autopay, a quick check catches surprise charges.'],
    ['Gather Tax Documents', 'Bills & Finance', 'Family', 'Yearly', 'F', 14, '02-15', ''],
    ['File Taxes', 'Bills & Finance', 'Family', 'Yearly', 'F', 45, '04-15', ''],
    ['Homeowners Insurance Renewal', 'Bills & Finance', 'Home', 'Yearly', 'F?H', 45, '', 'Set the due date to your policy renewal. It opens early so you can shop rates.'],
    ['Benefits Open Enrollment / FSA-HSA', 'Bills & Finance', 'Family', 'Yearly', 'F!', 21, '11-01', 'Check your employer’s dates. Use-it-or-lose-it FSA money is easy to forget.'],
    ['Pull Free Credit Report', 'Bills & Finance', 'Family', 'Every 4 months', '!', 14, '', 'Free at annualcreditreport.com.'],
    ['Audit Subscriptions & Autopays', 'Bills & Finance', 'Family', 'Every 6 months', '!', 14, '', ''],
    ['Review Life & Umbrella Insurance', 'Bills & Finance', 'Family', 'Yearly', '', 30, '', ''],
    ['Review Will, Guardianship & Beneficiaries', 'Personal', 'Family', 'Every 3 years', '!', 30, '', 'Update after any birth, move or marriage.'],
    ['Renew Driver’s License', 'Personal', '', 'Every 4 years', 'AF?', 90, '', 'Set the due date to the expiration printed on the license.'],
    ['Renew Passports (Adults)', 'Personal', 'Adults', 'Every 10 years', 'F?-', 180, '', 'Many countries want 6 months left on it before you travel.'],
    ['Update Home Inventory (Photos/Video)', 'Bills & Finance', 'Whole house', 'Yearly', '!', 30, '', 'A quick video of every room makes insurance claims much easier.'],
    ['Review Retirement Contributions & Rebalance', 'Bills & Finance', 'Family', 'Yearly', 'F-', 30, '01-15', '']] },
  { k: 'tech', t: 'Tech & Digital', d: 'Backups, passwords, router', ic: 'laptop', s: [
    ['Back Up Phones, Photos & Computers', 'Tech & Digital', 'Family', 'Every 3 months', '!', 14, '', ''],
    ['Update Router Firmware & Reboot', 'Tech & Digital', 'Home network', 'Every 6 months', '!', 14, '', ''],
    ['Review Passwords & Two-Factor', 'Tech & Digital', 'Family', 'Yearly', '', 14, '', ''],
    ['Clear Phone Storage & Old Apps', 'Tech & Digital', 'Family', 'Every 6 months', '', 14, '', ''],
    ['Replace Batteries (Thermostat, Locks, Remotes)', 'Tech & Digital', 'Whole house', 'Yearly', 'F!', 14, '11-01', 'Smart locks and thermostats always die at the worst time.'],
    ['Test Security Cameras, Doorbell & Alarm', 'Tech & Digital', 'Home', 'Every 6 months', '-', 14, '', ''],
    ['Renew Software & Antivirus Subscriptions', 'Tech & Digital', 'Family', 'Yearly', 'F?-', 30, '', '']] },
  { k: 'celebrate', t: 'Celebrations', d: 'Birthdays, holidays, anniversaries', ic: 'gift', s: [
    ['{n}', 'Celebrations', 'Family', 'Yearly', 'BF', 14, '', 'Opens 2 weeks early so there’s time for a card or gift.'],
    ['Valentine’s Day', 'Celebrations', 'Family', 'Yearly', 'F', 14, '02-14', ''],
    ['Mother’s Day', 'Celebrations', 'Family', 'Yearly', 'F', 14, 'H:mothers', 'The date moves each year. Tend works it out.'],
    ['Father’s Day', 'Celebrations', 'Family', 'Yearly', 'F', 14, 'H:fathers', 'The date moves each year. Tend works it out.'],
    ['Easter', 'Celebrations', 'Family', 'Yearly', 'F-', 14, 'H:easter', ''],
    ['Fourth of July Plans', 'Celebrations', 'Family', 'Yearly', 'F-', 14, '07-04', ''],
    ['Halloween Costumes & Candy', 'Celebrations', 'Family', 'Yearly', 'F', 30, '10-31', 'Popular costumes sell out early.'],
    ['Thanksgiving Plans', 'Celebrations', 'Family', 'Yearly', 'F', 21, 'H:thanksgiving', ''],
    ['Holiday Gifts & Cards', 'Celebrations', 'Family', 'Yearly', 'F', 45, '12-25', 'Opens in early November so shopping isn’t last-minute.'],
    ['New Year’s Eve Plans', 'Celebrations', 'Family', 'Yearly', 'F-', 21, '12-31', '']] },
  { k: 'partner', t: 'Spouse / Partner', d: 'Anniversary, date night, plans', ic: 'ring', s: [
    ['Plan Anniversary (Gift & Reservation)', 'Personal', 'Adults', 'Yearly', 'F?', 30, '', 'Set the due date to your anniversary. It opens a month early so you can plan.'],
    ['Date Night', 'Personal', 'Adults', 'Monthly', '', 7, '', ''],
    ['Budget & Goals Check-In', 'Bills & Finance', 'Adults', 'Every 3 months', '', 14, '', ''],
    ['Update Family Emergency Plan & Contacts', 'Personal', 'Family', 'Yearly', '!', 14, '', ''],
    ['Plan & Book Family Vacation', 'Personal', 'Family', 'Yearly', 'F', 45, '02-01', ''],
    ['Order Holiday Cards & Family Photo', 'Personal', 'Family', 'Yearly', 'F-', 21, '11-01', ''],
    ['Renew Memberships (Costco, Zoo, etc.)', 'Misc', 'Family', 'Yearly', 'F?-', 30, '', '']] }
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

