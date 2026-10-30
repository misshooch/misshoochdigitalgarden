/*
  Miss Hooch Archive: client script.

  Everything here is optional polish. Each feature is wrapped so that if one
  fails, the page still reads normally. No dependencies.

  What it does:
    1. Skin switch (terminal / cyber blue) and calm mode, remembered per visitor.
    2. Status-bar timecode.
    3. Photo effects: an image embedded in Obsidian with one of these words,
       for example ![[photo.jpg|halftone]], is redrawn in that style.
       Words: halftone, phosphor, cyber, pixel, code.
       Click the picture to flip between the effect and the original.
    4. Footnotes shown as marginalia beside the paragraph.
    5. A player in the status bar: a site-wide playlist from the plugin settings, audio linked
       or embedded in the note, or a built-in generated ambient track. It remembers its place.
    5b. The homepage portrait and ID photo, drawn in the current skin.
    6. Marks the homepage and the index page on <body> for styling.
*/
(function () {
  "use strict";
  var doc = document, root = doc.documentElement;
  function $(s, r) { return (r || doc).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }
  function safe(name, fn) { try { fn(); } catch (e) { if (window.console) console.warn("[misshooch-archive] " + name + " skipped:", e); } }
  function store(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- image effects (ported from the approved design preview) ---------- */
  function levels(data) {
    var hist = new Uint32Array(256), n = data.length / 4, i, acc = 0, lo = 0, hi = 255;
    for (i = 0; i < data.length; i += 4) hist[Math.round(data[i] * .3 + data[i + 1] * .59 + data[i + 2] * .11)]++;
    for (i = 0; i < 256; i++) { acc += hist[i]; if (acc > n * .02) { lo = i; break; } }
    acc = 0; for (i = 255; i >= 0; i--) { acc += hist[i]; if (acc > n * .02) { hi = i; break; } }
    return (hi - lo < 30) ? [0, 255] : [lo, hi];
  }
  function rng(seed) {
    return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function lumAt(data, sw, sh, u, v, lo, span) {
    var x = Math.max(0, Math.min(sw - 1, Math.floor(u * sw))), y = Math.max(0, Math.min(sh - 1, Math.floor(v * sh))), i = (y * sw + x) * 4;
    return Math.max(0, Math.min(1, ((data[i] * .3 + data[i + 1] * .59 + data[i + 2] * .11) - lo) / span));
  }
  /* pixelated: big blocks, six colour levels per channel, faint grid */
  function pixelFx(ctx, W, H, src) {
    var px = Math.max(6, Math.round(W / 44)), sm = document.createElement("canvas");
    sm.width = Math.ceil(W / px); sm.height = Math.ceil(H / px);
    var sc = sm.getContext("2d"); sc.imageSmoothingQuality = "high"; sc.drawImage(src, 0, 0, sm.width, sm.height);
    var d = sc.getImageData(0, 0, sm.width, sm.height).data;
    function q(v) { return Math.round(Math.round(v / 255 * 5) / 5 * 255); }
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
    for (var y = 0; y < sm.height; y++) for (var x = 0; x < sm.width; x++) {
      var i = (y * sm.width + x) * 4;
      ctx.fillStyle = "rgb(" + q(d[i]) + "," + q(d[i + 1]) + "," + q(d[i + 2]) + ")";
      ctx.fillRect(x * px, y * px, px, px);
    }
    ctx.fillStyle = "rgba(0,0,0,.18)";
    for (var gx = 0; gx < W; gx += px) ctx.fillRect(gx, 0, 1, H);
    for (var gy = 0; gy < H; gy += px) ctx.fillRect(0, gy, W, 1);
  }
  /* code: the picture is made of hex, binary and symbols, with link lines and labels */
  function codeFx(ctx, W, H, data, sw, sh, lo, span) {
    var R = rng(21), cw = Math.max(6, Math.round(W / 50)), ch = Math.round(cw * 1.6), cols = Math.floor(W / cw), rows = Math.floor(H / ch);
    var hex = "0123456789ABCDEF", sym = "{}[]<>/=+;:#$%&*()_-|", cells = [], r, c;
    ctx.fillStyle = "#020806"; ctx.fillRect(0, 0, W, H);
    ctx.font = "bold " + Math.round(ch * .82) + "px 'IBM Plex Mono', monospace"; ctx.textBaseline = "top";
    for (r = 0; r < rows; r++) for (c = 0; c < cols; c++) {
      var L = lumAt(data, sw, sh, (c + .5) / cols, (r + .5) / rows, lo, span);
      if (L < .1) continue;
      var g = L > .72 ? hex.charAt(Math.floor(R() * 16)) : L > .4 ? sym.charAt(Math.floor(R() * sym.length)) : (R() < .5 ? "0" : "1");
      ctx.fillStyle = R() < .025 ? "#ff2e88" : "rgb(" + Math.round(L * L * 200) + "," + Math.round(90 + L * 165) + "," + Math.round(60 + L * 120) + ")";
      ctx.fillText(g, c * cw, r * ch);
      if (L > .75) cells.push([c * cw + cw / 2, r * ch + ch / 2]);
    }
    var tags = ["0xA3F1", "note://214", "ref:7c2e", "->still_here", "if(!you){", "link[07]", "sys.angel()", "0b1011", "goto(void)"], pts = [], k;
    for (k = 0; k < 9 && cells.length; k++) pts.push(cells[Math.floor(R() * cells.length)]);
    ctx.lineWidth = 1; ctx.strokeStyle = "rgba(125,255,160,.9)"; ctx.beginPath();
    pts.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); });
    ctx.stroke();
    ctx.font = Math.round(ch * .75) + "px 'IBM Plex Mono', monospace";
    pts.forEach(function (p, i) {
      var t = tags[i % tags.length], w = ctx.measureText(t).width + 8;
      var lx = Math.min(W - w - 2, Math.max(2, p[0] + 6)), ly = Math.max(2, Math.min(H - ch - 2, p[1] - ch - 4));
      ctx.fillStyle = "#020806"; ctx.fillRect(lx, ly, w, ch);
      ctx.strokeStyle = "#ff2e88"; ctx.strokeRect(lx + .5, ly + .5, w - 1, ch - 1);
      ctx.fillStyle = "#bfffd0"; ctx.fillText(t, lx + 4, ly + 2);
      ctx.fillStyle = "#ff2e88"; ctx.fillRect(p[0] - 2, p[1] - 2, 5, 5);
    });
  }
  /* sigil: clear dotted photo in silver on near-black, framed by thin mirrored chrome blades */
  function blade(ctx, x0, y0, x1, y1, bend, wd) {
    var dx = x1 - x0, dy = y1 - y0, mx = (x0 + x1) / 2 - dy * bend, my = (y0 + y1) / 2 + dx * bend, nx = -dy, ny = dx, nl = Math.sqrt(nx * nx + ny * ny) || 1;
    nx = nx / nl * wd; ny = ny / nl * wd;
    ctx.beginPath(); ctx.moveTo(x0 + nx, y0 + ny); ctx.quadraticCurveTo(mx + nx * .6, my + ny * .6, x1, y1);
    ctx.quadraticCurveTo(mx - nx * .25, my - ny * .25, x0 - nx * .5, y0 - ny * .5); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  function sigilFx(ctx, W, H, data, sw, sh, lo, span) {
    ctx.fillStyle = "#03030a"; ctx.fillRect(0, 0, W, H);
    var step = Math.max(4, Math.round(W / 80)), x, y;
    ctx.fillStyle = "#e4efff";
    for (y = 0; y < H; y += step) for (x = 0; x < W; x += step) {
      var L = lumAt(data, sw, sh, (x + step / 2) / W, (y + step / 2) / H, lo, span), r = step / 2 * Math.sqrt(L) * 1.05;
      if (r > .4) { ctx.beginPath(); ctx.arc(x + step / 2, y + step / 2, r, 0, 7); ctx.fill(); }
    }
    var g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "rgba(255,255,255,.5)"); g.addColorStop(.5, "rgba(120,210,255,.28)"); g.addColorStop(1, "rgba(255,255,255,.5)");
    ctx.fillStyle = g; ctx.strokeStyle = "#bfeaff"; ctx.lineWidth = Math.max(1, W / 300); ctx.shadowColor = "#19d3ff"; ctx.shadowBlur = 8;
    var B = [
      [.00, .50, .17, .12, .15, .035], [.00, .38, .23, .05, -.2, .03], [.00, .62, .21, .78, .2, .03],
      [.03, .30, .14, .02, -.25, .025], [.03, .72, .16, .98, .25, .025], [.00, .22, .20, -.02, .25, .03],
      [.00, .80, .22, 1.02, -.25, .03], [.02, .90, .2, .86, .1, .02], [.02, .10, .2, .16, -.1, .02]
    ];
    [false, true].forEach(function (m) {
      ctx.save(); if (m) { ctx.translate(W, 0); ctx.scale(-1, 1); }
      B.forEach(function (b) { blade(ctx, b[0] * W, b[1] * H, b[2] * W, b[3] * H, b[4], b[5] * W); });
      ctx.restore();
    });
    // vertical centre blades, top and bottom
    blade(ctx, W * .5, 0, W * .5, H * .08, 0, W * .03); blade(ctx, W * .5, H, W * .5, H * .93, 0, W * .03);
    ctx.shadowBlur = 0; ctx.fillStyle = "#ff2e88"; [[.5, .09], [.5, .91]].forEach(function (p) { ctx.fillRect(p[0] * W - 2, p[1] * H - 2, 5, 5); });
  }
  function treat(cv, mode, src, step) {
    var ctx = cv.getContext("2d"), W = cv.width, H = cv.height;
    if (mode === "orig") { ctx.drawImage(src, 0, 0, W, H); return; }
    if (mode === "pixel") { pixelFx(ctx, W, H, src); return; }
    var sw = src.width, sh = src.height, data = src.getContext("2d").getImageData(0, 0, sw, sh).data;
    var lv = levels(data), lo = lv[0], span = Math.max(1, lv[1] - lv[0]);
    if (mode === "code") { codeFx(ctx, W, H, data, sw, sh, lo, span); return; }
    if (mode === "sigil") { sigilFx(ctx, W, H, data, sw, sh, lo, span); return; }
    var ink = "#f4f4f4", paper = "#0a0a0a";
    if (mode === "phosphor") { ink = "#7dffa0"; paper = "#02120a"; }
    if (mode === "soft") { ink = "#7fe8ff"; paper = "#0a2fa8"; }
    ctx.fillStyle = paper; ctx.fillRect(0, 0, W, H); ctx.fillStyle = ink;
    step = step || Math.max(4, Math.round(W / 78));
    for (var y = 0; y < H; y += step) {
      for (var x = 0; x < W; x += step) {
        var sx = Math.min(sw - 1, Math.floor((x + step / 2) / W * sw)), sy = Math.min(sh - 1, Math.floor((y + step / 2) / H * sh));
        var i = (sy * sw + sx) * 4, L = ((data[i] * .3 + data[i + 1] * .59 + data[i + 2] * .11) - lo) / span;
        L = Math.max(0, Math.min(1, L));
        var r = (step / 2) * Math.sqrt(L) * 1.1;
        if (r > .4) { ctx.beginPath(); ctx.arc(x + step / 2, y + step / 2, r, 0, 7); ctx.fill(); }
      }
    }
    if (mode === "phosphor" || mode === "soft") {
      ctx.fillStyle = "rgba(0,0,0,.3)";
      for (var k = 0; k < H; k += 3) ctx.fillRect(0, k, W, 1);
    }
  }

  var FX_MODES = { halftone: 1, phosphor: 1, cyber: 1, pixel: 1, code: 1, sigil: 1 };
  var FX_NAME = { cyber: "soft" }; // "cyber" is the public word; the drawing mode is "soft"

  function fxWord(img) {
    var alt = (img.getAttribute("alt") || "").trim().toLowerCase();
    var word = alt.split(/[\s|,]+/)[0];
    return FX_MODES[word] ? word : null;
  }

  function applyFx(img, word) {
    var nw = img.naturalWidth, nh = img.naturalHeight;
    if (!nw || !nh || img.getAttribute("data-mh-done")) return;
    img.setAttribute("data-mh-done", "1");
    var host = img.closest("picture") || img, parent = host.parentNode;
    if (!parent) return;
    var box = parent.getBoundingClientRect ? parent.getBoundingClientRect().width : 0;
    var W = Math.max(320, Math.min(900, Math.round(box || img.width || 600))), H = Math.round(W * nh / nw);
    var sw = 300, sh = Math.max(1, Math.round(300 * nh / nw));
    var src = doc.createElement("canvas"); src.width = sw; src.height = sh;
    src.getContext("2d", { willReadFrequently: true }).drawImage(img, 0, 0, sw, sh);
    var cv = doc.createElement("canvas"); cv.width = W; cv.height = H;
    cv.setAttribute("role", "img");
    cv.setAttribute("aria-label", "Photograph with " + word + " effect. Click to see the original.");
    treat(cv, FX_NAME[word] || word, src);
    var fig = doc.createElement("figure");
    fig.className = "mh-fx"; fig.setAttribute("data-fx", word); fig.tabIndex = 0;
    var orig = doc.createElement("div"); orig.className = "mh-orig";
    parent.replaceChild(fig, host);
    orig.appendChild(host); fig.appendChild(cv); fig.appendChild(orig);
    var cap = doc.createElement("figcaption"); cap.textContent = "|" + word + "  (click for original)"; fig.appendChild(cap);
    function flip() { fig.classList.toggle("mh-show-orig"); }
    fig.addEventListener("click", flip);
    fig.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } });
  }

  function setupFx() {
    var imgs = $$(".cm-s-obsidian img").filter(function (img) { return fxWord(img); });
    if (!imgs.length) return;
    var io = ("IntersectionObserver" in window) ? new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        var img = en.target.tagName === "PICTURE" ? $("img", en.target) : en.target, word = img && fxWord(img);
        if (!img || !word) return;
        safe("photo effect", function () { applyFx(img, word); });
      });
    }, { rootMargin: "300px" }) : null;
    imgs.forEach(function (img) {
      var go = function () {
        if (io) io.observe(img.closest("picture") || img);
        else safe("photo effect", function () { applyFx(img, fxWord(img)); });
      };
      if (img.complete && img.naturalWidth) go(); else img.addEventListener("load", go, { once: true });
    });
  }

  /* Portrait and ID photo: drawn in whichever skin is on, redrawn when it changes. */
  var skinFxList = [];
  function skinMode() { return root.getAttribute("data-skin") === "cyber" ? "soft" : "phosphor"; }
  function drawSkinFx(it) { treat(it.cv, skinMode(), it.src, it.step); }
  function setupSkinFx() {
    $$("img.mh-skinfx").forEach(function (img) {
      var go = function () {
        safe("skin image", function () {
          var nw = img.naturalWidth, nh = img.naturalHeight;
          if (!nw || !nh || img.getAttribute("data-mh-done")) return;
          img.setAttribute("data-mh-done", "1");
          var host = img.closest("picture") || img, parent = host.parentNode, small = img.classList.contains("mh-idph");
          var W = small ? 84 : Math.max(320, Math.min(900, Math.round(parent.getBoundingClientRect().width || 480)));
          var H = Math.round(W * nh / nw), sw = small ? 90 : 300, sh = Math.max(1, Math.round(sw * nh / nw));
          var src = doc.createElement("canvas"); src.width = sw; src.height = sh;
          src.getContext("2d", { willReadFrequently: true }).drawImage(img, 0, 0, sw, sh);
          var cv = doc.createElement("canvas"); cv.width = W; cv.height = H;
          cv.setAttribute("role", "img"); cv.setAttribute("aria-label", img.getAttribute("alt") || "Portrait");
          parent.insertBefore(cv, host); host.style.display = "none";
          var it = { cv: cv, src: src, step: small ? 3 : null }; skinFxList.push(it); drawSkinFx(it);
          if (!small) cv.addEventListener("click", function () { var showing = host.style.display !== "none"; host.style.display = showing ? "none" : "block"; cv.style.display = showing ? "block" : "none"; host.onclick = function () { host.style.display = "none"; cv.style.display = "block"; }; });
        });
      };
      if (img.complete && img.naturalWidth) go(); else img.addEventListener("load", go, { once: true });
    });
    doc.addEventListener("mh-skin", function () { skinFxList.forEach(drawSkinFx); });
  }

  /* ---------- skin + calm ---------- */
  function setupSkin() {
    var btns = $$("[data-mh-skin]"), calm = $$("[data-mh-calm]");
    function paint() {
      var cyber = root.getAttribute("data-skin") === "cyber", c = root.hasAttribute("data-calm");
      btns.forEach(function (b) { b.textContent = "skin: " + (cyber ? "cyber blue" : "terminal"); b.setAttribute("aria-pressed", cyber ? "true" : "false"); });
      calm.forEach(function (b) { b.textContent = "calm: " + (c ? "on" : "off"); b.setAttribute("aria-pressed", c ? "true" : "false"); });
    }
    btns.forEach(function (b) {
      b.addEventListener("click", function () {
        if (root.getAttribute("data-skin") === "cyber") { root.removeAttribute("data-skin"); store("mh-skin", null); }
        else { root.setAttribute("data-skin", "cyber"); store("mh-skin", "cyber"); }
        paint(); doc.dispatchEvent(new Event("mh-skin"));
      });
    });
    calm.forEach(function (b) {
      b.addEventListener("click", function () {
        if (root.hasAttribute("data-calm")) { root.removeAttribute("data-calm"); store("mh-calm", null); }
        else { root.setAttribute("data-calm", "1"); store("mh-calm", "1"); }
        paint();
      });
    });
    paint();
  }

  /* ---------- timecode ---------- */
  function setupClock() {
    var el = $("#mh-tc"); if (!el) return;
    var t0 = Date.now();
    function p(n) { return (n < 10 ? "0" : "") + n; }
    function tick() {
      var d = Date.now() - t0, s = Math.floor(d / 1000);
      el.textContent = "00:" + p(Math.floor(s / 60) % 60) + ":" + p(s % 60) + ":" + p(Math.floor((d % 1000) / 40));
    }
    tick(); setInterval(tick, reduce ? 1000 : 80);
  }

  /* ---------- footnotes as marginalia ---------- */
  function setupSidenotes() {
    var section = $(".cm-s-obsidian .footnotes"); if (!section) return;
    $$(".cm-s-obsidian sup.footnote-ref a").forEach(function (a) {
      var id = (a.getAttribute("href") || "").replace(/^#/, ""); if (!id) return;
      var li = doc.getElementById(id); if (!li) return;
      var para = a.closest("p, li, blockquote"); if (!para || !para.parentNode) return;
      var note = doc.createElement("aside"); note.className = "mh-sidenote";
      var clone = li.cloneNode(true);
      $$(".footnote-backref", clone).forEach(function (x) { x.parentNode.removeChild(x); });
      var label = doc.createElement("b"); label.textContent = (a.textContent || "").replace(/[\[\]]/g, "") + " ";
      note.appendChild(label); note.insertAdjacentHTML("beforeend", clone.textContent.trim() ? clone.innerHTML.replace(/^<p>|<\/p>\s*$/g, "") : "");
      para.parentNode.insertBefore(note, para);
    });
  }

  /* ---------- player ---------- */
  function setupPlayer() {
    var box = $("#mh-player"); if (!box) return;
    var tracks = [], seen = {};
    function add(src, title) {
      if (!src || seen[src]) return; seen[src] = 1;
      tracks.push({ src: src, title: title || decodeURIComponent(src.split("?")[0].split("/").pop().replace(/\.[a-z0-9]+$/i, "")) });
    }
    // 1. site-wide playlist from the plugin settings: "Title|https://file.mp3; Title|https://file2.mp3"
    (box.getAttribute("data-playlist") || "").split(";").forEach(function (item) {
      item = item.trim(); if (!item) return;
      var parts = item.split("|");
      add((parts.length > 1 ? parts[1] : parts[0]).trim(), parts.length > 1 ? parts[0].trim() : "");
    });
    // 2. audio embedded or linked in the current note
    $$(".cm-s-obsidian audio").forEach(function (a) { add(a.currentSrc || a.getAttribute("src") || ($("source", a) && $("source", a).src)); });
    $$(".cm-s-obsidian a[href]").forEach(function (a) { if (/\.(mp3|m4a|ogg|wav|flac)(\?.*)?$/i.test(a.getAttribute("href"))) add(a.href, a.textContent.trim()); });
    // 3. nothing to play: a generated ambient track so the player always works
    if (!tracks.length) tracks.push({ gen: true, title: "ambient_demo (generated)" });

    var audio = new Audio(); audio.preload = "none";
    var idx = 0, playing = false, ctx = null, analyser = null, master = null, mediaSrc = null, gen = null, raf = 0, useWebAudio = false;
    var title = $("#mh-p-title"), playBtn = $("[data-mh-play]", box), eq = $("#mh-eq"), vol = $("#mh-vol");
    var saved = {};
    try { saved = JSON.parse(localStorage.getItem("mh-player") || "{}") || {}; } catch (e) { saved = {}; }
    if (vol && saved.v != null && !isNaN(+saved.v)) vol.value = saved.v;
    tracks.forEach(function (t, i) { if (saved.k && (t.src || "gen") === saved.k) idx = i; });
    useWebAudio = tracks.every(function (t) { if (t.gen) return true; try { return new URL(t.src, location.href).origin === location.origin; } catch (e) { return false; } });

    function key() { return tracks[idx].src || "gen"; }
    function save() { store("mh-player", JSON.stringify({ k: key(), t: audio.currentTime || 0, v: vol ? vol.value : 0.25, p: playing ? 1 : 0 })); }
    function volume() { return vol ? +vol.value : 0.25; }
    function applyVolume() { if (master) master.gain.value = volume() * 0.5; audio.volume = useWebAudio ? 1 : volume(); }
    function ensureCtx() {
      if (ctx) return true;
      var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
      ctx = new AC(); master = ctx.createGain(); analyser = ctx.createAnalyser(); analyser.fftSize = 64;
      master.connect(analyser); analyser.connect(ctx.destination);
      if (useWebAudio) { mediaSrc = ctx.createMediaElementSource(audio); mediaSrc.connect(master); }
      applyVolume(); return true;
    }
    function startGen() {
      stopGen();
      var f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 700; f.Q.value = 4;
      var o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      o1.type = "sawtooth"; o2.type = "triangle"; o1.frequency.value = 110; o2.frequency.value = 164.9; o2.detune.value = 7;
      lfo.frequency.value = 0.09; lg.gain.value = 380; lfo.connect(lg); lg.connect(f.frequency);
      o1.connect(f); o2.connect(f); f.connect(master); o1.start(); o2.start(); lfo.start();
      gen = [o1, o2, lfo, f];
    }
    function stopGen() { if (!gen) return; try { gen[0].stop(); gen[1].stop(); gen[2].stop(); gen[3].disconnect(); } catch (e) {} gen = null; }
    function bars() {
      if (!eq) return; var c = eq.getContext("2d"); c.clearRect(0, 0, eq.width, eq.height);
      var data = new Uint8Array(analyser ? analyser.frequencyBinCount : 16);
      if (analyser && (tracks[idx].gen || useWebAudio)) analyser.getByteFrequencyData(data);
      c.fillStyle = getComputedStyle(doc.body).getPropertyValue("--mh-cy").trim() || "#5dff8a";
      for (var i = 0; i < 12; i++) {
        var v = (analyser && (tracks[idx].gen || useWebAudio)) ? data[i] / 255 : (playing ? 0.25 + 0.5 * Math.abs(Math.sin(Date.now() / 220 + i)) : 0);
        var h = Math.max(2, v * eq.height); c.fillRect(i * 8 + 1, eq.height - h, 6, h);
      }
      raf = playing && !reduce ? requestAnimationFrame(bars) : 0;
    }
    function setPlaying(on) {
      playing = on; playBtn.innerHTML = on ? "&#10074;&#10074;" : "&#9654;"; playBtn.setAttribute("aria-pressed", on ? "true" : "false");
      if (on && !raf) bars(); save();
    }
    function load(i) {
      var was = playing; idx = (i + tracks.length) % tracks.length; title.textContent = tracks[idx].title;
      if (tracks[idx].gen) { audio.pause(); } else { stopGen(); audio.src = tracks[idx].src; }
      if (was) play();
    }
    function play() {
      var t = tracks[idx];
      if (t.gen) {
        if (!ensureCtx()) { setPlaying(false); return; }
        audio.pause(); if (ctx.state === "suspended") ctx.resume(); startGen(); setPlaying(true);
      } else {
        stopGen(); if (!audio.src) audio.src = t.src;
        try { if (useWebAudio) { ensureCtx(); if (ctx && ctx.state === "suspended") ctx.resume(); } } catch (e) {}
        applyVolume(); audio.play().then(function () { setPlaying(true); }).catch(function () { setPlaying(false); });
      }
    }
    function pause() { audio.pause(); stopGen(); setPlaying(false); }

    title.textContent = tracks[idx].title;
    if (!tracks[idx].gen) {
      audio.src = tracks[idx].src;
      if (saved.k === key() && saved.t > 1) audio.addEventListener("loadedmetadata", function () { try { audio.currentTime = saved.t; } catch (e) {} }, { once: true });
    }
    applyVolume();
    playBtn.addEventListener("click", function () { if (playing) pause(); else play(); });
    $("[data-mh-next]", box).addEventListener("click", function () { load(idx + 1); });
    $("[data-mh-prev]", box).addEventListener("click", function () { load(idx - 1); });
    if (vol) vol.addEventListener("input", function () { applyVolume(); save(); });
    audio.addEventListener("ended", function () { load(idx + 1); if (tracks.length > 1) play(); else setPlaying(false); });
    audio.addEventListener("error", function () { setPlaying(false); title.textContent = tracks[idx].title + " (could not load)"; });
    var last = 0; audio.addEventListener("timeupdate", function () { var n = Date.now(); if (n - last > 2000) { last = n; save(); } });
    window.addEventListener("pagehide", save);
    $$(".cm-s-obsidian audio").forEach(function (a) { a.addEventListener("play", function () { if (playing) pause(); }); });
    // Carry on across pages: browsers may refuse to start sound without a click, so this is best effort.
    if (saved.p) { try { play(); } catch (e) {} }
  }

  /* ---------- search button + page markers ---------- */
  function setupMisc() {
    $$("[data-mh-search]").forEach(function (a) {
      a.addEventListener("click", function (e) { e.preventDefault(); if (typeof window.toggleSearch === "function") window.toggleSearch(); });
    });
    var n = $$(".mh-latest li").length + 1;
    $$("[data-mh-count]").forEach(function (el) { el.textContent = ("000000" + n).slice(-6); });
    $$("[data-mh-dialog-close]").forEach(function (b) {
      b.addEventListener("click", function () { var d = b.closest("[data-mh-dialog]"); if (d) d.style.display = "none"; });
    });
    if ($(".mh-home")) doc.body.classList.add("mh-is-home");
    if ($(".mh-az, .mh-gal")) doc.body.classList.add("mh-is-az");
  }


  function setupBoot() {
    var home = $(".mh-home"); if (!home) return;
    var h1 = $(".cm-s-obsidian h1, .content h1, h1"); if (!h1 || $(".mh-boot")) return;
    var n = $$(".mh-latest li").length + 1;
    var pct = Math.min(100, 40 + n * 10);
    var bar = "[" + "#".repeat(Math.round(pct / 10)) + "-".repeat(10 - Math.round(pct / 10)) + "] " + pct + "%";
    var box = doc.createElement("div"); box.className = "mh-boot"; box.setAttribute("aria-hidden", "true");
    var mode = function () { return (doc.documentElement.getAttribute("data-skin") === "cyber") ? "chrome" : "terminal"; };
    var lines = ["> archive online // " + n + " notes published", "> memory index: building", "> memory: " + bar, "> mode: " + mode()];
    box.innerHTML = lines.map(function (l, i) { return "<div" + (i === 3 ? ' data-mh-mode' : "") + ">" + l + "</div>"; }).join("") + '<span class="mh-cur"></span>';
    h1.parentNode.insertBefore(box, h1.nextSibling);
    doc.addEventListener("mh-skin", function () { var m = $("[data-mh-mode]"); if (m) m.textContent = "> mode: " + mode(); });
    // press / to search, click portrait to cycle photos
    doc.addEventListener("keydown", function (e) {
      var t = e.target && e.target.tagName;
      if (e.key === "/" && t !== "INPUT" && t !== "TEXTAREA" && typeof window.toggleSearch === "function") { e.preventDefault(); window.toggleSearch(); }
    });
    var photos = ["/img/archive/photo-1.jpg", "/img/archive/photo-2.jpg", "/img/archive/photo-3.jpg", "/img/archive/photo-4.jpg"];
    var fig = $(".mh-portrait");
    if (fig) {
      fig.style.cursor = "pointer"; fig.title = "click to change photo";
      var i = 0;
      fig.addEventListener("click", function () {
        i = (i + 1) % photos.length;
        var old = fig.querySelector("canvas, img"); if (!old) return;
        var img = new Image(); img.className = "mh-skinfx"; img.alt = ""; img.width = 480;
        img.onload = function () { old.replaceWith(img); safe("skin images", setupSkinFx); };
        img.src = photos[i];
      });
    }
  }

  function start() {
    safe("skin", setupSkin); safe("clock", setupClock); safe("misc", setupMisc); safe("boot", setupBoot);
    safe("sidenotes", setupSidenotes); safe("player", setupPlayer); safe("skin images", setupSkinFx); safe("photo effects", setupFx);
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", start); else start();
})();
