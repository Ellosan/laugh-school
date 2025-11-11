(function(){
  const STORAGE_KEY = "laughschool_items_v1";
  const POLL_VOTE_KEY = "laughschool_poll_votes_v1";
  const ADMIN_SESSION_KEY = "laughschool_admin_session";
  const ADMIN_PASSWORD = "LAUGHSCHOOLSERVER2025";

  const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
  const nowISO = () => new Date().toISOString();

  function save(items){ localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }
  function load(){
    try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]") }catch(e){ return [] }
  }
  function saveVotes(map){ localStorage.setItem(POLL_VOTE_KEY, JSON.stringify(map||{})); }
  function loadVotes(){ try{ return JSON.parse(localStorage.getItem(POLL_VOTE_KEY)||"{}") }catch(e){ return {} } }
  function setAdminSession(val){ sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(!!val)); }
  function getAdminSession(){ try{ return JSON.parse(sessionStorage.getItem(ADMIN_SESSION_KEY)||"false") }catch(e){ return false } }

  // Seed
  const items = load();
  if(items.length===0){
    items.push(
      { id: uid(), type: "image", title:"When the code compiles first try", caption:"Senior dev energy.", dataURL:createSVGDataURL(), createdAt: nowISO(), approved: true, laughs: 7 },
      { id: uid(), type: "poll", title:"Best reaction emoji?", poll:{ question:"Pick your go-to reaction", options:[{text:"😂",votes:12},{text:"🤣",votes:8},{text:"😹",votes:3}] }, createdAt: nowISO(), approved: true, laughs: 3 }
    );
    save(items);
  }

  function createSVGDataURL(){
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='1280' height='720'>
      <defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'>
        <stop stop-color='#a78bfa' offset='0'/><stop stop-color='#22d3ee' offset='1'/>
      </linearGradient></defs>
      <rect fill='url(#g)' width='100%' height='100%'></rect>
      <g font-family='Inter,system-ui,sans-serif' text-anchor='middle'>
        <text x='50%' y='45%' font-size='64' fill='white' font-weight='700'>Laugh School</text>
        <text x='50%' y='60%' font-size='32' fill='white' opacity='0.9'>Starter meme image</text>
      </g>
    </svg>`;
    return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  }

  function sortApproved(list){
    return list.filter(x=>x.approved).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  }

  // FEED page logic
  function initFeed(){
    const grid = document.getElementById("feedGrid");
    if(!grid) return;

    function render(){
      const data = sortApproved(load());
      grid.innerHTML = "";
      if(data.length===0){
        grid.innerHTML = `<div class="card muted">No posts yet. Be the first!</div>`;
        return;
      }
      data.forEach(item=>{
        const card = document.createElement("div");
        card.className = "card item";
        card.innerHTML = itemTemplate(item);
        // wire reactions & poll voting
        const laughBtn = card.querySelector(".laugh-btn");
        if(laughBtn) laughBtn.addEventListener("click", ()=>{
          const all = load();
          const it = all.find(i=>i.id===item.id);
          it.laughs = (it.laughs||0)+1;
          save(all);
          render();
        });

        if(item.type==="poll"){
          const buttons = card.querySelectorAll("[data-vote-idx]");
          buttons.forEach(btn=>btn.addEventListener("click", ()=>{
            const idx = +btn.getAttribute("data-vote-idx");
            const votes = loadVotes();
            if(votes[item.id] !== undefined) return; // already voted
            const all = load();
            const it = all.find(i=>i.id===item.id);
            it.poll.options[idx].votes = (it.poll.options[idx].votes||0)+1;
            save(all);
            votes[item.id] = idx;
            saveVotes(votes);
            render();
          }));
        }
        grid.appendChild(card);
      });
    }
    render();
  }

  function itemTemplate(item){
    const created = new Date(item.createdAt).toLocaleString();
    if(item.type==="image"){
      return `
        <div class="item-head">
          <div>
            <div class="item-title">${escapeHTML(item.title)}</div>
            <div class="item-meta">${created}</div>
          </div>
          <div class="reaction"><button class="btn primary laugh-btn">😂 ${item.laughs||0}</button></div>
        </div>
        <figure class="media"><img src="${item.dataURL}" alt="${escapeHTML(item.title)}"></figure>
        ${item.caption?`<div class="muted">${escapeHTML(item.caption)}</div>`:""}
      `;
    }
    if(item.type==="video"){
      return `
        <div class="item-head">
          <div>
            <div class="item-title">${escapeHTML(item.title)}</div>
            <div class="item-meta">${created}</div>
          </div>
          <div class="reaction"><button class="btn primary laugh-btn">😂 ${item.laughs||0}</button></div>
        </div>
        <div class="media"><video src="${item.dataURL}" controls preload="metadata"></video></div>
        ${item.caption?`<div class="muted">${escapeHTML(item.caption)}</div>`:""}
      `;
    }
    if(item.type==="poll"){
      const votes = loadVotes();
      const mine = votes[item.id];
      const total = item.poll.options.reduce((s,o)=>s+(o.votes||0),0);
      const opts = item.poll.options.map((o,i)=>{
        const pct = total ? Math.round((o.votes||0)*100/total) : 0;
        const disabled = mine !== undefined ? "disabled" : "";
        const active = mine === i ? "good" : "";
        return `
          <button class="btn ${active}" ${disabled} data-vote-idx="${i}" style="text-align:left">
            <div style="display:flex;justify-content:space-between;gap:8px">
              <span>${escapeHTML(o.text)}</span><span class="muted">${pct}%</span>
            </div>
            <div style="margin-top:6px;height:8px;border-radius:999px;background:#ffffff1a;overflow:hidden">
              <div style="height:8px;background:#ffffffcc;width:${pct}%"></div>
            </div>
          </button>`;
      }).join("");
      return `
        <div class="item-head">
          <div>
            <div class="item-title">${escapeHTML(item.title)}</div>
            <div class="item-meta">${created}</div>
          </div>
          <div class="reaction"><button class="btn primary laugh-btn">😂 ${item.laughs||0}</button></div>
        </div>
        <div class="muted">${escapeHTML(item.poll.question)}</div>
        <div class="col">${opts}</div>
        <div class="tiny muted">${total} votes • ${mine!==undefined?"Thanks for voting!":"Click to vote"}</div>
      `;
    }
  }

  function escapeHTML(s){
    return (s||"").replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c]));
  }

  // UPLOAD
  function initUpload(){
    const upTitle = document.getElementById("upTitle");
    const upCaption = document.getElementById("upCaption");
    const fileInput = document.getElementById("fileInput");
    const dropzone = document.getElementById("dropzone");
    const fileName = document.getElementById("fileName");
    const pollQ = document.getElementById("pollQ");
    const pollOptsWrap = document.getElementById("pollOpts");
    const addOptBtn = document.getElementById("addOpt");
    const submitBtn = document.getElementById("submitBtn");
    const clearBtn = document.getElementById("clearBtn");
    const mediaFields = document.getElementById("mediaFields");
    const pollFields = document.getElementById("pollFields");
    const modeLabel = document.getElementById("modeLabel");
    const pillBtns = document.querySelectorAll(".pill-btn");

    if(!submitBtn) return; // we're on admin page

    let mode = "image";
    pillBtns.forEach(btn=>btn.addEventListener("click", ()=>{
      pillBtns.forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      mode = btn.getAttribute("data-mode");
      modeLabel.textContent = mode;
      mediaFields.classList.toggle("hidden", mode==="poll");
      pollFields.classList.toggle("hidden", mode!=="poll");
      fileInput.accept = mode==="image" ? "image/*" : "video/*";
    }));

    // poll options
    function renderPollOpts(arr){
      pollOptsWrap.innerHTML = "";
      arr.forEach((val, i)=>{
        const row = document.createElement("div");
        row.className = "field-row";
        row.innerHTML = `
          <input value="${escapeHTML(val)}" data-idx="${i}" placeholder="Option ${i+1}"/>
          <button class="btn" data-remove="${i}">✕</button>
        `;
        pollOptsWrap.appendChild(row);
      });
    }
    let pollOpts = ["😂","🤣","😹"];
    renderPollOpts(pollOpts);

    pollOptsWrap.addEventListener("input", e=>{
      const idx = +e.target.getAttribute("data-idx");
      if(!Number.isNaN(idx)){ pollOpts[idx] = e.target.value; }
    });
    pollOptsWrap.addEventListener("click", e=>{
      const idx = +e.target.getAttribute("data-remove");
      if(!Number.isNaN(idx)){ pollOpts.splice(idx,1); renderPollOpts(pollOpts); }
    });
    addOptBtn.addEventListener("click", ()=>{ pollOpts.push(""); renderPollOpts(pollOpts); });

    // file handling
    fileInput.addEventListener("change", ()=>{
      fileName.textContent = fileInput.files[0]? `Selected: ${fileInput.files[0].name}` : "";
    });
    dropzone.addEventListener("dragover", e=>{ e.preventDefault(); });
    dropzone.addEventListener("drop", e=>{
      e.preventDefault();
      if(e.dataTransfer.files[0]){
        fileInput.files = e.dataTransfer.files;
        fileName.textContent = `Selected: ${fileInput.files[0].name}`;
      }
    });

    function clear(){
      upTitle.value = "";
      upCaption.value = "";
      fileInput.value = "";
      fileName.textContent = "";
      pollQ.value = "";
      pollOpts = ["😂","🤣","😹"];
      renderPollOpts(pollOpts);
    }
    clearBtn.addEventListener("click", clear);

    submitBtn.addEventListener("click", async ()=>{
      const title = upTitle.value.trim();
      if(!title){ alert("Please add a title"); return; }

      if(mode==="poll"){
        const options = pollOpts.map(s=>s.trim()).filter(Boolean).map(t=>({text:t,votes:0}));
        if(options.length<2){ alert("Add at least two poll options"); return; }
        const item = { id: uid(), type:"poll", title, poll:{question: (pollQ.value.trim()||title), options}, createdAt: nowISO(), approved:false, laughs:0 };
        const all = load();
        all.unshift(item); save(all);
        clear();
        alert("Poll submitted! It will show after admin approval.");
        return;
      }

      if(!fileInput.files[0]){ alert("Please choose a file"); return; }
      const dataURL = await readAsDataURL(fileInput.files[0]);
      const item = { id: uid(), type: mode, title, caption: upCaption.value.trim(), dataURL, createdAt: nowISO(), approved:false, laughs:0 };
      const all = load(); all.unshift(item); save(all);
      clear();
      alert("Submitted! Your post will appear once approved by Admin.");
    });

    // tabs on index
    const tabs = document.querySelectorAll(".tabs .tab[data-tab]");
    const sections = { feed: document.getElementById("feed"), upload: document.getElementById("upload") };
    tabs.forEach(t=>t.addEventListener("click", ()=>{
      const target = t.getAttribute("data-tab");
      if(!target) return;
      tabs.forEach(x=>x.classList.remove("active"));
      t.classList.add("active");
      Object.keys(sections).forEach(k=>sections[k].classList.toggle("hidden", k!==target));
      if(target==="feed") initFeed();
    }));

    // open upload if hash present
    if(location.hash==="#upload"){
      document.querySelector('.tabs .tab[data-tab="upload"]').click();
    }

    initFeed();
  }

  function readAsDataURL(file){
    return new Promise((res,rej)=>{
      const r = new FileReader();
      r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file);
    });
  }

  // ADMIN
  function initAdmin(){
    const gate = document.getElementById("authGate");
    const panel = document.getElementById("adminPanel");
    const passInput = document.getElementById("adminPass");
    const unlockBtn = document.getElementById("unlockBtn");
    const signOut = document.getElementById("signOut");
    const searchBox = document.getElementById("searchBox");
    const list = document.getElementById("adminList");
    if(!gate) return;

    function check(){ if(getAdminSession()){ gate.classList.add("hidden"); panel.classList.remove("hidden"); render(); } }
    check();

    unlockBtn.addEventListener("click", ()=>{
      const val = passInput.value;
      if(val===ADMIN_PASSWORD){ setAdminSession(true); check(); }
      else alert("Incorrect password");
    });
    signOut.addEventListener("click", ()=>{ setAdminSession(false); location.reload(); });
    searchBox.addEventListener("input", render);

    function render(){
      const q = (searchBox.value||"").toLowerCase().trim();
      const data = load().filter(it=>{
        if(!q) return true;
        return [it.title, it.caption, it?.poll?.question].filter(Boolean).some(s=>(s||"").toLowerCase().includes(q));
      });
      list.innerHTML = "";
      data.forEach(it=>{
        const row = document.createElement("div");
        row.className = "card";
        row.innerHTML = adminItemTemplate(it);
        // wire actions
        const titleInput = row.querySelector('[data-edit="title"]');
        if(titleInput) titleInput.addEventListener("blur", e=>update(it.id, {title: e.target.value}));

        const capInput = row.querySelector('[data-edit="caption"]');
        if(capInput) capInput.addEventListener("blur", e=>update(it.id, {caption: e.target.value}));

        const approveBtn = row.querySelector('[data-action="approve"]');
        approveBtn.addEventListener("click", ()=>update(it.id, {approved: !it.approved}, true));

        const delBtn = row.querySelector('[data-action="delete"]');
        delBtn.addEventListener("click", ()=>{ if(confirm("Delete this item?")) remove(it.id); });

        const resetBtn = row.querySelector('[data-action="reset"]');
        if(resetBtn) resetBtn.addEventListener("click", ()=>resetVotes(it.id));

        // poll options edit (text only)
        row.querySelectorAll('[data-opt-idx]').forEach(inp=>{
          inp.addEventListener("blur", e=>{
            const idx = +inp.getAttribute("data-opt-idx");
            const all = load();
            const target = all.find(x=>x.id===it.id);
            if(target && target.type==="poll"){ target.poll.options[idx].text = e.target.value; save(all); }
          });
        });

        list.appendChild(row);
      });
    }

    function update(id, patch, flip){
      const all = load();
      const idx = all.findIndex(x=>x.id===id);
      if(idx>-1){
        all[idx] = { ...all[idx], ...patch };
        if(flip && patch.approved===undefined) all[idx].approved = !all[idx].approved;
        save(all);
        render();
      }
    }
    function remove(id){
      const all = load().filter(x=>x.id!==id);
      save(all);
      render();
    }
    function resetVotes(id){
      const all = load();
      const it = all.find(x=>x.id===id);
      if(it && it.type==="poll"){
        it.poll.options = it.poll.options.map(o=>({ ...o, votes:0 }));
        save(all); render();
      }
    }
  }

  function adminItemTemplate(it){
    const created = new Date(it.createdAt).toLocaleString();
    const badge = it.type==="image" ? "indigo" : (it.type==="video"?"cyan":"emerald");
    const media = it.type==="image"
      ? `<figure class="media" style="margin-top:8px"><img src="${it.dataURL}"></figure>`
      : it.type==="video"
      ? `<div class="media" style="margin-top:8px"><video src="${it.dataURL}" controls preload="metadata"></video></div>`
      : pollEditor(it);

    return `
      <div class="field-row" style="justify-content:space-between;flex-wrap:wrap;gap:8px">
        <div class="field-row" style="gap:10px">
          <span class="badge" style="background:${badgeColor(badge)};color:#051016;padding:4px 8px;border-radius:8px;font-size:12px;font-weight:700;text-transform:uppercase">${it.type}</span>
          <input data-edit="title" value="${escapeHTML(it.title)}" />
        </div>
        <div class="field-row">
          <button data-action="approve" class="btn ${it.approved?'good':'warn'}">${it.approved?'Approved':'Pending'}</button>
          <button data-action="delete" class="btn bad">Delete</button>
        </div>
      </div>
      ${it.type!=="poll" ? `
      <div class="field">
        <label class="tiny muted">Caption</label>
        <input data-edit="caption" value="${escapeHTML(it.caption||'')}" />
      </div>` : ""}
      <div class="tiny muted">Created ${created} • 😂 ${it.laughs||0}</div>
      ${media}
    `;
  }

  function pollEditor(it){
    const rows = it.poll.options.map((o,i)=>`
      <div class="field-row">
        <input value="${escapeHTML(o.text)}" data-opt-idx="${i}" />
        <span class="tiny muted">${o.votes||0} votes</span>
      </div>
    `).join("");
    return `
      <div class="field">
        <label class="tiny muted">Poll options</label>
        <div class="col">${rows}</div>
        <div class="field-row">
          <button data-action="reset" class="btn">Reset votes</button>
        </div>
      </div>
    `;
  }

  function badgeColor(kind){
    if(kind==="indigo") return "#a78bfa";
    if(kind==="cyan") return "#22d3ee";
    return "#34d399";
  }

  // expose a tiny API for admin init
  window.__LAUGH_SCHOOL__ = {
    initAdmin, initFeed, initUpload
  };

  // Auto-init on index
  document.addEventListener("DOMContentLoaded", ()=>{
    if(document.getElementById("feedGrid")) initUpload();
  });
})();