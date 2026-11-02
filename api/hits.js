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
*/

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
  const count = req.method === "POST" && ua && !BOTS.test(ua);
  const visit = count && query.get("visit") === "1";

  try {
    const pageOps = count ? [["INCR", pageKey], ["ZINCRBY", "mh:pages", "1", path]] : [["GET", pageKey]];
    const [total, page] = await redis(url, token, [[visit ? "INCR" : "GET", "mh:hits"], ...pageOps]);
    res.statusCode = 200;
    res.end(JSON.stringify({ total, page }));
  } catch (e) {
    res.statusCode = 200;
    res.end(JSON.stringify({ total: null, page: null }));
  }
};
