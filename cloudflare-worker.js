// ICS proxy for Arpero Family (Cloudflare Workers free tier: 100k requests/day, $0).
// Deploy: dash.cloudflare.com → Workers → Create → paste → Deploy.
// Then in the app: Calendar → Work calendar → Proxy = https://<name>.workers.dev/?url=
export default {
  async fetch(req) {
    const cors = {'Access-Control-Allow-Origin': 'https://arperowoodworks.github.io', 'Access-Control-Allow-Methods': 'GET'};
    if (req.method === 'OPTIONS') return new Response(null, {headers: cors});
    const u = new URL(req.url).searchParams.get('url') || '';
    let t; try { t = new URL(u) } catch { return new Response('bad url', {status: 400, headers: cors}) }
    if (t.protocol !== 'https:' || !/^outlook\.(office365|office|live)\.com$/.test(t.hostname)) return new Response('host not allowed', {status: 403, headers: cors});
    const r = await fetch(t.toString(), {cf: {cacheTtl: 900}});
    return new Response(await r.text(), {status: r.status, headers: {...cors, 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'no-store'}});
  }
};
