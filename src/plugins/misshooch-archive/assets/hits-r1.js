/*
  Miss Hooch Archive: hit counter.

  Fills the odometer in the status bar with the total hits for the whole site.
  Hover it to see the hits for the page you are on.
  Each page counts once per visit (reloading doesn't add more).
  If the counter backend isn't connected yet, the counter stays hidden.
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

  var path = location.pathname || "/";
  var seenKey = "mh-hit:" + path, seen = false;
  try { seen = sessionStorage.getItem(seenKey) === "1"; } catch (e) {}

  draw(null);
  fetch("/api/hits?path=" + encodeURIComponent(path), { method: seen ? "GET" : "POST", keepalive: true })
    .then(function (r) { return r.ok ? r.json() : {}; })
    .then(function (d) {
      if (d.total == null) return;
      draw(d.total);
      box.hidden = false;
      box.title = "this page: " + (d.page || 0) + (d.page === 1 ? " hit" : " hits");
      box.setAttribute("aria-label", d.total + " hits on the archive, " + (d.page || 0) + " on this page");
      try { sessionStorage.setItem(seenKey, "1"); } catch (e) {}
    })
    .catch(function () {});
})();
