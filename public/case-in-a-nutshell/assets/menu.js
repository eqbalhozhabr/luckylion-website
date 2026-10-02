'use strict';
/* menu.js : the menu (cases, settings) shared by the hub and every case page.
   Reads its data and texts from <script id="nut-menu"> so it needs no knowledge of any case.
   Settings live in localStorage under "nutshell:settings" (every access guarded) and are applied
   as data-attributes on <html>; the tiny inline script in <head> applies them before first paint. */
(function () {
  var data;
  try { data = JSON.parse(document.getElementById('nut-menu').textContent); } catch (e) { return; }
  var T = data.t, html = document.documentElement;
  var KEY = 'nutshell:settings';
  function read() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } }
  function write(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* settings just won't persist */ } }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  var openEl = null, lastFocus = null;

  function close() { if (!openEl) return; openEl.remove(); openEl = null; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  function seg(title, key, options, apply) {
    var g = el('div', 'group-b'), row = el('div', 'seg'), cur = read()[key] || options[0][0];
    g.appendChild(el('h3', null, title));
    options.forEach(function (o) {
      var b = el('button', null, o[1]); b.type = 'button'; b.setAttribute('aria-pressed', String(cur === o[0]));
      b.addEventListener('click', function () {
        var s = read(); s[key] = o[0]; write(s); apply(o[0]);
        row.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); }); b.setAttribute('aria-pressed', 'true');
      });
      row.appendChild(b);
    });
    g.appendChild(row); return g;
  }
  function open() {
    if (openEl) return;
    lastFocus = document.activeElement;
    var back = el('div', 'menu-back'), m = el('div', 'menu');
    m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', T.title);
    var x = el('button', 'x', '×'); x.type = 'button'; x.setAttribute('aria-label', T.close); x.addEventListener('click', close);
    var head = el('div', 'head'); head.appendChild(el('h2', null, T.title)); head.appendChild(x); m.appendChild(head);

    var cases = el('div', 'group-b'); cases.appendChild(el('h3', null, T.cases));
    var list = el('div', 'list');
    data.cases.forEach(function (c) {
      var it = c.locked ? el('div', 'item locked') : el('a', 'item' + (c.current ? ' cur' : ''));
      if (!c.locked) it.href = c.href;
      it.appendChild(el('span', null, c.label)); it.appendChild(el('small', null, c.sub));
      list.appendChild(it);
    });
    var hub = el('a', 'item'); hub.href = data.hub; hub.appendChild(el('span', null, T.board)); list.appendChild(hub);
    cases.appendChild(list); m.appendChild(cases);

    var lang = el('div', 'group-b'); lang.appendChild(el('h3', null, T.language));
    var ll = el('div', 'list');
    data.langs.forEach(function (l) {
      var it = l.current ? el('div', 'item cur') : el('a', 'item'); if (!l.current) { it.href = l.href; it.setAttribute('hreflang', l.lang); it.setAttribute('lang', l.lang); }
      it.appendChild(el('span', null, l.name)); ll.appendChild(it);
    });
    lang.appendChild(ll); m.appendChild(lang);

    m.appendChild(seg(T.font, 'font', [['mixed', T.fontMixed], ['pixel', T.fontPixel], ['clean', T.fontClean]], function (v) { html.dataset.font = v; }));
    m.appendChild(seg(T.size, 'size', [['m', T.sizeM], ['s', T.sizeS], ['l', T.sizeL]], function (v) { html.dataset.size = v; }));
    m.appendChild(seg(T.motion, 'motion', [['auto', T.motionAuto], ['reduce', T.motionReduce]], function (v) { html.dataset.motion = v; }));
    m.appendChild(el('p', 'sample', T.sample));
    if (data.about) {
      var lb = el('button', 'item listbtn', data.about.list); lb.type = 'button';
      lb.addEventListener('click', function () { close(); window.dispatchEvent(new CustomEvent('nut-list')); });
      var lg = el('div', 'group-b'); lg.appendChild(lb); m.insertBefore(lg, m.children[1]);
    }
    if (data.about) {
      var ab = el('div', 'group-b about-b'); ab.appendChild(el('h3', null, data.about.h));
      data.about.paras.forEach(function (p) { ab.appendChild(el('p', null, p)); });
      ab.appendChild(el('h3', null, data.about.h2));
      var ul = el('ul'); data.about.how.forEach(function (p) { ul.appendChild(el('li', null, p)); }); ab.appendChild(ul);
      ab.appendChild(el('p', null, data.about.saved)); m.appendChild(ab);
    }

    back.appendChild(m); document.body.appendChild(back); openEl = back;
    back.addEventListener('click', function (e) { if (e.target === back) close(); });
    x.focus();
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  var b = document.getElementById('menu-btn'); if (b) b.addEventListener('click', open);
})();
