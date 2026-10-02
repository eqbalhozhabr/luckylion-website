'use strict';
/* ============================================================
   game.js : everything the player touches. Reads the globals the
   case bundle defines (CASE, ROOMS), the engine (renderRoom,
   compose, resolveRoom, drawPortrait ...) and the text table
   window.NUT_I18N. No sentence and no number format lives here:
   every string goes through t(), every number through num().
   ============================================================ */
(function () {
  const I = window.NUT_I18N;
  const t = (key, vars) => {
    const s = I.strings[key];
    if (s == null) { try { console.warn('missing text:', key); } catch (e) { /* ignore */ } return key; }
    return vars ? s.replace(/\{(\w+)\}/g, (m, n) => (vars[n] != null ? vars[n] : m)) : s;
  };
  const has = (key) => I.strings[key] != null;
  const nf = new Intl.NumberFormat(I.lang);
  const num = (n) => nf.format(n);
  const dig = (s) => String(s).replace(/\d/g, (d) => nf.format(+d));   // digits of times such as 22:50 in the reader's own numerals

  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const reducedQ = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => (reducedQ && reducedQ.matches) || document.documentElement.dataset.motion === 'reduce';
  const cv = $('cv'), ctx = cv.getContext('2d'), stage = $('stage');
  const img = ctx.createImageData(W, H), img32 = new Uint32Array(img.data.buffer);

  /* ---------- state + saving (browser storage may be blocked: every touch is guarded) ---------- */
  const KEY = 'nutshell:' + CASE.id;
  const SCENE = CASE.sceneRoom || 'bedroom';          // the room whose moments the player can compare
  const S = {
    room: CASE.map.start, moment: 'scene', compare: false,
    world: { lamp: false, box: false }, items: [], facts: {}, order: [], diffFound: [], docsSeen: {}, clockPushed: false,
    tries: 0, hints: 0, solved: false, stars: 0, playMs: 0, introSeen: false, visited: [],
    hover: 0, lampT: 0, sparkle: false, cur: null, tab: 'notebook', catN: 0, pick: {}, fresh: {}, lastHint: '', feedback: [], feedbackText: [], hintTier: {}
  };
  const SAVED = ['world', 'items', 'facts', 'order', 'diffFound', 'docsSeen', 'clockPushed', 'tries', 'hints', 'solved', 'stars', 'playMs', 'introSeen', 'visited'];
  function load() {
    try { const j = JSON.parse(localStorage.getItem(KEY) || 'null'); if (j) for (const k of SAVED) if (k in j) S[k] = j[k]; } catch (e) { /* no storage: play without saving */ }
  }
  function save() {
    try { const o = {}; for (const k of SAVED) o[k] = S[k]; localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* ignore */ }
  }
  function track(name, params) {
    try {
      const d = Object.assign({ case_id: CASE.id, locale: I.locale }, params || {});
      if (window.gtag) window.gtag('event', 'nutshell_' + name, d);
      else if (window.dataLayer) window.dataLayer.push(Object.assign({ event: 'nutshell_' + name }, d));
      window.dispatchEvent(new CustomEvent('nutshell:event', { detail: Object.assign({ name }, d) }));
    } catch (e) { /* analytics must never break the game */ }
  }

  const suspect = (id) => CASE.suspects.find(s => s.id === id);
  const sname = (id) => t('suspect.' + id + '.name');
  const moment = (id) => CASE.moments.find(m => m.id === id);
  const D = CASE.diff;
  const NDIFF = D.items.length;
  const REQUIRED = Object.keys(CASE.facts).filter(k => CASE.facts[k].required);
  const ft = (id) => t('fact.' + id + '.title');

  /* ---------- message line ---------- */
  let tw = null;
  function say(text) {
    const m = $('msg');
    clearInterval(tw);
    if (reduced()) { m.textContent = text; return; }
    m.textContent = '';
    let i = 0;
    tw = setInterval(() => { i += 2; m.textContent = text.slice(0, i); if (i >= text.length) clearInterval(tw); }, 16);
  }

  /* ---------- scene ---------- */
  function patchesFor() {
    if (S.room !== SCENE) return [];
    const p = moment(S.moment).patches.slice();
    if (S.moment === 'scene' && !CASE.boards) p.push({ id: 'lamp', set: { lit: S.world.lamp } }, { id: 'musicbox', set: { open: S.world.box } });
    return p;
  }
  function rebuild() {
    S.cur = resolveRoom(ROOMS[S.room], patchesFor());
    renderRoom(S.cur, { variant: 0, lampT: S.lampT, flags: {} });
  }
  const snapLamp = () => { S.lampT = S.cur.env.lampOn ? 1 : 0; };
  const label = (name) => {
    const own = 'hot.' + S.room + '.' + name + '.label';
    if (has(own)) return t(own);
    if (name.startsWith('door:')) return t('ui.door.to', { name: t('room.' + name.slice(5)) }) + (isGateClosed(S.room, name.slice(5)) ? ' ' + t('ui.door.lockedTag') : '');
    const generic = 'obj.' + name + '.label';
    return has(generic) ? t(generic) : name;
  };
  const itemOf = (id) => S.cur.items.find(i => i.id === id);

  function hotText(name) {
    for (const base of ['hot.' + S.room + '.' + name + '.say', 'obj.' + name + '.say']) {
      if (has(base + '.0')) { let n = 0; while (has(base + '.' + n)) n++; return t(base + '.' + ((S.catN++) % n)); }
      if (has(base + '.lit')) return t(base + (S.cur.env.lampOn ? '.lit' : '.dark'));
      if (has(base + '.' + S.moment)) return t(base + '.' + S.moment);
      if (has(base)) return t(base);
    }
    return '';
  }

  /* ---------- toasts, facts ---------- */
  function toast(title, text, key) {
    const box = el('div', 'toast');
    box.append(el('b', null, t(key || 'ui.toast.fact', { title })), el('span', null, text));
    $('toasts').append(box);
    setTimeout(() => box.remove(), 5200);
  }
  function gain(id) {
    if (S.facts[id]) return false;
    S.facts[id] = Date.now(); S.order.push(id); S.fresh[id] = true;
    save(); track('fact', { fact: id });
    toast(ft(id), t('fact.' + id + '.text'));
    renderNotebook(); renderAccuse();
    const dot = document.querySelector('[data-tab="notebook"] .dot'); if (dot && S.tab !== 'notebook') dot.hidden = false;
    if (REQUIRED.every(k => S.facts[k])) { const d2 = document.querySelector('[data-tab="accuse"] .dot'); if (d2) d2.hidden = false; }
    return true;
  }

  /* ---------- rooms ---------- */
  function updateRoomName() { $('roomname').textContent = t('room.' + S.room); }
  function go(id, silent) {
    stage.classList.add('swap');
    setTimeout(() => {
      S.room = id; S.hover = 0; if (id !== SCENE) setCompare(false);
      if (!S.visited.includes(id)) { S.visited.push(id); save(); }
      rebuild(); snapLamp(); updateRoomName(); updateMoments();
      stage.classList.remove('swap');
      if (!silent) say(t('ui.msg.enter.' + id));
    }, reduced() ? 0 : 220);
  }
  /* the list of things in the room: for keyboard and screen-reader users, and for anyone who prefers a list */
  function openList() {
    openModal(t('ui.page.list'), (body) => {
      const box = el('div', 'chips in-modal'), seen = new Set();
      for (const h of HOTLIST) {
        if (seen.has(h.name)) continue; seen.add(h.name);
        const b = el('button', 'chip', label(h.name) + (isLocked(h.name) ? ' ' + t('ui.door.lockedTag') : '')); b.type = 'button';
        b.addEventListener('click', () => { closeModal(); act(h.name); });
        box.append(b);
      }
      body.append(box);
    });
  }
  window.addEventListener('nut-list', openList);   // the menu's "things in this room" entry
  function fit() {
    // phone: the room takes the height the other bars leave it, so nothing needs scrolling. Desktop: as wide as the column, but not taller than the window.
    const wrap = $('stagewrap'), availW = wrap.clientWidth, desk = window.matchMedia && matchMedia('(min-width: 960px)').matches;
    const bars = ['.appbar', '#moments', '#stabs'].reduce((n, q) => { const e = document.querySelector(q); return n + (e && !e.hidden ? e.offsetHeight : 0); }, 0);
    const availH = desk ? Math.max(260, window.innerHeight - 330) : Math.max(120, window.innerHeight - bars - 130);
    let sc = Math.min(availW / W, availH / H);
    if (sc >= 3) sc = Math.min(Math.floor(sc), 5);
    cv.style.width = Math.round(W * sc) + 'px';
    cv.style.height = Math.round(H * sc) + 'px';
  }

  /* ---------- the moments bar ---------- */
  function avatar(m) {
    const c = document.createElement('canvas');
    if (m.who) drawPortrait(c, suspect(m.who).portrait);
    else {
      c.width = 24; c.height = 28; const x = c.getContext('2d');
      x.fillStyle = '#3a3552'; x.fillRect(0, 0, 24, 28); x.fillStyle = '#e0b04a';
      [[11, 5, 2, 2], [10, 7, 4, 2], [5, 9, 14, 3], [7, 12, 10, 3], [8, 15, 8, 2], [7, 17, 4, 3], [13, 17, 4, 3]].forEach(r => x.fillRect(r[0], r[1], r[2], r[3]));
    }
    return c;
  }
  function buildMoments() {
    const row = $('mrow'); row.textContent = '';
    for (const m of CASE.moments) {
      const b = el('button', 'mbtn'); b.type = 'button'; b.dataset.id = m.id;
      b.append(avatar(m), el('span', 't', dig(m.time)), el('span', 'l', t('moment.' + m.id + '.label')));
      b.addEventListener('click', () => setMoment(m.id));
      row.append(b);
    }
  }
  function setMoment(id, silent) {
    S.moment = id; S.hover = 0;
    if (!(id === D.a || id === D.b)) setCompare(false);
    rebuild(); snapLamp(); updateMoments();
    if (!silent) say(t('moment.' + id + '.caption'));
  }
  function setCompare(on) {
    S.compare = on; stage.classList.toggle('compare', on);
    const b = $('compare'); b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.classList.toggle('on', on);
  }
  function updateMoments() {
    $('moments').hidden = S.room !== SCENE;
    document.querySelectorAll('.mbtn').forEach((b) => { const on = b.dataset.id === S.moment; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    const can = S.moment === D.a || S.moment === D.b;
    $('compare').hidden = !can;
    $('dcount').textContent = num(S.diffFound.length) + '/' + num(NDIFF);
    $('compare').title = t('ui.diff.count', { n: num(S.diffFound.length), total: num(NDIFF) }) + (S.facts.changed ? '' : t('ui.diff.need', { need: num(D.need) }));
  }
  $('compare').addEventListener('click', () => {
    setCompare(!S.compare);
    if (S.compare) say(t('ui.diff.on'));
  });
  function markDiff(name) {
    if (D.items.includes(name)) {
      if (!S.diffFound.includes(name)) { S.diffFound.push(name); save(); }
      updateMoments();
      say(t('diff.item.' + name) + ' (' + num(S.diffFound.length) + '/' + num(NDIFF) + ')');
      if (S.diffFound.length >= D.need) gain('changed');
      return;
    }
    say(D.notes.includes(name) ? t('diff.note.' + name) : t('ui.diff.none'));
  }

  /* ---------- modal plumbing ---------- */
  let modal = null, lastFocus = null, onModalClose = null;
  function closeModal() {
    if (!modal) return;
    modal.remove(); modal = null;
    if (onModalClose) { const f = onModalClose; onModalClose = null; f(); }
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function openModal(title, build, cls, onClose) {
    closeModal();
    lastFocus = document.activeElement;
    const back = el('div', 'modal-back'), box = el('div', 'modal ' + (cls || ''));
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
    const head = el('div', 'modal-head'), h = el('h2', null, title); h.id = 'modal-title'; box.setAttribute('aria-labelledby', 'modal-title');
    const x = el('button', 'modal-x', '×'); x.type = 'button'; x.setAttribute('aria-label', t('ui.close')); x.addEventListener('click', closeModal);
    const body = el('div', 'modal-body');
    head.append(h, x); box.append(head, body); back.append(box); document.body.append(back);
    back.addEventListener('click', (e) => { if (e.target === back) closeModal(); });
    modal = back; onModalClose = onClose || null;
    build(body);
    const first = box.querySelector('button.main, .pick, .pill, .btn') || x; first.focus();
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
  const btn = (text, cls, fn) => { const b = el('button', cls || 'btn', text); b.type = 'button'; if (fn) b.addEventListener('click', fn); return b; };
  function pickButton(s, fn, sub) {
    const b = el('button', 'pick'); b.type = 'button';
    const c = document.createElement('canvas'); drawPortrait(c, s.portrait);
    b.append(c, el('span', null, sname(s.id)));
    if (sub) b.append(el('small', null, sub));
    b.addEventListener('click', fn);
    return b;
  }
  function personCard(who, vic) {
    const p = el('div', 'person' + (vic ? ' vic' : '')), c = document.createElement('canvas'), info = el('div', 'info');
    drawPortrait(c, vic ? CASE.victim.portrait : who.portrait);
    p.append(c, info);
    return { p, c, info };
  }

  /* ---------- the case card (first visit) ---------- */
  function openIntro() {
    openModal(t('ui.intro.title', { no: num(CASE.no), title: t('case.title') }), (body) => {
      const { p, info } = personCard(null, true);
      info.append(el('b', null, t('victim.name')), el('span', 'role', t('victim.role')), el('span', 'tag', t('case.building') + ', ' + t('case.unit') + ' · ' + t('ui.intro.found', { when: dig(t('case.foundAt')) })));
      body.append(p);
      for (let i = 0; i < CASE.intro; i++) body.append(el('p', null, t('intro.' + i)));
      body.append(el('p', 'muted', t('ui.intro.tip')));
      body.append(btn(t('ui.intro.start'), 'btn main', closeModal));
    }, '', () => {
      if (!S.introSeen) { S.introSeen = true; save(); track('start'); }
      say(t('ui.msg.start'));
    });
  }

  /* ---------- puzzle: the lying clock ---------- */
  function openClock() {
    let raf = 0;
    openModal(t('ui.clock.title'), (body) => {
      const C = CASE.clock, box = el('div', 'clockbox'), c = document.createElement('canvas'), cap = el('p', 'muted'), zone = el('div');
      box.append(c, cap); body.append(box, zone);
      const t0 = performance.now();
      const draw = (running) => drawClockBig(c, { time: C.stoppedAt, crownOut: !running, sec: running ? ((performance.now() - t0) / 1000 * 6 + 14) % 60 : null });
      const tick = () => { draw(true); raf = requestAnimationFrame(tick); };
      const shown = dig(C.stoppedAt.replace(/^0/, ''));
      cap.textContent = S.clockPushed ? t('ui.clock.running') : t('ui.clock.stopped', { time: shown });
      if (S.clockPushed) tick(); else draw(false);
      const renderZone = () => {
        zone.textContent = '';
        if (S.facts.clock) { zone.append(el('p', 'ok', t('fact.clock.text'))); return; }
        if (!S.clockPushed) {
          zone.append(btn(t('ui.clock.push'), 'btn main', () => { S.clockPushed = true; save(); cap.textContent = t('ui.clock.running'); tick(); renderZone(); }));
          return;
        }
        zone.append(el('p', null, t('clock.push')), el('p', null, t('clock.ask', { time: shown })));
        const chosen = new Set(), grid = el('div', 'pickrow'), fb = el('div');
        for (const s of CASE.suspects) {
          const st = t('suspect.' + s.id + '.statement');
          const b = pickButton(s, () => { chosen.has(s.id) ? chosen.delete(s.id) : chosen.add(s.id); b.setAttribute('aria-pressed', chosen.has(s.id) ? 'true' : 'false'); }, st.length > 90 ? st.slice(0, 88) + '…' : st);
          b.setAttribute('aria-pressed', 'false'); grid.append(b);
        }
        zone.append(grid, fb, btn(t('ui.check'), 'btn main', () => {
          fb.textContent = '';
          const want = new Set(C.answer), ok = chosen.size === want.size && [...want].every(i => chosen.has(i));
          if (ok) { gain('clock'); renderZone(); return; }
          if (!chosen.size) fb.append(el('p', 'bad', t('clock.wrong.' + C.answer[0])));
          for (const id of chosen) if (!want.has(id)) fb.append(el('p', 'bad', t('clock.wrong.' + id)));
          for (const id of want) if (!chosen.has(id) && chosen.size) fb.append(el('p', 'bad', t('ui.clock.missed') + ' ' + t('clock.wrong.' + id)));
        }));
      };
      renderZone();
    }, '', () => cancelAnimationFrame(raf));
  }

  /* ---------- puzzle: hallway documents ---------- */
  function cell(c) {
    if (typeof c === 'string') return { text: c, ltr: true };
    if (c.s) return { text: sname(c.s) };
    if (c.k) return { text: t('doc.cell.' + c.k) };
    return { text: dig(c.t), ltr: true };
  }
  function openDocs(start) {
    openModal(t('ui.docs.title'), (body) => {
      const keys = ['visitors', 'keys', 'camera'], tabs = el('div', 'dtabs'), view = el('div'), zone = el('div');
      body.append(tabs, view, zone);
      let cur = start;
      const q = () => {
        zone.textContent = '';
        if (S.facts.key) { zone.append(el('p', 'ok', t('fact.key.text'))); return; }
        if (!keys.every(k => S.docsSeen[k])) { zone.append(el('p', 'muted', t('ui.docs.seeAll'))); return; }
        const fb = el('div'), grid = el('div', 'pickrow');
        zone.append(el('p', null, t('hall.question')));
        for (const s of CASE.suspects) grid.append(pickButton(s, () => {
          fb.textContent = '';
          if (s.id === CASE.hall.answer) { gain('key'); q(); drawTabs(); return; }
          fb.append(el('p', 'bad', t('hall.wrong.' + s.id)));
        }));
        zone.append(grid, fb);
      };
      const drawTabs = () => {
        tabs.textContent = '';
        for (const k of keys) {
          const b = el('button', 'pill' + (k === cur ? ' on' : ''), t('doc.' + k + '.title') + (S.docsSeen[k] ? ' ✓' : '')); b.type = 'button';
          b.addEventListener('click', () => { cur = k; show(); });
          tabs.append(b);
        }
      };
      const show = () => {
        S.docsSeen[cur] = true; save(); drawTabs(); q();
        const d = CASE.hall.docs[cur], paper = el('div', 'paper');
        view.textContent = '';
        paper.append(el('h3', null, t('doc.' + cur + '.title')), el('p', null, t('doc.' + cur + '.note')));
        if (d.rows) {
          const tb = el('table', 'doc'), hd = el('tr');
          for (let i = 0; i < d.cols; i++) hd.append(el('th', null, t('doc.' + cur + '.col.' + i)));
          tb.append(hd);
          d.rows.forEach((r) => { const tr = el('tr'); r.forEach((v) => { const c = cell(v); tr.append(el('td', c.ltr ? 'ltr' : null, c.text)); }); tb.append(tr); });
          const wrap = el('div', 'tablewrap'); wrap.append(tb); paper.append(wrap);
        }
        if (d.frames) {
          const cam = el('div', 'cam'), wrap = el('div', 'camwrap'), c = document.createElement('canvas'), ts = el('span', 'ts'), cap = el('p'), fr = el('div', 'frames');
          wrap.append(c, ts); cam.append(wrap, cap, fr);
          const set = (i) => { drawCam(c, i); ts.textContent = dig(d.frames[i]); cap.textContent = t('doc.camera.frame.' + i); fr.querySelectorAll('button').forEach((b, j) => b.classList.toggle('on', j === i)); };
          d.frames.forEach((f, i) => { const b = el('button', null, dig(f)); b.type = 'button'; b.addEventListener('click', () => set(i)); fr.append(b); });
          paper.append(cam); set(0);
        }
        paper.append(el('p', 'foot', t('doc.' + cur + '.foot')));
        if (d.aside) paper.append(el('p', 'foot', t('doc.' + cur + '.aside')));
        view.append(paper);
      };
      show();
    }, 'wide');
  }

  /* ---------- puzzle boards: a few documents and one question that earns a fact ---------- */
  function docPaper(prefix, d) {
    const paper = el('div', 'paper');
    paper.append(el('h3', null, t(prefix + '.title')), el('p', null, t(prefix + '.note')));
    if (d.rows) {
      const tb = el('table', 'doc'), hd = el('tr');
      for (let i = 0; i < d.cols; i++) hd.append(el('th', null, t(prefix + '.col.' + i)));
      tb.append(hd);
      d.rows.forEach((r) => { const tr = el('tr'); r.forEach((v) => { const c = typeof v === 'object' && v.k ? { text: t('cell.' + v.k) } : cell(v); tr.append(el('td', c.ltr ? 'ltr' : null, c.text)); }); tb.append(tr); });
      const wrap = el('div', 'tablewrap'); wrap.append(tb); paper.append(wrap);
    }
    if (d.frames) {
      const people = {}; for (const s2 of CASE.suspects) people[s2.id] = s2.portrait;
      const cam = el('div', 'cam'), wrap = el('div', 'camwrap'), c = document.createElement('canvas'), ts = el('span', 'ts'), cap = el('p'), fr = el('div', 'frames');
      wrap.append(c, ts); cam.append(wrap, cap, fr);
      const set = (i) => { drawFrame(c, d.frames[i].spec, people); ts.textContent = dig(d.frames[i].t); cap.textContent = t(prefix + '.frame.' + i); fr.querySelectorAll('button').forEach((b, j) => b.classList.toggle('on', j === i)); };
      d.frames.forEach((f, i) => { const b = el('button', null, dig(f.t)); b.type = 'button'; b.addEventListener('click', () => set(i)); fr.append(b); });
      paper.append(cam); set(0);
    }
    paper.append(el('p', 'foot', t(prefix + '.foot')));
    return paper;
  }
  function openBoard(id) {
    const B = CASE.boards[id], keys = Object.keys(B.docs);
    openModal(t('board.' + id + '.title'), (body) => {
      const tabs = el('div', 'dtabs'), view = el('div'), zone = el('div');
      body.append(tabs, view, zone);
      let cur = keys[0];
      const seen = (k) => S.docsSeen[id + '.' + k];
      const ask = () => {
        zone.textContent = '';
        if (S.facts[B.fact]) { zone.append(el('p', 'ok', t('fact.' + B.fact + '.text'))); return; }
        if (!keys.every(seen)) { zone.append(el('p', 'muted', t('ui.docs.seeAll'))); return; }
        const Q = B.question, fb = el('div'), grid = el('div', 'pickrow'), chosen = new Set();
        zone.append(el('p', null, t('board.' + id + '.ask')));
        const done = () => { gain(B.fact); ask(); drawTabs(); };
        if (Q.kind === 'choice') {
          for (const o of Q.options) {
            const b = el('button', 'opt', t('board.' + id + '.opt.' + o)); b.type = 'button';
            b.addEventListener('click', () => { fb.textContent = ''; if (o === Q.answer) return done(); fb.append(el('p', 'bad', t('board.' + id + '.opt.' + o + '.wrong'))); });
            grid.append(b);
          }
          zone.append(grid, fb); return;
        }
        for (const s of CASE.suspects) {
          const b = pickButton(s, () => {
            if (Q.kind === 'one') { fb.textContent = ''; if (s.id === Q.answer) return done(); fb.append(el('p', 'bad', t('board.' + id + '.wrong.' + s.id))); return; }
            chosen.has(s.id) ? chosen.delete(s.id) : chosen.add(s.id); b.setAttribute('aria-pressed', chosen.has(s.id) ? 'true' : 'false');
          });
          if (Q.kind === 'many') b.setAttribute('aria-pressed', 'false');
          grid.append(b);
        }
        zone.append(grid, fb);
        if (Q.kind === 'many') zone.append(btn(t('ui.check'), 'btn main', () => {
          fb.textContent = '';
          const want = new Set(Q.answer), ok = chosen.size === want.size && [...want].every((i) => chosen.has(i));
          if (ok) return done();
          if (!chosen.size) fb.append(el('p', 'bad', t('board.' + id + '.none')));
          for (const i of chosen) if (!want.has(i)) fb.append(el('p', 'bad', t('board.' + id + '.wrong.' + i)));
          for (const i of want) if (!chosen.has(i) && chosen.size) fb.append(el('p', 'bad', t('ui.clock.missed') + ' ' + t('board.' + id + '.wrong.' + i)));
        }));
      };
      const drawTabs = () => {
        tabs.textContent = '';
        for (const k of keys) {
          const b = el('button', 'pill' + (k === cur ? ' on' : ''), t('doc.' + id + '.' + k + '.title') + (seen(k) ? ' ✓' : '')); b.type = 'button';
          b.addEventListener('click', () => { cur = k; show(); });
          tabs.append(b);
        }
      };
      const show = () => {
        S.docsSeen[id + '.' + cur] = true; save(); drawTabs(); ask();
        view.textContent = ''; view.append(docPaper('doc.' + id + '.' + cur, B.docs[cur]));
      };
      show();
    }, 'wide');
  }

  /* ---------- puzzle: the music box ---------- */
  function openLock() {
    const L = CASE.lock;
    openModal(t('case.lock.title'), (body) => {
      const vals = new Array(L.digits).fill(0), w = el('div', 'wheels'), msg = el('p', 'bad');
      body.append(el('p', 'muted', S.cur.env.lampOn ? t('lock.hint') : t('lock.needLamp')));
      vals.forEach((v, i) => {
        const col = el('div', 'wheel'), out2 = document.createElement('output'); out2.textContent = '0';
        const up = btn('▲', '', () => { vals[i] = (vals[i] + 1) % 10; out2.textContent = vals[i]; }); up.setAttribute('aria-label', t('ui.lock.up', { n: num(i + 1) }));
        const dn = btn('▼', '', () => { vals[i] = (vals[i] + 9) % 10; out2.textContent = vals[i]; }); dn.setAttribute('aria-label', t('ui.lock.down', { n: num(i + 1) }));
        col.append(up, out2, dn); w.append(col);
      });
      body.append(w, msg, btn(t('ui.lock.try'), 'btn main', () => {
        if (vals.join('') === BLUEPRINT.code) { closeModal(); S.world.box = true; save(); rebuild(); openLetter(); return; }
        msg.textContent = t('ui.lock.wrong'); w.classList.remove('shake'); void w.offsetWidth; w.classList.add('shake');
      }));
    });
  }
  function openLetter() {
    gain('motive');
    openModal(t('ui.letter.title'), (body) => {
      body.append(el('p', null, t('lock.opened')));
      const paper = el('div', 'paper');
      paper.append(el('h3', null, t('lock.letter.to')), el('p', null, t('lock.letter.body')), el('span', 'sign', t('victim.name')));
      body.append(paper, btn(t('ui.close'), 'btn main', closeModal));
    });
  }

  /* ---------- keys, hidden things and code locks (the puzzle layer around the rooms) ---------- */
  const hasItem = (id) => S.items.includes(id);
  const gateOf = (a, b) => (CASE.gates && (CASE.gates[a + ':' + b] || CASE.gates[b + ':' + a])) || null;
  const isGateClosed = (a, b) => { const g = gateOf(a, b); return !!g && !hasItem(g.need); };
  const isLocked = (name) => name.startsWith('door:') && isGateClosed(S.room, name.slice(5));
  function giveItem(id) {
    if (hasItem(id)) return false;
    S.items.push(id); save(); track('item', { item: id });
    toast(t('item.' + id + '.name'), t('item.' + id + '.text'), 'ui.toast.item');
    renderNotebook();
    return true;
  }
  /* the locks: wheels (digits), keypad (digits), fuses (switches) and wires (colour to symbol). Each calls ok() when solved. */
  const SYMS = { square: '■', circle: '●', triangle: '▲', cross: '✖', star: '★' };
  const WIRES = { red: '#e0584a', blue: '#4a86e0', green: '#5ab45a', yellow: '#e8c04a', white: '#e8e4d8' };
  function lockWheels(C, body, ok, bad) {
    const vals = new Array(C.code.length).fill(0), w = el('div', 'wheels');
    vals.forEach((v, i) => {
      const col = el('div', 'wheel'), out2 = document.createElement('output'); out2.textContent = '0';
      const up = btn('▲', '', () => { vals[i] = (vals[i] + 1) % 10; out2.textContent = vals[i]; }); up.setAttribute('aria-label', t('ui.lock.up', { n: num(i + 1) }));
      const dn = btn('▼', '', () => { vals[i] = (vals[i] + 9) % 10; out2.textContent = vals[i]; }); dn.setAttribute('aria-label', t('ui.lock.down', { n: num(i + 1) }));
      col.append(up, out2, dn); w.append(col);
    });
    body.append(w, btn(t('ui.lock.try'), 'btn main', () => { if (vals.join('') === C.code) ok(); else { bad(); w.classList.remove('shake'); void w.offsetWidth; w.classList.add('shake'); } }));
  }
  function lockKeypad(C, body, ok, bad) {
    let typed = '';
    const wrap = el('div', 'keypad'), disp = el('output', 'kdisp'), grid = el('div', 'kgrid');
    const show = () => { disp.textContent = typed.padEnd(C.code.length, '·'); };
    const press = (k) => {
      if (k === '✱') typed = '';
      else if (k === '#') { if (typed === C.code) return ok(); bad(); wrap.classList.remove('shake'); void wrap.offsetWidth; wrap.classList.add('shake'); typed = ''; }
      else if (typed.length < C.code.length) typed += k;
      show();
    };
    for (const k of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '✱', '0', '#']) { const b = btn(k, 'key', () => press(k)); b.setAttribute('aria-label', k === '✱' ? t('ui.lock.clear') : (k === '#' ? t('ui.lock.try') : k)); grid.append(b); }
    show(); wrap.append(disp, grid); body.append(wrap);
  }
  function lockFuses(C, key, body, ok, bad) {
    const st = C.pattern.split('').map(() => 0), row = el('div', 'fuses');
    C.pattern.split('').forEach((_, i) => {
      const f = el('button', 'fuse'); f.type = 'button'; f.setAttribute('aria-pressed', 'false');
      const lamp = el('i', 'lamp'), lab = el('span', null, t('container.' + key + '.sw.' + i)), sw = el('b', null, 'OFF');
      f.append(lamp, sw, lab);
      f.addEventListener('click', () => { st[i] ^= 1; f.setAttribute('aria-pressed', st[i] ? 'true' : 'false'); sw.textContent = st[i] ? 'ON' : 'OFF'; });
      row.append(f);
    });
    body.append(row, btn(t('ui.lock.try'), 'btn main', () => { if (st.join('') === C.pattern) ok(); else { bad(); row.classList.remove('shake'); void row.offsetWidth; row.classList.add('shake'); } }));
  }
  function lockWires(C, body, ok, bad) {
    const pairs = C.pairs, colors = Object.keys(pairs).concat(C.decoys ? C.decoys.colors : []), syms = Object.values(pairs).concat(C.decoys ? C.decoys.symbols : []);
    const link = {}; let pickC = null;
    const left = el('div', 'wcol'), right = el('div', 'wcol'), box = el('div', 'wires');
    const lb = {}, rb = {};
    const paint = () => {
      for (const c of colors) lb[c].classList.toggle('on', pickC === c);
      for (const sy of syms) { const c = Object.keys(link).find((k) => link[k] === sy); rb[sy].style.setProperty('--wc', c ? WIRES[c] : 'transparent'); rb[sy].classList.toggle('linked', !!c); }
      for (const c of colors) lb[c].classList.toggle('linked', !!link[c]);
    };
    for (const c of colors) { const b = el('button', 'wire'); b.type = 'button'; b.style.setProperty('--wc', WIRES[c]); b.setAttribute('aria-label', t('ui.wire.' + c)); b.addEventListener('click', () => { pickC = pickC === c ? null : c; paint(); }); lb[c] = b; left.append(b); }
    for (const sy of syms) { const b = el('button', 'sock', SYMS[sy]); b.type = 'button'; b.setAttribute('aria-label', t('ui.sym.' + sy)); b.addEventListener('click', () => { if (!pickC) return; for (const k of Object.keys(link)) if (link[k] === sy) delete link[k]; link[pickC] = sy; pickC = null; paint(); }); rb[sy] = b; right.append(b); }
    box.append(left, right); paint();
    body.append(box, btn(t('ui.lock.try'), 'btn main', () => {
      const good = Object.keys(pairs).every((c) => link[c] === pairs[c]) && Object.keys(link).length === Object.keys(pairs).length;
      if (good) ok(); else { bad(); box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake'); }
    }));
  }
  function openLockUI(key, C, done) {
    openModal(t('container.' + key + '.title'), (body) => {
      const msg2 = el('p', 'bad');
      body.append(el('p', 'muted', t('container.' + key + '.hint')));
      const okf = () => { closeModal(); done(); }, badf = () => { msg2.textContent = t('ui.lock.wrong'); };
      const kind = C.kind || 'wheels';
      if (kind === 'keypad') lockKeypad(C, body, okf, badf); else if (kind === 'fuses') lockFuses(C, key, body, okf, badf); else if (kind === 'wires') lockWires(C, body, okf, badf); else lockWheels(C, body, okf, badf);
      body.append(msg2);
    });
  }
  function openCode(key, C) {
    openLockUI(key, C, () => {
      gain(C.fact);
      openModal(t('container.' + key + '.paperTitle'), (b2) => {
        const paper = el('div', 'paper'); paper.append(el('p', null, t('container.' + key + '.paper')));
        b2.append(paper, btn(t('ui.close'), 'btn main', closeModal));
      });
    });
  }

  /* ---------- actions ---------- */
  function useDoor(name) {
    const to = name.slice(5);
    if (isGateClosed(S.room, to)) return say(t('gate.' + S.room + '.' + to));
    if (ROOMS[to]) return go(to);
    return say(hotText(name) || t('ui.door.locked'));
  }
  function act(name) {
    if (modal) return;
    if (name.startsWith('door:')) return useDoor(name);
    if (CASE.boards) return actBoards(name);
    return S.room === 'bedroom' ? actBedroom(name) : actHall(name);
  }
  /* cases built from boards: a thing is either a board (documents + one question), something to observe, or just something to look at */
  function actBoards(name) {
    if (S.compare && S.room === SCENE && (S.moment === D.a || S.moment === D.b)) return markDiff(name);
    const key = S.room + ':' + name;
    const find = CASE.finds && CASE.finds[key];
    if (find && !hasItem(find.give)) { giveItem(find.give); return say(t('find.' + S.room + '.' + name)); }
    const box = CASE.containers && CASE.containers[key];
    if (box) { if (S.facts[box.fact]) return say(t('container.' + key + '.open')); return openCode(key, box); }
    const board = CASE.bind && CASE.bind[key];
    if (board) return openBoard(board);
    const ob = CASE.observe && CASE.observe[name];
    if (ob && S.room === SCENE && S.moment === 'scene') { gain(ob.fact); return say(t('observe.' + name)); }
    return say(hotText(name));
  }
  function actBedroom(name) {
    const scene = S.moment === 'scene', m = S.moment;
    if (S.compare && (m === D.a || m === D.b)) return markDiff(name);
    switch (name) {
      case 'lamp':
        if (!scene) return say(t('ui.msg.lampPast'));
        S.world.lamp = !S.world.lamp; save(); rebuild();
        return say(t(S.world.lamp ? 'ui.msg.lampOn' : 'ui.msg.lampOff'));
      case 'clock':
        if (scene) return openClock();
        return say(t('ui.msg.clockPast', { time: dig(itemOf('clock').time) }));
      case 'cup':
        if (scene) { gain(CASE.observe.cup.fact); return say(t('observe.cup')); }
        return say(hotText(name));
      case 'pillow':
        if (scene) { gain(CASE.observe.pillow.fact); return say(t('observe.pillow')); }
        return say(hotText(name));
      case 'musicbox':
        if (!scene) return say(t('ui.msg.boxPast'));
        if (S.world.box) return say(t('ui.msg.boxOpen'));
        return openLock();
      default: return say(hotText(name));
    }
  }
  function actHall(name) {
    switch (name) {
      case 'keyboard': return openDocs('keys');
      case 'ledger': return openDocs('visitors');
      case 'monitor': return openDocs('camera');
      default: return say(hotText(name));
    }
  }

  /* ---------- side panels ---------- */
  function renderNotebook() {
    const box = $('tab-notebook'); box.textContent = '';
    box.append(el('h2', null, t('ui.nb.title')));
    const got = REQUIRED.filter(k => S.facts[k]).length, meter = el('div', 'meter');
    REQUIRED.forEach((k, i) => meter.append(el('i', i < got ? 'on' : '')));
    box.append(meter, el('p', null, t('ui.nb.progress', { n: num(got), total: num(REQUIRED.length) })));
    if (S.items.length) {
      const bag = el('div', 'bag'); bag.append(el('b', null, t('ui.nb.items')));
      for (const id of S.items) { const it = el('div', 'bagitem'); it.append(window.NUT_ICON('key'), el('span', null, t('item.' + id + '.name') + ': ' + t('item.' + id + '.text'))); bag.append(it); }
      box.append(bag);
    }
    if (!S.order.length) box.append(el('p', null, t('ui.nb.empty')));
    for (const id of S.order) {
      const c = el('div', 'fact' + (CASE.facts[id].required ? '' : ' opt') + (S.fresh[id] ? ' new' : ''));
      c.append(el('b', null, ft(id)), el('span', null, t('fact.' + id + '.text'))); box.append(c);
    }
    S.fresh = {};
    if (S.lastHint) box.append(el('div', 'hintbox', S.lastHint));
    box.append(btn(t('ui.nb.reset'), 'btn', () => { if (confirm(t('ui.nb.confirm'))) reset(); }));
  }
  function renderSuspects() {
    const box = $('tab-suspects'); box.textContent = '';
    box.append(el('h2', null, t('ui.sus.title')));
    const v = personCard(null, true);
    v.info.append(el('b', null, t('victim.name')), el('span', 'role', t('victim.role')), el('span', 'tag', t('ui.sus.found', { when: dig(t('case.foundAt')) })));
    box.append(v.p);
    for (const s of CASE.suspects) {
      const pc = personCard(s, false);
      pc.info.append(el('b', null, sname(s.id)), el('span', 'role', t('suspect.' + s.id + '.role')), el('span', 'tag', t('ui.sus.motive', { x: t('suspect.' + s.id + '.hint') })), el('q', null, t('suspect.' + s.id + '.statement')));
      const m = CASE.moments.find(mm => mm.who === s.id);
      if (m) pc.info.append(btn(t('ui.sus.room'), 'pill', () => { if (S.room !== SCENE) go(SCENE, true); setTimeout(() => setMoment(m.id), reduced() ? 0 : 240); }));
      box.append(pc.p);
    }
  }
  function renderAccuse() {
    const box = $('tab-accuse'); box.textContent = '';
    box.append(el('h2', null, t('ui.acc.title')));
    const A = CASE.accuse, ready = REQUIRED.every(k => S.facts[k]);
    if (!ready) {
      box.append(el('p', null, t('ui.acc.locked', { needs: t('accuse.unlock') })));
      for (const k of REQUIRED) box.append(el('p', S.facts[k] ? 'ok' : null, (S.facts[k] ? '✓ ' : '? ') + (S.facts[k] ? ft(k) : t('ui.acc.unknown'))));
      return;
    }
    if (S.solved) { box.append(el('p', 'ok', t('ui.acc.solved')), btn(t('ui.acc.view'), 'btn main', showEnd)); return; }
    box.append(el('p', null, t('ui.acc.intro')));
    for (const g of ['who', 'how', 'why']) {
      const G = A[g], grp = el('div', 'group'), opts = el('div', 'opts');
      opts.setAttribute('role', 'radiogroup'); opts.setAttribute('aria-label', t('accuse.' + g + '.title'));
      grp.append(el('h3', null, t('accuse.' + g + '.title')));
      for (const o of G.options) {
        const b = el('button', 'opt' + (S.feedback.includes(g + ':' + o.id) ? ' bad' : '')); b.type = 'button';
        b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', S.pick[g] === o.id ? 'true' : 'false');
        if (g === 'who') { const c = document.createElement('canvas'); drawPortrait(c, suspect(o.id).portrait); b.append(c); }
        b.append(el('span', null, g === 'who' ? sname(o.id) : t('accuse.' + g + '.' + o.id + '.label')));
        b.addEventListener('click', () => { S.pick[g] = o.id; S.feedback = S.feedback.filter(x => !x.startsWith(g + ':')); renderAccuse(); });
        opts.append(b);
      }
      grp.append(opts); box.append(grp);
    }
    const fb = el('div', 'group');
    for (const line of S.feedbackText) fb.append(el('p', 'feedback', line));
    box.append(fb, btn(t('ui.acc.submit'), 'btn main', submitAccuse));
  }
  function submitAccuse() {
    const A = CASE.accuse;
    if (!['who', 'how', 'why'].every(g => S.pick[g])) { say(t('ui.acc.pickAll')); return; }
    const lines = [], bad = [];
    for (const g of ['who', 'how', 'why']) {
      if (S.pick[g] === A[g].culprit) continue;
      const o = A[g].options.find(x => x.id === S.pick[g]);
      bad.push(g + ':' + o.id);
      lines.push(o.refutedBy && S.facts[o.refutedBy]
        ? t('ui.acc.contradicts', { part: t('accuse.' + g + '.title'), fact: ft(o.refutedBy), why: t('accuse.' + g + '.' + o.id + '.why') })
        : t('ui.acc.missing', { part: t('accuse.' + g + '.title') }));
    }
    if (!bad.length) { S.solved = true; S.stars = Math.max(1, 3 - Math.min(2, S.tries) - (S.hints > 2 ? 1 : 0)); save(); track('solved', { stars: S.stars, tries: S.tries }); renderAccuse(); showEnd(); return; }
    S.tries++; save(); S.feedback = bad; S.feedbackText = lines; track('wrong_accusation', { tries: S.tries });
    renderAccuse();
  }
  const isDesk = () => window.matchMedia && matchMedia('(min-width: 960px)').matches;
  function setSheet(open) { $('side').classList.toggle('open', open); document.documentElement.classList.toggle('sheet-open', open); }
  function setTab(tb, fromNav) {
    const same = S.tab === tb && $('side').classList.contains('open');
    S.tab = tb;
    document.querySelectorAll('.stab').forEach(b => { const on = b.dataset.tab === tb && (isDesk() || $('side').classList.contains('open') || !fromNav || true); b.classList.toggle('on', b.dataset.tab === tb); b.setAttribute('aria-selected', b.dataset.tab === tb ? 'true' : 'false'); const d = b.querySelector('.dot'); if (b.dataset.tab === tb && d) d.hidden = true; });
    for (const id of ['notebook', 'suspects', 'accuse']) $('tab-' + id).hidden = id !== tb;
    if (fromNav && !isDesk()) setSheet(!same);
  }
  document.querySelectorAll('.stab').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab, true)));
  $('sheet-x').addEventListener('click', () => setSheet(false));
  $('side').addEventListener('click', (e) => { if (e.target === $('side')) setSheet(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal) setSheet(false); });

  /* ---------- the cat gives hints. Tier a is free; tier b goes through an optional provider
       (window.NUT_HINT_PROVIDER({stage, tier}) -> Promise<boolean>), which is where a rewarded ad can plug in ---------- */
  $('hintbtn').addEventListener('click', async () => {
    const stage = CASE.hints.findIndex(h => h.when(S.facts));
    const tier = (S.hintTier[stage] || 0) >= 1 ? 'b' : 'a';
    if (tier === 'b' && window.NUT_HINT_PROVIDER) {
      let ok = false;
      try { ok = await window.NUT_HINT_PROVIDER({ stage, tier }); } catch (e) { ok = false; }
      if (!ok) { say(t('ui.hint.declined')); return; }
    }
    S.hintTier[stage] = (S.hintTier[stage] || 0) + 1;
    S.hints++; save();
    const text = t('hint.' + stage + '.' + tier);
    S.lastHint = text; renderNotebook(); say(t('ui.hint.say', { text })); track('hint', { stage, tier });
  });

  /* ---------- the map: a small floor plan of the spaces you can enter, with the doors drawn in ---------- */
  function openMap() {
    openModal(t('ui.map.title'), (body) => {
      const M = CASE.map, cols = Math.max(...M.nodes.map(n => n.x)) + 1, rows = Math.max(...M.nodes.map(n => n.y)) + 1;
      const plan = el('div', 'plan'); plan.style.setProperty('--cols', cols); plan.style.setProperty('--rows', rows);
      const near = (id) => M.edges.some(([a, b]) => (a === S.room && b === id) || (b === S.room && a === id));
      for (const n of M.nodes) {
        const here = n.id === S.room, known = S.visited.includes(n.id) || near(n.id);
        const b = el('button', 'node' + (here ? ' here' : '') + (known ? '' : ' unknown')); b.type = 'button';
        b.style.gridColumn = n.x + 1; b.style.gridRow = n.y + 1;
        b.append(el('b', null, known ? t('room.' + n.id) : '?'), el('small', null, here ? t('ui.map.here') : (known ? t('ui.map.go') : t('ui.map.unknown'))));
        // doors: a gap in the wall on the side that touches a neighbour; a locked one is drawn as a bar
        for (const [a, c] of M.edges) {
          const other = a === n.id ? c : (c === n.id ? a : null); if (!other) continue;
          const o = M.nodes.find(q => q.id === other), side = o.x > n.x ? 'r' : o.x < n.x ? 'l' : o.y > n.y ? 'b' : 't';
          b.append(el('i', 'gap ' + side + (isGateClosed(n.id, other) ? ' shut' : '')));
        }
        b.disabled = !known || here;
        b.addEventListener('click', () => { closeModal(); go(n.id); });
        plan.append(b);
      }
      body.append(plan, el('p', 'muted', t('ui.map.tip')));
    }, 'small');
  }
  $('mapbtn').addEventListener('click', openMap);

  /* ---------- the ending ---------- */
  function showEnd() {
    openModal(t('ui.end.title'), (body) => {
      body.append(el('div', 'stars', '★'.repeat(S.stars) + '☆'.repeat(3 - S.stars)), el('p', null, t('verdict.line')));
      const ol = el('ol', 'truth');
      for (let i = 0; i < CASE.verdict.truth; i++) { const li = el('li'); li.append(el('time', null, dig(t('verdict.truth.' + i + '.when'))), el('span', null, t('verdict.truth.' + i + '.text'))); ol.append(li); }
      body.append(el('h3', null, t('ui.end.truth')), ol, el('div', 'thread', t('verdict.thread')));
      const mins = Math.max(1, Math.round(S.playMs / 60000));
      const share = t('ui.end.share', { title: t('case.title'), stars: '★'.repeat(S.stars) + '☆'.repeat(3 - S.stars), min: num(mins), tries: num(S.tries) }) + '\n' + location.href.split('#')[0];
      const ta = el('textarea', 'share'); ta.readOnly = true; ta.value = share; ta.rows = 3; ta.setAttribute('aria-label', t('ui.end.shareLabel'));
      const done = el('p', 'muted'), row = el('div', 'btns');
      row.append(
        btn(t('ui.end.copy'), 'btn main', () => { ta.select(); try { navigator.clipboard.writeText(share).then(() => { done.textContent = t('ui.end.copied'); }, () => { done.textContent = t('ui.end.manual'); }); } catch (e) { done.textContent = t('ui.end.manual'); } }),
        btn(t('ui.end.stay'), 'btn', closeModal),
        btn(t('ui.end.again'), 'btn', () => { closeModal(); reset(); })
      );
      const back = el('a', 'btn', t('ui.end.board')); back.href = window.NUT_ROOT || '../';
      row.append(back);
      body.append(ta, done, row);
    }, 'wide');
  }
  function reset() {
    Object.assign(S, { room: CASE.map.start, moment: 'scene', compare: false, world: { lamp: false, box: false }, items: [], facts: {}, order: [], diffFound: [], docsSeen: {}, clockPushed: false, tries: 0, hints: 0, solved: false, stars: 0, playMs: 0, introSeen: true, visited: [CASE.map.start], pick: {}, fresh: {}, lastHint: '', feedback: [], feedbackText: [], hintTier: {} });
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    setCompare(false); rebuild(); snapLamp(); updateRoomName(); updateMoments(); renderNotebook(); renderAccuse(); setTab('notebook'); setSheet(false);
    say(t('ui.msg.reset'));
  }

  /* ---------- pointer ---------- */
  function pixelAt(e) {
    const r = cv.getBoundingClientRect();
    return { x: Math.floor((e.clientX - r.left) / r.width * W), y: Math.floor((e.clientY - r.top) / r.height * H) };
  }
  function pick(e) {
    const p = pixelAt(e);
    if (p.x < 0 || p.y < 0 || p.x >= W || p.y >= H) return 0;
    return hotIdx[p.y * W + p.x];
  }
  cv.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    S.hover = pick(e);
    cv.style.cursor = S.hover ? 'pointer' : (S.compare ? 'crosshair' : 'default');
    const n = HOTS[S.hover];
    $('hl').textContent = n ? label(n) : ''; $('hl').classList.toggle('on', !!n);
  });
  cv.addEventListener('pointerleave', () => { S.hover = 0; $('hl').classList.remove('on'); });
  let tapT = 0, lastType = 'mouse';
  cv.addEventListener('pointerdown', (e) => { lastType = e.pointerType || 'mouse'; });
  cv.addEventListener('click', (e) => {
    const touch = lastType !== 'mouse';
    const h = pick(e); if (!h) return;
    if (touch) { S.hover = h; clearTimeout(tapT); tapT = setTimeout(() => { S.hover = 0; }, 600); }
    act(HOTS[h]);
  });
  $('sparkle').addEventListener('click', () => { S.sparkle = !S.sparkle; $('sparkle').setAttribute('aria-pressed', S.sparkle ? 'true' : 'false'); $('sparkle').classList.toggle('on', S.sparkle); });

  /* ---------- marks for the differences already found ---------- */
  function drawMarks(tm) {
    if (S.room !== SCENE || !(S.moment === D.a || S.moment === D.b)) return;
    const blink = Math.sin(tm * 5) > -0.3;
    for (const h of HOTLIST) {
      if (!S.diffFound.includes(h.name) || !blink) continue;
      const bx = h.x, by = Math.max(2, h.y - 10), c = 0xFF5E6BFF;
      for (const [dx, dy] of [[0, 0], [0, 1], [0, 2], [0, 4]]) { const px = bx + dx, py = by + dy; if (px >= 0 && py >= 0 && px < W && py < H) out[py * W + px] = c; }
    }
  }

  /* ---------- loop ---------- */
  let last = 0;
  function frame(ts) {
    const tm = ts / 1000, dt = Math.min(0.05, tm - last); last = tm;
    if (!document.hidden && !S.solved) S.playMs += dt * 1000;
    const target = S.cur.env.lampOn ? 1 : 0;
    S.lampT += (target - S.lampT) * Math.min(1, dt * 5);
    if (Math.abs(target - S.lampT) < 0.01) S.lampT = target;
    compose(ROOMS[S.room].light({ lampT: S.lampT }, tm, S.cur), S.hover, tm);
    drawMarks(tm);
    if (S.sparkle) sparkles(tm);
    img32.set(out); ctx.putImageData(img, 0, 0);
    requestAnimationFrame(frame);
  }
  window.addEventListener('pagehide', save);
  setInterval(() => { if (!S.solved && !document.hidden) save(); }, 15000);

  /* ---------- start ---------- */
  document.title = t('case.title') + ' | ' + t('ui.site.name');
  drawCatIcon($('cat-icon'));
  load();
  if (!S.visited.includes(S.room)) S.visited.push(S.room);
  buildMoments(); updateRoomName(); rebuild(); snapLamp(); updateMoments(); renderNotebook(); renderSuspects(); renderAccuse(); fit();
  window.addEventListener('resize', fit);
  if (window.ResizeObserver) new ResizeObserver(fit).observe($('stagewrap'));
  if (!S.introSeen) openIntro();
  else say(t(S.order.length ? 'ui.msg.back' : 'ui.msg.start'));
  requestAnimationFrame(frame);
  window.NUT = { S, t, act, go, openBoard, setMoment, setCompare, gain, reset, openClock, openDocs, openLock, showEnd, closeModal, rebuild, submitAccuse, setTab };
})();
