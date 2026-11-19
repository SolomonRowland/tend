'use strict';
/* Tend: swipe a task row right to mark it done, or left to snooze it a week.
   Only takes over when the finger moves mostly sideways, so scrolling the list still works.
   Tapping the check and opening the task work exactly as before. */
var SW = { el: null, row: null, x0: 0, y0: 0, dx: 0, mode: '', w: 0, skipClick: false };
var SW_FIRE = 0.32; // share of the row width to pass before letting go counts

function swStart(e) {
  if (e.touches.length !== 1) return;
  var box = e.target.closest && e.target.closest('.swipe');
  if (!box || box.classList.contains('gone')) return;
  var row = box.querySelector('.row');
  if (!row || row.classList.contains('doing')) return;
  SW.el = box; SW.row = row; SW.mode = ''; SW.dx = 0; SW.w = box.offsetWidth || 340;
  SW.x0 = e.touches[0].clientX; SW.y0 = e.touches[0].clientY;
}
function swMove(e) {
  if (!SW.el) return;
  var dx = e.touches[0].clientX - SW.x0, dy = e.touches[0].clientY - SW.y0;
  if (!SW.mode) {
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
    if (Math.abs(dy) >= Math.abs(dx)) { swReset(); return; } // it's a scroll
    SW.mode = 'drag'; SW.el.classList.add('dragging'); SW.row.classList.remove('settle');
  }
  e.preventDefault();
  if (dx < 0 && SW.el.getAttribute('data-snooze') !== '1') dx = dx / 4; // can't snooze this one: resist
  SW.dx = dx;
  SW.row.style.transform = 'translateX(' + dx + 'px)';
  SW.el.classList.toggle('left', dx < 0); SW.el.classList.toggle('right', dx > 0);
  var armed = Math.abs(dx) > SW.w * SW_FIRE && (dx > 0 || SW.el.getAttribute('data-snooze') === '1');
  if (armed !== SW.el.classList.contains('armed')) { SW.el.classList.toggle('armed', armed); if (armed && navigator.vibrate) try { navigator.vibrate(8); } catch (x) {} }
}
function swEnd() {
  if (!SW.el) return;
  var box = SW.el, row = SW.row, dragged = SW.mode === 'drag', fire = dragged && box.classList.contains('armed') ? (SW.dx > 0 ? 'done' : 'snooze') : '';
  SW.el = null; SW.row = null; SW.mode = '';
  if (!dragged) return;
  SW.skipClick = true; setTimeout(function () { SW.skipClick = false; }, 350);
  row.classList.add('settle'); row.style.transform = '';
  box.classList.remove('dragging', 'armed');
  var id = box.getAttribute('data-id');
  if (fire === 'done') { box.classList.remove('left'); quickDone(id, row); }
  else if (fire === 'snooze') quickSnooze(id, row);
  else setTimeout(function () { box.classList.remove('left', 'right'); }, 230);
}
function swReset() { if (SW.el) { SW.el.classList.remove('dragging'); } SW.el = null; SW.row = null; SW.mode = ''; }

var swView = document.getElementById('view');
swView.addEventListener('touchstart', swStart, { passive: true });
swView.addEventListener('touchmove', swMove, { passive: false });
swView.addEventListener('touchend', swEnd);
swView.addEventListener('touchcancel', function () {
  if (SW.row) { SW.row.classList.add('settle'); SW.row.style.transform = ''; SW.el.classList.remove('dragging', 'armed', 'left', 'right'); }
  swReset();
});
// a drag shouldn't also count as a tap on the row
swView.addEventListener('click', function (e) { if (SW.skipClick) { SW.skipClick = false; e.stopPropagation(); e.preventDefault(); } }, true);
