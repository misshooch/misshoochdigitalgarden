/*
  Miss Hooch Archive: sacred geometry, topology and polymath tools.
  Written in Obsidian as callouts:
    > [!flower] 3          Flower of Life, 3 rings
    > [!phyllotaxis] 800   a sunflower spiral from the golden angle
    > [!mandala] any words a mandala grown from the words
    > [!ulam] 41           the Ulam spiral of prime numbers
    > [!pascal] 16         Pascal's triangle (add a line "mod 2" for Sierpinski)
    > [!collatz] 27        the hailstone path of a number
    > [!mobius]            a turning Mobius band
    > [!knot] 3,2          a turning torus knot (3,2 is the trefoil)
    > [!graph] Bridges     lines like "A - B"; says whether you can walk every edge once
    > [!number] 144        facts about a number
    > [!gematria] words    letter values added up
    > [!timeline] Title    lines like "1666: the plague year"
  Each is wrapped so that if one fails, the plain callout stays.
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
  var PHI = (1 + Math.sqrt(5)) / 2, TAU = Math.PI * 2;

  function parse(c, type) {
    var t = $(".callout-title-inner", c), title = t ? t.textContent.trim() : "";
    if (title.toLowerCase() === type) title = "";
    var content = $(".callout-content", c), lines = [];
    if (content) {
      var copy = content.cloneNode(true);
      $$("br", copy).forEach(function (b) { b.replaceWith("\n"); });
      $$("p, li, div", copy).forEach(function (n) { n.appendChild(doc.createTextNode("\n")); });
      lines = copy.textContent.split("\n").map(function (s) { return s.trim(); }).filter(Boolean);
    }
    return { title: title, lines: lines, all: [title].concat(lines).join(" ").trim() };
  }
  function firstNum(d, def, lo, hi) { var m = d.all.match(/-?\d+/); var n = m ? parseInt(m[0], 10) : def; return Math.max(lo, Math.min(hi, n)); }
  function swap(c, node) { c.parentNode.replaceChild(node, c); }

  /* ---- canvases that follow the skin ---- */
  var redraws = [];
  function pal() {
    if (root.getAttribute("data-skin") === "cyber") return { acc: "#4f8dff", dim: "#4a6fc4", fg: "#d6e4ff", bg: "#06163a", hot: "#19d3ff" };
    return { acc: "#5dff8a", dim: "#3f8a55", fg: "#bff5ca", bg: "#000", hot: "#ff6f91" };
  }
  function canvasBox(cls, w, h, caption) {
    var box = el("div", "mh-play mh-cv mh-" + cls), cv = el("canvas"); cv.width = w; cv.height = h; cv.setAttribute("role", "img");
    box.appendChild(cv); if (caption) box.appendChild(el("p", "mh-cv-cap", caption));
    return { box: box, cv: cv };
  }
  function paint(cv, fn) {
    var run = function () { var ctx = cv.getContext("2d"), p = pal(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.fillStyle = p.bg; ctx.fillRect(0, 0, cv.width, cv.height); fn(ctx, cv.width, cv.height, p); };
    run(); redraws.push(run); return run;
  }
  function spin(cv, fn) { // animated 3D drawings: fn(ctx, W, H, p, angle)
    var angle = 0.6, visible = true, running = false;
    function frame() {
      var ctx = cv.getContext("2d"), p = pal(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = p.bg; ctx.fillRect(0, 0, cv.width, cv.height); fn(ctx, cv.width, cv.height, p, angle);
      if (visible && !reduce && !root.hasAttribute("data-calm")) { angle += 0.012; requestAnimationFrame(frame); } else running = false;
    }
    function go() { if (!running) { running = true; requestAnimationFrame(frame); } }
    frame(); redraws.push(function () { frame(); });
    if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) go(); }).observe(cv);
  }
  function isPrime(n) { if (n < 2) return false; if (n % 2 === 0) return n === 2; for (var i = 3; i * i <= n; i += 2) if (n % i === 0) return false; return true; }
  function factor(n) { var f = [], d = 2; while (n > 1 && d * d <= n) { while (n % d === 0) { f.push(d); n /= d; } d += d === 2 ? 1 : 2; } if (n > 1) f.push(n); return f; }

  /* ---- sacred geometry ---- */
  function flower(c) {
    var d = parse(c, "flower"), n = firstNum(d, 2, 1, 6), o = canvasBox("flower", 560, 560, "Flower of Life: " + n + " ring" + (n > 1 ? "s" : "") + " of overlapping circles");
    paint(o.cv, function (ctx, W, H, p) {
      var r = (Math.min(W, H) / 2 - 14) / (n + 1), pts = [];
      for (var a = -n; a <= n; a++) for (var b = -n; b <= n; b++) if ((Math.abs(a) + Math.abs(b) + Math.abs(a + b)) / 2 <= n) pts.push([W / 2 + r * (a + b / 2), H / 2 + r * (b * Math.sqrt(3) / 2)]);
      ctx.lineWidth = 1.4; ctx.strokeStyle = p.acc; ctx.shadowColor = p.acc; ctx.shadowBlur = 5;
      pts.forEach(function (q) { ctx.beginPath(); ctx.arc(q[0], q[1], r, 0, TAU); ctx.stroke(); });
      ctx.beginPath(); ctx.arc(W / 2, H / 2, r * (n + 1), 0, TAU); ctx.strokeStyle = p.dim; ctx.stroke();
    });
    swap(c, o.box);
  }
  function phyllotaxis(c) {
    var d = parse(c, "phyllotaxis"), n = firstNum(d, 700, 20, 3000), o = canvasBox("phyllo", 560, 560, n + " seeds, each turned 137.5078 degrees (the golden angle) from the last");
    paint(o.cv, function (ctx, W, H, p) {
      var k = (Math.min(W, H) / 2 - 8) / Math.sqrt(n), ang = Math.PI * (3 - Math.sqrt(5));
      for (var i = 1; i <= n; i++) { var r = k * Math.sqrt(i), t = i * ang; ctx.fillStyle = i % 2 ? p.acc : p.fg; ctx.globalAlpha = 0.35 + 0.65 * (i / n); ctx.beginPath(); ctx.arc(W / 2 + r * Math.cos(t), H / 2 + r * Math.sin(t), Math.max(1.2, k * 0.42), 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1;
    });
    swap(c, o.box);
  }
  function mandala(c) {
    var d = parse(c, "mandala"), text = d.all || "mandala", seed = hash(text), o = canvasBox("mandala", 560, 560, "Grown from the words: " + esc(text.slice(0, 60)));
    paint(o.cv, function (ctx, W, H, p) {
      var r = rng(seed), k = 6 + Math.floor(r() * 7), R = Math.min(W, H) / 2 - 10; ctx.translate(W / 2, H / 2); ctx.lineWidth = 1.3; ctx.shadowColor = p.acc; ctx.shadowBlur = 4;
      for (var layer = 1; layer <= 7; layer++) {
        var rad = R * layer / 7.4, kind = Math.floor(r() * 4), size = R / 7 * (0.5 + r()), col = [p.acc, p.fg, p.dim, p.hot][Math.floor(r() * 4)];
        ctx.strokeStyle = col; ctx.fillStyle = col;
        for (var i = 0; i < k; i++) {
          ctx.save(); ctx.rotate(TAU * i / k + layer * 0.07); ctx.translate(0, -rad); ctx.beginPath();
          if (kind === 0) { ctx.moveTo(0, 0); ctx.quadraticCurveTo(size * 0.7, -size * 0.5, 0, -size); ctx.quadraticCurveTo(-size * 0.7, -size * 0.5, 0, 0); ctx.stroke(); }
          else if (kind === 1) { ctx.arc(0, 0, size * 0.45, 0, TAU); ctx.stroke(); }
          else if (kind === 2) { ctx.arc(0, 0, Math.max(2, size * 0.14), 0, TAU); ctx.fill(); }
          else { ctx.moveTo(-size * 0.4, 0); ctx.lineTo(0, -size * 0.7); ctx.lineTo(size * 0.4, 0); ctx.closePath(); ctx.stroke(); }
          ctx.restore();
        }
      }
      ctx.beginPath(); ctx.arc(0, 0, R / 14, 0, TAU); ctx.fillStyle = p.acc; ctx.fill();
    });
    swap(c, o.box);
  }
  function ulam(c) {
    var d = parse(c, "ulam"), n = firstNum(d, 41, 9, 101); if (n % 2 === 0) n++;
    var o = canvasBox("ulam", 560, 560, " "), count = 0, cap = $(".mh-cv-cap", o.box);
    paint(o.cv, function (ctx, W, H, p) {
      var cell = Math.floor((Math.min(W, H) - 8) / n), x = (n - 1) / 2, y = (n - 1) / 2, dx = 1, dy = 0, step = 1, left = 1, turns = 0; count = 0;
      var off = (W - cell * n) / 2;
      for (var i = 1; i <= n * n; i++) {
        if (isPrime(i)) { count++; ctx.fillStyle = p.acc; ctx.fillRect(off + x * cell + 1, off + y * cell + 1, cell - 1, cell - 1); } else { ctx.fillStyle = p.dim; ctx.globalAlpha = 0.18; ctx.fillRect(off + x * cell + 1, off + y * cell + 1, cell - 1, cell - 1); ctx.globalAlpha = 1; }
        x += dx; y += dy; if (--left === 0) { var t = dx; dx = -dy; dy = t; turns++; if (turns % 2 === 0) step++; left = step; }
      }
    });
    cap.textContent = "Numbers 1 to " + (n * n) + " wound into a square spiral. The bright cells are the " + count + " primes, and they gather along diagonal lines.";
    swap(c, o.box);
  }
  function pascal(c) {
    var d = parse(c, "pascal"), n = firstNum(d, 16, 4, 34), mod2 = /mod\s*2/i.test(d.all), o = canvasBox("pascal", 640, Math.min(640, 40 + n * 20), mod2 ? "Pascal's triangle, odd numbers lit: the Sierpinski triangle appears" : "Pascal's triangle: each number is the sum of the two above it");
    paint(o.cv, function (ctx, W, H, p) {
      var row = [1], cell = Math.min(24, (W - 20) / n), rh = (H - 30) / n; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = Math.floor(cell * 0.4) + "px monospace";
      for (var i = 0; i < n; i++) {
        for (var j = 0; j <= i; j++) {
          var x = W / 2 + (j - i / 2) * cell, y = 18 + i * rh, v = row[j];
          if (mod2) { if (v % 2 === 1) { ctx.fillStyle = p.acc; ctx.fillRect(x - cell / 2 + 1, y - rh / 2 + 1, cell - 2, rh - 1); } }
          else if (n <= 14) { ctx.fillStyle = p.fg; ctx.fillText(String(v), x, y); } else { ctx.fillStyle = p.acc; ctx.globalAlpha = Math.min(1, 0.15 + Math.log(v + 1) / Math.log(Math.pow(2, i) + 1)); ctx.beginPath(); ctx.arc(x, y, cell * 0.36, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
        }
        var nx = [1]; for (var k = 1; k <= i; k++) nx.push((row[k - 1] || 0) + (row[k] || 0)); row = nx;
      }
    });
    swap(c, o.box);
  }
  function collatz(c) {
    var d = parse(c, "collatz"), n0 = firstNum(d, 27, 2, 999999), seq = [n0], n = n0, peak = n0;
    while (n !== 1 && seq.length < 5000) { n = n % 2 ? 3 * n + 1 : n / 2; seq.push(n); if (n > peak) peak = n; }
    var o = canvasBox("collatz", 640, 320, n0 + " takes " + (seq.length - 1) + " steps to fall to 1, climbing as high as " + peak + ". Odd: times 3, plus 1. Even: halve.");
    paint(o.cv, function (ctx, W, H, p) {
      var lm = Math.log(peak + 1); ctx.strokeStyle = p.acc; ctx.lineWidth = 1.6; ctx.shadowColor = p.acc; ctx.shadowBlur = 4; ctx.beginPath();
      seq.forEach(function (v, i) { var x = 10 + (W - 20) * i / Math.max(1, seq.length - 1), y = H - 10 - (H - 20) * Math.log(v) / lm; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke();
    });
    swap(c, o.box);
  }

  /* ---- topology ---- */
  function proj(x, y, z, a, W, H, s) { var y2 = y * Math.cos(a) - z * Math.sin(a), z2 = y * Math.sin(a) + z * Math.cos(a), x2 = x * Math.cos(a * 0.6) + z2 * Math.sin(a * 0.6), z3 = -x * Math.sin(a * 0.6) + z2 * Math.cos(a * 0.6); return [W / 2 + x2 * s, H / 2 + y2 * s, z3]; }
  function mobius(c) {
    var d = parse(c, "mobius"), o = canvasBox("mobius", 560, 380, "A Mobius band: one side, one edge. Follow a line along it and you return upside down.");
    var U = 120, V = 5, grid = [];
    for (var i = 0; i <= U; i++) { grid[i] = []; var u = TAU * i / U; for (var j = 0; j <= V; j++) { var v = -1 + 2 * j / V, r = 1 + v / 2 * Math.cos(u / 2); grid[i][j] = [r * Math.cos(u), r * Math.sin(u), v / 2 * Math.sin(u / 2)]; } }
    spin(o.cv, function (ctx, W, H, p, a) {
      var quads = [], s = Math.min(W, H) * 0.34;
      for (var i = 0; i < U; i++) for (var j = 0; j < V; j++) {
        var q = [grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]].map(function (g) { return proj(g[0], g[1], g[2], a, W, H, s); });
        quads.push({ q: q, z: (q[0][2] + q[1][2] + q[2][2] + q[3][2]) / 4, k: (i + j) % 2 });
      }
      quads.sort(function (m, n) { return m.z - n.z; });
      ctx.lineWidth = 0.6; quads.forEach(function (m) { ctx.beginPath(); ctx.moveTo(m.q[0][0], m.q[0][1]); for (var t = 1; t < 4; t++) ctx.lineTo(m.q[t][0], m.q[t][1]); ctx.closePath(); ctx.globalAlpha = 0.55 + 0.4 * (m.z + 1.6) / 3.2; ctx.fillStyle = m.k ? p.acc : p.dim; ctx.fill(); ctx.strokeStyle = p.bg; ctx.stroke(); }); ctx.globalAlpha = 1;
    });
    swap(c, o.box);
  }
  function knot(c) {
    var d = parse(c, "knot"), nums = (d.all.match(/\d+/g) || []).map(Number), P = Math.max(2, Math.min(nums[0] || 3, 9)), Q = Math.max(2, Math.min(nums[1] || 2, 9));
    var name = (P === 3 && Q === 2) || (P === 2 && Q === 3) ? "the trefoil knot" : "the (" + P + "," + Q + ") torus knot";
    var o = canvasBox("knot", 560, 380, "This is " + name + ": a loop that cannot be undone without cutting it.");
    var N = 360, pts = []; for (var i = 0; i <= N; i++) { var t = TAU * i / N, r = Math.cos(Q * t) + 2; pts.push([r * Math.cos(P * t), r * Math.sin(P * t), -Math.sin(Q * t)]); }
    spin(o.cv, function (ctx, W, H, p, a) {
      var s = Math.min(W, H) * 0.14, pr = pts.map(function (g) { return proj(g[0], g[1], g[2], a, W, H, s); }), idx = pr.map(function (_, k) { return k; });
      idx.sort(function (m, n) { return pr[m][2] - pr[n][2]; }); ctx.lineCap = "round";
      idx.forEach(function (k) { if (!k) return; var q = pr[k], q0 = pr[k - 1], depth = (q[2] + 4) / 8; ctx.strokeStyle = depth > 0.5 ? p.acc : p.dim; ctx.lineWidth = 2 + depth * 5; ctx.beginPath(); ctx.moveTo(q0[0], q0[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); });
    });
    swap(c, o.box);
  }
  function graph(c) {
    var d = parse(c, "graph"), edges = [], names = {}, list = [];
    d.lines.forEach(function (l) { var m = l.split(/\s*[-–—]{1,2}\s*/); if (m.length === 2 && m[0] && m[1]) { edges.push([m[0], m[1]]); m.forEach(function (x) { if (!(x in names)) { names[x] = list.length; list.push(x); } }); } });
    if (!edges.length) { edges = [["Island A", "Bank 1"], ["Island A", "Bank 1"], ["Island A", "Bank 2"], ["Island A", "Bank 2"], ["Island A", "Island B"], ["Island B", "Bank 1"], ["Island B", "Bank 2"]]; edges.forEach(function (e) { e.forEach(function (x) { if (!(x in names)) { names[x] = list.length; list.push(x); } }); }); }
    var deg = list.map(function () { return 0; }); edges.forEach(function (e) { deg[names[e[0]]]++; deg[names[e[1]]]++; });
    var par = list.map(function (_, i) { return i; }); function find(x) { return par[x] === x ? x : (par[x] = find(par[x])); }
    edges.forEach(function (e) { par[find(names[e[0]])] = find(names[e[1]]); });
    var connected = list.every(function (_, i) { return find(i) === find(0); }), odd = deg.filter(function (x) { return x % 2; }).length;
    var verdict = !connected ? "The graph is in separate pieces, so no walk reaches every edge." : odd === 0 ? "Every point has an even number of edges: you can walk every edge exactly once and finish where you started (an Euler circuit)." : odd === 2 ? "Exactly two points have an odd number of edges: you can walk every edge exactly once, starting at one of them and ending at the other (an Euler path)." : odd + " points have an odd number of edges, so no walk can use every edge exactly once. This is how Euler settled the bridges of Konigsberg.";
    var o = canvasBox("graph", 560, 380, esc(d.title ? d.title + ": " : "") + verdict);
    paint(o.cv, function (ctx, W, H, p) {
      var n = list.length, pos = list.map(function (_, i) { var t = TAU * i / n - Math.PI / 2, R = Math.min(W, H) * 0.34; return [W / 2 + R * Math.cos(t) * (W / H > 1.3 ? 1.3 : 1), H / 2 + R * Math.sin(t)]; }), seen = {};
      ctx.lineWidth = 1.6; ctx.strokeStyle = p.acc;
      edges.forEach(function (e) { var a = pos[names[e[0]]], b = pos[names[e[1]]], key = names[e[0]] + "_" + names[e[1]], k = seen[key] = (seen[key] || 0) + 1, bow = (k - 1) * 22 * (k % 2 ? -1 : 1) + (k > 1 ? 0 : 0), mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, nx = -(b[1] - a[1]), ny = b[0] - a[0], len = Math.hypot(nx, ny) || 1;
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(mx + nx / len * bow * 2, my + ny / len * bow * 2, b[0], b[1]); ctx.stroke(); });
      ctx.font = "13px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      list.forEach(function (name, i) { var q = pos[i]; ctx.fillStyle = p.bg; ctx.strokeStyle = deg[i] % 2 ? p.hot : p.acc; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(q[0], q[1], 17, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = p.fg; ctx.fillText(String(deg[i]), q[0], q[1]); ctx.fillText(name, q[0], q[1] + (q[1] > H / 2 ? 30 : -30)); });
    });
    swap(c, o.box);
  }

  /* ---- polymath tools ---- */
  function roman(n) { if (n < 1 || n > 3999) return ""; var m = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]], s = ""; m.forEach(function (p) { while (n >= p[0]) { s += p[1]; n -= p[0]; } }); return s; }
  function number(c) {
    var d = parse(c, "number"), n = firstNum(d, 144, 1, 999999999), box = el("div", "mh-play mh-num"), f = factor(n), rows = [];
    var divs = []; for (var i = 1; i * i <= n; i++) if (n % i === 0) { divs.push(i); if (i * i !== n) divs.push(n / i); }
    var proper = divs.reduce(function (a, b) { return a + b; }, 0) - n, root2 = Math.round(Math.sqrt(n)), cube = Math.round(Math.cbrt(n)), tri = Math.round((Math.sqrt(8 * n + 1) - 1) / 2);
    var a = 0, b = 1, fi = -1; for (var k = 0; k < 80; k++) { if (a === n) { fi = k; break; } if (a > n) break; var t = a + b; a = b; b = t; }
    var steps = 0, cn = n; while (cn !== 1 && steps < 5000) { cn = cn % 2 ? 3 * cn + 1 : cn / 2; steps++; }
    var dr = n % 9 === 0 ? 9 : n % 9;
    rows.push(["number", n.toLocaleString("en")], ["prime?", isPrime(n) ? "yes, prime" : "no: " + f.join(" x ")], ["divisors", divs.length + (n < 100000 ? " (" + divs.sort(function (x, y) { return x - y; }).join(", ") + ")" : "")],
      ["kind", n === 1 ? "unit" : proper === n ? "perfect number (its divisors add up to itself)" : proper > n ? "abundant (its divisors add to more)" : "deficient (its divisors add to less)"],
      ["shape", [root2 * root2 === n ? "perfect square" : "", cube * cube * cube === n ? "perfect cube" : "", tri * (tri + 1) / 2 === n ? "triangular" : ""].filter(Boolean).join(", ") || "none of square, cube, triangular"],
      ["fibonacci", fi >= 0 ? "yes, it is Fibonacci number " + fi : "no"], ["digital root", String(dr)], ["binary", n.toString(2)], ["hex", n.toString(16).toUpperCase()], ["roman", roman(n) || "out of range"], ["collatz", steps + " steps to reach 1"]);
    box.innerHTML = "<h3 class=\"mh-play-t\">" + esc(d.title && !/^\d+$/.test(d.title) ? d.title : "the number " + n) + "</h3><dl>" + rows.map(function (r) { return "<dt>" + esc(r[0]) + "</dt><dd>" + esc(r[1]) + "</dd>"; }).join("") + "</dl>";
    swap(c, box);
  }
  function gematria(c) {
    var d = parse(c, "gematria"), text = d.title ? [d.title].concat(d.lines) : d.lines, box = el("div", "mh-play mh-gem"), total = 0;
    function val(w) { return w.toLowerCase().replace(/[^a-z]/g, "").split("").reduce(function (a, ch) { return a + ch.charCodeAt(0) - 96; }, 0); }
    function root3(n) { while (n > 9) n = String(n).split("").reduce(function (a, x) { return a + +x; }, 0); return n; }
    var rows = text.map(function (line) { var words = line.split(/\s+/).filter(Boolean), sum = 0; var ws = words.map(function (w) { var v = val(w); sum += v; return esc(w) + "<sub>" + v + "</sub>"; }); total += sum; return '<p class="mh-gem-l">' + ws.join(" ") + '<span class="mh-gem-s"> = ' + sum + " &rarr; " + root3(sum) + "</span></p>"; });
    box.innerHTML = '<div class="mh-gem-h">ordinal gematria <small>A=1 ... Z=26, then reduce to one digit</small></div>' + rows.join("") + '<p class="mh-gem-t">total ' + total + " &rarr; " + root3(total) + (isPrime(total) ? " (a prime)" : "") + "</p>";
    swap(c, box);
  }
  function timeline(c) {
    var d = parse(c, "timeline"), items = d.lines.map(function (l) { var i = l.indexOf(":"); return i > 0 ? { y: l.slice(0, i).trim(), t: l.slice(i + 1).trim() } : { y: "", t: l }; });
    items.sort(function (a, b) { var x = parseFloat(a.y), y = parseFloat(b.y); return isNaN(x) || isNaN(y) ? 0 : x - y; });
    var box = el("div", "mh-play mh-tl"); if (d.title) box.appendChild(el("h3", "mh-play-t", esc(d.title)));
    items.forEach(function (it) { box.appendChild(el("div", "mh-tl-i", '<span class="mh-tl-y">' + esc(it.y) + '</span><span class="mh-tl-d"></span><span class="mh-tl-t">' + esc(it.t) + "</span>")); });
    swap(c, box);
  }

  var MAKERS = { flower: flower, phyllotaxis: phyllotaxis, mandala: mandala, ulam: ulam, pascal: pascal, collatz: collatz, mobius: mobius, knot: knot, graph: graph, number: number, gematria: gematria, timeline: timeline };
  function start() {
    $$(".callout[data-callout]").forEach(function (c) {
      var type = (c.getAttribute("data-callout") || "").toLowerCase(), fn = MAKERS[type];
      if (!fn) return;
      try { fn(c); } catch (e) { if (window.console) console.warn("[misshooch math] " + type + " skipped:", e); }
    });
    doc.addEventListener("mh-skin", function () { redraws.forEach(function (r) { try { r(); } catch (e) {} }); });
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", start); else start();
})();
