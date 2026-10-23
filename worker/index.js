import seed from "../seed.json";
const MAX = 5, WIN = 600, CAP = 5000, LMAX = 20, LCAP = 500;
const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
const clean = (s, m) => String(s || "").replace(/[\u0000-\u001f\u007f<>]/g, "").trim().slice(0, m);
function normId(s) { s = String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); return /^G\d{3}[A-Z0-9]{6}$/.test(s) ? `G ${s.slice(1, 4)} ${s.slice(4, 7)} ${s.slice(7)}` : null; }
const hex = (u8) => [...u8].map((b) => b.toString(16).padStart(2, "0")).join("");
const uid = () => hex(crypto.getRandomValues(new Uint8Array(6)));
const col = (s) => s.replace(/(.)\1+/g, "$1");
const STEMS = ["pendej","chingad","chingar","gilipoll","hijueputa","hijodeputa","maricon","nigg","faggot","motherfuck","cocksuck","cabron","culer","pedofil","violador","rapist","whore","bitch","asshole","pussy","fuck","cunt"].map(col);
const EXACT = ["puta","puto","hdp","verga","pinga","joder","marica","fag","kike","spic","chink","tranny","rape","kys","retard","retarded"].map(col);
const LEET = { 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 7: "t", "@": "a", "$": "s", "!": "i" };
function tokens(s) {
  const t = String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[013457@$!]/g, (c) => LEET[c]).replace(/[^a-z]+/g, " ").trim().split(" ").filter(Boolean);
  const out = []; let run = "";
  for (const w of t) { if (w.length === 1) run += w; else { if (run) { out.push(run); run = ""; } out.push(w); } }
  if (run) out.push(run);
  return out.map(col);
}
function bad(text, extra) {
  const ex = String(extra || "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean).map((w) => w.endsWith("*") ? [col(w.slice(0, -1)), true] : [col(w), false]);
  return tokens(text).some((w) => STEMS.some((s) => w.startsWith(s)) || EXACT.some((e) => w === e || w === e + "s") || ex.some(([e, st]) => (st ? w.startsWith(e) : w === e)));
}
async function ipKey(ip) { return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("l" + ip))).slice(0, 6)); }
async function cacheLimited(ip, max, win) {
  if (typeof caches === "undefined") return false;
  const c = caches.default, r = new Request("https://rl.invalid/like/" + encodeURIComponent(ip));
  const m = await c.match(r), n = m ? +(await m.text()) : 0;
  if (n >= max) return true;
  await c.put(r, new Response(String(n + 1), { headers: { "Cache-Control": "max-age=" + win } }));
  return false;
}
async function load(env) {
  let v = await env.LEVELS.get("levels", "json");
  if (!v) { v = seed.map((x) => ({ ...x, id: uid(), t: 0 })); await env.LEVELS.put("levels", JSON.stringify(v)); }
  return v;
}
async function limited(env, ip) {
  const h = hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip))).slice(0, 8));
  const k = "rl:" + h, now = Math.floor(Date.now() / 1000);
  let r = await env.LEVELS.get(k, "json");
  if (!r || r.t0 + WIN <= now) r = { n: 0, t0: now };
  if (r.n >= MAX) return true;
  r.n++;
  await env.LEVELS.put(k, JSON.stringify(r), { expiration: Math.max(r.t0 + WIN, now + 61) });
  return false;
}
function same(a, b) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }
export default { fetch: (request, env) => handle(request, env) };
async function handle(request, env) {
  if (!env.LEVELS) return J({ error: "kv" }, 500);
  const u = new URL(request.url), m = request.method, ip = request.headers.get("CF-Connecting-IP") || "x";
  const path = u.pathname.replace(/^\/api\//, "").replace(/\/$/, "");
  try {
    if (path === "levels" && m === "GET") {
      const L = await load(env), lk = (await env.LEVELS.get("likes", "json")) || {}, me = await ipKey(ip);
      return J(L.map(({ id, n, c, i, t }) => ({ id, n, c, i, t, l: (lk[id] || []).length, me: (lk[id] || []).includes(me) })));
    }
    if (path === "levels" && m === "POST") {
      const txt = await request.text(); if (txt.length > 2048) return J({ error: "bad" }, 400);
      let j; try { j = JSON.parse(txt); } catch { return J({ error: "bad" }, 400); }
      const n = clean(j.n, 60), c = clean(j.c, 40), i = normId(j.i);
      if (!n || !i) return J({ error: "bad" }, 400);
      if (bad(n, env.BLOCKED_WORDS) || bad(c, env.BLOCKED_WORDS)) return J({ error: "words" }, 400);
      if (await limited(env, ip)) return J({ error: "rate" }, 429);
      const L = await load(env);
      if (L.some((l) => l.i === i)) return J({ error: "dup" }, 409);
      if (L.length >= CAP) return J({ error: "full" }, 507);
      L.unshift({ id: uid(), n, c, i, t: Date.now() });
      await env.LEVELS.put("levels", JSON.stringify(L));
      return J({ ok: true }, 201);
    }
    const lm = path.match(/^levels\/([a-f0-9]+)\/like$/);
    if (lm && m === "POST") {
      if (await cacheLimited(ip, LMAX, WIN)) return J({ error: "rate" }, 429);
      const L = await load(env); if (!L.some((l) => l.id === lm[1])) return J({ error: "none" }, 404);
      const lk = (await env.LEVELS.get("likes", "json")) || {}, arr = lk[lm[1]] || [], me = await ipKey(ip), k = arr.indexOf(me);
      if (k >= 0) arr.splice(k, 1); else if (arr.length < LCAP) arr.push(me);
      lk[lm[1]] = arr; await env.LEVELS.put("likes", JSON.stringify(lk));
      return J({ ok: true, liked: arr.includes(me), likes: arr.length });
    }
    const d = path.match(/^levels\/([a-f0-9]+)$/);
    if (d && m === "DELETE") {
      const key = String(env.ADMIN_KEY || "");
      if (!key || !same(String(request.headers.get("x-admin-key") || ""), key)) return J({ error: "auth" }, 401);
      const L = await load(env), k = L.findIndex((l) => l.id === d[1]);
      if (k < 0) return J({ error: "none" }, 404);
      L.splice(k, 1); await env.LEVELS.put("levels", JSON.stringify(L));
      const lk = (await env.LEVELS.get("likes", "json")) || {}; if (lk[d[1]]) { delete lk[d[1]]; await env.LEVELS.put("likes", JSON.stringify(lk)); }
      return J({ ok: true });
    }
    return J({ error: "404" }, 404);
  } catch (e) { return J({ error: "err" }, 500); }
}
