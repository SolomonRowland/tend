'use strict';
/* Tend: photos on tasks and belongings (receipts, filter sizes, the crack you're watching).
   Photos live in the household's private Supabase Storage folder: photos/<household>/<task or belonging>/<file>.jpg
   The task or belonging keeps the list ({ p: path, at: date, by: name }) so it syncs like everything else. */
var PHOTO_MAX = 12;
var photoUrls = {}; // path -> { url, until }

function normPhotos(list) {
  return (Array.isArray(list) ? list : []).filter(function (x) { return x && typeof x.p === 'string' && /^[0-9a-f-]{36}\/[\w-]+\/[\w-]+\.jpg$/.test(x.p); })
    .map(function (x) { return { p: x.p, at: parse(x.at) ? x.at : null, by: String(x.by || '') }; }).slice(0, PHOTO_MAX);
}
function photoOwner(kind, id) { return kind === 'item' ? itemById(id) : db.tasks.find(function (t) { return t.id === id; }); }

function photosCard(kind, obj) {
  if (!C.on || !C.hid) return '';
  var list = obj.photos || [], need = list.filter(function (x) { var u = photoUrls[x.p]; return !u || u.until < Date.now(); }).map(function (x) { return x.p; });
  if (need.length) loadPhotoUrls(need);
  var h = '<div class="section"><h2 style="font-size:19px">Photos</h2>' + (list.length < PHOTO_MAX ? '<button class="link" data-act="photo-add" data-kind="' + kind + '" data-id="' + esc(obj.id) + '">+ Add</button>' : '') + '</div>';
  if (!list.length) return h + '<button class="photoempty" data-act="photo-add" data-kind="' + kind + '" data-id="' + esc(obj.id) + '">' + ic('camera', 22) + '<span>' +
    (kind === 'item' ? 'Snap the model sticker, filter size or receipt.' : 'Snap a receipt, a part number, or a before-and-after.') + '</span></button>';
  h += '<div class="photos">' + list.map(function (x, i) {
    var u = photoUrls[x.p];
    return '<button class="ph" data-act="photo-open" data-kind="' + kind + '" data-id="' + esc(obj.id) + '" data-i="' + i + '" aria-label="Photo ' + (i + 1) + '">' +
      (u ? '<img src="' + esc(u.url) + '" alt="" loading="lazy">' : '<span class="phload">' + (C.online ? '' : 'Offline') + '</span>') + '</button>';
  }).join('') + '</div>';
  if (ui.photoBusy) h += '<p class="note" style="text-align:left;padding:6px 20px 0">Uploading…</p>';
  return h;
}
function loadPhotoUrls(paths) {
  if (loadPhotoUrls.busy) return; loadPhotoUrls.busy = true;
  C.sb.storage.from('photos').createSignedUrls(paths, 3600).then(function (r) {
    loadPhotoUrls.busy = false;
    if (r.error) return;
    (r.data || []).forEach(function (x) { if (x.signedUrl) photoUrls[x.path] = { url: x.signedUrl, until: Date.now() + 50 * 60000 }; });
    if (ui.screen === 'task' || ui.screen === 'item') refreshView();
  }, function () { loadPhotoUrls.busy = false; });
}

/* shrink to at most 1600px on the long side, as a JPEG (a phone photo goes from ~4 MB to ~300 KB) */
function shrinkPhoto(file) {
  return new Promise(function (ok, bad) {
    var url = URL.createObjectURL(file), img = new Image();
    img.onload = function () {
      var s = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight)), w = Math.round(img.naturalWidth * s), hh = Math.round(img.naturalHeight * s);
      var cv = document.createElement('canvas'); cv.width = w; cv.height = hh;
      cv.getContext('2d').drawImage(img, 0, 0, w, hh); URL.revokeObjectURL(url);
      cv.toBlob(function (b) { b ? ok(b) : bad(new Error('Could not read that photo')); }, 'image/jpeg', 0.8);
    };
    img.onerror = function () { URL.revokeObjectURL(url); bad(new Error('Could not read that photo')); };
    img.src = url;
  });
}
var photoInput = document.createElement('input');
photoInput.type = 'file'; photoInput.accept = 'image/*'; photoInput.className = 'sr'; photoInput.tabIndex = -1; photoInput.setAttribute('aria-hidden', 'true');
document.body.appendChild(photoInput);
photoInput.addEventListener('change', function () {
  var f = photoInput.files && photoInput.files[0], tgt = photoInput.target; photoInput.value = '';
  if (!f || !tgt) return;
  if (!C.online && !navigator.onLine) { toast('Adding photos needs a connection.'); return; }
  var hid = C.hid, path = hid + '/' + tgt.id + '/' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + '.jpg';
  ui.photoBusy = true; keepRender();
  shrinkPhoto(f).then(function (blob) {
    return C.sb.storage.from('photos').upload(path, blob, { contentType: 'image/jpeg', upsert: false }).then(function (r) {
      if (r.error) throw r.error;
      photoUrls[path] = { url: URL.createObjectURL(blob), until: Date.now() + 50 * 60000 };
      var o = photoOwner(tgt.kind, tgt.id); if (!o || hid !== C.hid) return;
      o.photos = (o.photos || []).concat([{ p: path, at: iso(today()), by: db.user }]).slice(0, PHOTO_MAX);
      save();
    });
  }).then(function () { ui.photoBusy = false; keepRender(); }, function (e) { ui.photoBusy = false; keepRender(); toast(cloudMsg(e)); });
});

/* full-screen viewer */
function photoViewer() {
  var v = ui.viewer; if (!v) return '';
  var o = photoOwner(v.kind, v.id), x = o && (o.photos || [])[v.i];
  if (!x) { ui.viewer = null; return ''; }
  var u = photoUrls[x.p], armed = ui.armed === 'photo-del';
  return '<div class="viewer" role="dialog" aria-modal="true" aria-label="Photo"><div class="vtop"><button class="textbtn" data-act="photo-close">Done</button><span>' + (v.i + 1) + ' of ' + o.photos.length + '</span>' +
    '<button class="textbtn" data-act="photo-del" style="' + (armed ? 'color:#FF8A80' : '') + '">' + (armed ? 'Tap to Delete' : 'Delete') + '</button></div>' +
    '<div class="vimg" data-act="photo-next">' + (u ? '<img src="' + esc(u.url) + '" alt="">' : '') + '</div>' +
    '<div class="vcap">' + esc([x.at ? fmt(parse(x.at), true) : '', x.by ? 'by ' + x.by : ''].filter(Boolean).join(' · ')) + '</div></div>';
}
function showViewer() { document.getElementById('modal').innerHTML = ui.viewer ? photoViewer() : modalHtml(); }
function deletePhotos(list) {
  var paths = (list || []).map(function (x) { return x.p; });
  if (paths.length && C.on && C.sb) C.sb.storage.from('photos').remove(paths).then(function () {}, function () {});
}
function photoAct(a, el) {
  switch (a) {
    case 'photo-add':
      photoInput.target = { kind: el.getAttribute('data-kind'), id: el.getAttribute('data-id') }; photoInput.click(); return true;
    case 'photo-open': ui.armed = null; ui.viewer = { kind: el.getAttribute('data-kind'), id: el.getAttribute('data-id'), i: +el.getAttribute('data-i') }; showViewer(); return true;
    case 'photo-close': ui.viewer = null; ui.armed = null; showViewer(); return true;
    case 'photo-next':
      var o = photoOwner(ui.viewer.kind, ui.viewer.id); if (o && o.photos.length > 1) { ui.viewer.i = (ui.viewer.i + 1) % o.photos.length; ui.armed = null; showViewer(); } return true;
    case 'photo-del':
      if (ui.armed !== 'photo-del') { ui.armed = 'photo-del'; showViewer(); return true; }
      var ow = photoOwner(ui.viewer.kind, ui.viewer.id); ui.armed = null;
      if (ow) { deletePhotos(ow.photos.splice(ui.viewer.i, 1)); save(); }
      ui.viewer = null; showViewer(); keepRender(); toast('Photo deleted.'); return true;
  }
  return false;
}
