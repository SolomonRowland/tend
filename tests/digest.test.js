// Checks the wording and rules of the daily heads-up (the same code the tend-notify function runs).
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/../supabase/functions/tend-notify/index.ts', 'utf8');
const block = src.split('// --- digest start')[1].split('// --- digest end ---')[0].replace(/^[^\n]*\n/, '');
const { localToday, buildDigest } = new Function(block + '; return { localToday, buildDigest };')();
let ok = 0, bad = 0;
function eq(name, got, want) { const g = JSON.stringify(got), w = JSON.stringify(want); if (g === w) { ok++; console.log('PASS', name); } else { bad++; console.log('FAIL', name, '\n  got ', g, '\n  want', w); } }
const T = '2026-11-19';
eq('nothing due -> no notification', buildDigest({ tasks: [['a', 'Rotate tires', '2026-12-30', '2026-12-20', null]] }, T), null);
eq('missing schedule -> no notification', buildDigest(null, T), null);
eq('overdue and due today', buildDigest({ tasks: [
  ['a', 'Clean dryer vent', '2026-11-01', '2026-10-25', null], ['b', 'Pay electric', T, '2026-11-12', null], ['c', 'Rotate tires', '2026-11-24', '2026-11-17', null]] }, T),
  { title: '1 thing is overdue', body: 'Overdue: Clean dryer vent. Due today: Pay electric. Coming up: Rotate tires.', count: 3 });
eq('only coming up', buildDigest({ tasks: [['a', 'Rotate tires', '2026-11-24', '2026-11-20', null], ['b', 'Replace furnace filter', '2026-12-15', '2026-11-15', null]] }, T),
  { title: '2 things coming up this week', body: 'Coming up: Rotate tires, Replace furnace filter.', count: 2 });
eq('snoozed tasks wait (unless overdue)', buildDigest({ tasks: [['a', 'Wash car', '2026-11-21', '2026-11-14', '2026-11-26'], ['b', 'Old thing', '2026-11-02', '2026-11-01', '2026-11-30']] }, T),
  { title: '1 thing is overdue', body: 'Overdue: Old thing.', count: 1 });
eq('long lists are trimmed', buildDigest({ tasks: [1, 2, 3, 4].map(i => ['o' + i, 'Overdue ' + i, '2026-11-0' + i, '2026-10-01', null]) }, T).body, 'Overdue: Overdue 1, Overdue 2 and 2 more.');
const shared = { tasks: [['a', 'Clean gutters', '2026-11-01', '2026-10-25', null, 'Kelly'], ['b', 'Pay electric', T, '2026-11-12', null, ''], ['c', 'Rotate tires', '2026-11-24', '2026-11-17', null, 'Solomon']] };
eq('Kelly hears her jobs plus shared ones', buildDigest(shared, T, 'Kelly'), { title: '1 thing is overdue', body: 'Overdue: Clean gutters. Due today: Pay electric.', count: 2 });
eq('Solomon does not hear Kelly\'s jobs', buildDigest(shared, T, 'Solomon'), { title: '1 thing due today', body: 'Due today: Pay electric. Coming up: Rotate tires.', count: 2 });
eq('older schedules without owners still work', buildDigest({ tasks: [['b', 'Pay electric', T, '2026-11-12', null]] }, T, 'Kelly').count, 1);
const full = { tasks: [['a', 'Clean gutters', '2026-11-01', '2026-10-25', null, 'Sam Park'], ['b', 'Pay electric', T, '2026-11-12', null, ''], ['c', 'Rotate tires', '2026-11-24', '2026-11-17', null, 'Sam Lee']] };
eq('two people named Sam each hear only their own jobs', [buildDigest(full, T, 'Sam Lee').body, buildDigest(full, T, 'Sam Park').body], ['Due today: Pay electric. Coming up: Rotate tires.', 'Overdue: Clean gutters. Due today: Pay electric.']);
eq('older first-name rows still reach the right person', buildDigest(shared, T, 'Kelly Lee').count, 2);
eq('rows can name an account id too', buildDigest({ tasks: [['a', 'Clean gutters', '2026-11-01', '2026-10-25', null, 'uid-1']] }, T, 'Kelly Lee', 'uid-1').count, 1);
eq('local time in Chicago', localToday('America/Chicago', new Date('2026-11-19T14:05:00Z')), { date: '2026-11-19', hour: 8 });
eq('local date rolls at midnight', localToday('America/Chicago', new Date('2026-11-20T05:30:00Z')), { date: '2026-11-19', hour: 23 });
console.log(ok, 'passed', bad, 'failed'); process.exit(bad ? 1 : 0);
