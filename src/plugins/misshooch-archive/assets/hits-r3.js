/*
  Miss Hooch Archive: hit counter.

  Fills the odometer in the status bar with the number of visits to the site.
  A visit counts once, on the first page; moving around the site or reloading
  doesn't add to it. A visit ends when the visitor closes the tab.
  Hover it to see how many times the page you are on has been viewed.
  If the counter backend isn't connected yet, the counter stays hidden.

  To stop your own browser counting, open any page with ?notme on the end
  (misshooch.com/?notme). It's remembered on that browser from then on, and
  it also stops Vercel Web Analytics counting you. ?countme undoes it.
  Do it once on each browser and device you use.
*/
(function () {
  "use strict";
  var box = document.getElementById("mh-hits");
  if (!box || !window.fetch) return;
  var digits = box.querySelector(".mh-hits-n");
  var WIDTH = 6;

  function draw(n) {
    var s = n == null ? new Array(WIDTH + 1).join("-") : String(n);
    while (s.length < WIDTH) s = "0" + s;
    digits.innerHTML = "";
    for (var i = 0; i < s.length; i++) {
      var d = document.createElement("span");
      d.textContent = s.charAt(i);
      digits.appendChild(d);
    }
  }

  var me = false;
  try {
    var q = location.search;
    if (/[?&]notme\b/.test(q)) { localStorage.setItem("mh-notme", "1"); localStorage.setItem("va-disable", "true"); }
    if (/[?&]countme\b/.test(q)) { localStorage.removeItem("mh-notme"); localStorage.removeItem("va-disable"); }
    me = localStorage.getItem("mh-notme") === "1";
  } catch (e) {}

  var path = location.pathname || "/";
  var seenKey = "mh-hit:" + path, seen = false;
  try { seen = sessionStorage.getItem(seenKey) === "1"; } catch (e) {}

  var newVisit = false;
  try { newVisit = sessionStorage.getItem("mh-visit") !== "1"; } catch (e) {}
  draw(null);
  fetch("/api/hits?path=" + encodeURIComponent(path) + (newVisit && !me ? "&visit=1" : ""), { method: me || (seen && !newVisit) ? "GET" : "POST", keepalive: true })
    .then(function (r) { return r.ok ? r.json() : {}; })
    .then(function (d) {
      if (d.total == null) return;
      draw(d.total);
      box.hidden = false;
      box.title = "this page: " + (d.page || 0) + (d.page === 1 ? " view" : " views") + (me ? " (you aren't counted on this browser)" : "");
      box.setAttribute("aria-label", d.total + " visits to the archive, " + (d.page || 0) + " views of this page");
      try { sessionStorage.setItem(seenKey, "1"); sessionStorage.setItem("mh-visit", "1"); } catch (e) {}
    })
    .catch(function () {});
})();
