/*
  Miss Hooch Archive: music visualiser.
  - A "viz" button in the bottom player opens a full-screen visualiser (Esc or the x closes it).
  - In a note, write  > [!visualiser]  (or [!viz]) to put a small one in the page.
  Both listen to the bottom-bar player. If the browser cannot read the sound (songs on another host
  without CORS), the picture is honestly labelled "simulated" and moves with the play state instead.
*/
(function () {
  "use strict";
  var doc = document, root = doc.documentElement;
  var MODES = ["bars", "wave", "radial", "spiral", "rings"];
  function el(t, c, h) { var e = doc.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; }
  function css(n, f) { var v = getComputedStyle(root).getPropertyValue(n).trim(); return v || f; }
  function pal() { return { bg: css("--mh-bg", "#040905"), fg: css("--mh-fg", "#bff5ca"), ac: css("--mh-accent", "#5dff8a"), hot: css("--mh-hot", "#ff6f91"), dim: css("--mh-dim", "#5f9e6f") }; }
  function calm() { return root.hasAttribute("data-calm") || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); }

  var fbuf = null, tbuf = null, sm = [], t0 = Date.now();
  function sample() {
    var A = window.mhAudio, an = A && A.analyser(), live = !!(A && A.live() && an), playing = !!(A && A.playing());
    var N = 64, f = new Array(N), w = new Array(128), i;
    if (live) {
      if (!fbuf || fbuf.length !== an.frequencyBinCount) { fbuf = new Uint8Array(an.frequencyBinCount); tbuf = new Uint8Array(an.fftSize); }
      an.getByteFrequencyData(fbuf); an.getByteTimeDomainData(tbuf);
      for (i = 0; i < N; i++) f[i] = fbuf[1 + Math.floor(Math.pow(i / N, 1.6) * (fbuf.length * 0.7))] / 255;
      for (i = 0; i < 128; i++) w[i] = (tbuf[Math.floor(i * tbuf.length / 128)] - 128) / 128;
    } else {
      var t = (Date.now() - t0) / 1000, amp = playing ? 1 : 0.06;
      for (i = 0; i < N; i++) f[i] = amp * Math.max(0, 0.55 * Math.sin(t * 2.1 + i * 0.37) * Math.sin(t * 0.7 + i * 0.11) + 0.35 * Math.sin(t * 3.3 - i * 0.2)) * (1 - i / N * 0.7);
      for (i = 0; i < 128; i++) w[i] = amp * 0.5 * Math.sin(i * 0.15 + t * 5) * Math.sin(i * 0.03 + t);
    }
    for (i = 0; i < N; i++) sm[i] = (sm[i] || 0) * 0.6 + f[i] * 0.4;
    return { f: sm.slice(), w: w, live: live, playing: playing };
  }

  function draw(ctx, W, H, mode, d, p, t) {
    ctx.globalAlpha = 1; ctx.fillStyle = p.bg; ctx.fillRect(0, 0, W, H);
    var f = d.f, N = f.length, cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2, i;
    var bass = (f[1] + f[2] + f[3] + f[4]) / 4;
    ctx.lineWidth = Math.max(1.5, W / 400);
    if (mode === "bars") {
      var bw = W / N;
      for (i = 0; i < N; i++) { var h = f[i] * H * 0.9; ctx.fillStyle = i % 5 === 0 ? p.hot : p.ac; ctx.globalAlpha = 0.45 + f[i] * 0.55; ctx.fillRect(i * bw + 1, H - h, bw - 2, h); ctx.fillRect(i * bw + 1, H - h - 4, bw - 2, 2); }
    } else if (mode === "wave") {
      ctx.strokeStyle = p.ac; ctx.beginPath();
      for (i = 0; i < 128; i++) { var x = i / 127 * W, y = cy + d.w[i] * H * 0.45; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke(); ctx.strokeStyle = p.hot; ctx.globalAlpha = 0.5; ctx.beginPath();
      for (i = 0; i < 128; i++) { var x2 = i / 127 * W, y2 = cy - d.w[i] * H * 0.3; i ? ctx.lineTo(x2, y2) : ctx.moveTo(x2, y2); }
      ctx.stroke();
    } else if (mode === "radial") {
      var r0 = R * 0.28 + bass * R * 0.12;
      for (i = 0; i < N; i++) { var a = i / N * Math.PI * 2 - Math.PI / 2, l = f[i] * R * 0.62 + 2; ctx.strokeStyle = i % 4 === 0 ? p.hot : p.ac; ctx.globalAlpha = 0.5 + f[i] * 0.5; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * (r0 + l), cy + Math.sin(a) * (r0 + l)); ctx.stroke(); }
      ctx.globalAlpha = 1; ctx.strokeStyle = p.dim; ctx.beginPath(); ctx.arc(cx, cy, r0 - 4, 0, Math.PI * 2); ctx.stroke();
    } else if (mode === "spiral") {
      var GA = 2.399963229728653, M = 220;
      for (i = 1; i < M; i++) { var e = f[Math.floor(i / M * N)] || 0, rr = Math.sqrt(i / M) * R * 0.92, an = i * GA + t * 0.15; ctx.fillStyle = i % 8 === 0 ? p.hot : p.ac; ctx.globalAlpha = 0.35 + e * 0.65; ctx.beginPath(); ctx.arc(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr, 1.5 + e * R * 0.05, 0, Math.PI * 2); ctx.fill(); }
    } else {
      for (i = 0; i < 9; i++) { var v = f[i * 5] || 0, rad = R * (0.12 + i * 0.1) * (1 + v * 0.35); ctx.strokeStyle = i % 3 === 0 ? p.hot : p.ac; ctx.globalAlpha = 0.3 + v * 0.7; ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.stroke(); }
    }
    ctx.globalAlpha = 1;
  }

  function make(host, big) {
    var wrap = el("div", "mh-viz" + (big ? " mh-viz-big" : ""));
    var cv = el("canvas", "mh-viz-cv"), bar = el("div", "mh-viz-bar"), name = el("span", "mh-viz-name", "no track"), note = el("span", "mh-viz-note", "");
    var mode = 0, btn = el("button", "mh-viz-mode", MODES[0]); btn.type = "button"; btn.title = "Change picture";
    btn.addEventListener("click", function () { mode = (mode + 1) % MODES.length; btn.textContent = MODES[mode]; });
    bar.appendChild(btn); bar.appendChild(name); bar.appendChild(note);
    wrap.appendChild(cv); wrap.appendChild(bar); host.appendChild(wrap);
    var raf = 0, vis = !big, io;
    function size() { var r = wrap.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = Math.max(100, Math.floor(r.width * dpr)); cv.height = Math.max(80, Math.floor((r.height - 28) * dpr)); }
    function frame() {
      raf = 0; if (!vis) return;
      var d = sample(), A = window.mhAudio;
      name.textContent = A ? A.title() : "no player";
      note.textContent = d.live ? (d.playing ? "live" : "paused") : (d.playing ? "simulated" : "idle");
      draw(cv.getContext("2d"), cv.width, cv.height, MODES[mode], d, pal(), (Date.now() - t0) / 1000);
      if (!calm() || !d.live) raf = requestAnimationFrame(frame); else setTimeout(function () { if (!raf && vis) raf = requestAnimationFrame(frame); }, 120);
    }
    function start() { if (!raf) raf = requestAnimationFrame(frame); }
    size(); window.addEventListener("resize", function () { size(); });
    if (!big && "IntersectionObserver" in window) { io = new IntersectionObserver(function (es) { vis = es[0].isIntersecting; if (vis) { size(); start(); } }); io.observe(wrap); } else { vis = true; start(); }
    doc.addEventListener("mh-skin", function () { start(); });
    return { start: start, size: size, stop: function () { vis = false; } };
  }

  function setup() {
    Array.prototype.slice.call(doc.querySelectorAll('.callout[data-callout="visualiser"], .callout[data-callout="viz"]')).forEach(function (c) {
      if (c.getAttribute("data-mh-done")) return; c.setAttribute("data-mh-done", "1");
      var h = el("div", "mh-viz-host"); c.parentNode.replaceChild(h, c); make(h, false);
    });
    var pl = doc.getElementById("mh-player"); if (!pl || pl.querySelector(".mh-viz-open")) return;
    var b = el("button", "mh-viz-open", "viz"); b.type = "button"; b.title = "Visualise the music"; b.setAttribute("aria-label", "Open music visualiser");
    pl.insertBefore(b, pl.querySelector(".mh-vol"));
    var ov = null, inst = null;
    function close() { if (!ov) return; inst.stop(); ov.remove(); ov = null; doc.removeEventListener("keydown", esc); b.focus(); }
    function esc(e) { if (e.key === "Escape") close(); }
    b.addEventListener("click", function () {
      if (ov) return close();
      ov = el("div", "mh-viz-ov"); ov.setAttribute("role", "dialog"); ov.setAttribute("aria-label", "Music visualiser");
      var x = el("button", "mh-viz-x", "x"); x.type = "button"; x.setAttribute("aria-label", "Close visualiser"); x.addEventListener("click", close);
      ov.appendChild(x); doc.body.appendChild(ov); inst = make(ov, true); inst.size(); inst.start();
      doc.addEventListener("keydown", esc); x.focus();
    });
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", setup); else setup();
  window.addEventListener("load", setup);
})();
