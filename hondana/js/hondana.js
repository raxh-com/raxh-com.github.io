/* ══════════════════════════════════════════════════════════════
   HONDANA (本棚) — motor de la estantería
   Una sala, un mueble, una lámpara. Tres niveles: estudios, proyectos,
   correspondencia. Los libros se toman con la mano, se sacan del
   estante y se hojean; los cajones se tiran del asa.
   A la manera de DEsk (fyzugx): una sola luz que sigue al puntero,
   resortes con un poco de rebote, la cámara que se inclina con la
   cabeza, y cada sonido ubicado donde está la cosa que lo hace.
══════════════════════════════════════════════════════════════ */
(() => {
'use strict';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(pointer: fine)').matches;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ── idioma ─────────────────────────────────────────────── */
let LANG = 'es';
try { LANG = localStorage.getItem('hondana-lang') || ((navigator.language || '').startsWith('es') ? 'es' : 'en'); } catch (e) {}
const T = x => (x == null ? '' : typeof x === 'string' ? x : (x[LANG] ?? x.es ?? x.en));
const UI = () => CONTENT.ui[LANG];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ── resortes de DEsk como easing CSS linear() ──────────── */
// look_ease: W = 8.5, Z = 0.74 — llega, se pasa un 3 % y vuelve. drawer_ease: W = 12, Z = 0.80 — golpea el tope.
function springLinear(W, Z, n = 40) {
  const wd = W * Math.sqrt(1 - Z * Z);
  const f = u => 1 - Math.exp(-Z * W * u) * (Math.cos(wd * u) + (Z * W / wd) * Math.sin(wd * u));
  const pts = [];
  for (let i = 0; i <= n; i++) { const u = i / n; pts.push(`${f(u).toFixed(4)} ${(u * 100).toFixed(1)}%`); }
  return `linear(${pts.join(', ')})`;
}
if (CSS.supports('transition-timing-function', 'linear(0, 1)')) {
  document.documentElement.style.setProperty('--ease-look', springLinear(8.5, 0.74));
  document.documentElement.style.setProperty('--ease-drawer', springLinear(12, 0.80));
}
const EASE_LOOK = getComputedStyle(document.documentElement).getPropertyValue('--ease-look').trim() || 'cubic-bezier(0.34, 1.2, 0.44, 1)';

/* ── sonido: síntesis mínima, ubicada donde pasa la cosa ── */
const SFX = (() => {
  let ctx = null, on = true;
  try { on = localStorage.getItem('hondana-sound') !== 'off'; } catch (e) {}
  const ac = () => { ctx ||= new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return ctx; };
  const pan = x => clamp((x / innerWidth - 0.5) * 1.2, -0.6, 0.6);
  function out(a, node, x) { if (a.createStereoPanner) { const p = a.createStereoPanner(); p.pan.value = pan(x); node.connect(p); p.connect(a.destination); } else node.connect(a.destination); }
  function noise(ms, { type = 'bandpass', freq = 1800, q = 0.8, gain = 0.25, x = innerWidth / 2, attack = 0.005 } = {}) {
    if (!on) return; try {
      const a = ac(); const len = Math.floor(a.sampleRate * ms / 1000);
      const buf = a.createBuffer(1, len, a.sampleRate); const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 1.6;
      const src = a.createBufferSource(); src.buffer = buf;
      const f = a.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = a.createGain(); g.gain.setValueAtTime(0, a.currentTime); g.gain.linearRampToValueAtTime(gain, a.currentTime + attack); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + ms / 1000);
      src.connect(f); f.connect(g); out(a, g, x); src.start();
    } catch (e) {}
  }
  function tone(freq, ms, { gain = 0.18, x = innerWidth / 2, type = 'sine' } = {}) {
    if (!on) return; try {
      const a = ac(); const o = a.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, a.currentTime); o.frequency.exponentialRampToValueAtTime(freq * 0.6, a.currentTime + ms / 1000);
      const g = a.createGain(); g.gain.setValueAtTime(gain, a.currentTime); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + ms / 1000);
      o.connect(g); out(a, g, x); o.start(); o.stop(a.currentTime + ms / 1000);
    } catch (e) {}
  }
  return {
    get on() { return on; },
    toggle() { on = !on; try { localStorage.setItem('hondana-sound', on ? 'on' : 'off'); } catch (e) {} return on; },
    page: x => noise(140, { freq: 2200, q: 0.6, gain: 0.16, x }),
    slide: x => noise(260, { type: 'lowpass', freq: 900, gain: 0.14, x, attack: 0.04 }),
    thump: x => { tone(95, 150, { gain: 0.22, x }); noise(60, { type: 'lowpass', freq: 400, gain: 0.08, x }); },
    drawer: x => { noise(220, { type: 'lowpass', freq: 700, gain: 0.1, x, attack: 0.03 }); setTimeout(() => tone(70, 120, { gain: 0.2, x }), 230); },
    knock: x => tone(70, 120, { gain: 0.2, x }),
    stamp: x => { tone(140, 90, { gain: 0.2, x }); noise(70, { freq: 1200, gain: 0.12, x }); },
    look: x => noise(380, { type: 'lowpass', freq: 500, gain: 0.05, x, attack: 0.08 }),
  };
})();

/* ── estado ─────────────────────────────────────────────── */
const state = { level: null, book: null, intro: true, pan: 0, maxPan: 0, flip: null, bookEl: null, bookData: null, busy: false };
const stage = $('#stage'), tilt = $('#tilt'), cabinet = $('#cabinet'), lamp = $('#lamp');
const reader = $('#reader'), bookWrap = $('#bookWrap'), bookHost = $('#book');
const hud = { back: $('#hudBack'), hint: $('#hudHint'), lang: $('#hudLang'), sound: $('#hudSound'), title: $('#hudTitle') };

/* ── texto de la interfaz ───────────────────────────────── */
function renderUI() {
  const u = UI();
  document.documentElement.lang = LANG;
  document.title = `${u.title} · 本棚`;
  $('#plaque').innerHTML = `${esc(u.plaque)}<small>${esc(u.plaqueSub)}</small>`;
  $$('.level').forEach(lv => { $('.tag', lv).textContent = u.levels[lv.dataset.level]; lv.setAttribute('aria-label', u.levels[lv.dataset.level]); });
  $('#drawerCV .d-label').textContent = u.drawerCV; $('#drawerCV .d-inside').textContent = u.drawerCVin;
  $('#drawerVcard .d-label').textContent = u.drawerVcard; $('#drawerVcard .d-inside').textContent = u.drawerVcardIn;
  $('#albumTitle').textContent = u.album;
  hud.back.lastElementChild.textContent = u.back; $('#readerClose').lastElementChild.textContent = u.close;
  hud.title.textContent = u.title;
  $$('span', hud.lang).forEach(s => s.classList.toggle('on', s.dataset.lang === LANG));
  hud.sound.setAttribute('aria-label', u.sound); hud.sound.classList.toggle('is-off', !SFX.on);
  $('#cardRole').textContent = T(CONTENT.contact.card.role); $('#cardRole2').textContent = T(CONTENT.contact.card.role);
  $$('.stamp').forEach(st => { const s = CONTENT.contact.stamps.find(x => x.id === st.dataset.id); $('.s-name', st).textContent = T(s.name); st.setAttribute('aria-label', T(s.name)); });
  updateHint();
}
function updateHint() {
  const u = UI();
  hud.hint.textContent = state.book ? '' : state.level === 'contact' ? u.hintContact : state.level ? u.hintLevel : u.hintRoom;
  hud.back.hidden = !state.level || !!state.book;
}

/* ── libros en el estante ───────────────────────────────── */
function bookEl(b, shelf) {
  const el = document.createElement('div');
  el.className = 'book'; el.tabIndex = 0; el.setAttribute('role', 'button');
  el.dataset.id = b.id; el.dataset.shelf = shelf;
  el.style.setProperty('--t', b.t); el.style.setProperty('--h', b.h); el.style.setProperty('--c', b.color); el.style.setProperty('--fs', b.fs || 11);
  el.setAttribute('aria-label', `${T(b.title)} — ${T(b.sub)}`);
  el.innerHTML = `<span class="b-spine"><span class="b-head"></span><span class="b-label"></span><span class="b-bands"></span><span class="b-title">${esc(T(b.spine || b.title))}</span><span class="b-orn t">❦</span><span class="b-kanji ${(b.kanji || '').length > 2 ? 'is-long' : ''}">${esc(b.kanji || '')}</span></span>`;
  return el;
}
function renderShelves() {
  const st = $('#booksStudies'), pr = $('#booksProjects');
  st.innerHTML = ''; pr.innerHTML = '';
  CONTENT.studies.forEach(b => st.appendChild(bookEl(b, 'studies')));
  const end = document.createElement('div'); end.className = 'bookend'; st.appendChild(end);
  const pile = document.createElement('div'); pile.className = 'pile'; pile.setAttribute('aria-hidden', 'true');
  pile.innerHTML = [['#3a2a44', 118, 14, 0], ['#6b4a1c', 104, 12, 6], ['#24343a', 110, 16, 2]].map(([c, w, h, x]) => `<span style="--pc:${c};--pw:${w};--ph:${h};--px:${x}"></span>`).join('');
  st.appendChild(pile);
  CONTENT.projects.forEach(b => pr.appendChild(bookEl(b, 'projects')));
  if (state.book) { const el = $(`.book[data-id="${state.book}"]`); if (el) { el.classList.add('is-hidden'); state.bookEl = el; } }
}
function findBook(id) { return CONTENT.studies.find(b => b.id === id) || CONTENT.projects.find(b => b.id === id); }
function shelfOf(id) { return CONTENT.studies.some(b => b.id === id) ? 'studies' : 'projects'; }

/* ── estampillas ────────────────────────────────────────── */
const ICONS = {
  whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.4M12 21.8a9.9 9.9 0 0 1-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4a9.9 9.9 0 1 1 8.3 4.6m8.4-18.3A11.8 11.8 0 0 0 .2 17.8L0 24l6.3-1.7a11.8 11.8 0 0 0 5.7 1.5c6.5 0 11.9-5.3 11.9-11.9 0-3.2-1.2-6.2-3.5-8.4z"/></svg>',
  call: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 1 1.2 2 2 0 0 1 3 0h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L7.1 7.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.9.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>',
  email: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><path d="m22 6-10 7L2 6"/></svg>',
  linkedin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.4 20.5h-3.5v-5.6c0-1.3 0-3-1.9-3s-2.1 1.4-2.1 2.9v5.7H9.4V9h3.4v1.6c.5-.9 1.6-1.9 3.4-1.9 3.6 0 4.3 2.4 4.3 5.5v6.3zM5.3 7.4a2.1 2.1 0 1 1 0-4.1 2.1 2.1 0 0 1 0 4.1zm1.8 13.1H3.6V9h3.5v11.5zM22.2 0H1.8C.8 0 0 .8 0 1.7v20.5c0 1 .8 1.8 1.8 1.8h20.5c1 0 1.8-.8 1.8-1.8V1.7C24 .8 23.2 0 22.2 0z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
  github: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3z"/></svg>',
};
function renderStamps() {
  const host = $('#stamps'); host.innerHTML = '';
  CONTENT.contact.stamps.forEach(s => {
    const a = document.createElement('a');
    a.className = 'stamp'; a.href = s.href; a.dataset.id = s.id; a.style.setProperty('--sc', s.color); a.style.setProperty('--r', `${s.r}deg`);
    if (/^https?:/.test(s.href)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    a.innerHTML = `<span class="art">${ICONS[s.id] || ''}<span class="s-name">${esc(T(s.name))}</span></span><span class="s-val">${esc(s.val)}</span><span class="s-year">${esc(s.year)}</span><span class="postmark">RTR<br>PERTH</span>`;
    a.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation(); if (a.classList.contains('is-stamped')) return;
      a.classList.add('is-stamped'); SFX.stamp(e.clientX || innerWidth / 2);
      setTimeout(() => {
        if (a.target === '_blank') { const w = window.open(s.href, '_blank'); if (w) w.opener = null; else location.href = s.href; }
        else location.href = s.href;
        setTimeout(() => a.classList.remove('is-stamped'), 1400);
      }, reduced ? 0 : 520);
    });
    host.appendChild(a);
  });
}

/* ── tarjeta de presentación ────────────────────────────── */
function setupCard() {
  const scene = $('#cardScene'), card = $('#card3d');
  scene.addEventListener('click', e => { e.stopPropagation(); card.classList.toggle('flipped'); SFX.page(scene.getBoundingClientRect().x); });
  if (finePointer) {
    scene.addEventListener('pointermove', e => {
      const r = scene.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `${card.classList.contains('flipped') ? 'rotateY(180deg)' : ''} rotateX(${(-py * 14).toFixed(1)}deg) rotateY(${(px * 14).toFixed(1)}deg)`;
      $('.card-glare', scene).style.opacity = .6; $('.card-glare', scene).style.backgroundPosition = `${(px + .5) * 100}% ${(py + .5) * 100}%`;
    });
    scene.addEventListener('pointerleave', () => { card.style.transform = ''; $('.card-glare', scene).style.opacity = 0; });
  }
}

/* ── lámpara: vaga sola y, si hay puntero, lo sigue ──────── */
const lampCtl = (() => {
  let idleTimer = null, wanderTimer = null, following = false;
  function moveTo(x, y, dur) { lamp.style.transitionDuration = `${dur}ms`; lamp.style.transform = `translate(${(x - innerWidth / 2).toFixed(0)}px, ${(y - innerHeight / 2).toFixed(0)}px)`; }
  function wander() {
    clearTimeout(wanderTimer); if (following) return;
    const r = cabinet.getBoundingClientRect();
    const x = r.left + r.width * (0.1 + Math.random() * 0.8), y = r.top + r.height * (Math.random() * 0.9);
    const dur = 3800 + Math.random() * 3200; moveTo(x, y, dur);
    wanderTimer = setTimeout(wander, dur + 400 + Math.random() * 1500);
  }
  function onPointer(e) {
    following = true; clearTimeout(wanderTimer); moveTo(e.clientX, e.clientY, 900);
    clearTimeout(idleTimer); idleTimer = setTimeout(() => { following = false; wander(); }, 3500);
  }
  function start() {
    if (reduced) { const r = cabinet.getBoundingClientRect(); moveTo(r.left + r.width / 2, r.top + r.height * 0.3, 0); return; }
    wander(); if (finePointer) addEventListener('pointermove', onPointer, { passive: true });
  }
  return { start };
})();

/* ── cámara: acercarse a un nivel; la cabeza se inclina ─── */
const geo = { p: {}, cabW: 0, cabH: 0, fit: 1 };
function measure() {
  const prev = cabinet.style.transform, prevT = cabinet.style.transition, prevTilt = tilt.style.transform;
  cabinet.style.transition = 'none'; cabinet.style.transform = 'none'; tilt.style.transition = 'none'; tilt.style.transform = 'none';
  const cr = cabinet.getBoundingClientRect(); const cx = cr.left + cr.width / 2, cy = cr.top + cr.height / 2;
  geo.cabW = cr.width; geo.cabH = cr.height;
  geo.fit = Math.min(1, (innerHeight - 28) / cr.height);          // en pantallas bajas el mueble entero debe caber
  $$('.level').forEach(lv => { const r = lv.getBoundingClientRect(); geo.p[lv.dataset.level] = { x: r.left + r.width / 2 - cx, y: r.top + r.height / 2 - cy, h: r.height, w: r.width }; });
  void cabinet.offsetWidth;
  cabinet.style.transform = prev; cabinet.style.transition = prevT; tilt.style.transform = prevTilt; tilt.style.transition = '';
}
function applyCamera(animate = true) {
  cabinet.style.transition = animate && !reduced ? '' : 'none';
  if (!state.level) { cabinet.style.transform = geo.fit < 1 ? `scale(${geo.fit.toFixed(3)})` : ''; state.maxPan = 0; return; }
  const p = geo.p[state.level]; const narrow = innerWidth < 700;
  let s = narrow
    ? (state.level === 'contact' ? innerWidth * 0.98 / geo.cabW : Math.min(innerHeight * 0.58 / (p.h * 1.25), 2.4))
    : Math.min(innerWidth * 0.96 / geo.cabW, innerHeight * 0.74 / (p.h * 1.3));
  s = Math.max(geo.fit, s);
  const maxPan = Math.max(0, (geo.cabW * s - innerWidth) / 2 + 20);
  state.pan = clamp(state.pan, -maxPan, maxPan); state.maxPan = maxPan;
  cabinet.style.transform = `translate(${(-s * p.x + state.pan).toFixed(1)}px, ${(-s * p.y).toFixed(1)}px) scale(${s.toFixed(3)})`;
}
function setLevel(id) {
  if (state.level === id) return;
  state.level = id; state.pan = 0;
  $$('.level').forEach(lv => lv.classList.toggle('is-active', lv.dataset.level === id));
  document.body.classList.toggle('is-zoomed', !!id); stage.classList.toggle('is-zoomed', !!id);
  if (id) tilt.style.transform = '';
  applyCamera(); updateHint();
  if (id) SFX.look(innerWidth / 2);
}
// la cabeza se mueve un poco con el puntero (solo en la sala, solo con mouse)
if (finePointer && !reduced) {
  let raf = 0;
  addEventListener('pointermove', e => {
    if (state.level || state.book || state.intro || raf) return;
    raf = requestAnimationFrame(() => { raf = 0; const px = e.clientX / innerWidth - 0.5, py = e.clientY / innerHeight - 0.5; tilt.style.transform = `rotateX(${(-py * 3).toFixed(2)}deg) rotateY(${(px * 4).toFixed(2)}deg)`; });
  }, { passive: true });
}
// arrastrar para desplazarse cuando el nivel ampliado no cabe (teléfonos)
(() => {
  let x0 = null, pan0 = 0, moved = false;
  stage.addEventListener('pointerdown', e => { if (!state.level || !state.maxPan || e.pointerType === 'mouse' || e.target.closest('.book, .drawer, .stamp, .card-scene')) return; x0 = e.clientX; pan0 = state.pan; moved = false; });
  stage.addEventListener('pointermove', e => { if (x0 == null) return; const dx = e.clientX - x0; if (Math.abs(dx) > 6) moved = true; state.pan = pan0 + dx; applyCamera(false); }, { passive: true });
  const end = () => { x0 = null; if (moved) stage.addEventListener('click', e => e.stopPropagation(), { capture: true, once: true }); };
  stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);
})();

/* ── el lector: construir páginas ───────────────────────── */
function pageShell(book, inner, n, cls = '') {
  const head = n ? `<div class="page-head"><span>${esc(T(book.title))}</span><span>${n % 2 ? esc(T(book.sub)) : 'RTR'}</span></div>` : '';
  const num = n ? `<div class="page-num">${n}</div>` : '';
  return `<div class="page ${cls}"><div class="page-inner">${head}${inner}${num}</div></div>`;
}
function textPage(book, p, n) {
  let h = '';
  if (p.title) h += `<h2>${esc(T(p.title))}</h2><div class="orn"></div>`;
  if (p.meta && !p.paras) h += `<div class="meta">${esc(T(p.meta))}</div>`;
  (p.paras || []).forEach((x, i) => h += `<p class="${i === 0 && p.lead ? 'lead' : ''}">${esc(T(x))}</p>`);
  if (p.list) h += `<ul>${p.list.map(x => `<li>${esc(T(x))}</li>`).join('')}</ul>`;
  if (p.meta && p.paras) h += `<div class="meta" style="margin-top:auto">${esc(T(p.meta))}</div>`;
  if (p.stack) h += `<div class="stack">${p.stack.map(x => `<span>${esc(x)}</span>`).join('')}</div>`;
  if (p.status) h += `<div><span class="status">${esc(T(p.status))}</span></div>`;
  return pageShell(book, h, n);
}
function figurePage(book, p, n) {
  return pageShell(book, `<div class="plate"><img src="${p.src}" alt="${esc(T(p.caption))}" loading="lazy" decoding="async"></div><div class="caption">${esc(T(p.caption))}</div>`, n);
}
function docPage(book, p, n) {
  return `<div class="page"><div class="doc"><img src="${p.src}" alt="${esc(T(p.caption))}" loading="lazy" decoding="async"><div class="caption">${esc(T(p.caption))}</div></div><div class="page-num">${n}</div></div>`;
}
function blankPage(book, n, first) {
  const note = first ? `<p style="margin:auto;text-align:center;font-style:italic;color:var(--ink-soft)">${esc(UI().stillWriting)}</p>` : '';
  return pageShell(book, `<div style="flex:1;display:flex;background:repeating-linear-gradient(0deg,transparent 0 22px,#e3d9c0 22px 23px)">${note}</div>`, n);
}
function coursePages(book, nStart) {
  const rows = []; Object.entries(C).forEach(([sem, list]) => list.forEach(c => rows.push({ sem, c })));
  const per = 5, out = []; let n = nStart;
  for (let i = 0; i < rows.length; i += per) {
    const chunk = rows.slice(i, i + per); let h = '', lastSem = null;
    if (i === 0) h += `<h2>${LANG === 'es' ? 'Plan de estudios' : 'Study plan'}</h2><div class="orn"></div>`;
    h += '<table class="tbl">';
    chunk.forEach(({ sem, c }) => {
      if (sem !== lastSem) { h += `<tr><td colspan="3" class="sem">${esc(sem)}${lastSem === null && i > 0 && sem === rows[i - 1].sem ? ' (cont.)' : ''}</td></tr>`; lastSem = sem; }
      h += `<tr><td class="code">${esc(c[0])}</td><td><strong>${esc(c[1])}</strong><span class="d">${esc(c[2])}</span><span class="d" style="font-style:normal">${esc(c[5])}</span></td><td class="cr">${c[3]} SCT</td></tr>`;
    });
    h += '</table>';
    out.push(pageShell(book, h, n++));
  }
  return { pages: out, n };
}
function unitPage(book, n) {
  const st = { credit: { es: 'Convalidada', en: 'Credited' }, now: { es: 'En curso', en: 'Enrolled' }, plan: { es: 'Planificada', en: 'Planned' } };
  let h = `<h2>${LANG === 'es' ? 'Plan del programa' : 'Course plan'}</h2><div class="orn"></div><table class="tbl">`;
  Object.entries(U).forEach(([grp, list]) => {
    h += `<tr><td colspan="3" class="sem">${esc(grp.split(' — ')[0].split('  (')[0])}</td></tr>`;
    list.forEach(u => h += `<tr><td class="code">${esc(u[0])}</td><td>${esc(u[1])}</td><td class="cr">${esc(T(st[u[3]]))}</td></tr>`);
  });
  return pageShell(book, h + '</table>', n);
}
function coverPage(book, back) {
  const kanji = book.kanji ? `<div class="cv-kanji">${esc(book.kanji)}</div>` : '';
  const inner = back
    ? `<div class="cv-frame"><div class="rtr"><span>R</span><span>T</span><span class="r-mirror">R</span></div><div class="colophon">${esc(T(book.author))}<br>Raheel Ahmad Aguirre · ${LANG === 'es' ? 'Perth, Australia Occidental' : 'Perth, Western Australia'}</div></div>`
    : `<div class="cv-frame">${kanji}<div class="cv-title">${esc(T(book.title))}</div><div class="cv-sub">${esc(T(book.sub))}</div><div class="cv-author">${esc(T(book.author))}</div></div>`;
  return `<div class="page cover ${back ? 'back' : ''}" data-density="hard" style="--c:${book.color}">${inner}</div>`;
}
function buildBookHTML(book) {
  const pages = [coverPage(book, false)]; let n = 1, firstBlank = true;
  for (const p of book.pages) {
    if (p.type === 'courses') { const r = coursePages(book, n); pages.push(...r.pages); n = r.n; }
    else if (p.type === 'units') pages.push(unitPage(book, n++));
    else if (p.type === 'figure') pages.push(figurePage(book, p, n++));
    else if (p.type === 'doc') pages.push(docPage(book, p, n++));
    else if (p.type === 'blank') { pages.push(blankPage(book, n++, firstBlank)); firstBlank = false; }
    else pages.push(textPage(book, p, n++));
  }
  if ((pages.length - 1) % 2 === 1) pages.push(blankPage(book, n++, false));
  pages.push(coverPage(book, true));
  return pages.join('');
}

/* ── el lector: StPageFlip ──────────────────────────────── */
function initFlip(startPage = 0) {
  if (state.flip) { try { state.flip.destroy(); } catch (e) {} state.flip = null; }
  bookHost.innerHTML = buildBookHTML(state.bookData);
  const wrapW = bookWrap.clientWidth, wrapH = bookWrap.clientHeight;
  const portrait = wrapW < 640;
  const pageH = Math.min(wrapH, portrait ? wrapW * 1.42 : 680), pageW = Math.min(pageH / 1.42, portrait ? wrapW : wrapW / 2);
  state.flip = new St.PageFlip(bookHost, {
    width: Math.round(pageW), height: Math.round(pageH), size: 'fixed',
    showCover: true, usePortrait: portrait, mobileScrollSupport: false,
    maxShadowOpacity: 0.45, drawShadow: true, flippingTime: reduced ? 1 : 750, startPage, showPageCorners: true, swipeDistance: 24,
  });
  state.flip.loadFromHTML(bookHost.querySelectorAll('.page'));
  state.flip.on('flip', () => { SFX.page(bookWrap.getBoundingClientRect().left + bookWrap.clientWidth / 2); updatePager(); });
  updatePager();
}
function updatePager() {
  if (!state.flip) return; const u = UI();
  $('#pagerText').textContent = `${state.flip.getCurrentPageIndex() + 1} ${u.of} ${state.flip.getPageCount()}`;
}
function coverRect() {   // dónde dibuja StPageFlip la tapa — ahí aterriza el libro
  const first = bookHost.querySelector('.stf__item, .page');
  const r = (first || bookHost).getBoundingClientRect();
  if (r.width < 10) { const w = bookWrap.getBoundingClientRect(); return { left: w.left + w.width / 2, top: w.top + w.height * 0.1, width: w.width / 2, height: w.height * 0.8 }; }
  return r;
}

/* ── la tapa en vuelo (del estante a la mano, de la mano al lector) ── */
let flyer = null;
function mkFlyer(book, w, h, inHand) {
  flyer && flyer.remove();
  flyer = document.createElement('div'); flyer.className = 'flyer' + (inHand ? ' in-hand' : ''); flyer.style.setProperty('--c', book.color);
  flyer.innerHTML = `<div class="page cover" style="--c:${book.color};position:absolute;inset:0"><div class="cv-frame">${book.kanji ? `<div class="cv-kanji">${esc(book.kanji)}</div>` : ''}<div class="cv-title">${esc(T(book.title))}</div><div class="cv-sub">${esc(T(book.sub))}</div></div></div>`;
  Object.assign(flyer.style, { width: `${w}px`, height: `${h}px` });
  $('#flyerPersp').appendChild(flyer);
  return flyer;
}
// Poses como take_pose_at en DEsk: colgando en el estante → en la mano, levantado → sobre su sitio, apenas inclinado → posado.
function fly({ from, to, book, mode }) {
  const cover = mode === 'in' ? from : to;
  mkFlyer(book, cover.width, cover.height, false);
  const sx = r => (r.width / cover.width).toFixed(3), sy = r => (r.height / cover.height).toFixed(3);
  const spine = r => `translate(${r.left}px, ${r.top}px) rotateY(-82deg) scale(${(r.width / cover.width * 6).toFixed(3)}, ${sy(r)})`;
  const lifted = r => `translate(${r.left - cover.width * 0.15}px, ${r.top - 30}px) rotateY(-45deg) scale(${(r.height / cover.height * 1.07).toFixed(3)})`;
  const over = r => `translate(${r.left - r.width * 0.03}px, ${r.top - r.height * 0.04}px) rotateY(0deg) rotateZ(-2deg) scale(${(r.width / cover.width * 1.06).toFixed(3)})`;
  const flat = r => `translate(${r.left}px, ${r.top}px) rotateY(0deg) rotateZ(0deg) scale(${sx(r)})`;
  let frames;
  if (mode === 'out')  frames = [{ transform: spine(from), offset: 0 }, { transform: lifted(from), offset: 0.3 }, { transform: over(to), offset: 0.72 }, { transform: flat(to), offset: 1 }];
  if (mode === 'in')   frames = [{ transform: flat(from), offset: 0 }, { transform: over(from), offset: 0.28 }, { transform: lifted(to), offset: 0.7 }, { transform: spine(to), offset: 1 }];
  if (mode === 'hand') frames = [{ transform: flat(from), offset: 0 }, { transform: over(to), offset: 0.6 }, { transform: flat(to), offset: 1 }];
  const anim = flyer.animate(frames, { duration: reduced ? 1 : (mode === 'hand' ? 620 : 880), easing: 'cubic-bezier(0.22, 0.8, 0.25, 1)', fill: 'forwards' });
  return anim.finished.catch(() => {});
}
function shelfRectOf(el) { return el ? el.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 40, height: 160 }; }

/* ── abrir y devolver ───────────────────────────────────── */
async function openBook(id, from, mode = 'out') {
  const book = findBook(id); if (!book || state.book === id || state.busy) return;
  const el = $(`.book[data-id="${id}"]`); from ||= shelfRectOf(el);
  state.busy = true; state.book = id; state.bookData = book; state.bookEl = el; updateHint();
  if (mode === 'out') SFX.slide(from.left);
  reader.hidden = false; bookWrap.classList.remove('is-on'); void reader.offsetWidth; reader.classList.add('is-on');
  initFlip(0);
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  el && el.classList.add('is-hidden');
  await fly({ from, to: coverRect(), book, mode });
  SFX.thump(innerWidth / 2);
  bookWrap.classList.add('is-on'); flyer && flyer.remove(); flyer = null;
  state.busy = false;
  $('#readerClose').focus({ preventScroll: true });
}
async function closeBook() {
  if (!state.book || state.busy) return;
  state.busy = true;
  const book = state.bookData, el = state.bookEl;
  if (state.flip && state.flip.getCurrentPageIndex() > 0) { try { state.flip.turnToPage(0); } catch (e) {} }
  const from = coverRect(), to = shelfRectOf(el);
  bookWrap.classList.remove('is-on');
  await fly({ from, to, book, mode: 'in' });
  flyer && flyer.remove(); flyer = null;
  el && el.classList.remove('is-hidden'); SFX.thump(to.left);
  reader.classList.remove('is-on'); setTimeout(() => { reader.hidden = true; if (state.flip) { try { state.flip.destroy(); } catch (e) {} state.flip = null; } bookHost.innerHTML = ''; }, 450);
  state.book = null; state.bookData = null; state.bookEl = null; state.busy = false; updateHint();
  el && el.focus({ preventScroll: true });
}

/* ── tomar un libro con la mano ─────────────────────────── */
// Al apretar y arrastrar, el libro sale del estante y sigue a la mano (con la inclinación
// de la velocidad, como la hoja en DEsk). Si se suelta lejos, se abre ahí; si se suelta
// cerca, vuelve solo a su hueco. Un toque sin arrastre también lo abre.
const hand = { d: null };
function handSize() { const w = clamp(innerWidth * 0.22, 110, 190); return { w, h: w * 1.42 }; }
function onBookDown(e) {
  const b = e.target.closest('.book'); if (!b || state.book || state.busy || state.intro || (e.button && e.button !== 0)) return;
  hand.d = { b, id: b.dataset.id, shelf: b.dataset.shelf, x0: e.clientX, y0: e.clientY, pid: e.pointerId, started: false, vx: 0, lx: e.clientX, lt: performance.now() };
  try { b.setPointerCapture(e.pointerId); } catch (err) {}
}
function onBookMove(e) {
  const d = hand.d; if (!d || e.pointerId !== d.pid) return;
  const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
  if (!d.started) { if (Math.hypot(dx, dy) < 8) return; d.started = true; startHand(d); }
  const now = performance.now(); const dt = Math.max(1, now - d.lt); d.vx = d.vx * 0.7 + ((e.clientX - d.lx) / dt) * 0.3; d.lx = e.clientX; d.lt = now;
  moveHand(d, e.clientX, e.clientY);
}
function onBookUp(e) {
  const d = hand.d; if (!d || e.pointerId !== d.pid) return; hand.d = null;
  if (!d.started) { go(`#${d.shelf}/${d.id}`); return; }
  releaseHand(d, e.clientX, e.clientY, e.type === 'pointercancel');
}
function startHand(d) {
  const book = findBook(d.id); const { w, h } = handSize();
  d.book = book; d.w = w; d.h = h;
  mkFlyer(book, w, h, true); d.b.classList.add('is-hidden'); SFX.slide(d.x0);
  flyer.style.transform = `translate(${d.x0 - w / 2}px, ${d.y0 - h * 0.3}px) scale(0.6)`;
  flyer.animate([{ transform: flyer.style.transform }, { transform: `translate(${d.x0 - w / 2}px, ${d.y0 - h * 0.3}px) scale(1)` }], { duration: 180, easing: 'ease-out' });
}
function moveHand(d, x, y) {
  if (!flyer) return;
  const r = clamp(-d.vx * 18, -9, 9);
  flyer.style.transform = `translate(${x - d.w / 2}px, ${y - d.h * 0.3}px) rotate(${r.toFixed(1)}deg) scale(1)`;
}
async function releaseHand(d, x, y, cancelled) {
  if (!flyer) return;
  const far = Math.hypot(x - d.x0, y - d.y0) > 70;
  const here = flyer.getBoundingClientRect();
  if (far && !cancelled) {
    if (state.level !== d.shelf) go(`#${d.shelf}/${d.id}`);   // la URL manda; openBook la honra
    else { history.replaceState(null, '', `#${d.shelf}/${d.id}`); }
    openBook(d.id, { left: here.left, top: here.top, width: here.width, height: here.height }, 'hand');
  } else {
    state.busy = true;
    await fly({ from: here, to: shelfRectOf(d.b), book: d.book, mode: 'in' });
    flyer && flyer.remove(); flyer = null; d.b.classList.remove('is-hidden'); SFX.thump(x); state.busy = false;
  }
}

/* ── cajones: se tiran del asa ──────────────────────────── */
function vcard() {
  const c = CONTENT.contact.card;
  const v = ['BEGIN:VCARD', 'VERSION:3.0', `N:Ahmad Aguirre;Raheel;;;`, `FN:${c.name}`, 'ORG:RTR', `TITLE:${T(c.role)}`,
    `TEL;TYPE=CELL:${c.phone.replace(/\s/g, '')}`, `TEL;TYPE=CELL,VOICE:${c.phone2.replace(/\s/g, '')}`, `EMAIL;TYPE=INTERNET:${c.email}`, `EMAIL;TYPE=INTERNET:${c.email2}`,
    'URL:https://raxh-com.github.io', 'ADR;TYPE=WORK:;;;Perth;WA;;Australia', 'END:VCARD'].join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([v], { type: 'text/vcard' })); a.download = 'Raheel_Ahmad_Aguirre.vcf'; document.body.appendChild(a); a.click(); a.remove();
}
function drawerAction(d) {
  if (d.id === 'drawerCV') { const w = window.open('assets/docs/Raheel_Ahmad_Aguirre_CV.pdf', '_blank'); if (w) w.opener = null; }
  else vcard();
}
function openDrawer(d, x) {
  if (d.classList.contains('is-open')) return;
  d.classList.add('is-open'); SFX.drawer(x);
  setTimeout(() => { drawerAction(d); setTimeout(() => d.classList.remove('is-open'), 1400); }, reduced ? 0 : 420);
}
function setupDrawers() {
  $$('.drawer').forEach(d => {
    let g = null;
    const unit = () => parseFloat(getComputedStyle(cabinet).width) / 560;
    d.addEventListener('pointerdown', e => { if (d.classList.contains('is-open') || state.intro) return; g = { pid: e.pointerId, y0: e.clientY, max: 22 * unit() * (1 / (state.level ? 1 : geo.fit)), moved: false }; try { d.setPointerCapture(e.pointerId); } catch (err) {} });
    d.addEventListener('pointermove', e => { if (!g || e.pointerId !== g.pid) return; const dy = clamp(e.clientY - g.y0, 0, g.max * 1.15); if (dy > 4) { g.moved = true; d.classList.add('is-dragging'); } d.style.setProperty('--dy', `${dy}px`); });
    const up = e => {
      if (!g || e.pointerId !== g.pid) return; const dy = clamp(e.clientY - g.y0, 0, g.max * 1.15); const was = g; g = null;
      d.classList.remove('is-dragging'); d.style.removeProperty('--dy');
      if (!was.moved) { openDrawer(d, e.clientX); return; }
      if (dy > was.max * 0.55) { d.classList.add('is-open'); SFX.knock(e.clientX); setTimeout(() => { drawerAction(d); setTimeout(() => d.classList.remove('is-open'), 1400); }, 200); }
      else SFX.knock(e.clientX);
    };
    d.addEventListener('pointerup', up); d.addEventListener('pointercancel', up);
    d.addEventListener('click', e => e.stopPropagation());
    d.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDrawer(d, innerWidth / 2); } });
  });
}

/* ── rutas: #studies · #projects/daicho · #contact ──────── */
function route() {
  const [lv, bk] = location.hash.replace(/^#/, '').split('/');
  const level = ['studies', 'projects', 'contact'].includes(lv) ? lv : null;
  const book = bk && findBook(bk) ? bk : null;
  if (state.book && state.book !== book) closeBook();
  const changed = state.level !== level;
  setLevel(level);
  if (book && !state.book && !state.busy) setTimeout(() => { if (location.hash === `#${level}/${book}`) openBook(book); }, changed ? 1200 : 0);
}
function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }

/* ── eventos ────────────────────────────────────────────── */
function setupEvents() {
  $$('.level').forEach(lv => {
    lv.addEventListener('pointerdown', onBookDown);
    lv.addEventListener('pointermove', onBookMove);
    lv.addEventListener('pointerup', onBookUp);
    lv.addEventListener('pointercancel', onBookUp);
    lv.addEventListener('click', e => {
      if (state.intro || e.target.closest('.book, .stamp, .card-scene')) return;
      if (state.level !== lv.dataset.level) go(`#${lv.dataset.level}`);
    });
    lv.addEventListener('keydown', e => { const b = e.target.closest('.book'); if (b && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); go(`#${b.dataset.shelf}/${b.dataset.id}`); } });
  });
  if (finePointer) document.addEventListener('pointerover', e => { const b = e.target.closest && e.target.closest('.book'); if (b && !b.dataset.hov && !hand.d) { b.dataset.hov = 1; SFX.slide(b.getBoundingClientRect().left); setTimeout(() => delete b.dataset.hov, 600); } });
  hud.back.addEventListener('click', () => { if (state.book) go(`#${state.level}`); else go('#'); });
  $('#readerClose').addEventListener('click', () => go(`#${state.level || shelfOf(state.book)}`));
  reader.addEventListener('click', e => { if (e.target === reader) go(`#${state.level || shelfOf(state.book)}`); });
  $('#pagerPrev').addEventListener('click', () => state.flip && state.flip.flipPrev());
  $('#pagerNext').addEventListener('click', () => state.flip && state.flip.flipNext());
  hud.lang.addEventListener('click', e => { const s = e.target.closest('span[data-lang]'); if (!s || s.dataset.lang === LANG) return; setLang(s.dataset.lang); });
  hud.sound.addEventListener('click', () => { hud.sound.classList.toggle('is-off', !SFX.toggle()); if (SFX.on) SFX.page(innerWidth - 40); });
  addEventListener('hashchange', route);
  addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (state.book) go(`#${state.level}`); else if (state.level) go('#'); }
    if (state.flip && !e.metaKey && !e.ctrlKey) { if (e.key === 'ArrowRight') state.flip.flipNext(); if (e.key === 'ArrowLeft') state.flip.flipPrev(); }
  });
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { measure(); applyCamera(false); if (state.flip) initFlip(state.flip.getCurrentPageIndex()); }, 150); });
  stage.addEventListener('click', e => { if (state.intro || state.book) return; if (e.target === stage || e.target === tilt) { if (state.level) go('#'); } });
  // rueda del mouse / trackpad: baja y sube por los niveles
  const ORDER = [null, 'studies', 'projects', 'contact'];
  let acc = 0, lastStep = 0;
  function step(dir) {
    const now = performance.now(); if (now - lastStep < 750 || state.book || state.intro || state.busy) return;
    const i = ORDER.indexOf(state.level); const j = clamp(i + dir, 0, ORDER.length - 1); if (j === i) return;
    lastStep = now; go(ORDER[j] ? `#${ORDER[j]}` : '#');
  }
  addEventListener('wheel', e => {
    if (state.book || (e.target.closest && e.target.closest('.reader'))) return;
    acc += e.deltaY; if (Math.abs(acc) > 90) { step(acc > 0 ? 1 : -1); acc = 0; }
    clearTimeout(step.t); step.t = setTimeout(() => acc = 0, 220);
  }, { passive: true });
  let sw = null;
  stage.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' || e.target.closest('.book, .drawer, .stamp, .card-scene')) return; sw = { y: e.clientY, x: e.clientX, t: performance.now() }; });
  stage.addEventListener('pointerup', e => { if (!sw) return; const dy = e.clientY - sw.y, dx = e.clientX - sw.x; sw = null; if (Math.abs(dy) > 60 && Math.abs(dy) > Math.abs(dx) * 1.5) step(dy < 0 ? 1 : -1); });
  addEventListener('keydown', e => { if (e.key === 'ArrowDown' || e.key === 'PageDown') step(1); if (e.key === 'ArrowUp' || e.key === 'PageUp') step(-1); });
}
function setLang(l) {
  LANG = l; try { localStorage.setItem('hondana-lang', l); } catch (e) {}
  renderUI(); renderShelves(); renderStamps();
  if (state.flip) initFlip(state.flip.getCurrentPageIndex());
}

/* ── arranque ───────────────────────────────────────────── */
function init() {
  const c = CONTENT.contact.card;
  $('#cardPhone').textContent = c.phone; $('#cardEmailTag').textContent = c.email2;
  $('#cardName').textContent = c.name; $('#cbPhone').textContent = c.phone; $('#cbPhone2').textContent = c.phone2; $('#cbEmail').textContent = c.email; $('#cbEmail2').textContent = c.email2;
  renderUI(); renderShelves(); renderStamps(); setupCard(); setupDrawers(); setupEvents();
  measure(); applyCamera(false); lampCtl.start();
  const intro = $('#intro');
  const done = () => { intro.classList.add('is-done'); state.intro = false; setTimeout(() => intro.remove(), 1000); route(); };
  let seen = false; try { seen = !!sessionStorage.getItem('hondana-intro'); } catch (e) {}
  if (reduced || seen) { intro.remove(); state.intro = false; route(); }
  else { try { sessionStorage.setItem('hondana-intro', '1'); } catch (e) {} setTimeout(done, 1500); }
}
window.__hondana = { get state() { return state; }, go, openBook, closeBook, measure };
if (document.fonts && document.fonts.ready) document.fonts.ready.then(init, init); else init();
})();
