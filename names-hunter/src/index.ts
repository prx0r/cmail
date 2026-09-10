// names-hunter worker — Domain Hunter UI + cmail MCP backend
// Serves Domain Hunter static UI and proxies MCP to cmail.

const CMAIL_URL = "https://cmail.tradesprior.workers.dev";

// Minimal landing page with Domain Hunter UI
const LANDING = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>names — one name, everywhere</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Source Code Pro',system-ui,monospace;background:#fafafa;color:#111;line-height:1.6}
    .wrap{max-width:900px;margin:0 auto;padding:2rem}
    h1{font-size:1.2rem;font-weight:500;margin-bottom:.5rem}
    .sub{font-size:.75rem;color:#999;margin-bottom:1.5rem}
    .search{display:flex;gap:0;border:1px solid #ccc;margin-bottom:1.5rem}
    .search input{flex:1;padding:.75rem 1rem;border:none;background:transparent;font-family:inherit;font-size:.875rem;outline:none}
    .search button{padding:.75rem 1.5rem;background:#111;color:#fff;border:none;font-family:inherit;font-size:.75rem;cursor:pointer}
    .search button:hover{background:#333}
    table{width:100%;border-collapse:collapse;margin-bottom:1.5rem}
    th{text-align:left;font-size:.625rem;color:#999;text-transform:uppercase;letter-spacing:.1em;padding:.5rem 0;border-bottom:1px solid #eee}
    td{padding:.5rem 0;border-bottom:1px solid #f0f0f0;font-size:.8125rem}
    .avail{color:#166534;font-weight:500}
    .taken{color:#999}
    .unknown{color:#b45309}
    .price{font-size:.75rem;color:#666;text-align:right}
    .section{margin-top:2rem}
    .section-label{font-size:.625rem;color:#999;text-transform:uppercase;letter-spacing:.1em;margin-bottom:.75rem}
    .handles{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:.5rem;margin-bottom:1.5rem}
    .handle{padding:.5rem;border:1px solid #eee;font-size:.75rem;display:flex;justify-content:space-between}
    .handle .name{font-weight:500}
    footer{margin-top:3rem;padding-top:1rem;border-top:1px solid #eee;font-size:.625rem;color:#bbb}
    .tabs{display:flex;gap:0;margin-bottom:1rem;border-bottom:1px solid #ccc}
    .tab{padding:.5rem 1rem;font-size:.75rem;cursor:pointer;border-bottom:2px solid transparent}
    .tab.active{border-bottom-color:#111;font-weight:500}
    .hidden{display:none}
  </style>
</head>
<body>
  <div class="wrap">
    <h1>one name, everywhere</h1>
    <p class="sub">check a name across 1200+ TLDs, socials, packages — buy with one click</p>
    <div class="tabs">
      <div class="tab active" onclick="showTab('domains')">Domains</div>
      <div class="tab" onclick="showTab('handles')">Socials</div>
      <div class="tab" onclick="showTab('tools')">MCP Tools</div>
    </div>
    <div id="domains-tab">
      <div class="search">
        <input type="text" id="q" placeholder="postagi, makemoney, yourbrand...">
        <button onclick="search()">check</button>
      </div>
      <div id="status" style="font-size:.75rem;color:#999;margin-bottom:1rem"></div>
      <table id="results" style="display:none">
        <thead><tr><th>domain</th><th>status</th><th class="price">best price</th><th></th></tr></thead>
        <tbody id="tbody"></tbody>
      </table>
    </div>
    <div id="handles-tab" class="hidden">
      <div class="search">
        <input type="text" id="hq" placeholder="username to check...">
        <button onclick="checkHandles()">check socials</button>
      </div>
      <div id="hstatus" style="font-size:.75rem;color:#999;margin-bottom:1rem"></div>
      <div class="handles" id="hresults"></div>
    </div>
    <div id="tools-tab" class="hidden">
      <div class="section-label">MCP Tools (for agents)</div>
      <table>
        <thead><tr><th>tool</th><th>description</th></tr></thead>
        <tbody>
          <tr><td><code>name.check</code></td><td>Unified domain + handle availability check</td></tr>
          <tr><td><code>name.search</code></td><td>Namecheap-style search with registrar pricing</td></tr>
          <tr><td><code>name.verify_domain</code></td><td>Single domain RDAP+DNS verification</td></tr>
          <tr><td><code>name.check_handles</code></td><td>Check username across 9 platforms</td></tr>
          <tr><td><code>name.cf_check</code></td><td>Cloudflare Registrar availability + price</td></tr>
          <tr><td><code>name.cf_purchase</code></td><td>Purchase domain (confirmed:true required)</td></tr>
          <tr><td><code>name.wire_email</code></td><td>Set up email routing after purchase</td></tr>
          <tr><td><code>name.phone_search</code></td><td>Search Telnyx phone numbers</td></tr>
          <tr><td><code>name.read_sms</code></td><td>Read received SMS verification codes</td></tr>
        </tbody>
      </table>
      <p style="margin-top:1rem;font-size:.75rem;color:#999">Endpoint: <code>https://cmail.tradesprior.workers.dev/mcp</code></p>
    </div>
    <footer>names v1.0 · powered by Domain Hunter RDAP engine + cmail MCP</footer>
  </div>
  <script>
    const \$ = s => document.querySelector(s);
    function showTab(t) {
      document.querySelectorAll('.tab').forEach((el,i) => el.classList.toggle('active', el.textContent.toLowerCase().includes(t)));
      ['domains','handles','tools'].forEach(id => {
        document.getElementById(id+'-tab').classList.toggle('hidden', id !== t);
      });
    }
    async function search() {
      const q = \$('#q').value.trim();
      if (!q) return;
      const st = \$('#status'), tbody = \$('#tbody'), table = \$('#results');
      st.textContent = 'checking ' + q + ' across TLDs...';
      table.style.display = 'none';
      tbody.innerHTML = '';
      try {
        const r = await fetch('/api/check', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({name: q})
        });
        const d = await r.json();
        if (d.error) { st.textContent = 'error: ' + d.error; return; }
        const domains = d.results || [];
        st.textContent = domains.filter(r=>r.status==='available').length + '/' + domains.length + ' available';
        domains.sort((a,b) => {
          const order = {available:0,unknown:1,taken:2};
          return (order[a.status]||1) - (order[b.status]||1);
        });
        domains.forEach(r => {
          const cls = r.status === 'available' ? 'avail' : r.status === 'taken' ? 'taken' : 'unknown';
          const price = r.price ? r.price.formatted.first + '/' + r.price.registrar : '';
          tbody.innerHTML += '<tr><td>' + r.domain + '</td><td class="'+cls+'">'+r.status+'</td><td class="price">'+price+'</td><td>'+(r.status==='available'?'<a href="https://www.cloudflare.com/products/registrar/?query='+r.domain+'" target="_blank" style="font-size:.75rem">buy →</a>':'')+'</td></tr>';
        });
        table.style.display = 'table';
      } catch(e) { st.textContent = 'error: ' + e.message; }
    }
    async function checkHandles() {
      const q = \$('#hq').value.trim();
      if (!q) return;
      const st = \$('#hstatus'), out = \$('#hresults');
      st.textContent = 'checking ' + q + ' across platforms...';
      out.innerHTML = '';
      try {
        const r = await fetch('https://cmail.tradesprior.workers.dev/mcp', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({tool:'name.check_handles', args:{name:q}})
        });
        const d = await r.json();
        st.textContent = d.handles.filter(h=>h.status==='available').length + '/' + d.handles.length + ' available';
        d.handles.forEach(h => {
          const cls = h.status === 'available' ? 'avail' : h.status === 'taken' ? 'taken' : 'unknown';
          out.innerHTML += '<div class="handle"><span class="name">' + h.label + '</span><span class="'+cls+'">' + h.status + '</span></div>';
        });
      } catch(e) { st.textContent = 'error: ' + e.message; }
    }
    \$('#q').addEventListener('keydown', e => { if (e.key==='Enter') search() });
    \$('#hq').addEventListener('keydown', e => { if (e.key==='Enter') checkHandles() });
  </script>
</body>
</html>`;

export default {
  async fetch(req: Request, env: any): Promise<Response> {
    const url = new URL(req.url);
    const corsHeaders: Record<string,string> = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    // Health
    if (url.pathname === "/api/health") {
      return Response.json({ ok: true, service: "names-hunter" }, { headers: corsHeaders });
    }

    // MCP proxy → cmail
    if (url.pathname === "/mcp") {
      try {
        const body = await req.json();
        const r = await fetch(`${CMAIL_URL}/mcp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        return Response.json(await r.json(), { headers: corsHeaders });
      } catch (e: any) {
        return Response.json({ error: e.message }, { status: 502, headers: corsHeaders });
      }
    }

    // Domain check API — RDAP lookup for multiple TLDs
    if (url.pathname === "/api/check" && req.method === "POST") {
      try {
        const body: any = await req.json();
        const name = (body.name || "").toLowerCase().replace(/[^a-z0-9-]/g, "");
        if (!name) return Response.json({ error: "name required" }, { status: 400, headers: corsHeaders });

        const TLD_LIST = ["com","net","org","io","dev","ai","xyz","app","co","trade","site","online","store","tech","sh","me","uk","de","nl","fr","ch","ru","so","ly","pl","co.uk","ca","us","au","in","br","jp","cn","kr"];
        const results = await Promise.all(TLD_LIST.map(async tld => {
          const domain = tld.includes(".") ? name + "." + tld : name + "." + tld;
          const rdapUrl = await getRdapUrl(tld);
          if (!rdapUrl) return { domain, tld, status: "unknown", source: "no-rdap" };
          try {
            const r = await fetch(`${rdapUrl}${domain}`, { headers: { "User-Agent": "names-hunter/1.0" }, redirect: "follow" });
            if (r.status === 200) return { domain, tld, status: "taken", source: "rdap" };
            if (r.status === 404) {
              // Corroborate with DNS for low-trust TLDs
              try {
                const dns = await fetch(`https://cloudflare-dns.com/dns-query?name=${domain}&type=NS`, { headers: { "Accept": "application/dns-json" } });
                const dnsData: any = await dns.json();
                const hasNS = (dnsData.Answer || []).some((a: any) => a.type === 2);
                if (hasNS) return { domain, tld, status: "taken", source: "rdap+dns" };
              } catch {}
              return { domain, tld, status: "available", source: "rdap" };
            }
            return { domain, tld, status: "unknown", source: "rdap", note: `HTTP ${r.status}` };
          } catch { return { domain, tld, status: "unknown", source: "error" }; }
        }));

        // Attach prices from our pricing table
        const priced = results.map(r => ({
          ...r,
          price: getPrice(r.tld),
        }));

        return Response.json({ name, results: priced }, { headers: corsHeaders });
      } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
      }
    }

    // Serve UI
    return new Response(LANDING, { headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders } });
  },
};

// Minimal RDAP URL resolver with IANA bootstrap
const RDAP_CACHE: Record<string, string> = {};
async function getRdapUrl(tld: string): Promise<string | null> {
  if (RDAP_CACHE[tld]) return RDAP_CACHE[tld];
  const known: Record<string, string> = {
    com: "https://rdap.verisign.com/com/v1/domain/",
    net: "https://rdap.verisign.com/net/v1/domain/",
    org: "https://rdap.org/domain/",
    io: "https://rdap.nic.io/domain/",
    dev: "https://rdap.nic.google/domain/",
    ai: "https://rdap.nic.ai/domain/",
    co: "https://rdap.nic.co/domain/",
    xyz: "https://rdap.nic.xyz/domain/",
    app: "https://rdap.nic.google/domain/",
    trade: "https://rdap.nic.trade/domain/",
    site: "https://rdap.nic.site/domain/",
    online: "https://rdap.nic.online/domain/",
    store: "https://rdap.nic.store/domain/",
    tech: "https://rdap.nic.tech/domain/",
    me: "https://rdap.nic.me/domain/",
    uk: "https://rdap.nic.uk/domain/",
    de: "https://rdap.denic.de/domain/",
    nl: "https://rdap.sidn.nl/domain/",
    fr: "https://rdap.nic.fr/domain/",
    ch: "https://rdap.nic.ch/domain/",
    ru: "https://rdap.tcinet.ru/domain/",
    so: "https://rdap.nic.so/domain/",
    ly: "https://rdap.nic.ly/domain/",
    pl: "https://rdap.dns.pl/domain/",
    ca: "https://rdap.cira.ca/domain/",
    us: "https://rdap.nic.us/domain/",
    au: "https://rdap.auda.org.au/domain/",
    in: "https://rdap.inregistry.in/domain/",
    br: "https://rdap.registro.br/domain/",
    jp: "https://rdap.jprs.jp/domain/",
    cn: "https://rdap.cnnic.cn/domain/",
    kr: "https://rdap.kisa.or.kr/domain/",
  };
  if (known[tld]) { RDAP_CACHE[tld] = known[tld]; return known[tld]; }
  try {
    const r = await fetch("https://data.iana.org/rdap/dns.json");
    if (!r.ok) return null;
    const data: any = await r.json();
    for (const [tlds, urls] of data.services || []) {
      if (tlds.includes(tld) && urls.length) {
        RDAP_CACHE[tld] = urls[0].replace(/\/$/, "") + "/domain/";
        return RDAP_CACHE[tld];
      }
    }
  } catch {}
  return null;
}

// Pricing table (cheapest registrar per TLD)
function getPrice(tld: string): { registrar: string; formatted: { first: string; renew: string } } | null {
  const prices: Record<string, [number, number, string]> = {
    com: [10.44, 10.44, "Cloudflare"],
    net: [10.44, 10.44, "Cloudflare"],
    org: [9.98, 13.98, "Namecheap"],
    io: [32.98, 32.98, "Namecheap"],
    dev: [12.00, 12.00, "Cloudflare"],
    ai: [74.98, 74.98, "Namecheap"],
    xyz: [1.15, 11.99, "Porkbun"],
    app: [12.00, 12.00, "Cloudflare"],
    co: [9.98, 29.98, "Namecheap"],
    trade: [2.98, 2.98, "Namecheap"],
    site: [2.98, 9.98, "Namecheap"],
    online: [3.98, 3.98, "Namecheap"],
    store: [2.98, 2.98, "Namecheap"],
    tech: [4.98, 4.98, "Namecheap"],
    sh: [38.99, 38.99, "Dynadot"],
    me: [10.98, 23.98, "Namecheap"],
    uk: [6.98, 9.98, "Namecheap"],
    de: [6.98, 9.88, "Namecheap"],
    nl: [7.48, 8.98, "Namecheap"],
    fr: [0, 0, "free"],
    ch: [0, 0, "free"],
    ca: [9.98, 11.98, "Namecheap"],
    us: [9.98, 9.98, "Namecheap"],
    au: [14.98, 14.98, "Namecheap"],
    in: [5.98, 8.98, "Namecheap"],
    br: [20.00, 20.00, "registro.br"],
    jp: [35.00, 35.00, "Onamae"],
    cn: [25.00, 25.00, "West.cn"],
    kr: [15.00, 15.00, "KISA"],
  };
  const p = prices[tld];
  if (!p) return null;
  return {
    registrar: p[2],
    formatted: { first: `$${p[0].toFixed(2)}`, renew: `$${p[1].toFixed(2)}` },
  };
}
