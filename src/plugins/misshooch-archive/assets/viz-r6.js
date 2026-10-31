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
  var MODES = ["pulse", "loops", "ridges", "text", "arcs", "spiral", "radial", "spectrogram"];
  function esc(z) { return String(z).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }
  function el(t, c, h) { var e = doc.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; }
  function css(n, f) { var v = getComputedStyle(root).getPropertyValue(n).trim(); return v || f; }
  var PASSAGE = "I am because you are. Not simply because you recognise me, love me, or bear witness to my existence, but because the very possibility of my being a self depends upon the existence of another. We are not born into the world as complete and autonomous subjects who subsequently enter into relationships; rather, it is through these relationships that we come to exist as ourselves. The other is not an addition to the self but one of its fundamental conditions. Descartes' I think, therefore I am establishes the certainty of consciousness, but it cannot account for the emergence of the consciousness that thinks. Hegel understood that self-consciousness requires recognition by another consciousness, and herein lies the extraordinary contradiction of human existence: to become myself, I must encounter someone who is not me. My independence is made possible by my dependence; my individuality is constituted through the very thing that distinguishes me from another. Lacan takes this contradiction further, suggesting that the ego is born through identification with an image outside itself, that what we experience as our most intimate and indivisible identity is already inhabited by something foreign. We are, from the beginning, strangers to ourselves. Merleau-Ponty reveals that this entanglement is not confined to consciousness or language but extends into the body itself. We do not merely observe the suffering, pleasure, movement or tenderness of another; we experience their gestures through the possibilities of our own flesh. The body reaches beyond the apparent limits of its skin. Derrida's philosophy of difference makes the separation between self and other more profound still: identity cannot exist without that which it excludes, and the meaning of the self is forever dependent upon what lies beyond it. In Becoming Others, Siri Hustvedt approaches this extraordinary intimacy through embodiment, imagination and intersubjectivity, exploring the ways another person's experience can enter our own without ever becoming entirely ours. We are capable of feeling with another, of imaginatively inhabiting another life, of being transformed by a consciousness we can never fully possess. This is perhaps the most beautiful and unbearable paradox of intimacy: the person who makes me more completely myself must always remain someone other than me. To love another is not to abolish the distance between us, but to discover that this distance is precisely what makes our encounter possible. I cannot become you, and yet I cannot remain entirely who I was before knowing you. Something of you enters the architecture of my consciousness; your existence changes the conditions of my own. Even in your absence, I carry the alterations produced by your presence. The self is not a sealed interior, untouched by the world, but an accumulation of encounters, recognitions, losses, desires and transformations. We are continually becoming through one another, and every intimacy leaves us irreversibly changed. To say I am because you are is therefore not merely to make a declaration of affection. It is to acknowledge something far more radical: that the boundaries of my existence do not coincide with the boundaries of my body, that what I call myself has always been constituted through what is not myself, and that to encounter another person is to risk the transformation of one's very being. I do not love you because I am incomplete and require you to make me whole. I love you because your existence reveals that I was never separate from the world to begin with. You are not mine, and I am not yours, but something of who I am exists only because you have existed. The tragedy and the miracle are the same: we can never entirely belong to one another, and yet we can never entirely disentangle ourselves from those we have loved.";
  var SENTENCES = PASSAGE.match(/[^.;:?!]+[.;:?!]?/g).map(function (z) { return z.trim(); }).filter(Boolean);
  var THEMES = [
    { n: "viridis", ac: "#5ee67a", hot: "#c8e84a", fg: "#d8f5e0", dim: "#1f8a7a", bg: "#03050f" },
    { n: "oscilloscope", ac: "#3de6ff", hot: "#ffffff", fg: "#d8fbff", dim: "#17788a", bg: "#000508" },
    { n: "lightpaint", ac: "#2f8bff", hot: "#7fe7ff", fg: "#cfe6ff", dim: "#123a7a", bg: "#00030a" },
    { n: "bone", ac: "#e8dcb0", hot: "#ffffff", fg: "#f2ead0", dim: "#7d7355", bg: "#050505" },
    { n: "mono", ac: "#ffffff", hot: "#9a9a9a", fg: "#ffffff", dim: "#666666", bg: "#000000" }
  ];
  var theme = 0; try { theme = Math.min(THEMES.length - 1, parseInt(localStorage.getItem("mh-viz-theme"), 10) || 0); } catch (e) {}
  function pal() { return THEMES[theme]; }
  function base() { return { bg: css("--mh-bg", "#040905"), fg: css("--mh-fg", "#bff5ca"), ac: css("--mh-accent", "#5dff8a"), hot: css("--mh-hot", "#ff6f91"), dim: css("--mh-dim", "#5f9e6f") }; }
  function calm() { return root.hasAttribute("data-calm") || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); }

  var rows = [], fbuf = null, tbuf = null, sm = [], t0 = Date.now();
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

  var VIR = [[3, 5, 15], [68, 1, 84], [49, 104, 142], [33, 145, 140], [53, 183, 121], [144, 215, 67], [253, 231, 37]];
  function viridis(v) { v = Math.max(0, Math.min(1, v)) * (VIR.length - 1); var i = Math.min(VIR.length - 2, Math.floor(v)), k = v - i, a = VIR[i], b = VIR[i + 1]; return "rgb(" + Math.round(a[0] + (b[0] - a[0]) * k) + "," + Math.round(a[1] + (b[1] - a[1]) * k) + "," + Math.round(a[2] + (b[2] - a[2]) * k) + ")"; }
  var lastMode = "";
  function draw(ctx, W, H, mode, d, p, t) {
    if (mode === "spectrogram") {
      // A scrolling picture of sound over time: time runs left to right, low notes at the bottom.
      var step = Math.max(2, Math.round(W / 420)), N2 = d.f.length;
      if (lastMode !== mode) { ctx.fillStyle = viridis(0); ctx.fillRect(0, 0, W, H); }
      lastMode = mode;
      ctx.globalAlpha = 1; ctx.drawImage(ctx.canvas, -step, 0);
      for (var k = 0; k < N2; k++) { ctx.fillStyle = viridis(Math.pow(d.f[k], 1.25) * 0.95); ctx.fillRect(W - step, H - (k + 1) * H / N2, step, Math.ceil(H / N2) + 1); }
      return;
    }
    if (mode === "loops") {
      // Light painting: a looping line drawn from the sound, with trails that slowly fade.
      var first = lastMode !== mode; lastMode = mode;
      ctx.globalCompositeOperation = "destination-out"; ctx.globalAlpha = first ? 1 : (calm() ? 0.3 : 0.09); ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
      var cx = W / 2, cy = H / 2, f3 = d.f, lo = (f3[1] + f3[2] + f3[3]) / 3, mid = (f3[10] + f3[14] + f3[18]) / 3, hi = (f3[30] + f3[40]) / 2, Rl = Math.min(W, H) * 0.42, ph = t * 0.35;
      ctx.globalCompositeOperation = "lighter"; ctx.lineWidth = Math.max(1, W / 700); ctx.shadowColor = p.ac; ctx.shadowBlur = 8;
      for (var L = 0; L < 3; L++) {
        ctx.strokeStyle = L === 1 ? p.hot : p.ac; ctx.globalAlpha = 0.55; ctx.beginPath();
        for (var q = 0; q <= 220; q++) {
          var u = q / 220 * Math.PI * 2, wv = d.w[(q * 128 / 220 | 0) % 128] || 0;
          var rr = Rl * (0.55 + 0.25 * Math.sin(u * (3 + L) + ph) + wv * 0.5 + lo * 0.3);
          var xx = cx + Math.cos(u * (2 + L) + ph * (L + 1)) * rr * (1 + mid * 0.5), yy = cy + Math.sin(u * (3 + L) - ph) * rr * (1 + hi * 0.8);
          q ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
        }
        ctx.stroke();
      }
      ctx.shadowBlur = 0; ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
      return;
    }
    lastMode = mode;
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; ctx.clearRect(0, 0, W, H);
    var f = d.f, N = f.length, cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2, i;
    var bass = (f[1] + f[2] + f[3] + f[4]) / 4;
    ctx.lineWidth = Math.max(1.5, W / 400);
    if (mode === "pulse") {
      // A waveform with swelling knots along a line, inside broken rings that open and close.
      ctx.shadowColor = p.ac; ctx.shadowBlur = 10; ctx.strokeStyle = p.fg; ctx.globalAlpha = 0.9;
      for (var sg = -1; sg <= 1; sg += 2) {
        ctx.beginPath();
        for (i = 0; i <= 160; i++) { var dist = Math.abs(i / 160 - 0.5) * 2, kk = Math.min(N - 1, Math.floor(Math.pow(dist, 1.2) * 40)), amp = f[kk] * H * 0.2 * (0.35 + dist), bump = Math.abs(Math.sin(i * 0.5)) * amp + (d.w[i % 128] || 0) * H * 0.02; var px = i / 160 * W; i ? ctx.lineTo(px, cy + sg * bump) : ctx.moveTo(px, cy + sg * bump); }
        ctx.stroke();
      }
      for (i = 0; i < 6; i++) { var e2 = f[2 + i * 4] || 0, r2 = R * (0.18 + i * 0.13) * (1 + e2 * 0.18), a0 = t * (0.25 + i * 0.07) * (i % 2 ? -1 : 1) + i, gap = 0.5 + (1 - e2) * 1.3; ctx.strokeStyle = i % 2 ? p.ac : p.fg; ctx.globalAlpha = 0.45 + e2 * 0.5; ctx.beginPath(); ctx.arc(cx, cy, r2, a0, a0 + Math.PI * 2 - gap); ctx.stroke(); }
      ctx.shadowBlur = 0;
    } else if (mode === "ridges" || mode === "text") {
      // Columns of dots that bend with each moment of sound, so time becomes a bumpy profile.
      rows.push(d.f.slice()); if (rows.length > 60) rows.shift();
      var gx = W * 0.8 / 60, base = W * 0.12, dots = 90;
      if (mode === "text") {
        var lines = (window.mhVizText && window.mhVizText.length) ? window.mhVizText : SENTENCES, fs = Math.max(12, Math.round(H / 26)), off = (t * fs * 1.2) % (fs * 2);
        ctx.font = fs + "px " + css("--mh-mono", "monospace"); ctx.fillStyle = p.dim; ctx.globalAlpha = 0.85; ctx.textBaseline = "top";
        for (var ty = -2, ln = 0; ty * fs * 1.4 < H; ty++, ln++) ctx.fillText(lines[ln % lines.length].toUpperCase(), W * 0.03, ty * fs * 1.4 + (off % (fs * 1.4)));
        ctx.fillStyle = p.ac;
      } else ctx.fillStyle = p.fg;
      for (var c = 0; c < rows.length; c++) {
        var row = rows[c], x0 = base + (c + 60 - rows.length) * gx;
        ctx.globalAlpha = 0.35 + 0.65 * c / rows.length;
        for (var k2 = 0; k2 < dots; k2++) { var v2 = row[Math.floor(Math.pow(1 - k2 / dots, 1.5) * (N - 1))] || 0, yy2 = H * 0.05 + k2 / dots * H * 0.9, sh = Math.sin(k2 * 0.35 + c * 0.2) * 3, edge = Math.sin(k2 / dots * Math.PI); ctx.fillRect(x0 + v2 * gx * 9 * edge + sh - 1, yy2 - 1, Math.max(2, W / 450), Math.max(2, W / 450)); }
      }
    } else if (mode === "arcs") {
      // Hanging curves rising to marked peaks, one per band of sound.
      var M = 11, pk = [];
      for (i = 0; i < M; i++) { var vv = f[Math.floor(1 + i / M * 40)] || 0, ax = W * (0.06 + 0.88 * i / (M - 1)), ah = H * (0.12 + vv * 0.8); pk.push([ax, H - ah]); }
      ctx.lineWidth = Math.max(1, W / 900); ctx.strokeStyle = p.ac;
      for (i = 0; i < M; i++) for (var fan = 1; fan <= 8; fan++) { var sp = fan * W * 0.012, A = pk[i]; ctx.globalAlpha = 0.18 + 0.05 * (9 - fan); ctx.beginPath(); ctx.moveTo(A[0] - sp * 3, H); ctx.quadraticCurveTo(A[0] - sp * 0.4, A[1] + (H - A[1]) * 0.35, A[0], A[1]); ctx.quadraticCurveTo(A[0] + sp * 0.4, A[1] + (H - A[1]) * 0.35, A[0] + sp * 3, H); ctx.stroke(); }
      ctx.globalAlpha = 0.8; ctx.strokeStyle = p.hot; ctx.beginPath(); pk.forEach(function (a, n) { n ? ctx.lineTo(a[0], a[1]) : ctx.moveTo(a[0], a[1]); }); ctx.stroke();
      ctx.strokeStyle = p.fg; ctx.globalAlpha = 1;
      pk.forEach(function (a) { var m = Math.max(5, W / 120); ctx.beginPath(); ctx.moveTo(a[0] - m, a[1]); ctx.lineTo(a[0] + m, a[1]); ctx.moveTo(a[0], a[1] - m); ctx.lineTo(a[0], a[1] + m); ctx.stroke(); });
    } else if (mode === "bars") {
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
    var cb = el("button", "mh-viz-mode", THEMES[theme].n); cb.type = "button"; cb.title = "Change colours";
    cb.addEventListener("click", function () { theme = (theme + 1) % THEMES.length; cb.textContent = THEMES[theme].n; try { localStorage.setItem("mh-viz-theme", theme); } catch (e) {} });
    bar.appendChild(btn); bar.appendChild(cb); bar.appendChild(name); bar.appendChild(note);
    var bg = el("div", "mh-viz-bgtext"), inner = el("div", "mh-viz-bgin");
    var txt = (window.mhVizText && window.mhVizText.length) ? window.mhVizText.join(" ") : PASSAGE;
    inner.innerHTML = "<p>" + esc(txt) + "</p><p>" + esc(txt) + "</p>"; bg.appendChild(inner); wrap.appendChild(bg);
    wrap.appendChild(cv); wrap.appendChild(bar); host.appendChild(wrap);
    var raf = 0, vis = !big, io;
    function size() { var r = wrap.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = Math.max(100, Math.floor(r.width * dpr)); cv.height = Math.max(80, Math.floor((r.height - 28) * dpr)); }
    function frame() {
      raf = 0; if (!vis) return;
      var d = sample(), A = window.mhAudio;
      name.textContent = A ? A.title() : "no player";
      note.textContent = d.live ? (d.playing ? "live" : "paused") : (d.playing ? "simulated" : "idle");
      var pp = pal(); wrap.style.background = pp.bg; bg.style.color = pp.dim; bg.style.display = (MODES[mode] === "spectrogram" || MODES[mode] === "text") ? "none" : "";
      bg.classList.toggle("still", calm());
      draw(cv.getContext("2d"), cv.width, cv.height, MODES[mode], d, pp, (Date.now() - t0) / 1000);
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
      var tx = (c.querySelector(".callout-content") || {}).innerText; if (tx && tx.trim()) window.mhVizText = tx.split(/\n+/).map(function (z) { return z.trim(); }).filter(Boolean);
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
