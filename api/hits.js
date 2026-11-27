/*
  Hit counter for the archive status bar.

  POST /api/hits?path=/notes/some-note          -> counts one view of that page
  POST /api/hits?path=/notes/some-note&visit=1  -> also counts one visit to the site
                                                   (sent once per visit, on the first page)
  GET  /api/hits?path=/notes/some-note  -> returns the totals without counting

  Response: { "total": 1234, "page": 56 }

  Storage is an Upstash Redis database connected to the Vercel project
  (Vercel dashboard > Storage > Upstash for Redis > Connect). Connecting it adds
  the environment variables below automatically. Until it is connected the
  endpoint answers { "total": null, "page": null } and the counter shows dashes.

  Abuse protection (a view is only counted when all of these hold):
    - the request comes from a page on this site (Origin/Referer is the same
      host, and the Referer is the page being counted)
    - that visitor (by a one-way hash of their IP; raw IPs are never stored)
      has counted fewer than RATE_LIMIT views in the last minute
    - it isn't a bot user agent
  Anything else just gets the current totals back. Methods other than GET and
  POST are refused.
*/
const crypto = require("crypto");

const RATE_LIMIT = 30; // counted views per visitor per minute

const URL_VARS = ["KV_REST_API_URL", "UPSTASH_REDIS_REST_URL"];
const TOKEN_VARS = ["KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_TOKEN"];
const BOTS = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|monitor|curl|wget|python|go-http/i;

function env(names) {
  for (const n of names) if (process.env[n]) return process.env[n];
  return "";
}

function cleanPath(raw) {
  let p = String(raw || "/").split("?")[0].split("#")[0];
  try { p = decodeURIComponent(p); } catch (e) { /* keep as is */ }
  p = p.replace(/[^\w\-\/.~%À-ɏ]/g, "").slice(0, 200);
  if (!p.startsWith("/")) p = "/" + p;
  if (p.length > 1) p = p.replace(/\/+$/, "");
  return p || "/";
}

function host(raw) {
  try {
    return new URL(raw).host.toLowerCase();
  } catch (e) {
    return "";
  }
}

// True when the request was sent by a page on this same site.
function sameSite(req, path) {
  const here = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim().toLowerCase();
  if (!here) return false;
  const origin = req.headers.origin;
  if (origin && host(origin) !== here) return false;
  const referer = req.headers.referer || req.headers.referrer;
  if (!referer) return Boolean(origin);
  if (host(referer) !== here) return false;
  try {
    return cleanPath(new URL(referer).pathname) === path;
  } catch (e) {
    return false;
  }
}

function visitorKey(req) {
  const ip = String(req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || req.socket?.remoteAddress || "")
    .split(",")[0]
    .trim();
  const day = new Date().toISOString().slice(0, 10); // rotate the hash daily
  return "mh:rl:" + crypto.createHash("sha256").update(day + "|" + ip).digest("hex").slice(0, 24);
}

async function redis(url, token, commands) {
  const res = await fetch(url.replace(/\/$/, "") + "/pipeline", {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error("redis " + res.status);
  return (await res.json()).map((r) => (r && r.result != null ? Number(r.result) : 0));
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "GET" && req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Allow", "GET, POST");
    return res.end(JSON.stringify({ error: "method not allowed" }));
  }

  const url = env(URL_VARS);
  const token = env(TOKEN_VARS);
  if (!url || !token) {
    res.statusCode = 200;
    return res.end(JSON.stringify({ total: null, page: null }));
  }

  const query = new URL(req.url, "http://x").searchParams;
  const path = cleanPath(query.get("path"));
  const pageKey = "mh:page:" + path;
  const ua = req.headers["user-agent"] || "";
  let count = req.method === "POST" && ua && !BOTS.test(ua) && sameSite(req, path);

  try {
    if (count) {
      const rl = visitorKey(req);
      const [, n] = await redis(url, token, [["SET", rl, "0", "EX", "60", "NX"], ["INCR", rl]]);
      if (n > RATE_LIMIT) count = false;
    }
    const visit = count && query.get("visit") === "1";
    const pageOps = count ? [["INCR", pageKey], ["ZINCRBY", "mh:pages", "1", path]] : [["GET", pageKey]];
    const [total, page] = await redis(url, token, [[visit ? "INCR" : "GET", "mh:hits"], ...pageOps]);
    res.statusCode = 200;
    res.end(JSON.stringify({ total, page }));
  } catch (e) {
    res.statusCode = 200;
    res.end(JSON.stringify({ total: null, page: null }));
  }
};
