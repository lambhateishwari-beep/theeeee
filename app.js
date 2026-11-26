const DEFAULT = { cats: [], items: [] }; // real menu is loaded from menu.json
const IMG = {a:"assets/cafe-interior.jpg", b:"assets/cafe-booth.jpg", c:"assets/cafe-wall.jpg"};
const MIN_DELIVERY = 120;
const telHref = () => state.phone.replace(/[^\d+]/g, "");
const waNum = () => { const d = state.phone.replace(/\D/g, ""); return d.length === 10 ? "91" + d : d; };

const state = { phone: "+91 7559492970", items: DEFAULT.items.slice(), cats: DEFAULT.cats.slice(), upi: "", live: true };
const cart = {}; // key -> {id,size,qty}
const ui = { q:"", cat:"All", diet:"all", cartOpen:false, order:"Dine-in", table:"", pay:"Pay at counter", name:"", phone:"", addr:"", note:"", own:{q:"", cat:"all", form:null} };
let canEdit = true; // the owner dashboard is behind the login screen

const $ = (s, r=document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const ic = (n, c="") => `<svg class="ico ${c}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const logo = c => `<svg class="logo ${c||""}" viewBox="0 0 100 100" role="img" aria-label="The Golden Sip café logo"><use href="#logo"/></svg>`;
const rs = n => "₹" + Number(n).toLocaleString("en-IN");
const byId = id => state.items.find(i => i.id === id);

/* ---------- cart ---------- */
const keyOf = (id, size) => id + (size ? ":" + size : "");
function priceOf(it, size){ return size === "10" && it.p10 ? it.p10 : it.price; }
function cartLines(){
  return Object.values(cart).map(l => ({...l, it: byId(l.id)})).filter(l => l.it && l.qty > 0);
}
function cartTotal(){ return cartLines().reduce((s,l) => s + priceOf(l.it, l.size) * l.qty, 0); }
function cartCount(){ return cartLines().reduce((s,l) => s + l.qty, 0); }
function bump(id, size, d){
  const k = keyOf(id, size);
  const cur = cart[k] || {id, size, qty:0};
  cur.qty = Math.max(0, cur.qty + d);
  if (cur.qty) cart[k] = cur; else delete cart[k];
  renderMenuLists(); renderBar(); renderCartBadge(); if (ui.cartOpen) renderSheet();
}

/* ---------- menu rendering ---------- */
function itemRow(it){
  const sizes = it.p10 ? ["7","10"] : [""];
  const sizeLabel = s => s ? `${s}″ ${rs(priceOf(it,s))}` : "";
  const acts = sizes.map(s => {
    const l = cart[keyOf(it.id, s)];
    if (!it.ok) return `<button class="add" disabled>SOLD OUT</button>`;
    if (l) return `<span class="step" role="group" aria-label="${esc(it.name)} ${s? s+' inch':''} quantity"><button data-b="${it.id}|${s}|-1" aria-label="Remove one">−</button><span>${l.qty}</span><button data-b="${it.id}|${s}|1" aria-label="Add one">+</button></span>`;
    return `<button class="add" data-b="${it.id}|${s}|1" aria-label="Add ${esc(it.name)} ${s? s+' inch':''}">+ ADD${s ? " " + s + "″" : ""}</button>`;
  }).join("");
  const price = it.p10 ? `<span class="pr">${rs(it.price)} / ${rs(it.p10)}</span>` : `<span class="pr">${rs(it.price)}</span>`;
  return `<div class="it ${it.ok?"":"off"}"><span class="vd ${it.veg?"":"nv"}" title="${it.veg?"Veg":"Non-veg"}"></span><div class="tx"><div class="nm">${esc(it.name)}</div><div class="sb">${esc(it.note || (it.cat + ", better vibes"))}</div></div>${price}<div class="acts">${acts}</div></div>`;
}
function matches(it){
  const q = ui.q.trim().toLowerCase();
  if (ui.diet === "veg" && !it.veg) return false;
  if (ui.diet === "non" && it.veg) return false;
  if (ui.cat !== "All" && it.cat !== ui.cat) return false;
  if (q && !(it.name + " " + it.cat + " " + it.note).toLowerCase().includes(q)) return false;
  return true;
}
function renderLoved(){
  const el = $("#loved"); if (!el) return;
  const l = state.items.filter(i => i.loved && i.ok);
  const mk = (veg, title) => {
    const xs = l.filter(i => i.veg === veg);
    if (!xs.length) return "";
    return `<div class="lv"><h3><span class="vd ${veg?"":"nv"}"></span>${title}<small>${xs.length} favourites</small></h3><div style="display:grid;gap:10px">${xs.map(itemRow).join("")}</div></div>`;
  };
  el.innerHTML = mk(true, "Veg Most Loved") + mk(false, "Non-veg Most Loved");
  el.hidden = !el.innerHTML;
}
function renderMenuLists(){
  const box = $("#menulist"); if (!box) return;
  const cats = state.cats.filter(c => state.items.some(i => i.cat === c));
  const shown = state.items.filter(matches);
  $("#count").textContent = `Full menu · ${state.items.length} choices`;
  $("#chips").innerHTML = ["All", ...cats].map(c => `<button class="chip" data-cat="${esc(c)}" aria-pressed="${ui.cat===c}">${esc(c)}</button>`).join("");
  $("#diet").innerHTML = [["all","All"],["veg","Veg only"],["non","Non-veg"]].map(([k,t]) => `<button class="chip" data-diet="${k}" aria-pressed="${ui.diet===k}">${t}</button>`).join("");
  if (!shown.length){ box.innerHTML = `<div class="empty">No dishes match that search. Try another word or clear the filters.</div>`; renderLoved(); return; }
  box.innerHTML = cats.map(c => {
    const xs = shown.filter(i => i.cat === c); if (!xs.length) return "";
    const subs = [["veg", xs.filter(i=>i.veg)], ["non", xs.filter(i=>!i.veg)]].filter(s => s[1].length);
    const both = subs.length > 1;
    return `<section class="cat" aria-label="${esc(c)}"><h3>${esc(c)}<small>${xs.length} dishes</small></h3>${subs.map(([k,list]) => `${both || k==="non" ? `<div class="sub"><span class="vd ${k==="veg"?"":"nv"}"></span>${k==="veg"?"Veg":"Non-veg"}</div>`:`<div class="sub"><span class="vd"></span>Veg</div>`}<div class="list">${list.map(itemRow).join("")}</div>`).join("")}</section>`;
  }).join("");
  renderLoved();
}
function renderBar(){
  const b = $("#bar"); if (!b) return;
  const n = cartCount();
  if (!n || ui.cartOpen || route() !== "home"){ b.innerHTML = ""; return; }
  const t = cartTotal();
  b.innerHTML = `<button id="openCart"><span>${ic("bag")} ${n} item${n>1?"s":""}<small>${t >= MIN_DELIVERY ? "Delivery available" : "Delivery from " + rs(MIN_DELIVERY)}</small></span><span>${rs(t)} ${ic("arrow")}</span></button>`;
}
function renderCartBadge(){
  const n = cartCount();
  document.querySelectorAll(".cartbtn b").forEach(e => e.remove());
  if (n) document.querySelectorAll(".cartbtn").forEach(c => c.insertAdjacentHTML("beforeend", `<b>${n}</b>`));
}

/* ---------- views ---------- */
const route = () => { const h = location.hash.slice(1); return h === "instagram" || h === "owner" ? h : "home"; };
function header(cur){
  const a = (h, label, icon) => `<a href="#${h}" ${cur===h?'aria-current="page"':""}>${icon||""}${label}</a>`;
  return `<header class="hdr"><div class="wrap"><a class="brand" href="#" aria-label="The Golden Sip home">${logo()}<span>The Golden <em>Sip</em></span></a>
  <nav class="nav" aria-label="Main">${a("story","Story")}${a("menu","Menu")}${a("visit","Visit")}${a("instagram","Instagram",ic("insta"))}${a("owner","Owner")}</nav>
  <div class="hdr-r"><a class="call" href="tel:${telHref()}">${ic("phone")}${esc(state.phone)}</a><button class="cartbtn" id="cartBtn" aria-label="Open your order">${ic("bag")}</button></div></div>
  <div class="mnav"><div class="wrap">${a("story","Story")}${a("menu","Menu")}${a("visit","Visit")}${a("instagram","Instagram",ic("insta"))}${a("owner","Owner")}</div></div></header>`;
}
function renderHome(){
  $("#app").innerHTML = header("") + `
  <main>
  <section class="hero"><div class="wrap">
    <div class="eyebrow mono">${ic("spark")}<span>The Golden Sip · Loni Kalbhor</span></div>
    <h1>Made for golden <em>hours.</em></h1>
    <p>A café and restaurant near MIT College, Pune. Made for slow mornings, long lunches, and the kind of nights you wish went on forever.</p>
    <div class="cta"><a class="btn gold" href="#menu">Explore the menu ${ic("arrow")}</a><a class="link" href="https://wa.me/${waNum()}?text=${encodeURIComponent("Hi The Golden Sip! I'd like to reserve a table.")}" target="_blank" rel="noopener">Book your table ${ic("arrow")}</a></div>
    <div class="live"><i></i>Serving comfort, coffee &amp; conversation, 10 AM to 4 AM</div>
    <figure class="figure"><img src="${IMG.a}" alt="Inside The Golden Sip café with ceiling fans, seating and a glowing arch sign"><div class="badge"><div>${ic("star")}Open<br>10 AM –<br>4 AM</div></div></figure>
  </div>
  <div class="ticker" aria-hidden="true"><div>${Array(12).fill('<span>OPEN 10 AM – 4 AM ✦</span><span>THE GOLDEN SIP ✦</span>').join("")}</div></div>
  </section>

  <section class="sec" id="story"><div class="wrap two">
    <div><div class="tag"><span>01 — The Golden Sip</span></div>
    <h2>A little more <em>golden.</em></h2>
    <p class="lead">Your Golden Sip menu is live online with all the dishes and prices guests already know. Pull up a chair anytime from 10 AM to 4 AM: coffee in the morning, comfort food at noon, and frappes long after midnight.</p>
    <a class="link" href="#visit">Find your way here ${ic("arrow")}</a></div>
    <div class="pic"><img src="${IMG.b}" alt="Cushioned booth seating under a palm-leaf mural"><div class="stat"><b>18</b><small>hours of<br>good taste</small></div></div>
  </div></section>

  <section class="sec" id="menu" style="padding-top:0"><div class="wrap">
    <div class="tag"><span>02 — Your menu</span></div>
    <h2>The menu, <em>golden.</em></h2>
    <p class="lead">Quick-add your favourites, see the live total, then send your order straight to the café.</p>
    <div class="loved" id="loved"></div>
    <div class="fm">
      <div class="mono" id="count"></div>
      <h2 style="margin-top:14px">Everything we <em>serve.</em></h2>
      <label class="search">${ic("search")}<input id="q" type="search" placeholder="Search the menu" autocomplete="off" aria-label="Search the menu"></label>
      <div class="chips" id="chips"></div><div class="chips" id="diet"></div>
      <div id="menulist"></div>
    </div>
  </div></section>

  <section class="sec" id="visit" style="padding-top:0"><div class="wrap two">
    <div class="pic"><img src="${IMG.c}" alt="Colourful 'good food good mood' wall beside café tables"></div>
    <div><div class="tag"><span>03 — Come by anytime</span></div>
    <h2>Your table is <em>waiting.</em></h2>
    <p class="lead">Near MIT College, Pune Solapur Road, Loni Kalbhor — 412201. Walk in or call <a href="tel:${telHref()}" style="color:var(--gold)">${esc(state.phone)}</a>.</p>
    <div class="info">
      <div>${ic("clock")}<span><b>Open 10 AM to 4 AM</b><small>Monday — Sunday · Every day</small></span></div>
      <div>${ic("fork")}<span><b>Walk-ins welcome</b><small>Dine-in &amp; takeaway, 10 AM to 4 AM</small></span></div>
      <div>${ic("pin")}<span><b>Find us</b><small>200M from MIT ADT · Open in Google Maps</small></span></div>
      <div>${ic("insta")}<span><b>Follow us</b><small>@_thegoldensip_</small></span></div>
    </div>
    <a class="btn gold" href="https://wa.me/${waNum()}?text=${encodeURIComponent("Hi The Golden Sip! I'd like to reserve a table.")}" target="_blank" rel="noopener">Reserve your table ${ic("arrow")}</a></div>
  </div></section>
  </main>
  <footer class="foot">${logo()}<div>© The Golden Sip · Open 10 AM – 4 AM · <a href="tel:${telHref()}">${esc(state.phone)}</a> ·<br><a href="#instagram">@_thegoldensip_</a></div></footer>
  <div class="bar" id="bar"></div>`;
  $("#q").value = ui.q;
  renderMenuLists(); renderBar(); renderCartBadge();
}

/* QR */
function makeQR(canvas, text, withLogo){
  const q = qrcode(0, "H"); q.addData(text); q.make();
  const n = q.getModuleCount(), px = 12, pad = 0, size = n * px;
  canvas.width = canvas.height = size;
  const g = canvas.getContext("2d");
  g.fillStyle = "#fff"; g.fillRect(0,0,size,size);
  g.fillStyle = "#111";
  for (let r=0;r<n;r++) for (let c=0;c<n;c++) if (q.isDark(r,c)) g.fillRect(c*px+pad, r*px+pad, px, px);
  if (withLogo){
    const s = size * 0.2, x = (size - s)/2;
    g.fillStyle = "#fff"; g.fillRect(x-8, x-8, s+16, s+16);
    g.fillStyle = "#0d0a08"; g.beginPath(); g.arc(size/2, size/2, s/2, 0, 7); g.fill();
    g.fillStyle = "#f0c274"; g.textAlign = "center"; g.font = `italic ${s*.5}px Georgia,serif`; g.fillText("GS", size/2, size/2 + s*.08);
    g.fillStyle = "#f7f1e6"; g.font = `700 ${s*.1}px sans-serif`; g.fillText("THE GOLDEN SIP", size/2, size/2 + s*.26);
  }
}
const menuUrl = () => location.href.split("#")[0] + "#menu";
function renderInsta(){
  $("#app").innerHTML = header("instagram") + `<main class="wrap" style="max-width:680px;padding-bottom:80px">
  <a class="back" href="#">${ic("back")} Back to the café</a>
  <div class="qrcard">${logo()}<div class="mono">The Golden Sip</div><h1>Follow the golden hours.</h1><p>Point your phone camera at this code to open our Instagram profile.</p>
  <div class="qrbox"><img id="qrc" src="assets/instagram-qr.jpg" alt="Instagram QR code for @_thegoldensip_" width="320" height="320"></div>
  <h2>@_thegoldensip_</h2><small>Open 10 AM – 4 AM · Loni Kalbhor</small></div>
  <div class="qrdown"><span style="color:var(--gold)">${ic("insta")}</span><div class="mono">The Golden Sip on Instagram</div><h2>See what is new.</h2>
  <p>New dishes, late-night specials and café moments. Scan the code or open the profile directly.</p>
  <a class="btn gold" href="https://www.instagram.com/_thegoldensip_/" target="_blank" rel="noopener" style="justify-content:center">${ic("insta")} Open Instagram profile</a>
  <button class="btn" id="dlqr" style="justify-content:center">${ic("down")} Download QR image</button></div></main>`;
  renderCartBadge();
}
const OWNER_PW = "6622e7a92227fde47464de4e5b74efd47166f4797305c1af250e3d14ff73a6cb", OWNER_IDS = ["957f550879928f79868075e1ad0e8fa183b81b61926c0ecb613a44aedad63333", "81d08a0536906dcabaff94c919096752e44522c00fe7b1e0dbd4a99e35a260b2"];
let unlocked = false;
try { unlocked = sessionStorage.getItem("gs-owner") === "1"; } catch(_){}
async function slow(t){
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(t), "PBKDF2", false, ["deriveBits"]);
  const b = await crypto.subtle.deriveBits({name:"PBKDF2", salt:new TextEncoder().encode("gs-owner-v1"), iterations:150000, hash:"SHA-256"}, k, 256);
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2,"0")).join("");
}
async function credsOk(id, pw){
  id = id.trim().toLowerCase();
  const norm = id.includes("@") ? id : id.replace(/\D/g, "").slice(-10);
  const [i, p] = await Promise.all([slow("id:" + norm), slow("pw:" + pw)]);
  return OWNER_IDS.includes(i) && p === OWNER_PW;
}
function renderLogin(){
  $("#app").innerHTML = header("owner") + `<main class="wrap" style="max-width:560px;padding-block:36px 100px">
  <a class="back" href="#">${ic("back")} Back to public menu</a>
  <div style="width:74px;height:74px;border-radius:20px;background:#2a1f14;display:grid;place-items:center;color:var(--gold);margin:24px 0 28px"><svg class="ico" style="width:34px;height:34px" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.500" r="1"/></svg></div>
  <h1 style="font:400 clamp(40px,8vw,56px)/1.05 var(--serif);margin:0 0 12px">Owner access</h1>
  <p style="color:var(--muted);font-size:18px;margin:0 0 26px">Sign in to add dishes, create categories and update live prices.</p>
  <form id="loginForm" autocomplete="on"><label class="l" for="lid" style="margin-top:0">Owner email or phone</label><input class="fld" id="lid" required autocomplete="username" placeholder="Email address or phone number">
  <label class="l" for="lpw">Password</label><input class="fld" id="lpw" type="password" required autocomplete="current-password">
  <div class="hint" id="lerr" role="alert" style="color:var(--nonveg)" hidden>That email, phone or password is not right. Check it and try again.</div>
  <button class="btn gold" type="submit" style="width:100%;justify-content:center;margin-top:24px;padding:16px">Open owner dashboard</button></form></main>`;
  renderCartBadge();
}

/* Owner */
const DRAFT_KEY = "gs-menu-draft";
function menuJson(){ return { cats: state.cats, items: state.items, upi: state.upi, phone: state.phone, updated: new Date().toISOString() }; }
function persist(msg){
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(menuJson())); } catch(_){}
  toast((msg || "Saved") + ". Download menu.json to publish");
  if (route() === "home") { renderMenuLists(); renderBar(); }
}
function renderOwner(){
  if (!unlocked){ renderLogin(); return; }
  const o = ui.own;
  const rows = state.items.filter(i => (o.cat === "all" || i.cat === o.cat) && (!o.q || (i.name+i.cat).toLowerCase().includes(o.q.toLowerCase())));
  const f = o.form;
  $("#app").innerHTML = header("owner") + `<main class="wrap own" style="max-width:820px">
  <div class="mono">Owner dashboard</div><h1>Run the menu, <em style="color:var(--gold-hi)">live.</em></h1>
  <div class="panel"><header><h2>Live menu items</h2><p>Price and availability changes appear on the public menu immediately.</p>
    <div class="tools"><button class="btn" id="addCat">${ic("plus")} Category</button><button class="btn gold" id="addDish">${ic("plus")} Add dish</button><button class="btn" id="lockOut">${ic("x")} Sign out</button></div></header>
    ${f === "cat" ? `<form class="form" id="catForm"><label class="l" for="cn" style="margin:0">New category name</label><input class="fld" id="cn" required maxlength="40" placeholder="e.g. Breakfast"><div class="tools"><button class="btn gold" type="submit">Add category</button><button class="btn" type="button" id="cancelForm">Cancel</button></div></form>` : ""}
    ${f === "dish" ? `<form class="form" id="dishForm"><div class="grid"><div><label class="l" for="dn" style="margin:0 0 6px">Dish name</label><input class="fld" id="dn" required maxlength="60"></div><div><label class="l" for="dp" style="margin:0 0 6px">Price (₹)</label><input class="fld" id="dp" type="number" min="0" required inputmode="numeric"></div></div>
      <div class="grid"><div><label class="l" for="dc" style="margin:0 0 6px">Category</label><select class="fld" id="dc">${state.cats.map(c=>`<option>${esc(c)}</option>`).join("")}</select></div><div><label class="l" for="dv" style="margin:0 0 6px">Type</label><select class="fld" id="dv"><option value="1">Veg</option><option value="0">Non-veg</option></select></div></div>
      <div><label class="l" for="dnote" style="margin:0 0 6px">Short description (optional)</label><input class="fld" id="dnote" maxlength="90"></div>
      <div class="tools"><button class="btn gold" type="submit">Add dish</button><button class="btn" type="button" id="cancelForm">Cancel</button></div></form>` : ""}
    <div class="filters"><label class="search">${ic("search")}<input id="oq" type="search" placeholder="Search dishes" aria-label="Search dishes"></label>
      <select id="oc" aria-label="Category filter"><option value="all">All categories</option>${state.cats.map(c=>`<option ${o.cat===c?"selected":""}>${esc(c)}</option>`).join("")}</select></div>
    <div id="orows">${rows.length ? rows.slice(0,60).map(ownRow).join("") : `<div class="empty" style="border:0">No dishes found.</div>`}${rows.length>60?`<div class="empty" style="border:0">Showing the first 60 of ${rows.length}. Search or pick a category to narrow it down.</div>`:""}</div>
  </div>
  <div class="panel"><header><h2>Publish changes</h2><p>Edits are saved on this device first. To show them to every guest, download menu.json, replace the file in your GitHub repository and let your host redeploy.</p>
    <div class="tools"><button class="btn gold" id="dlMenu">${ic("down")} Download menu.json</button><button class="btn" id="discardDraft">Discard unsaved edits</button></div></header></div>
  <div class="panel"><header><h2>Contact phone</h2><p>Shown on the website, used for the Call button and as the WhatsApp number that receives orders.</p>
    <div class="pricebox"><label><span>${ic("phone")}</span><input id="phone" type="tel" placeholder="+91 7559492970" value="${esc(state.phone)}" aria-label="Contact phone number" autocomplete="off"></label><button class="sq" id="savePhone" aria-label="Save phone number">${ic("save")}</button></div></header></div>
  <div class="panel"><header><h2>Online payment</h2><p>Add your UPI ID so guests who choose Online see a payment QR with the exact amount.</p>
    <div class="pricebox"><label><span>@</span><input id="upi" placeholder="yourname@upi" value="${esc(state.upi)}" aria-label="UPI ID"></label><button class="sq" id="saveUpi" aria-label="Save UPI ID">${ic("save")}</button></div></header></div>
  </main>`;
  $("#oq").value = o.q;
  renderCartBadge();
}
function ownRow(it){
  return `<div class="row" data-id="${it.id}"><h3><span class="dot ${it.veg?"":"nv"}"></span>${esc(it.name)}</h3><div class="ct">${esc(it.cat)}${it.p10?" · 7″ price shown, 10″ "+rs(it.p10):""}</div>
  <label class="ck"><input type="checkbox" data-ok ${it.ok?"checked":""}> Available</label>
  <button class="mostl" data-loved aria-pressed="${!!it.loved}">${ic("star")} Most Loved</button>
  <div class="pricebox"><label><span>₹</span><input data-price type="number" min="0" inputmode="numeric" value="${it.price}" aria-label="Price for ${esc(it.name)}"></label>${it.p10?`<label><span>10″ ₹</span><input data-price10 type="number" min="0" inputmode="numeric" value="${it.p10}" aria-label="10 inch price"></label>`:""}<button class="sq" data-save aria-label="Save price">${ic("save")}</button></div>
  <button class="trash" data-del aria-label="Delete ${esc(it.name)}">${ic("trash")}</button></div>`;
}

/* ---------- cart sheet ---------- */
function renderSheet(){
  const portal = $("#portal");
  if (!ui.cartOpen){ portal.innerHTML = ""; return; }
  const lines = cartLines(), total = cartTotal();
  const deliv = total >= MIN_DELIVERY;
  if (ui.order === "Delivery" && !deliv) ui.order = "Dine-in";
  const payOpts = ui.order === "Dine-in" ? ["Pay at counter"] : ["Online"];
  ui.pay = payOpts[0];
  const needAddr = ui.order === "Delivery";
  const ready = lines.length && (!needAddr || (ui.name.trim() && ui.phone.trim().length >= 8 && ui.addr.trim()));
  portal.innerHTML = `<div class="shade" id="shade"><div class="sheet" role="dialog" aria-modal="true" aria-label="Your golden order">
  <div class="sh-top"><div><h3>Your golden order</h3><div class="sub2">Review your picks and send them directly to the café.</div></div><button class="x" id="closeCart" aria-label="Close">${ic("x")}</button></div>
  ${lines.length ? lines.map(l => `<div class="line"><div><div class="nm">${esc(l.it.name)}${l.size?` · ${l.size}″`:""}</div><div class="pr">${rs(priceOf(l.it,l.size))}</div></div><span class="step"><button data-b="${l.id}|${l.size}|-1" aria-label="Remove one">−</button><span>${l.qty}</span><button data-b="${l.id}|${l.size}|1" aria-label="Add one">+</button></span></div>`).join("") : `<div class="empty">Your order is empty. Add something from the menu.</div>`}
  <label class="l">Order type</label>
  <div class="seg">${[["Dine-in","store"],["Takeaway","walk"],["Delivery","bike"]].map(([t,i]) => `<button data-ot="${t}" aria-pressed="${ui.order===t}" ${t==="Delivery"&&!deliv?"disabled":""}>${ic(i)}${t}</button>`).join("")}</div>
  ${deliv ? `<div class="hint">Delivery available for this ${rs(MIN_DELIVERY)}+ order.</div>` : `<div class="hint">Add ${rs(MIN_DELIVERY-total)} more to unlock delivery.</div>`}
  ${ui.order === "Dine-in" ? `<label class="l" for="tbl">Table number (optional)</label><input class="fld" id="tbl" placeholder="e.g. 4" value="${esc(ui.table)}" inputmode="numeric">` : ""}
  ${needAddr ? `<label class="l" for="cname">Customer name</label><input class="fld" id="cname" placeholder="Your full name" value="${esc(ui.name)}" autocomplete="name"><label class="l" for="cph">Phone number</label><input class="fld" id="cph" placeholder="Your contact number" value="${esc(ui.phone)}" inputmode="tel" autocomplete="tel"><label class="l" for="cad">Full delivery address</label><textarea class="fld" id="cad" placeholder="Building, street, landmark and PIN">${esc(ui.addr)}</textarea>` : ""}
  <label class="l">Payment method</label>
  <div class="seg">${payOpts.map(p => `<button data-pay="${p}" aria-pressed="${ui.pay===p}">${ic("card")}${p}</button>`).join("")}</div>
  ${ui.pay === "Online" ? (state.upi ? `<div class="upi"><div style="font-weight:600;margin-bottom:8px">Scan to pay ${rs(total)} with any UPI app</div><canvas id="upiqr"></canvas><p>${esc(state.upi)}</p><p>Your order is confirmed by the café after payment is checked.</p></div>` : `<div class="hint" style="color:var(--muted)">Online payment details are shared by the café on WhatsApp after you send the order.</div>`) : ""}
  <label class="l" for="note">Special instructions</label><textarea class="fld" id="note" placeholder="Less spicy, no onion...">${esc(ui.note)}</textarea>
  <div class="tot"><span>Total</span><b>${rs(total)}</b></div>
  <button class="wa" id="sendWa" ${ready?"":"disabled"}>${ic("wa")} Confirm on WhatsApp</button>
  <button class="clr" id="clear">Clear cart</button></div></div>`;
  const qc = $("#upiqr");
  if (qc && state.upi) makeQR(qc, `upi://pay?pa=${encodeURIComponent(state.upi)}&pn=${encodeURIComponent("The Golden Sip")}&am=${total}&cu=INR`, false);
}
function sendWhatsApp(){
  const lines = cartLines();
  let t = "Hi The Golden Sip! I'd like to place an order.\n\n";
  lines.forEach(l => t += `• ${l.it.name}${l.size?` (${l.size} inch)`:""} x${l.qty} — ${rs(priceOf(l.it,l.size)*l.qty)}\n`);
  t += `\nTotal: ${rs(cartTotal())}\nOrder type: ${ui.order}\n`;
  if (ui.order === "Dine-in" && ui.table.trim()) t += `Table: ${ui.table.trim()}\n`;
  if (ui.order === "Delivery") t += `Name: ${ui.name.trim()}\nPhone: ${ui.phone.trim()}\nAddress: ${ui.addr.trim()}\n`;
  t += `Payment: ${ui.pay}`;
  if (ui.note.trim()) t += `\nNotes: ${ui.note.trim()}`;
  window.open("https://wa.me/" + waNum() + "?text=" + encodeURIComponent(t), "_blank", "noopener");
}

/* ---------- toast ---------- */
let toastT;
function toast(msg){
  document.querySelectorAll(".toast").forEach(e => e.remove());
  const d = document.createElement("div"); d.className = "toast"; d.setAttribute("role","status"); d.textContent = msg; document.body.appendChild(d);
  clearTimeout(toastT); toastT = setTimeout(() => d.remove(), 2600);
}

/* ---------- events ---------- */
document.addEventListener("click", async e => {
  const t = e.target;
  const b = t.closest("[data-b]");
  if (b){ const [id,size,d] = b.dataset.b.split("|"); bump(id, size, +d); return; }
  if (t.closest("#cartBtn") || t.closest("#openCart")){ ui.cartOpen = true; renderSheet(); renderBar(); return; }
  if (t.closest("#closeCart") || t.id === "shade"){ ui.cartOpen = false; renderSheet(); renderBar(); return; }
  const ch = t.closest("[data-cat]"); if (ch){ ui.cat = ch.dataset.cat; renderMenuLists(); return; }
  const dt = t.closest("[data-diet]"); if (dt){ ui.diet = dt.dataset.diet; renderMenuLists(); return; }
  const ot = t.closest("[data-ot]"); if (ot){ ui.order = ot.dataset.ot; renderSheet(); return; }
  const py = t.closest("[data-pay]"); if (py){ ui.pay = py.dataset.pay; renderSheet(); return; }
  if (t.closest("#clear")){ for (const k in cart) delete cart[k]; ui.cartOpen = false; renderSheet(); renderMenuLists(); renderBar(); renderCartBadge(); return; }
  if (t.closest("#sendWa")){ sendWhatsApp(); return; }
  if (t.closest("#dlqr")){
    const a = document.createElement("a"); a.href = $("#qrc").src; a.download = "the-golden-sip-instagram-qr.jpg"; document.body.appendChild(a); a.click(); a.remove();
    return;
  }
  if (t.closest("#cpqr")){ try { await navigator.clipboard.writeText(menuUrl()); toast("Menu link copied"); } catch(_){ toast(menuUrl()); } return; }
  /* owner */
  if (route() === "owner"){
    if (t.closest("#lockOut")){ unlocked = false; try { sessionStorage.removeItem("gs-owner"); } catch(_){} renderOwner(); return; }
    if (t.closest("#addCat")){ ui.own.form = "cat"; renderOwner(); $("#cn")?.focus(); return; }
    if (t.closest("#addDish")){ ui.own.form = "dish"; renderOwner(); $("#dn")?.focus(); return; }
    if (t.closest("#cancelForm")){ ui.own.form = null; renderOwner(); return; }
    if (t.closest("#dlMenu")){
      const blob = new Blob([JSON.stringify(menuJson(), null, 2)], {type:"application/json"});
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "menu.json"; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000); toast("menu.json downloaded. Upload it to GitHub to publish"); return;
    }
    if (t.closest("#discardDraft")){ try { localStorage.removeItem(DRAFT_KEY); } catch(_){} location.reload(); return; }
    if (t.closest("#savePhone")){
      const v = $("#phone").value.trim(), d = v.replace(/\D/g, "");
      if (d.length < 10 || d.length > 13 || !/^[+\d\s()-]+$/.test(v)){ toast("Enter a valid phone number, like +91 7559492970"); return; }
      if (!canEdit){ toast("Sign in as the owner to make changes"); return; }
      state.phone = v; persist("Phone number updated everywhere"); return;
    }
    if (t.closest("#saveUpi")){ state.upi = $("#upi").value.trim(); persist("UPI ID saved"); return; }
    const row = t.closest(".row");
    if (row){
      const it = byId(row.dataset.id); if (!it) return;
      if (!canEdit){ toast("Sign in as the owner to make changes"); return; }
      if (t.closest("[data-loved]")){ it.loved = !it.loved; persist(); renderOwner(); return; }
      if (t.closest("[data-save]")){
        const p = +row.querySelector("[data-price]").value, p10 = row.querySelector("[data-price10]");
        if (!(p >= 0) || row.querySelector("[data-price]").value === ""){ toast("Enter a valid price"); return; }
        it.price = p; if (p10) it.p10 = +p10.value || it.p10; persist(`${it.name} is now ${rs(p)}`); return;
      }
      if (t.closest("[data-del]")){
        if (row.dataset.arm !== "1"){ row.dataset.arm = "1"; row.querySelector("[data-del]").innerHTML = `${ic("trash")} <span style="font-size:14px">Tap again to delete</span>`; setTimeout(()=>{ row.dataset.arm = ""; }, 3000); return; }
        state.items = state.items.filter(x => x.id !== it.id); for (const k of Object.keys(cart)) if (cart[k].id === it.id) delete cart[k];
        persist(`${it.name} deleted`); renderOwner(); return;
      }
    }
  }
});
document.addEventListener("change", e => {
  const t = e.target;
  if (t.id === "oc"){ ui.own.cat = t.value; renderOwner(); return; }
  const row = t.closest(".row");
  if (row && t.matches("[data-ok]")){
    if (!canEdit){ t.checked = !t.checked; toast("Sign in as the owner to make changes"); return; }
    const it = byId(row.dataset.id); it.ok = t.checked; persist(`${it.name} is ${it.ok ? "available" : "sold out"}`);
  }
});
document.addEventListener("input", e => {
  const t = e.target;
  if (t.id === "q"){ ui.q = t.value; renderMenuLists(); }
  else if (t.id === "oq"){ ui.own.q = t.value; const rows = state.items.filter(i => (ui.own.cat==="all"||i.cat===ui.own.cat) && (!ui.own.q || (i.name+i.cat).toLowerCase().includes(ui.own.q.toLowerCase()))); $("#orows").innerHTML = rows.length ? rows.slice(0,60).map(ownRow).join("") : `<div class="empty" style="border:0">No dishes found.</div>`; }
  else if (t.id === "tbl") ui.table = t.value;
  else if (t.id === "cname") { ui.name = t.value; syncReady(); }
  else if (t.id === "cph") { ui.phone = t.value; syncReady(); }
  else if (t.id === "cad") { ui.addr = t.value; syncReady(); }
  else if (t.id === "note") ui.note = t.value;
});
function syncReady(){
  const b = $("#sendWa"); if (!b) return;
  b.disabled = !(cartLines().length && (ui.order !== "Delivery" || (ui.name.trim() && ui.phone.trim().length >= 8 && ui.addr.trim())));
}
document.addEventListener("submit", async e => {
  e.preventDefault();
  if (e.target.id === "loginForm"){
    let ok = false;
    try { ok = await credsOk($("#lid").value, $("#lpw").value); } catch(_){}
    if (ok){ unlocked = true; try { sessionStorage.setItem("gs-owner","1"); } catch(_){} renderOwner(); }
    else { $("#lerr").hidden = false; $("#lpw").value = ""; $("#lpw").focus(); }
    return;
  }
  if (e.target.id === "catForm"){
    const n = $("#cn").value.trim(); if (!n) return;
    if (state.cats.some(c => c.toLowerCase() === n.toLowerCase())){ toast("That category already exists"); return; }
    state.cats.push(n); ui.own.form = null; persist(`${n} category added`); renderOwner();
  }
  if (e.target.id === "dishForm"){
    const name = $("#dn").value.trim(), price = +$("#dp").value; if (!name || !(price >= 0)) return;
    const id = "n" + Date.now().toString(36);
    state.items.unshift({id, name, cat:$("#dc").value, veg:$("#dv").value === "1", price, ok:true, loved:false, note:$("#dnote").value.trim()});
    ui.own.form = null; ui.own.cat = "all"; ui.own.q = ""; persist(`${name} added to the menu`); renderOwner();
  }
});
document.addEventListener("keydown", e => { if (e.key === "Escape" && ui.cartOpen){ ui.cartOpen = false; renderSheet(); renderBar(); } });

/* ---------- routing ---------- */
function render(){
  const r = route();
  if (r === "instagram") renderInsta(); else if (r === "owner") renderOwner(); else renderHome();
  renderBar();
  if (r === "home"){
    const id = location.hash.slice(1);
    const el = id && document.getElementById(id);
    if (el) requestAnimationFrame(() => el.scrollIntoView()); else window.scrollTo(0,0);
  } else window.scrollTo(0,0);
}
let lastRoute = null;
window.addEventListener("hashchange", () => {
  const r = route();
  if (r === "home" && lastRoute === "home"){ const el = document.getElementById(location.hash.slice(1)); if (el) el.scrollIntoView(); else window.scrollTo(0,0); return; }
  lastRoute = r; render();
});

/* ---------- load menu.json, then start ---------- */
function applyMenu(d){
  if (!d || !Array.isArray(d.items) || !d.items.length) return;
  state.items = d.items; if (Array.isArray(d.cats)) state.cats = d.cats;
  state.upi = d.upi || "";
  if (typeof d.phone === "string" && d.phone.trim()) state.phone = d.phone;
}
(async () => {
  try { const r = await fetch("menu.json", {cache:"no-cache"}); applyMenu(await r.json()); } catch(_){}
  if (unlocked) { try { applyMenu(JSON.parse(localStorage.getItem(DRAFT_KEY) || "null")); } catch(_){} }
  lastRoute = route(); render();
})();
