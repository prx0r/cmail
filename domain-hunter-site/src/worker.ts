// Names — one name, everywhere

const MCP = "https://cmail.tradesprior.workers.dev/mcp";

const UI = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>names — one name, everywhere</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Source Code Pro',system-ui,monospace;background:#fafafa;color:#111;line-height:1.6}
.wrap{max-width:900px;margin:0 auto;padding:2rem}
h1{font-size:1.4rem;font-weight:600;margin-bottom:.25rem}
.sub{font-size:.75rem;color:#999;margin-bottom:1.5rem}
.tabs{display:flex;gap:0;border-bottom:1px solid #ccc;margin-bottom:1.5rem}
.tab{padding:.5rem 1rem;font-size:.75rem;cursor:pointer;border-bottom:2px solid transparent;color:#666}
.tab.active{border-bottom-color:#111;font-weight:500;color:#111}
.hidden{display:none}
.search{display:flex;gap:0;border:1px solid #ccc;margin-bottom:1rem}
.search input{flex:1;padding:.75rem 1rem;border:none;background:transparent;font-family:inherit;font-size:.875rem;outline:none}
.search button{padding:.75rem 1.5rem;background:#111;color:#fff;border:none;font-family:inherit;font-size:.75rem;cursor:pointer}
.search button:hover{background:#333}
.search button:disabled{opacity:.5;cursor:not-allowed}
.status{font-size:.75rem;color:#999;margin-bottom:1rem;min-height:1.2em}
table{width:100%;border-collapse:collapse;margin-bottom:1.5rem}
th{text-align:left;font-size:.625rem;color:#999;text-transform:uppercase;letter-spacing:.1em;padding:.5rem 0;border-bottom:1px solid #eee}
td{padding:.5rem 0;border-bottom:1px solid #f0f0f0;font-size:.8125rem}
.avail{color:#166534;font-weight:500}
.taken{color:#999}
.unknown{color:#b45309}
.price{font-size:.75rem;color:#666;text-align:right}
.buy{font-size:.75rem;color:#2563eb;text-decoration:none}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:.5rem;margin-bottom:1.5rem}
.card{padding:.6rem;border:1px solid #eee;font-size:.75rem;display:flex;justify-content:space-between;align-items:center}
.card .nm{font-weight:500}
.sug{font-size:.65rem;color:#2563eb;padding:.4rem .6rem;border:1px dashed #2563eb;border-radius:4px}
.tools-list{margin-top:1rem}
.tool{padding:.6rem 0;border-bottom:1px solid #f0f0f0}
.tool-name{font-weight:500;font-size:.8125rem}
.tool-desc{font-size:.7rem;color:#666}
footer{margin-top:3rem;padding-top:1rem;border-top:1px solid #eee;font-size:.625rem;color:#bbb}
.spinner{display:inline-block;width:12px;height:12px;border:2px solid #ccc;border-top-color:#111;border-radius:50%;animation:spin .6s linear infinite;margin-right:.5rem}
@keyframes spin{to{transform:rotate(360deg)}}
</style>
</head>
<body>
<div class="wrap">
<h1>one name, everywhere</h1>
<p class="sub">check a name across 1200+ TLDs, 13 social platforms — buy with one click</p>

<div class="tabs">
<div class="tab active" onclick="showTab('check')">Domains</div>
<div class="tab" onclick="showTab('social')">Socials</div>
<div class="tab" onclick="showTab('tools')">MCP Tools</div>
</div>

<!-- DOMAIN CHECK -->
<div id="check-tab">
<div class="search">
<input type="text" id="dq" placeholder="hamtask, postagi, yourbrand..." autofocus>
<button id="dbtn" onclick="checkDomains()">check</button>
</div>
<div class="status" id="dstatus"></div>
<table id="dresults" style="display:none">
<thead><tr><th>domain</th><th>status</th><th class="price">best price</th><th></th></tr></thead>
<tbody id="dtbody"></tbody>
</table>
</div>

<!-- SOCIAL HANDLES -->
<div id="social-tab" class="hidden">
<div class="search">
<input type="text" id="sq" placeholder="username to check...">
<button id="sbtn" onclick="checkSocial()">check socials</button>
</div>
<div class="status" id="sstatus"></div>
<div class="grid" id="sresults"></div>
<div id="sugbox" class="hidden">
<div style="font-size:.625rem;color:#999;text-transform:uppercase;letter-spacing:.1em;margin-bottom:.5rem">suggestions for taken platforms</div>
<div class="grid" id="suglist"></div>
</div>
</div>

<!-- MCP TOOLS -->
<div id="tools-tab" class="hidden">
<div style="font-size:.625rem;color:#999;text-transform:uppercase;letter-spacing:.1em;margin-bottom:.75rem">23 MCP tools — agent-callable</div>
<div class="tools-list" id="toolslist"></div>
<div style="margin-top:1.5rem">
<div style="font-size:.625rem;color:#999;text-transform:uppercase;letter-spacing:.1em;margin-bottom:.5rem">endpoint</div>
<code style="font-size:.75rem;background:#f5f5f5;padding:.25rem .5rem">POST https://cmail.tradesprior.workers.dev/mcp</code>
</div>
</div>

<footer>
<span>names v2.0 · 23 MCP tools · 13 social platforms</span>
<span>built with cmail + domain-hunter</span>
</footer>
</div>

<script>
const \$=s=>document.querySelector(s);

function showTab(t){
document.querySelectorAll('.tab').forEach(el=>el.classList.toggle('active',el.textContent.toLowerCase()===t));
['check','social','tools'].forEach(id=>\$('#'+id+'-tab').classList.toggle('hidden',id!==t));
}

async function mcp(tool,args){
const r=await fetch('${MCP}',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tool,args})});
return r.json();
}

async function checkDomains(){
const q=\$('#dq').value.trim();if(!q)return;
\$('#dbtn').disabled=true;
\$('#dstatus').innerHTML='<span class="spinner"></span>checking '+q+' across 15 TLDs...';
\$('#dresults').style.display='none';\$('#dtbody').innerHTML='';
try{
const d=await mcp('name.search',{name:q});
if(d.error){\$('#dstatus').textContent='error: '+d.error;return}
const avail=d.domains.filter(x=>x.available);
\$('#dstatus').textContent=avail.length+'/'+d.domains.length+' available';
d.domains.sort((a,b)=>a.available===b.available?0:a.available?-1:1);
d.domains.forEach(r=>{
const cls=r.available?'avail':'taken';
const price=r.best_price?'$'+r.best_price+' '+r.best_registrar:'';
const buy=r.available?'<a class="buy" href="https://www.cloudflare.com/products/registrar/?query='+r.domain+'" target="_blank">buy →</a>':'';
\$('#dtbody').innerHTML+='<tr><td>'+r.domain+'</td><td class="'+cls+'">'+(r.available?'available':'taken')+'</td><td class="price">'+price+'</td><td>'+buy+'</td></tr>';
});
\$('#dresults').style.display='table';
}catch(e){\$('#dstatus').textContent='error: '+e.message}
finally{\$('#dbtn').disabled=false}
}

async function checkSocial(){
const q=\$('#sq').value.trim();if(!q)return;
\$('#sbtn').disabled=true;
\$('#sstatus').innerHTML='<span class="spinner"></span>checking '+q+' across 13 platforms...';
\$('#sresults').innerHTML='';\$('#sugbox').classList.add('hidden');
try{
const d=await mcp('name.social',{name:q});
if(d.error){\$('#sstatus').textContent='error: '+d.error;return}
\$('#sstatus').textContent=d.available.length+'/13 available · '+d.taken.length+' taken · '+d.unknown.length+' unknown';
d.handles.forEach(h=>{
const icon=h.status==='available'?'✅':h.status==='taken'?'❌':'❓';
const cls=h.status;
let cards='<div class="card"><span class="nm">'+icon+' '+h.label+'</span><span class="'+cls+'">'+h.status+'</span></div>';
if(h.suggestions&&h.suggestions.length){
cards+='<div class="card"><span class="sug">→ '+h.suggestions.map(s=>s.handle).join(', ')+'</span></div>';
}
\$('#sresults').innerHTML+=cards;
});
}catch(e){\$('#sstatus').textContent='error: '+e.message}
finally{\$('#sbtn').disabled=false}
}

// Load tools
mcp('email.list_domains',{}).catch(()=>{});
fetch('${MCP}',{method:'GET'}).then(r=>r.json()).then(d=>{
const tools=d.tools||[];
\$('#toolslist').innerHTML=tools.map(t=>'<div class="tool"><div class="tool-name">'+t.name+'</div><div class="tool-desc">'+t.description+'</div></div>').join('');
}).catch(()=>{});

\$('#dq').addEventListener('keydown',e=>{if(e.key==='Enter')checkDomains()});
\$('#sq').addEventListener('keydown',e=>{if(e.key==='Enter')checkSocial()});
</script>
</body>
</html>`;

export default {
  fetch(req: Request): Response {
    const url = new URL(req.url);
    if (url.pathname === "/api/health") {
      return Response.json({ ok: true, service: "names", version: "2.0.0", tools: 23 });
    }
    return new Response(UI, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  },
};
