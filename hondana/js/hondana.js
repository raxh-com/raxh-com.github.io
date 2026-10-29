/* ══════════════════════════════════════════════════════════════
   HONDANA (本棚) — motor de la estantería
   Una sala, un mueble, una lámpara. Tres niveles: estudios, proyectos,
   correspondencia. Los libros se sacan del estante y se hojean.
   Movimiento inspirado en DEsk (fyzugx): una sola luz que sigue al
   puntero, resortes con un poco de rebote, y cada sonido ubicado
   donde está la cosa que lo hace.
══════════════════════════════════════════════════════════════ */
(() => {
'use strict';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(pointer: fine)').matches;

/* ── idioma ─────────────────────────────────────────────── */
let LANG = 'es';
try { LANG = localStorage.getItem('hondana-lang') || ((navigator.language || '').startsWith('es') ? 'es' : 'en'); } catch (e) {}
const T = x => (x == null ? '' : typeof x === 'string' ? x : (x[LANG] ?? x.es ?? x.en));
const UI = () => CONTENT.ui[LANG];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ── resortes de DEsk como easing CSS linear() ──────────── */
// look_ease: W = 8.5, Z = 0.74 — llega, se pasa un 3 % y vuelve. drawer_ease: W = 12, Z = 0.80.
function springLinear(W, Z, n = 40) {
  const wd = W * Math.sqrt(1 - Z * Z);
  const f = u => 1 - Math.exp(-Z * W * u) * (Math.cos(wd * u) + (Z * W / wd) * Math.sin(wd * u));
  const pts = [];
  for (let i = 0; i <= n; i++) { const u = i / n; pts.push(`${f(u).toFixed(4)} ${(u * 100).toFixed(1)}%`); }
  return `linear(${pts.join(', ')})`;
}
const SUPPORTS_LINEAR = CSS.supports('transition-timing-function', 'linear(0, 1)');
const EASE_LOOK   = SUPPORTS_LINEAR ? springLinear(8.5, 0.74) : 'cubic-bezier(0.34, 1.2, 0.44, 1)';
const EASE_DRAWER = SUPPORTS_LINEAR ? springLinear(12, 0.80)  : 'cubic-bezier(0.34, 1.3, 0.5, 1)';
document.documentElement.style.setProperty('--ease-look', EASE_LOOK);
document.documentElement.style.setProperty('--ease-drawer', EASE_DRAWER);

/* ── sonido: síntesis mínima, ubicada donde pasa la cosa ── */
const SFX = (() => {
  let ctx = null, on = true;
  try { on = localStorage.getItem('hondana-sound') !== 'off'; } catch (e) {}
  const ac = () => (ctx ||= new (window.AudioContext || window.webkitAudioContext)());
  const pan = x => Math.max(-0.6, Math.min(0.6, (x / innerWidth - 0.5) * 1.2));
  function noise(ms, { type = 'bandpass', freq = 1800, q = 0.8, gain = 0.25, x = innerWidth / 2, attack = 0.005 } = {}) {
    if (!on) return; const a = ac(); const len = Math.floor(a.sampleRate * ms / 1000);
    const buf = a.createBuffer(1, len, a.sampleRate); const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 1.6;
    const src = a.createBufferSource(); src.buffer = buf;
    const f = a.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = a.createGain(); g.gain.setValueAtTime(0, a.currentTime); g.gain.linearRampToValueAtTime(gain, a.currentTime + attack); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + ms / 1000);
    const p = a.createStereoPanner ? a.createStereoPanner() : null; if (p) p.pan.value = pan(x);
    src.connect(f); f.connect(g); (p ? (g.connect(p), p) : g).connect(a.destination); src.start();
  }
  function tone(freq, ms, { gain = 0.18, x = innerWidth / 2, type = 'sine' } = {}) {
    if (!on) return; const a = ac(); const o = a.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, a.currentTime); o.frequency.exponentialRampToValueAtTime(freq * 0.6, a.currentTime + ms / 1000);
    const g = a.createGain(); g.gain.setValueAtTime(gain, a.currentTime); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + ms / 1000);
    const p = a.createStereoPanner ? a.createStereoPanner() : null; if (p) p.pan.value = pan(x);
    o.connect(g); (p ? (g.connect(p), p) : g).connect(a.destination); o.start(); o.stop(a.currentTime + ms / 1000);
  }
  return {
    get on() { return on; },
    toggle() { on = !on; try { localStorage.setItem('hondana-sound', on ? 'on' : 'off'); } catch (e) {} return on; },
    page: x => noise(140, { freq: 2200, q: 0.6, gain: 0.16, x }),                    // hoja que pasa
    slide: x => noise(260, { type: 'lowpass', freq: 900, gain: 0.14, x, attack: 0.04 }), // libro que sale del estante
    thump: x => { tone(95, 150, { gain: 0.22, x }); noise(60, { type: 'lowpass', freq: 400, gain: 0.08, x }); }, // se posa
    drawer: x => { noise(220, { type: 'lowpass', freq: 700, gain: 0.1, x, attack: 0.03 }); setTimeout(() => tone(70, 120, { gain: 0.2, x }), 230); }, // corre y golpea el tope
    stamp: x => { tone(140, 90, { gain: 0.2, x }); noise(70, { freq: 1200, gain: 0.12, x }); },
    look: x => noise(380, { type: 'lowpass', freq: 500, gain: 0.05, x, attack: 0.08 }),
  };
})();

/* ── estado ─────────────────────────────────────────────── */
const state = { level: null, book: null, intro: true, pan: 0, flip: null, bookEl: null, bookData: null };
const stage = $('#stage'), cabinet = $('#cabinet'), lamp = $('#lamp');
const reader = $('#reader'), bookWrap = $('#bookWrap'), bookHost = $('#book');
const hud = { back: $('#hudBack'), hint: $('#hudHint'), lang: $('#hudLang'), sound: $('#hudSound'), title: $('#hudTitle') };

/* ── construir texto de la interfaz ─────────────────────── */
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
  el.innerHTML =
    `<span class="b-pages"></span>` +
    `<span class="b-cover"><span class="c-frame">${b.kanji ? `<span class="c-kanji">${esc(b.kanji)}</span>` : ''}<span class="c-title">${esc(T(b.title))}</span><span class="c-sub">${esc(T(b.sub))}</span></span></span>` +
    `<span class="b-top"></span>` +
    `<span class="b-spine"><span class="b-title">${esc(T(b.spine || b.title))}</span><span class="b-kanji ${(b.kanji || '').length > 2 ? 'is-long' : ''}">${esc(b.kanji || '')}</span></span>`;
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
  if (state.book) { const el = $(`.book[data-id="${state.book}"]`); el && el.classList.add('is-hidden'); }
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
      e.preventDefault(); if (a.classList.contains('is-stamped')) return;
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
  scene.addEventListener('click', () => { card.classList.toggle('flipped'); SFX.page(scene.getBoundingClientRect().x); });
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
    if (!finePointer || reduced) return;
    following = true; clearTimeout(wanderTimer); moveTo(e.clientX, e.clientY, 900);
    clearTimeout(idleTimer); idleTimer = setTimeout(() => { following = false; wander(); }, 3500);
  }
  function start() {
    if (reduced) { const r = cabinet.getBoundingClientRect(); moveTo(r.left + r.width / 2, r.top + r.height * 0.3, 0); return; }
    wander(); addEventListener('pointermove', onPointer, { passive: true });
  }
  return { start, wander };
})();

/* ── cámara: acercarse a un nivel ───────────────────────── */
const geo = { p: {}, cabW: 0, levelH: 0 };
function measure() {
  const prev = cabinet.style.transform, prevT = cabinet.style.transition;
  cabinet.style.transition = 'none'; cabinet.style.transform = 'none';
  const cr = cabinet.getBoundingClientRect(); const cx = cr.left + cr.width / 2, cy = cr.top + cr.height / 2;
  geo.cabW = cr.width;
  $$('.level').forEach(lv => { const r = lv.getBoundingClientRect(); geo.p[lv.dataset.level] = { x: r.left + r.width / 2 - cx, y: r.top + r.height / 2 - cy, h: r.height, w: r.width }; });
  void cabinet.offsetWidth; cabinet.style.transform = prev; cabinet.style.transition = prevT;
}
function applyCamera(animate = true) {
  cabinet.style.transition = animate && !reduced ? `transform 1.1s ${EASE_LOOK}` : 'none';
  if (!state.level) { cabinet.style.transform = ''; stage.style.perspectiveOrigin = '50% 50%'; return; }
  const p = geo.p[state.level]; const narrow = innerWidth < 700;
  let s = narrow ? (state.level === 'contact' ? innerWidth * 0.98 / geo.cabW : Math.min(innerHeight * 0.58 / (p.h * 1.25), 2.4)) : Math.min(innerWidth * 0.96 / geo.cabW, innerHeight * 0.74 / (p.h * 1.3));
  s = Math.max(1, s);
  const maxPan = Math.max(0, (geo.cabW * s - innerWidth) / 2 + 20);
  state.pan = Math.max(-maxPan, Math.min(maxPan, state.pan)); state.maxPan = maxPan;
  cabinet.style.transform = `translate(${(-s * p.x + state.pan).toFixed(1)}px, ${(-s * p.y).toFixed(1)}px) scale(${s.toFixed(3)})`;
}
function setLevel(id) {
  if (state.level === id) return;
  state.level = id; state.pan = 0;
  $$('.level').forEach(lv => lv.classList.toggle('is-active', lv.dataset.level === id));
  document.body.classList.toggle('is-zoomed', !!id);
  applyCamera(); updateHint();
  if (id) SFX.look(innerWidth / 2);
}
// arrastrar para desplazarse cuando el nivel ampliado no cabe (teléfonos)
(() => {
  let x0 = null, pan0 = 0, moved = false;
  stage.addEventListener('pointerdown', e => { if (!state.level || !state.maxPan || e.pointerType === 'mouse') return; x0 = e.clientX; pan0 = state.pan; moved = false; });
  stage.addEventListener('pointermove', e => { if (x0 == null) return; const dx = e.clientX - x0; if (Math.abs(dx) > 6) moved = true; state.pan = pan0 + dx; applyCamera(false); }, { passive: true });
  const end = () => { x0 = null; if (moved) { stage.addEventListener('click', e => e.stopPropagation(), { capture: true, once: true }); } };
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
      if (sem !== lastSem) { h += `<tr><td colspan="3" class="sem">${esc(sem)}${i > 0 && sem === rows[i - 1].sem && lastSem === null ? (LANG === 'es' ? ' (cont.)' : ' (cont.)') : ''}</td></tr>`; lastSem = sem; }
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
  if ((pages.length - 1) % 2 === 1) pages.push(blankPage(book, n++, false));   // pliegos completos antes de la contratapa
  pages.push(coverPage(book, true));
  return pages.join('');
}

/* ── el lector: abrir, hojear, devolver ─────────────────── */
let flyer = null;
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
  state.flip.on('flip', e => { SFX.page(bookWrap.getBoundingClientRect().left + bookWrap.clientWidth / 2); updatePager(); });
  updatePager();
}
function updatePager() {
  if (!state.flip) return; const u = UI();
  $('#pagerText').textContent = `${state.flip.getCurrentPageIndex() + 1} ${u.of} ${state.flip.getPageCount()}`;
}
function coverRect() {   // dónde dibuja StPageFlip la tapa (primera página) — ahí aterriza el libro en vuelo
  const first = bookHost.querySelector('.stf__item, .page');
  const r = (first || bookHost).getBoundingClientRect();
  if (r.width < 10) { const w = bookWrap.getBoundingClientRect(); return { left: w.left + w.width / 2, top: w.top + w.height * 0.1, width: w.width / 2, height: w.height * 0.8 }; }
  return r;
}
function fly(fromRect, toRect, color, book, reverse) {
  flyer && flyer.remove();
  flyer = document.createElement('div'); flyer.className = 'flyer'; flyer.style.setProperty('--c', color);
  flyer.innerHTML = `<div class="page cover" style="--c:${color};position:absolute;inset:0"><div class="cv-frame">${book.kanji ? `<div class="cv-kanji">${esc(book.kanji)}</div>` : ''}<div class="cv-title">${esc(T(book.title))}</div><div class="cv-sub">${esc(T(book.sub))}</div></div></div>`;
  Object.assign(flyer.style, { width: `${toRect.width}px`, height: `${toRect.height}px`, left: 0, top: 0 });
  $('#flyerPersp').appendChild(flyer);
  const sx = fromRect.width / toRect.width, sy = fromRect.height / toRect.height;
  // Poses, como take_pose_at en DEsk: colgando en el estante → en la mano, levantado → sobre su sitio, apenas inclinado → posado.
  const k0 = `translate(${fromRect.left}px, ${fromRect.top}px) rotateY(-82deg) scale(${(fromRect.width / toRect.width * 6).toFixed(3)}, ${sy.toFixed(3)})`;
  const k1 = `translate(${fromRect.left - toRect.width * 0.15}px, ${fromRect.top - 30}px) rotateY(-45deg) scale(${(sy * 1.07).toFixed(3)})`;
  const k2 = `translate(${toRect.left - toRect.width * 0.03}px, ${toRect.top - toRect.height * 0.04}px) rotateY(0deg) rotateZ(-2deg) scale(1.06)`;
  const k3 = `translate(${toRect.left}px, ${toRect.top}px) rotateY(0deg) rotateZ(0deg) scale(1)`;
  const frames = [{ transform: k0, opacity: 1, offset: 0 }, { transform: k1, offset: 0.3 }, { transform: k2, offset: 0.72 }, { transform: k3, offset: 1 }];
  const anim = flyer.animate(reverse ? frames.slice().reverse().map((f, i) => ({ ...f, offset: [0, 0.28, 0.7, 1][i] })) : frames,
    { duration: reduced ? 1 : 880, easing: 'cubic-bezier(0.22, 0.8, 0.25, 1)', fill: 'forwards' });
  return anim.finished;
}
async function openBook(id) {
  const book = findBook(id); if (!book || state.book === id) return;
  const el = $(`.book[data-id="${id}"]`); const from = el ? el.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 40, height: 160 };
  state.book = id; state.bookData = book; state.bookEl = el; updateHint();
  SFX.slide(from.left);
  reader.hidden = false; bookWrap.classList.remove('is-on'); void reader.offsetWidth; reader.classList.add('is-on');
  initFlip(0);
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  el && el.classList.add('is-hidden');
  await fly(from, coverRect(), book.color, book, false);
  SFX.thump(innerWidth / 2);
  bookWrap.classList.add('is-on'); flyer && flyer.remove(); flyer = null;
  $('#readerClose').focus({ preventScroll: true });
}
async function closeBook() {
  if (!state.book) return;
  const book = state.bookData, el = state.bookEl;
  const toRect = el ? el.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 40, height: 160 };
  if (state.flip && state.flip.getCurrentPageIndex() > 0) { try { state.flip.turnToPage(0); } catch (e) {} }
  const from = coverRect();
  bookWrap.classList.remove('is-on');
  await fly(toRect, from, book.color, book, true);
  flyer && flyer.remove(); flyer = null;
  el && el.classList.remove('is-hidden'); SFX.thump(toRect.left);
  reader.classList.remove('is-on'); setTimeout(() => { reader.hidden = true; if (state.flip) { try { state.flip.destroy(); } catch (e) {} state.flip = null; } bookHost.innerHTML = ''; }, 450);
  state.book = null; state.bookData = null; state.bookEl = null; updateHint();
  el && el.focus({ preventScroll: true });
}

/* ── cajones ────────────────────────────────────────────── */
function vcard() {
  const c = CONTENT.contact.card;
  const v = ['BEGIN:VCARD', 'VERSION:3.0', `N:Ahmad Aguirre;Raheel;;;`, `FN:${c.name}`, 'ORG:RTR', `TITLE:${T(c.role)}`,
    `TEL;TYPE=CELL:${c.phone.replace(/\s/g, '')}`, `TEL;TYPE=CELL,VOICE:${c.phone2.replace(/\s/g, '')}`, `EMAIL;TYPE=INTERNET:${c.email}`, `EMAIL;TYPE=INTERNET:${c.email2}`,
    'URL:https://raxh-com.github.io', 'ADR;TYPE=WORK:;;;Perth;WA;;Australia', 'END:VCARD'].join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([v], { type: 'text/vcard' })); a.download = 'Raheel_Ahmad_Aguirre.vcf'; document.body.appendChild(a); a.click(); a.remove();
}
function setupDrawers() {
  $$('.drawer').forEach(d => d.addEventListener('click', e => {
    e.stopPropagation(); if (d.classList.contains('is-open')) return;
    d.classList.add('is-open'); SFX.drawer(e.clientX || innerWidth / 2);
    setTimeout(() => {
      if (d.id === 'drawerCV') { const w = window.open('assets/docs/Raheel_Ahmad_Aguirre_CV.pdf', '_blank'); if (w) w.opener = null; }
      else vcard();
      setTimeout(() => d.classList.remove('is-open'), 1400);
    }, reduced ? 0 : 420);
  }));
}

/* ── rutas: #studies · #projects/daicho · #contact ──────── */
function route() {
  const [lv, bk] = location.hash.replace(/^#/, '').split('/');
  const level = ['studies', 'projects', 'contact'].includes(lv) ? lv : null;
  const book = bk && findBook(bk) ? bk : null;
  if (state.book && state.book !== book) closeBook();
  setLevel(level);
  if (book && !state.book) setTimeout(() => openBook(book), state.level !== level ? 1100 : 0);
}
function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }

/* ── eventos ────────────────────────────────────────────── */
function setupEvents() {
  $$('.level').forEach(lv => {
    lv.addEventListener('click', e => {
      if (state.intro) return;
      const b = e.target.closest('.book');
      if (b) { go(`#${b.dataset.shelf}/${b.dataset.id}`); return; }
      if (e.target.closest('.stamp, .card-scene')) return;
      if (state.level !== lv.dataset.level) go(`#${lv.dataset.level}`);
    });
    lv.addEventListener('keydown', e => { const b = e.target.closest('.book'); if (b && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); go(`#${b.dataset.shelf}/${b.dataset.id}`); } });
    lv.addEventListener('pointerenter', e => { const b = e.target.closest && e.target.closest('.book'); }, true);
  });
  $$('.book').forEach(() => {});
  document.addEventListener('pointerover', e => { const b = e.target.closest && e.target.closest('.book'); if (b && finePointer && !b.dataset.hov) { b.dataset.hov = 1; SFX.slide(b.getBoundingClientRect().left); setTimeout(() => delete b.dataset.hov, 600); } });
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
  stage.addEventListener('click', e => { if (state.intro || state.book) return; if (e.target === stage || e.target.closest('.floor')) { if (state.level) go('#'); } });
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
  measure(); lampCtl.start();
  const intro = $('#intro');
  const done = () => { intro.classList.add('is-done'); state.intro = false; setTimeout(() => intro.remove(), 1000); route(); };
  if (reduced || sessionStorage.getItem('hondana-intro')) { intro.remove(); state.intro = false; route(); }
  else { try { sessionStorage.setItem('hondana-intro', '1'); } catch (e) {} setTimeout(done, 1500); }
}
window.__hondana = { get state() { return state; }, go, openBook, closeBook, measure };
document.fonts && document.fonts.ready ? document.fonts.ready.then(init) : init();
})();
