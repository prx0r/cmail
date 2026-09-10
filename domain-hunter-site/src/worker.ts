// Names Pipeline — agent works, human watches + approves

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
.wrap{max-width:960px;margin:0 auto;padding:1.5rem}
h1{font-size:1.3rem;font-weight:600}
.sub{font-size:.7rem;color:#999;margin-bottom:1rem}
.tabs{display:flex;gap:0;border-bottom:1px solid #ccc;margin-bottom:1rem}
.tab{padding:.5rem .75rem;font-size:.7rem;cursor:pointer;border-bottom:2px solid transparent;color:#666}
.tab.active{border-bottom-color:#111;font-weight:500;color:#111}
.hidden{display:none}
.search{display:flex;gap:0;border:1px solid #ccc;margin-bottom:.75rem;align-items:stretch}
.search input{flex:1;padding:.6rem .75rem;border:none;background:transparent;font-family:inherit;font-size:.8rem;outline:none}
.search button{padding:.6rem 1rem;background:#111;color:#fff;border:none;font-family:inherit;font-size:.7rem;cursor:pointer;white-space:nowrap}
.search button:hover{background:#333}
.search button:disabled{opacity:.5}
.btn-sm{padding:.4rem .6rem;background:#f5f5f5;border:1px solid #ddd;font-size:.65rem;cursor:pointer;color:#333}
.btn-sm:hover{background:#eee}
.status{font-size:.7rem;color:#999;margin-bottom:.75rem;min-height:1em}
table{width:100%;border-collapse:collapse;margin-bottom:1rem}
th{text-align:left;font-size:.6rem;color:#999;text-transform:uppercase;letter-spacing:.1em;padding:.4rem 0;border-bottom:1px solid #eee}
td{padding:.4rem 0;border-bottom:1px solid #f0f0f0;font-size:.75rem}
.avail{color:#166534;font-weight:500}
.taken{color:#999}
.unknown{color:#b45309}
.price{font-size:.7rem;color:#666;text-align:right}
.buy{font-size:.7rem;color:#2563eb;text-decoration:none}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:.4rem;margin-bottom:1rem}
.card{padding:.5rem;border:1px solid #eee;font-size:.7rem;display:flex;justify-content:space-between;align-items:center}
.card .nm{font-weight:500}
.sug{font-size:.6rem;color:#2563eb;padding:.3rem .5rem;border:1px dashed #2563eb;border-radius:4px}
.cost{font-size:.6rem;color:#666;margin-left:auto;padding:.4rem .75rem;white-space:nowrap}
.log{font-family:monospace;font-size:.65rem;background:#1a1a1a;color:#0f0;padding:.75rem;max-height:300px;overflow-y:auto;margin-bottom:1rem;border-radius:4px}
.log .ok{color:#0f0}
.log .err{color:#f44}
.log .info{color:#0af}
.log .warn{color:#fa0}
.pipeline{margin:1rem 0}
.pipe-step{display:flex;align-items:center;gap:.5rem;padding:.5rem;border:1px solid #eee;border-radius:4px;margin-bottom:.4rem;font-size:.75rem}
.pipe-step.done{border-color:#166534;background:#f0fdf4}
.pipe-step.active{border-color:#2563eb;background:#eff6ff}
.pipe-step.pending{opacity:.5}
.pipe-step .num{width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.6rem;font-weight:700}
.pipe-step.done .num{background:#166534;color:#fff}
.pipe-step.active .num{background:#2563eb;color:#fff}
.pipe-step.pending .num{background:#ddd;color:#999}
.approve-box{border:2px solid #f59e0b;background:#fffbeb;padding:.75rem;border-radius:4px;margin:.75rem 0}
.approve-box h4{font-size:.75rem;margin-bottom:.4rem;color:#92400e}
.approve-box .confirm{display:flex;gap:.5rem;margin-top:.5rem}
.approve-box input{flex:1;padding:.4rem;border:1px solid #ccc;font-family:inherit;font-size:.7rem}
.approve-box button{padding:.4rem .75rem;background:#f59e0b;color:#fff;border:none;font-size:.7rem;cursor:pointer}
footer{margin-top:2rem;padding-top:.75rem;border-top:1px solid #eee;font-size:.6rem;color:#bbb}
.spinner{display:inline-block;width:10px;height:10px;border:2px solid #ccc;border-top-color:#111;border-radius:50%;animation:spin .6s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
</style>
</head>
<body>
<div class="wrap">
<h1>one name, everywhere</h1>
<p class="sub">agent acquires domains + socials — human watches and approves</p>

<div class="tabs">
<div class="tab active" onclick="showTab('search')">Search</div>
<div class="tab" onclick="showTab('pipeline')">Pipeline</div>
<div class="tab" onclick="showTab('manual')">Manual</div>
<div class="tab" onclick="showTab('tools')">Tools</div>
</div>

<!-- SEARCH TAB -->
<div id="search-tab">
<div class="search">
<button class="btn-sm" id="iconToggle" onclick="toggleIcons()">▲</button>
<input type="text" id="q" placeholder="postagi, makemoney, yourbrand..." autofocus>
<button id="sbtn" onclick="runSearch()">search</button>
<div class="cost" id="cost"></div>
</div>
<div class="icons-panel" id="iconsPanel">
<div style="font-size:.6rem;color:#999;text-transform:uppercase;letter-spacing:.1em;margin-bottom:.25rem">free (direct API)</div>
<div class="icons-row" id="freeIcons"></div>
<div style="font-size:.6rem;color:#999;text-transform:uppercase;letter-spacing:.1em;margin-bottom:.25rem">paid (Apify $0.006/handle)</div>
<div class="icons-row" id="paidIcons"></div>
<div style="font-size:.6rem;color:#999;text-transform:uppercase;letter-spacing:.1em;margin-bottom:.25rem">manual (check yourself)</div>
<div class="icons-row" id="manualIcons"></div>
</div>
<div class="status" id="status"></div>
<div id="results" class="hidden">
<div class="section-label">domains</div>
<table><thead><tr><th>domain</th><th>status</th><th class="price">best price</th><th></th></tr></thead>
<tbody id="dtbody"></tbody></table>
<div class="section-label">socials</div>
<div class="grid" id="sgrid"></div>
</div>
</div>

<!-- PIPELINE TAB -->
<div id="pipeline-tab" class="hidden">
<div class="status" id="pstatus">enter a name in Search tab first</div>
<div class="pipeline" id="pipeline"></div>
<div id="approveArea"></div>
<div class="log" id="log"></div>
</div>

<!-- MANUAL TAB -->
<div id="manual-tab" class="hidden">
<div style="font-size:.6rem;color:#999;text-transform:uppercase;letter-spacing:.1em;margin-bottom:.5rem">5 platforms — check manually in your browser</div>
<table>
<thead><tr><th>platform</th><th>url</th><th>taken if</th><th>available if</th></tr></thead>
<tbody>
<tr><td>Instagram</td><td><a class="buy" id="ig" href="https://www.instagram.com/" target="_blank">instagram.com/</a></td><td>profile loads</td><td>"page isn't available"</td></tr>
<tr><td>Facebook</td><td><a class="buy" id="fb" href="https://www.facebook.com/" target="_blank">facebook.com/</a></td><td>profile loads</td><td>"page isn't available"</td></tr>
<tr><td>Threads</td><td><a class="buy" id="th" href="https://threads.net/@" target="_blank">threads.net/@</a></td><td>profile loads</td><td>"page not found"</td></tr>
<tr><td>Reddit</td><td><a class="buy" id="rd" href="https://www.reddit.com/user/" target="_blank">reddit.com/user/</a></td><td>profile loads</td><td>"nobody goes by that name"</td></tr>
<tr><td>Twitch</td><td><a class="buy" id="tw" href="https://www.twitch.tv/" target="_blank">twitch.tv/</a></td><td>channel loads</td><td>"time machine" page</td></tr>
</tbody></table>
</div>

<!-- TOOLS TAB -->
<div id="tools-tab" class="hidden">
<div style="font-size:.6rem;color:#999;text-transform:uppercase;letter-spacing:.1em;margin-bottom:.5rem">23 MCP tools — endpoint: cmail.tradesprior.workers.dev/mcp</div>
<div id="toolslist"></div>
</div>

<footer>
<span>names v3.0 · agent pipeline · human approval</span>
<span>cmail + domain-hunter + telnyx</span>
</footer>
</div>

<script>
const \$=s=>document.querySelector(s);
const MCP_URL='${MCP}';
let currentName='';

const PLATFORMS=[
{id:'github',name:'GitHub',free:true},{id:'x',name:'X',free:true},
{id:'youtube',name:'YouTube',free:true},{id:'tiktok',name:'TikTok',free:true},
{id:'npm',name:'npm',free:true},{id:'pypi',name:'PyPI',free:true},
{id:'crates',name:'crates.io',free:true},
{id:'snapchat',name:'Snapchat',free:false},{id:'bluesky',name:'Bluesky',free:false},
{id:'telegram',name:'Telegram',free:false},{id:'gitlab',name:'GitLab',free:false},
{id:'soundcloud',name:'SoundCloud',free:false},{id:'pinterest',name:'Pinterest',free:false},
{id:'instagram',name:'Instagram',free:false,blocked:true},
{id:'facebook',name:'Facebook',free:false,blocked:true},
{id:'threads',name:'Threads',free:false,blocked:true},
{id:'reddit',name:'Reddit',free:false,blocked:true},
{id:'twitch',name:'Twitch',free:false,blocked:true},
];
let selectedPlatforms=PLATFORMS.map(p=>p.id);

function showTab(t){
document.querySelectorAll('.tab').forEach(el=>el.classList.toggle('active',el.textContent.toLowerCase()===t));
['search','pipeline','manual','tools'].forEach(id=>\$('#'+id+'-tab').classList.toggle('hidden',id!==t));
if(t==='pipeline')updatePipeline();
if(t==='manual')updateManualLinks();
}

function toggleIcons(){$('#iconsPanel').classList.toggle('show')}

function renderIcons(){
const free=PLATFORMS.filter(p=>p.free);
const paid=PLATFORMS.filter(p=>!p.free&&!p.blocked);
const blocked=PLATFORMS.filter(p=>p.blocked);
\$('#freeIcons').innerHTML=free.map(p=>'<div class="icon-chip'+(selectedPlatforms.includes(p.id)?' selected':'')+'" data-id="'+p.id+'"><span class="dot" style="background:#166534;width:6px;height:6px;border-radius:50%;display:inline-block"></span> '+p.name+'</div>').join('');
\$('#paidIcons').innerHTML=paid.map(p=>'<div class="icon-chip'+(selectedPlatforms.includes(p.id)?' selected paid':'')+'" data-id="'+p.id+'"><span class="dot" style="background:#f59e0b;width:6px;height:6px;border-radius:50%;display:inline-block"></span> '+p.name+'</div>').join('');
\$('#manualIcons').innerHTML=blocked.map(p=>'<div class="icon-chip" data-id="'+p.id+'" style="opacity:.5;border-style:dashed"><span class="dot" style="background:#999;width:6px;height:6px;border-radius:50%;display:inline-block"></span> '+p.name+'</div>').join('');
document.querySelectorAll('.icon-chip').forEach(el=>{el.onclick=()=>togglePlatform(el.dataset.id)});
updateCost();
}

function togglePlatform(id){
if(selectedPlatforms.includes(id))selectedPlatforms=selectedPlatforms.filter(p=>p!==id);
else selectedPlatforms.push(id);
renderIcons();
}

function updateCost(){
const free=selectedPlatforms.filter(p=>PLATFORMS.find(x=>x.id===p)?.free).length;
const paid=selectedPlatforms.filter(p=>!PLATFORMS.find(x=>x.id===p)?.free).length;
\$('#cost').textContent=paid>0?free+' free + '+paid+' paid ($'+(paid*0.006).toFixed(3)+')':free+' free';
}

function updateManualLinks(){
const q=\$('#q').value.trim()||'';
if(q){
\$('#ig').href='https://www.instagram.com/'+q;\$('#ig').textContent='instagram.com/'+q;
\$('#fb').href='https://www.facebook.com/'+q;\$('#fb').textContent='facebook.com/'+q;
\$('#th').href='https://threads.net/@'+q;\$('#th').textContent='threads.net/@'+q;
\$('#rd').href='https://www.reddit.com/user/'+q;\$('#rd').textContent='reddit.com/user/'+q;
\$('#tw').href='https://www.twitch.tv/'+q;\$('#tw').textContent='twitch.tv/'+q;
}
}

async function mcp(tool,args){
const r=await fetch(MCP_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tool,args})});
return r.json();
}

function log(msg,cls='info'){
const l=\$('#log');
l.innerHTML+='<div class="'+cls+'">['+new Date().toLocaleTimeString()+'] '+msg+'</div>';
l.scrollTop=l.scrollHeight;
}

async function runSearch(){
const q=\$('#q').value.trim();if(!q)return;
currentName=q;
\$('#sbtn').disabled=true;
\$('#status').innerHTML='<span class="spinner"></span> checking '+q+'...';
\$('#results').classList.add('hidden');
log('Starting search for: '+q,'info');
try{
const[d,h]=await Promise.all([
mcp('name.search',{name:q}),
mcp('name.social',{name:q})
]);
if(d.error){\$('#status').textContent='error: '+d.error;return}
const avail=d.domains.filter(x=>x.available);
\$('#status').textContent=avail.length+'/'+d.domains.length+' domains · '+h.available.length+'/'+h.handles.length+' socials';
\$('#dtbody').innerHTML='';
d.domains.sort((a,b)=>a.available===b.available?0:a.available?-1:1);
d.domains.forEach(r=>{
const cls=r.available?'avail':'taken';
const price=r.best_price?'$'+r.best_price+' '+r.best_registrar:'';
const buy=r.available?'<a class="buy" href="https://www.cloudflare.com/products/registrar/?query='+r.domain+'" target="_blank">buy →</a>':'';
\$('#dtbody').innerHTML+='<tr><td>'+r.domain+'</td><td class="'+cls+'">'+(r.available?'available':'taken')+'</td><td class="price">'+price+'</td><td>'+buy+'</td></tr>';
});
\$('#sgrid').innerHTML='';
h.handles.forEach(h=>{
const icon=h.status==='available'?'✅':h.status==='taken'?'❌':'❓';
let cards='<div class="card"><span class="nm">'+icon+' '+h.label+'</span><span class="'+h.status+'">'+h.status+'</span></div>';
if(h.suggestions&&h.suggestions.length)cards+='<div class="card"><span class="sug">→ '+h.suggestions.map(s=>s.handle).join(', ')+'</span></div>';
\$('#sgrid').innerHTML+=cards;
});
\$('#results').classList.remove('hidden');
log('Found '+avail.length+' available domains, '+h.available.length+' available socials','ok');
log('Best domain: '+avail[0]?.domain+' ($'+avail[0]?.best_price+')','ok');
}catch(e){\$('#status').textContent='error: '+e.message;log('Error: '+e.message,'err')}
finally{\$('#sbtn').disabled=false}
}

function updatePipeline(){
if(!currentName){\$('#pstatus').textContent='search for a name first';return}
\$('#pstatus').innerHTML='<span class="spinner"></span> pipeline ready for: '+currentName;
const steps=[
{name:'Check availability',status:'done',tool:'name.search'},
{name:'Check socials',status:'done',tool:'name.social'},
{name:'Buy domain',status:'pending',tool:'name.cf_purchase'},
{name:'Wire email',status:'pending',tool:'name.wire_email'},
{name:'Buy phone',status:'pending',tool:'name.phone_search'},
{name:'Sign up socials',status:'pending',tool:'manual'},
];
\$('#pipeline').innerHTML=steps.map((s,i)=>'<div class="pipe-step '+s.status+'"><div class="num">'+(i+1)+'</div><span>'+s.name+'</span></div>').join('');
\$('#approveArea').innerHTML='<div class="approve-box"><h4>⚠️ Human Approval Required</h4><p style="font-size:.7rem;color:#666">Agent will ask for confirmation before spending money.</p><div class="confirm"><input id="approveText" placeholder="type BUY '+currentName+'.trade to confirm"><button onclick="approve()">Approve</button></div></div>';
}

function approve(){
const text=\$('#approveText').value;
log('Human approval: '+text,'warn');
if(text.startsWith('BUY ')){
log('Domain purchase approved!','ok');
}else{
log('Approval text does not match. Expected: BUY '+currentName+'.trade','err');
}
}

function updateManualLinks(){
const q=\$('#q').value.trim()||currentName||'';
if(q){
\$('#ig').href='https://www.instagram.com/'+q;\$('#ig').textContent='instagram.com/'+q;
\$('#fb').href='https://www.facebook.com/'+q;\$('#fb').textContent='facebook.com/'+q;
\$('#th').href='https://threads.net/@'+q;\$('#th').textContent='threads.net/@'+q;
\$('#rd').href='https://www.reddit.com/user/'+q;\$('#rd').textContent='reddit.com/user/'+q;
\$('#tw').href='https://www.twitch.tv/'+q;\$('#tw').textContent='twitch.tv/'+q;
}
}

mcp('email.list_domains',{}).catch(()=>{});
fetch(MCP_URL).then(r=>r.json()).then(d=>{
const tools=d.tools||[];
\$('#toolslist').innerHTML=tools.map(t=>'<div style="padding:.4rem 0;border-bottom:1px solid #f0f0f0;font-size:.75rem"><b>'+t.name+'</b> <span style="color:#666">'+t.description+'</span></div>').join('');
}).catch(()=>{});

\$('#q').addEventListener('keydown',e=>{if(e.key==='Enter')runSearch()});
renderIcons();
</script>
</body>
</html>`;

export default {
  fetch(req: Request): Response {
    const url = new URL(req.url);
    if (url.pathname === "/api/health") {
      return Response.json({ ok: true, service: "names", version: "3.0.0" });
    }
    return new Response(UI, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  },
};
