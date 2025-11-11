import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Laugh School — a modern, single‑file React app
 * ------------------------------------------------
 * Features
 * - Public feed (images, videos, polls)
 * - Upload page (image/video or poll)
 * - Simple reactions (😂 count) & poll voting
 * - Admin dashboard (approve/hide/delete/reset votes)
 * - Client-side password gate (NOT secure for production)
 * - Persists to localStorage
 *
 * IMPORTANT: Client-side passwords are easily viewable in source and should
 * not be considered secure. For production use, replace the auth and storage
 * with a real backend (JWT sessions + object storage/DB).
 */

// === Constants ===
const STORAGE_KEY = "laughschool_items_v1";
const POLL_VOTE_KEY = "laughschool_poll_votes_v1"; // maps pollId -> optionIndex
const ADMIN_SESSION_KEY = "laughschool_admin_session";
const ADMIN_PASSWORD = "LAUGHSCHOOLSERVER2025"; // user-requested

// === Utilities ===
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const nowISO = () => new Date().toISOString();

function saveToStorage(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to load storage", e);
    return [];
  }
}

function saveVote(pollId, optionIndex) {
  const map = loadVotes();
  map[pollId] = optionIndex;
  localStorage.setItem(POLL_VOTE_KEY, JSON.stringify(map));
}
function loadVotes() {
  try {
    return JSON.parse(localStorage.getItem(POLL_VOTE_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function setAdminSession(val) {
  sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(!!val));
}
function getAdminSession() {
  try {
    return JSON.parse(sessionStorage.getItem(ADMIN_SESSION_KEY) || "false");
  } catch {
    return false;
  }
}

// === Types (JSDoc) ===
/**
 * @typedef {Object} BaseItem
 * @property {string} id
 * @property {"image"|"video"|"poll"} type
 * @property {string} title
 * @property {string} createdAt
 * @property {boolean} approved
 * @property {number} laughs
 *
 * @typedef {BaseItem & { caption?: string, dataURL: string }} MediaItem
 * @typedef {BaseItem & { poll: { question: string, options: { text: string, votes: number }[] } }} PollItem
 */

// === Layout primitives ===
function Container({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black text-slate-100">
      <div className="mx-auto max-w-6xl px-4 pb-24">{children}</div>
    </div>
  );
}

function Nav({ current, onNavigate, isAdmin }) {
  const tabs = [
    { key: "feed", label: "Feed" },
    { key: "upload", label: "Upload" },
    { key: "admin", label: "Admin" },
  ];
  return (
    <div className="sticky top-0 z-30 backdrop-blur bg-slate-950/70 border-b border-white/5">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-white/10 grid place-items-center text-xl">😂</div>
            <h1 className="text-2xl font-black tracking-tight">Laugh School</h1>
          </div>
          <div className="flex items-center gap-1">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => onNavigate(t.key)}
                className={
                  "px-4 py-2 rounded-xl text-sm transition-all " +
                  (current === t.key
                    ? "bg-white text-slate-900 font-semibold"
                    : "hover:bg-white/10 text-slate-200")
                }
              >
                {t.label}
                {t.key === "admin" && isAdmin && (
                  <span className="ml-2 inline-block h-2 w-2 rounded-full bg-emerald-400 align-middle" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, subtitle, children, actions }) {
  return (
    <section className="mt-10">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold">{title}</h2>
          {subtitle && <p className="text-slate-400 text-sm mt-1">{subtitle}</p>}
        </div>
        <div>{actions}</div>
      </div>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

function Card({ children }) {
  return (
    <div className="rounded-2xl bg-gradient-to-b from-slate-800/60 to-slate-900/60 border border-white/10 shadow-xl shadow-black/30">
      <div className="p-4">{children}</div>
    </div>
  );
}

// === Main App ===
export default function App() {
  const [view, setView] = useState("feed");
  const [items, setItems] = useState(() => loadFromStorage());
  const [isAdmin, setIsAdmin] = useState(() => getAdminSession());

  useEffect(() => saveToStorage(items), [items]);

  // seed example content on first load if empty
  useEffect(() => {
    if (items.length === 0) {
      const seed = [
        {
          id: uid(),
          type: "image",
          title: "When the code compiles first try",
          caption: "Senior dev energy.",
          dataURL:
            "data:image/svg+xml;utf8," +
            encodeURIComponent(
              `<svg xmlns='http://www.w3.org/2000/svg' width='1280' height='720'>\n  <defs>\n    <linearGradient id='g' x1='0' x2='1' y1='0' y2='1'>\n      <stop stop-color='#a78bfa' offset='0'/>\n      <stop stop-color='#22d3ee' offset='1'/>\n    </linearGradient>\n  </defs>\n  <rect fill='url(#g)' width='100%' height='100%'></rect>\n  <g font-family='sans-serif' text-anchor='middle'>\n    <text x='50%' y='45%' font-size='64' fill='white' font-weight='700'>Laugh School</text>\n    <text x='50%' y='60%' font-size='32' fill='white' opacity='0.9'>Starter meme image</text>\n  </g>\n</svg>`
            ),
          createdAt: nowISO(),
          approved: true,
          laughs: 7,
        },
        {
          id: uid(),
          type: "poll",
          title: "Best reaction emoji?",
          poll: {
            question: "Pick your go‑to reaction",
            options: [
              { text: "😂", votes: 12 },
              { text: "🤣", votes: 8 },
              { text: "😹", votes: 3 },
            ],
          },
          createdAt: nowISO(),
          approved: true,
          laughs: 3,
        },
      ];
      setItems(seed);
    }
  }, []);

  const approvedItems = useMemo(
    () => items.filter((it) => it.approved).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [items]
  );

  return (
    <Container>
      <Nav current={view} onNavigate={setView} isAdmin={isAdmin} />
      {view === "feed" && <Feed items={approvedItems} onReact={(id) =>
        setItems((prev) => prev.map((it) => (it.id === id ? { ...it, laughs: (it.laughs || 0) + 1 } : it)))} />}
      {view === "upload" && <Upload onCreate={(newItem) => setItems((prev) => [newItem, ...prev])} />}
      {view === "admin" && (
        <Admin
          isAdmin={isAdmin}
          onRequireAuth={() =>
            openAdminAuth({ onSuccess: () => setIsAdmin(true) })
          }
          items={items}
          setItems={setItems}
          onSignOut={() => {
            setIsAdmin(false);
            setAdminSession(false);
          }}
        />
      )}
      <Footer />
    </Container>
  );
}

function Footer() {
  return (
    <div className="mt-16 text-center text-xs text-slate-500">
      <p>
        Built with ❤️ for memes. Client‑side demo only — add a backend for real use.
      </p>
    </div>
  );
}

// === Feed ===
function Feed({ items, onReact }) {
  return (
    <Section title="Latest laughs" subtitle="Fresh drops from Laugh School">
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((it) => (
          <Card key={it.id}>
            <ItemView item={it} onReact={() => onReact(it.id)} />
          </Card>
        ))}
        {items.length === 0 && (
          <Card>
            <div className="text-center text-slate-400">No posts yet. Be the first!</div>
          </Card>
        )}
      </div>
    </Section>
  );
}

function ItemView({ item, onReact }) {
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold leading-tight">{item.title}</h3>
          <p className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()}</p>
        </div>
        <button
          onClick={onReact}
          className="px-3 py-1.5 rounded-lg bg-white text-slate-900 text-sm font-semibold hover:translate-y-[-1px] active:translate-y-0 transition-transform"
          title="This made me laugh!"
        >
          😂 {item.laughs || 0}
        </button>
      </div>
      {item.type === "image" && (
        <figure className="overflow-hidden rounded-xl border border-white/10">
          <img src={item.dataURL} alt={item.title} className="w-full h-auto object-contain" />
          {item.caption && (
            <figcaption className="p-2 text-sm text-slate-300">{item.caption}</figcaption>
          )}
        </figure>
      )}
      {item.type === "video" && (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <video src={item.dataURL} className="w-full h-auto" controls preload="metadata" />
        </div>
      )}
      {item.type === "poll" && <PollView item={item} />}
    </div>
  );
}

function PollView({ item }) {
  const myVotes = loadVotes();
  const votedIndex = myVotes[item.id];
  const [_, force] = useState(0);
  const total = item.poll.options.reduce((s, o) => s + (o.votes || 0), 0);

  const handleVote = (idx) => {
    if (votedIndex !== undefined) return; // already voted
    item.poll.options[idx].votes = (item.poll.options[idx].votes || 0) + 1;
    saveToStorage(patchItem(item));
    saveVote(item.id, idx);
    force((n) => n + 1);
  };

  return (
    <div className="grid gap-2">
      <div className="text-sm text-slate-300">{item.poll.question}</div>
      <div className="grid gap-2">
        {item.poll.options.map((opt, i) => {
          const pct = total ? Math.round((opt.votes || 0) * 100 / total) : 0;
          const isMine = votedIndex === i;
          return (
            <button
              key={i}
              disabled={votedIndex !== undefined}
              onClick={() => handleVote(i)}
              className={
                "text-left p-2 rounded-xl border border-white/10 transition-all " +
                (isMine ? "bg-emerald-400 text-emerald-950" : "bg-white/5 hover:bg-white/10")
              }
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{opt.text}</span>
                <span className="text-sm opacity-80">{pct}%</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-2 bg-white/80" style={{ width: pct + "%" }} />
              </div>
            </button>
          );
        })}
      </div>
      <div className="text-xs text-slate-400">{total} votes • {votedIndex !== undefined ? "Thanks for voting!" : "Click to vote"}</div>
    </div>
  );
}

// Patch helper to replace an item in storage by id (used inside PollView)
function patchItem(updated) {
  const all = loadFromStorage();
  const idx = all.findIndex((x) => x.id === updated.id);
  if (idx !== -1) {
    all[idx] = updated;
    return all;
  }
  return all;
}

// === Upload ===
function Upload({ onCreate }) {
  const [mode, setMode] = useState("image"); // image | video | poll
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState(null);
  const [pollQ, setPollQ] = useState("");
  const [pollOpts, setPollOpts] = useState(["😂", "🤣", "😹"]);
  const fileInput = useRef(null);

  const onPick = (e) => setFile(e.target.files?.[0] || null);

  const onDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  };

  const clear = () => {
    setTitle("");
    setCaption("");
    setFile(null);
    fileInput.current && (fileInput.current.value = "");
    setPollQ("");
    setPollOpts(["😂", "🤣", "😹"]);
  };

  const submit = async () => {
    if (!title.trim()) return alert("Please add a title");

    if (mode === "poll") {
      const options = pollOpts
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => ({ text: t, votes: 0 }));
      if (options.length < 2) return alert("Add at least two poll options");
      const newItem = {
        id: uid(),
        type: "poll",
        title: title.trim(),
        poll: { question: pollQ.trim() || title.trim(), options },
        createdAt: nowISO(),
        approved: false,
        laughs: 0,
      };
      onCreate(newItem);
      clear();
      return;
    }

    if (!file) return alert("Please choose a file");
    const dataURL = await readAsDataURL(file);
    /** @type {any} */
    const newItem = {
      id: uid(),
      type: mode,
      title: title.trim(),
      caption: caption.trim(),
      dataURL,
      createdAt: nowISO(),
      approved: false,
      laughs: 0,
    };
    onCreate(newItem);
    clear();
  };

  return (
    <Section
      title="Upload"
      subtitle="Share an image, a short video, or create a poll. Submissions appear once approved by Admin."
      actions={
        <div className="flex gap-2">
          {(["image", "video", "poll"]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={
                "px-3 py-1.5 rounded-lg text-sm border " +
                (mode === m
                  ? "bg-white text-slate-900 border-white"
                  : "bg-white/0 text-white border-white/20 hover:bg-white/10")
              }
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      }
    >
      <Card>
        <div className="grid gap-4">
          <div className="grid gap-1">
            <label className="text-sm text-slate-300">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add a catchy title"
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-white/30"
            />
          </div>

          {mode !== "poll" && (
            <>
              <div className="grid gap-1">
                <label className="text-sm text-slate-300">Caption (optional)</label>
                <input
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Say something funny"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-white/30"
                />
              </div>

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                className="rounded-xl border border-dashed border-white/15 bg-white/5 p-4 text-center"
              >
                <p className="text-sm text-slate-300 mb-2">Drag & drop a {mode} file, or pick one</p>
                <input ref={fileInput} type="file" accept={mode === "image" ? "image/*" : "video/*"} onChange={onPick} />
                {file && <p className="text-xs text-slate-400 mt-2">Selected: {file.name}</p>}
              </div>
            </>
          )}

          {mode === "poll" && (
            <div className="grid gap-3">
              <div className="grid gap-1">
                <label className="text-sm text-slate-300">Question (optional)</label>
                <input
                  value={pollQ}
                  onChange={(e) => setPollQ(e.target.value)}
                  placeholder="What do you want to ask?"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-white/30"
                />
              </div>
              <div className="grid gap-2">
                <div className="text-sm text-slate-300">Options</div>
                {pollOpts.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={opt}
                      onChange={(e) =>
                        setPollOpts((prev) => prev.map((p, idx) => (idx === i ? e.target.value : p)))
                      }
                      placeholder={`Option ${i + 1}`}
                      className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-white/30"
                    />
                    <button
                      onClick={() => setPollOpts((prev) => prev.filter((_, idx) => idx !== i))}
                      className="px-2 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setPollOpts((prev) => [...prev, ""]) }
                  className="self-start px-3 py-1.5 rounded-lg bg-white text-slate-900 text-sm font-semibold"
                >
                  + Add option
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button onClick={submit} className="px-4 py-2 rounded-xl bg-white text-slate-900 font-semibold">
              Submit
            </button>
            <button onClick={clear} className="px-4 py-2 rounded-xl bg-white/10 text-white border border-white/15">
              Clear
            </button>
          </div>
          <p className="text-xs text-slate-400">Your submission will appear once approved by Admin.</p>
        </div>
      </Card>
    </Section>
  );
}

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// === Admin ===
function Admin({ isAdmin, onRequireAuth, items, setItems, onSignOut }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) =>
      [it.title, it.caption, it?.poll?.question]
        .filter(Boolean)
        .some((s) => (s || "").toLowerCase().includes(q))
    );
  }, [items, query]);

  if (!isAdmin) {
    return (
      <Section title="Admin login" subtitle="Restricted area">
        <Card>
          <div className="grid gap-3">
            <p className="text-sm text-slate-300">Enter the admin password to manage posts and polls.</p>
            <button
              onClick={onRequireAuth}
              className="self-start px-4 py-2 rounded-xl bg-white text-slate-900 font-semibold"
            >
              Unlock Admin
            </button>
            <p className="text-xs text-slate-400">Note: client‑side auth is for demos only.</p>
          </div>
        </Card>
      </Section>
    );
  }

  const updateItem = (id, patch) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  const deleteItem = (id) => {
    if (!confirm("Delete this item?")) return;
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const resetPollVotes = (id) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id && it.type === "poll"
          ? {
              ...it,
              poll: {
                ...it.poll,
                options: it.poll.options.map((o) => ({ ...o, votes: 0 })),
              },
            }
          : it
      )
    );
  };

  return (
    <Section
      title="Admin dashboard"
      subtitle="Approve, hide, edit, or delete content."
      actions={
        <div className="flex items-center gap-2">
          <input
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/30"
          />
          <button onClick={onSignOut} className="px-3 py-2 rounded-lg bg-white/10 text-white border border-white/15">
            Sign out
          </button>
        </div>
      }
    >
      <div className="grid gap-3">
        {filtered.map((it) => (
          <Card key={it.id}>
            <div className="grid gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={
                    "inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold " +
                    (it.type === "image"
                      ? "bg-indigo-400 text-indigo-950"
                      : it.type === "video"
                      ? "bg-cyan-400 text-cyan-950"
                      : "bg-emerald-400 text-emerald-950")
                  }>
                    {it.type}
                  </span>
                  <input
                    defaultValue={it.title}
                    onBlur={(e) => updateItem(it.id, { title: e.target.value })}
                    className="rounded-md bg-white/5 border border-white/10 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-white/30"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateItem(it.id, { approved: !it.approved })}
                    className={
                      "px-3 py-1.5 rounded-lg text-sm font-semibold " +
                      (it.approved ? "bg-emerald-400 text-emerald-950" : "bg-yellow-400 text-yellow-950")
                    }
                  >
                    {it.approved ? "Approved" : "Pending"}
                  </button>
                  <button onClick={() => deleteItem(it.id)} className="px-3 py-1.5 rounded-lg bg-red-500 text-red-50 text-sm font-semibold">
                    Delete
                  </button>
                </div>
              </div>

              {it.type !== "poll" && (
                <div className="grid gap-2">
                  <label className="text-xs text-slate-400">Caption</label>
                  <input
                    defaultValue={it.caption || ""}
                    onBlur={(e) => updateItem(it.id, { caption: e.target.value })}
                    className="rounded-md bg-white/5 border border-white/10 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-white/30"
                  />
                </div>
              )}

              {it.type === "poll" && (
                <div className="grid gap-2">
                  <label className="text-xs text-slate-400">Poll options</label>
                  <div className="grid md:grid-cols-2 gap-2">
                    {it.poll.options.map((o, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          defaultValue={o.text}
                          onBlur={(e) => {
                            const next = { ...it };
                            next.poll.options[idx].text = e.target.value;
                            updateItem(it.id, next);
                          }}
                          className="flex-1 rounded-md bg-white/5 border border-white/10 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-white/30"
                        />
                        <span className="text-xs text-slate-300">{o.votes} votes</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => resetPollVotes(it.id)} className="px-3 py-1.5 rounded-lg bg-white/10 text-white border border-white/15">
                      Reset votes
                    </button>
                  </div>
                </div>
              )}

              <div className="text-xs text-slate-500">Created {new Date(it.createdAt).toLocaleString()} • 😂 {it.laughs || 0}
              </div>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && (
          <Card>
            <div className="text-center text-slate-400">No items match your filters.</div>
          </Card>
        )}
      </div>
    </Section>
  );
}

// === Admin Auth Modal (simple prompt style) ===
function openAdminAuth({ onSuccess }) {
  const input = prompt("Enter admin password");
  if (input === null) return;
  if (input === ADMIN_PASSWORD) {
    setAdminSession(true);
    onSuccess && onSuccess();
  } else {
    alert("Incorrect password");
  }
}
