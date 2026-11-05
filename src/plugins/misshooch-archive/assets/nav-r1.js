/*
  Miss Hooch Archive: keep the music playing between pages.

  While a song is playing, clicking a link to another page of the site swaps the
  page in place instead of loading a new one, so the status bar and the player
  never stop. The address bar, the back button and the page title still work.
  When nothing is playing, links behave normally. If anything goes wrong, it
  falls back to an ordinary page load.

  After a swap it fires "mh-page" on the document, so the other archive scripts
  can redo the parts that belong to the page (ID cards, photo effects and so on).
*/
(function () {
  "use strict";
  if (!window.fetch || !window.DOMParser || !window.history || !history.pushState) return;
  var doc = document;
  // Kept as they are across swaps: the status bar (player, clock, counter), the scanline layer and search.
  var KEEP = ".mh-status, .mh-fxlayer, #globalsearch";
  // Inline scripts that set themselves up once for the whole site and must not run twice.
  var ONCE = [/window\.toggleSearch\s*=/];
  var busy = false;

  function playing() { try { return !!(window.mhAudio && window.mhAudio.playing()); } catch (e) { return false; } }
  function kept(n) { return n.nodeType === 1 && (n.matches(KEEP) || !!n.closest(KEEP)); }

  function target(a) {
    if (!a || !a.getAttribute("href") || a.hasAttribute("download")) return null;
    if (a.target && a.target !== "_self") return null;
    var u; try { u = new URL(a.href, location.href); } catch (e) { return null; }
    if (u.origin !== location.origin || !/^https?:$/.test(u.protocol)) return null;
    if (/\.(jpe?g|png|gif|webp|avif|svg|mp3|m4a|wav|ogg|flac|pdf|zip|xml|json|txt|ico)$/i.test(u.pathname)) return null;
    if (u.pathname.indexOf("/api/") === 0 || u.pathname.indexOf("/_vercel/") === 0) return null;
    if (u.pathname === location.pathname && u.search === location.search) return null; // same page or an anchor on it
    return u;
  }

  doc.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (!playing()) return;
    var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    var u = target(a); if (!u) return;
    e.preventDefault();
    go(u.href, true);
  });

  window.addEventListener("popstate", function (e) {
    if (e.state && e.state.mhNav) go(location.href, false);
  });

  function go(url, push) {
    if (busy) return; busy = true;
    var y = window.scrollY;
    fetch(url, { credentials: "same-origin", headers: { Accept: "text/html" } })
      .then(function (r) {
        if ((r.headers.get("content-type") || "").indexOf("text/html") < 0) throw new Error("not a page");
        return r.text().then(function (t) { return { html: t, url: r.url || url }; });
      })
      .then(function (res) {
        var next = new DOMParser().parseFromString(res.html, "text/html");
        if (!next.body || !next.body.querySelector("main, .content")) throw new Error("no content");
        var hash = new URL(url, location.href).hash, dest = res.url.split("#")[0] + hash;
        if (push) {
          try { history.replaceState({ mhNav: 1, y: y }, "", location.href); } catch (e) {}
          history.pushState({ mhNav: 1, y: 0 }, "", dest);
        }
        return swap(next).then(function () {
          var el = hash && doc.getElementById(decodeURIComponent(hash.slice(1)));
          if (el) el.scrollIntoView(); else window.scrollTo(0, push ? 0 : ((history.state && history.state.y) || 0));
        });
      })
      .then(function () { busy = false; })
      .catch(function (err) {
        if (window.console) console.warn("[misshooch nav] normal page load instead:", err);
        location.href = url;
      });
  }

  function swap(next) {
    doc.title = next.title;

    // Styles the new page needs that this one doesn't have yet.
    var have = {};
    doc.head.querySelectorAll('link[rel="stylesheet"], style').forEach(function (n) { have[n.outerHTML] = 1; });
    next.head.querySelectorAll('link[rel="stylesheet"], style').forEach(function (n) {
      if (!have[n.outerHTML]) doc.head.appendChild(doc.importNode(n, true));
    });

    // The body: same attributes as the new page; everything replaced except what is kept.
    var body = doc.body;
    Array.prototype.slice.call(body.attributes).forEach(function (a) { if (!next.body.hasAttribute(a.name)) body.removeAttribute(a.name); });
    Array.prototype.slice.call(next.body.attributes).forEach(function (a) { body.setAttribute(a.name, a.value); });

    Array.prototype.slice.call(body.childNodes).forEach(function (n) { if (!kept(n)) body.removeChild(n); });
    var anchor = body.querySelector(".mh-status");
    var scripts = [];
    Array.prototype.slice.call(next.body.childNodes).forEach(function (n) {
      if (n.nodeType === 1 && n.matches(KEEP)) return;
      if (n.nodeType === 1) {
        n.querySelectorAll(KEEP).forEach(function (k) { k.remove(); });
        if (n.tagName === "SCRIPT") scripts.push(n); else n.querySelectorAll("script").forEach(function (s) { scripts.push(s); });
      }
      body.insertBefore(doc.adoptNode(n), anchor && anchor.parentNode === body ? anchor : null);
    });
    return runScripts(scripts).then(function () {
      doc.dispatchEvent(new Event("mh-page"));
      try { if (window.lucide && window.lucide.createIcons) window.lucide.createIcons(); } catch (e) {}
    });
  }

  // Scripts that came with the new page don't run on their own, so each is replaced by a fresh copy, in order.
  // While they run, anything they set to happen "when the page has loaded" happens straight after instead.
  function runScripts(list) {
    var loaded = {};
    doc.querySelectorAll("script[src]").forEach(function (s) { loaded[s.src] = 1; });
    var waiting = [];
    var dAdd = doc.addEventListener, wAdd = window.addEventListener;
    function hook(orig, self) {
      return function (type, fn, opts) {
        if (type === "DOMContentLoaded" || type === "load") { waiting.push(fn); return; }
        return orig.call(self, type, fn, opts);
      };
    }
    doc.addEventListener = hook(dAdd, doc); window.addEventListener = hook(wAdd, window);
    function restore() { doc.addEventListener = dAdd; window.addEventListener = wAdd; }

    var chain = Promise.resolve();
    list.forEach(function (old) {
      chain = chain.then(function () {
        if (!old.parentNode) return;
        var type = (old.getAttribute("type") || "").toLowerCase();
        if (type === "importmap" || type === "application/json" || type === "application/ld+json") return;
        var text = old.textContent || "";
        if (!old.src && ONCE.some(function (re) { return re.test(text); })) { old.remove(); return; }
        var s = doc.createElement("script");
        Array.prototype.slice.call(old.attributes).forEach(function (a) { s.setAttribute(a.name, a.value); });
        if (old.src) {
          if (loaded[old.src]) { old.remove(); return; } // the library is already on the page
          return new Promise(function (done) {
            s.async = false; s.onload = s.onerror = function () { done(); };
            old.parentNode.replaceChild(s, old);
          });
        }
        // Wrapped in a block so that const/let names from the first visit can be declared again.
        s.textContent = type === "module" ? text : "{\n" + text + "\n}";
        old.parentNode.replaceChild(s, old);
      });
    });
    return chain.then(function () {
      restore();
      waiting.forEach(function (fn) {
        try { typeof fn === "function" ? fn.call(doc, new Event("DOMContentLoaded")) : fn.handleEvent(new Event("DOMContentLoaded")); }
        catch (e) { if (window.console) console.warn("[misshooch nav] page script:", e); }
      });
    }, function (e) { restore(); throw e; });
  }
})();
