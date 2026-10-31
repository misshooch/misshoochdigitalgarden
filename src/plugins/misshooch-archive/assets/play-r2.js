/*
  Miss Hooch Archive: play components.
  Turns callouts written in Obsidian into little interactive things:
    > [!idcard] Name        a made-up ID card (key: value lines, optional photo)
    > [!fibonacci] 12       a golden spiral of 12 squares
    > [!fibpoem] Title      a poem; line length is checked against 1,1,2,3,5,8...
    > [!polaroid] Caption   a tilted photo
    > [!redacted] Title     text under black bars, click to reveal
    > [!oracle] Question    click to draw a random line
    > [!progress] Label     a loading bar (first line: a number 0 to 100)
    > [!countdown] Label    first line: a date like 2026-12-25
    > [!terminal] Title     lines typed out one by one
  Each one is wrapped so that if it fails, the plain callout stays as it was.
*/
(function () {
  "use strict";
  var doc = document, root = doc.documentElement;
  function $(s, r) { return (r || doc).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }
  function el(tag, cls, html) { var e = doc.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function hash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { var s = seed || 1; return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var FIB = [1, 1]; for (var f = 2; f < 40; f++) FIB.push(FIB[f - 1] + FIB[f - 2]);

  function parse(c, type) {
    var t = $(".callout-title-inner", c); var title = t ? t.textContent.trim() : "";
    if (title.toLowerCase() === type) title = "";
    var content = $(".callout-content", c), media = null, lines = [];
    if (content) {
      media = content.querySelector("picture, img");
      var copy = content.cloneNode(true);
      $$("picture, img", copy).forEach(function (n) { n.remove(); });
      $$("br", copy).forEach(function (b) { b.replaceWith("\n"); });
      $$("p, li, div", copy).forEach(function (n) { n.appendChild(doc.createTextNode("\n")); });
      lines = copy.textContent.split("\n").map(function (s) { return s.trim(); }).filter(Boolean);
    }
    return { title: title, lines: lines, media: media };
  }
  function kv(lines) {
    var pairs = [], rest = [];
    lines.forEach(function (l) { var i = l.indexOf(":"); if (i > 0 && i < 24) pairs.push([l.slice(0, i).trim(), l.slice(i + 1).trim()]); else rest.push(l); });
    return { pairs: pairs, rest: rest };
  }
  function swap(c, node) { c.parentNode.replaceChild(node, c); }
  function cssColor(v) { try { return window.CSS && CSS.supports("color", v) ? v : ""; } catch (e) { return ""; } }

  /* ---- ID card ---- */
  function barcode(seed) {
    var r = rng(seed), x = 0, out = "";
    while (x < 190) { var w = 1 + Math.floor(r() * 4), gap = 1 + Math.floor(r() * 3); out += '<rect x="' + x + '" y="0" width="' + w + '" height="26"/>'; x += w + gap; }
    return '<svg class="mh-id-bars" viewBox="0 0 190 26" preserveAspectRatio="none" aria-hidden="true" fill="currentColor">' + out + "</svg>";
  }
  function idcard(c) {
    var d = parse(c, "idcard"), p = kv(d.lines), name = d.title || "UNNAMED";
    var signal = "SIGNAL: ONLINE", note = "AUTHORISATION GRANTED TO THE AUTHOR. BUT WHAT IS AN AUTHOR? AND WHO PERMITS THEM TO SPEAK?", color = "", rows = "";
    p.pairs.forEach(function (kvp) {
      var k = kvp[0].toLowerCase();
      if (k === "signal") signal = kvp[1];
      else if (k === "note" || k === "auth" || k === "text") note = kvp[1];
      else if (k === "color" || k === "colour") color = cssColor(kvp[1]);
      else rows += "<dt>" + esc(kvp[0].toUpperCase()) + "</dt><dd>" + esc(kvp[1]) + "</dd>";
    });
    if (p.rest.length) note = p.rest.join(" ");
    var seed = hash(name), no = ("000000" + (seed % 1000000)).slice(-6);
    var card = el("div", "mh-play mh-id");
    if (color) card.style.setProperty("--mh-play", color);
    card.innerHTML = '<div class="mh-id-h"><span>' + esc(name) + "</span><span>" + esc(signal) + '</span></div><div class="mh-id-b"><div class="mh-id-ph"></div><dl><dt>NAME</dt><dd>' + esc(name) + "</dd>" + rows + '</dl></div><p class="mh-id-t">' + esc(note) + "</p>" + barcode(seed) + '<div class="mh-id-no">No. ' + no + "</div>";
    var ph = $(".mh-id-ph", card);
    if (d.media) ph.appendChild(d.media); else ph.textContent = name.charAt(0).toUpperCase();
    swap(c, card);
  }

  /* ---- Fibonacci spiral ---- */
  function spiralRects(n) {
    var r = [], x0 = 0, y0 = 0, x1 = 0, y1 = 0;
    for (var i = 0; i < n; i++) {
      var s = FIB[i], x, y;
      if (i === 0) { x = 0; y = 0; x1 = 1; y1 = 1; }
      else if (i === 1) { x = x1; y = y0; x1 = x + s; }
      else {
        var dir = ["bottom", "right", "top", "left"][i % 4];
        if (dir === "top") { x = x0; y = y0 - s; y0 = y; }
        else if (dir === "left") { x = x0 - s; y = y0; x0 = x; }
        else if (dir === "bottom") { x = x0; y = y1; y1 = y + s; }
        else { x = x1; y = y0; x1 = x + s; }
      }
      r.push({ x: x, y: y, s: s, dir: ["bottom", "right", "top", "left"][i % 4] });
    }
    return { rects: r, x0: x0, y0: y0, x1: x1, y1: y1 };
  }
  var spirals = [];
  function drawSpiral(cv, n) {
    var g = spiralRects(n), W = cv.width, H = cv.height, pad = 8;
    var cs = getComputedStyle(cv), acc = cs.getPropertyValue("--mh-accent").trim() || "#5dff8a", dim = cs.getPropertyValue("--mh-dim").trim() || "#5f9e6f", fg = cs.getPropertyValue("--mh-fg").trim() || "#bff5ca";
    if (root.getAttribute("data-skin") === "cyber") { acc = "#4f8dff"; dim = "#4a6fc4"; fg = "#d6e4ff"; }
    var k = Math.min((W - pad * 2) / (g.x1 - g.x0), (H - pad * 2) / (g.y1 - g.y0));
    var ox = (W - (g.x1 - g.x0) * k) / 2 - g.x0 * k, oy = (H - (g.y1 - g.y0) * k) / 2 - g.y0 * k;
    var ctx = cv.getContext("2d"); ctx.clearRect(0, 0, W, H); ctx.lineWidth = 1; ctx.strokeStyle = dim;
    g.rects.forEach(function (q) { ctx.strokeRect(ox + q.x * k, oy + q.y * k, q.s * k, q.s * k); });
    ctx.fillStyle = fg; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    g.rects.forEach(function (q) { var px = q.s * k; if (px > 14) { ctx.font = Math.max(9, Math.min(px / 3, 30)) + "px monospace"; ctx.fillText(String(q.s), ox + (q.x + q.s / 2) * k, oy + (q.y + q.s / 2) * k); } });
    ctx.strokeStyle = acc; ctx.lineWidth = 2; ctx.shadowColor = acc; ctx.shadowBlur = 6; ctx.beginPath();
    g.rects.forEach(function (q) {
      var cx, cy, a0, a1, s = q.s * k, x = ox + q.x * k, y = oy + q.y * k;
      if (q.dir === "bottom") { cx = x + s; cy = y; a0 = Math.PI; a1 = Math.PI / 2; }
      else if (q.dir === "right") { cx = x; cy = y; a0 = Math.PI / 2; a1 = 0; }
      else if (q.dir === "top") { cx = x; cy = y + s; a0 = 0; a1 = -Math.PI / 2; }
      else { cx = x + s; cy = y + s; a0 = -Math.PI / 2; a1 = -Math.PI; }
      ctx.arc(cx, cy, s, a0, a1, true);
    });
    ctx.stroke(); ctx.shadowBlur = 0;
  }
  function fibonacci(c) {
    var d = parse(c, "fibonacci"), n = parseInt((d.title.match(/\d+/) || d.lines.join(" ").match(/\d+/) || [10])[0], 10);
    n = Math.max(3, Math.min(n, 20));
    var box = el("div", "mh-play mh-fib"), cv = el("canvas"); cv.width = 640; cv.height = 400; cv.setAttribute("role", "img"); cv.setAttribute("aria-label", "Golden spiral of " + n + " squares");
    var label = el("p", "mh-fib-seq", FIB.slice(0, n).join(", ") + ' <span>&rarr; ratio ' + (FIB[n - 1] / FIB[n - 2]).toFixed(5) + "</span>");
    box.appendChild(cv); box.appendChild(label); swap(c, box); drawSpiral(cv, n); spirals.push([cv, n]);
  }

  /* ---- Fibonacci poem ---- */
  function fibpoem(c) {
    var d = parse(c, "fibpoem"), box = el("div", "mh-play mh-fibpoem");
    if (d.title) box.appendChild(el("h3", "mh-play-t", esc(d.title)));
    d.lines.forEach(function (l, i) {
      var words = l.split(/\s+/).length, want = FIB[Math.min(i, FIB.length - 1)];
      var row = el("div", "mh-fp-row" + (words === want ? " is-fib" : ""));
      row.style.fontSize = (0.95 + Math.min(i, 8) * 0.14) + "em";
      row.innerHTML = '<span class="mh-fp-n" title="words in this line / the Fibonacci number for this line">' + words + "/" + want + '</span><span class="mh-fp-l">' + esc(l) + "</span>";
      box.appendChild(row);
    });
    box.appendChild(el("p", "mh-play-hint", "Each line is counted. Green means it has exactly the Fibonacci number of words."));
    swap(c, box);
  }

  /* ---- polaroid ---- */
  function polaroid(c) {
    var d = parse(c, "polaroid"), box = el("figure", "mh-play mh-pol"), seed = hash(d.title + d.lines.join(""));
    box.style.setProperty("--tilt", (((seed % 70) - 35) / 10).toFixed(1) + "deg");
    var ph = el("div", "mh-pol-ph"); if (d.media) ph.appendChild(d.media);
    box.appendChild(ph); box.appendChild(el("figcaption", "", esc(d.title || d.lines[0] || "")));
    swap(c, box);
  }

  /* ---- redacted ---- */
  function redacted(c) {
    var d = parse(c, "redacted"), box = el("div", "mh-play mh-red", '<div class="mh-red-h">CLASSIFIED' + (d.title ? " // " + esc(d.title) : "") + " <small>click to declassify</small></div>");
    d.lines.forEach(function (l) { box.appendChild(el("p", "", l.split(/(\s+)/).map(function (w) { return /^\s+$/.test(w) ? w : '<span class="mh-bar">' + esc(w) + "</span>"; }).join(""))); });
    box.addEventListener("click", function () { box.classList.toggle("is-open"); });
    swap(c, box);
  }

  /* ---- oracle ---- */
  function oracle(c) {
    var d = parse(c, "oracle"), box = el("div", "mh-play mh-orc"), out = el("p", "mh-orc-a", "&nbsp;"), btn = el("button", "mh-orc-b", "ask"), last = -1;
    btn.type = "button"; if (!d.lines.length) d.lines = ["The archive has no answers yet."];
    box.appendChild(el("p", "mh-orc-q", esc(d.title || "Ask the archive"))); box.appendChild(out); box.appendChild(btn);
    btn.addEventListener("click", function () {
      var i; do { i = Math.floor(Math.random() * d.lines.length); } while (d.lines.length > 1 && i === last); last = i;
      var text = d.lines[i], n = 0; out.textContent = ""; if (reduce) { out.textContent = text; return; }
      var t = setInterval(function () { out.textContent = text.slice(0, ++n); if (n >= text.length) clearInterval(t); }, 22);
    });
    swap(c, box);
  }

  /* ---- progress ---- */
  function progress(c) {
    var d = parse(c, "progress"), n = Math.max(0, Math.min(100, parseFloat((d.lines[0] || "50").replace(/[^\d.]/g, "")) || 0)), cells = Math.round(n / 10);
    var box = el("div", "mh-play mh-prog", "<span>" + esc(d.title || "loading") + "</span><code>[" + "#".repeat(cells) + "-".repeat(10 - cells) + "] " + Math.round(n) + "%</code>");
    if (d.lines[1]) box.appendChild(el("small", "", esc(d.lines.slice(1).join(" "))));
    swap(c, box);
  }

  /* ---- countdown ---- */
  function countdown(c) {
    var d = parse(c, "countdown"), when = new Date((d.lines[0] || "").replace(/\s+/g, "T")), box = el("div", "mh-play mh-cd"), out = el("code", "mh-cd-n");
    box.appendChild(el("span", "", esc(d.title || "countdown"))); box.appendChild(out);
    function tick() {
      if (isNaN(when.getTime())) { out.textContent = "use a date like 2026-12-25"; return; }
      var ms = when - new Date(), sign = ms < 0 ? "T+ " : "T- "; ms = Math.abs(ms);
      var dd = Math.floor(ms / 864e5), hh = Math.floor(ms % 864e5 / 36e5), mm = Math.floor(ms % 36e5 / 6e4), ss = Math.floor(ms % 6e4 / 1e3);
      out.textContent = sign + dd + "d " + ("0" + hh).slice(-2) + "h " + ("0" + mm).slice(-2) + "m " + ("0" + ss).slice(-2) + "s";
    }
    tick(); setInterval(tick, 1000); swap(c, box);
  }

  /* ---- terminal ---- */
  function terminal(c) {
    var d = parse(c, "terminal"), box = el("div", "mh-play mh-term"), pre = el("pre"); box.appendChild(el("div", "mh-term-h", esc(d.title || "terminal")));
    box.appendChild(pre); var full = d.lines.map(function (l) { return "> " + l; }).join("\n"); swap(c, box);
    if (reduce || !("IntersectionObserver" in window)) { pre.textContent = full; return; }
    var started = false; new IntersectionObserver(function (es, io) {
      if (started || !es[0].isIntersecting) return; started = true; io.disconnect(); var n = 0;
      var t = setInterval(function () { pre.textContent = full.slice(0, ++n) + (n < full.length ? "█" : ""); if (n >= full.length) clearInterval(t); }, 24);
    }).observe(box);
  }

  var MAKERS = { idcard: idcard, fibonacci: fibonacci, fibpoem: fibpoem, polaroid: polaroid, redacted: redacted, oracle: oracle, progress: progress, countdown: countdown, terminal: terminal };
  function start() {
    $$(".callout[data-callout]").forEach(function (c) {
      var type = (c.getAttribute("data-callout") || "").toLowerCase(), fn = MAKERS[type];
      if (!fn) return;
      try { fn(c); } catch (e) { if (window.console) console.warn("[misshooch play] " + type + " skipped:", e); }
    });
    doc.addEventListener("mh-skin", function () { spirals.forEach(function (s) { drawSpiral(s[0], s[1]); }); });
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", start); else start();
})();
