import { useState, useEffect, useCallback, useRef } from “react”;

const DB = {
async get(key) {
try { const r = await window.storage.get(key, true); return r ? JSON.parse(r.value) : null; }
catch { return null; }
},
async set(key, val) {
try { await window.storage.set(key, JSON.stringify(val), true); } catch {}
},
};

const genAccNo = () => “VX” + Math.floor(1000000000 + Math.random() * 9000000000);
const genTxId  = () => “TX” + Date.now() + Math.floor(Math.random() * 9999);
const fmt      = n  => Number(n).toLocaleString(“en-US”, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ts       = () => new Date().toLocaleString(“en-US”, { month: “short”, day: “numeric”, hour: “2-digit”, minute: “2-digit” });

export default function App() {
const [screen, setScreen]       = useState(“splash”);
const [me, setMe]               = useState(null);
const [name, setName]           = useState(””);
const [form, setForm]           = useState({});
const [error, setError]         = useState(””);
const [success, setSuccess]     = useState(””);
const [busy, setBusy]           = useState(false);
const [aiChat, setAiChat]       = useState([]);
const [aiInput, setAiInput]     = useState(””);
const [aiLoading, setAiLoading] = useState(false);
const chatEndRef                = useRef(null);

useEffect(() => {
setTimeout(() => setScreen(“enter”), 1600);
}, []);

useEffect(() => {
chatEndRef.current?.scrollIntoView({ behavior: “smooth” });
}, [aiChat]);

const refresh = useCallback(async (accNo) => {
const users = await DB.get(“vx_users_v3”) || {};
if (users[accNo]) setMe(users[accNo]);
}, []);

const handleEnter = async () => {
setError(””);
const trimmed = name.trim();
if (trimmed.length < 2) return setError(“Please enter your name (at least 2 letters).”);
const users = await DB.get(“vx_users_v3”) || {};
const existing = Object.values(users).find(u => u.name.toLowerCase() === trimmed.toLowerCase());
if (existing) { setMe(existing); setScreen(“dashboard”); return; }
const accNo = genAccNo();
const newUser = {
accountNo: accNo, name: trimmed, balance: 500,
transactions: [{ id: genTxId(), type: “credit”, amount: 500, desc: “🎁 Welcome gift”, date: ts(), balance: 500 }],
};
users[accNo] = newUser;
await DB.set(“vx_users_v3”, users);
setMe(newUser);
setScreen(“dashboard”);
};

const handleSend = async () => {
setError(””); setSuccess(””); setBusy(true);
const users = await DB.get(“vx_users_v3”) || {};
const sender = users[me.accountNo];
const amt = parseFloat(form.amount);
const q = form.to?.trim().toLowerCase();
const recipient = Object.values(users).find(u =>
u.accountNo.toLowerCase() === q || u.name.toLowerCase() === q
);
if (!recipient)                              { setError(“Person not found.”); setBusy(false); return; }
if (recipient.accountNo === sender.accountNo){ setError(“Can’t send to yourself.”); setBusy(false); return; }
if (!amt || amt <= 0)                        { setError(“Enter a valid amount.”); setBusy(false); return; }
if (amt > sender.balance)                    { setError(“Not enough balance.”); setBusy(false); return; }

```
const id = genTxId(), time = ts();
sender.balance    = +(sender.balance - amt).toFixed(2);
recipient.balance = +(recipient.balance + amt).toFixed(2);
sender.transactions.unshift({ id, type:"debit",  amount:amt, desc:`Sent to ${recipient.name}`,  date:time, balance:sender.balance });
recipient.transactions.unshift({ id, type:"credit", amount:amt, desc:`From ${sender.name}`, date:time, balance:recipient.balance });
users[sender.accountNo]    = sender;
users[recipient.accountNo] = recipient;
await DB.set("vx_users_v3", users);
setMe(sender);
setSuccess(`✓ $${fmt(amt)} sent to ${recipient.name}!`);
setForm({});
setBusy(false);
```

};

const handleAi = async () => {
if (!aiInput.trim()) return;
const msg = aiInput.trim();
setAiInput(””);
const history = […aiChat, { role:“user”, content:msg }];
setAiChat(history);
setAiLoading(true);
const ctx = me
? `Name:${me.name}, Account:${me.accountNo}, Balance:$${fmt(me.balance)}, Recent:${me.transactions.slice(0,5).map(t=>`${t.type} $${t.amount} (${t.desc})`).join("; ")}`
: “No user.”;
try {
const res  = await fetch(“https://api.anthropic.com/v1/messages”, {
method:“POST”, headers:{“Content-Type”:“application/json”},
body: JSON.stringify({ model:“claude-sonnet-4-20250514”, max_tokens:800,
system:`You are Vexa, a friendly AI banking assistant. Be concise and warm. Context: ${ctx}`,
messages: history }),
});
const data = await res.json();
setAiChat([…history, { role:“assistant”, content: data.content?.[0]?.text || “Try again.” }]);
} catch {
setAiChat([…history, { role:“assistant”, content:“Connection error.” }]);
}
setAiLoading(false);
};

const go = s => { setError(””); setSuccess(””); setForm({}); setScreen(s); };
const txC = t => t.type === “credit” ? “#00e5a0” : “#ff7575”;
const txS = t => t.type === “credit” ? “+” : “−”;

const css = `* { box-sizing: border-box; margin: 0; padding: 0; } body { background: #04090f; } input { outline: none; font-family: inherit; } input::placeholder { color: #ffffff25; } input:focus { border-color: #00e5a055 !important; } button { cursor: pointer; font-family: inherit; transition: opacity .15s; } button:hover { opacity: .82; } button:disabled { opacity: .5; cursor: not-allowed; } ::-webkit-scrollbar { width: 3px; } ::-webkit-scrollbar-thumb { background: #ffffff15; border-radius: 3px; } @keyframes barAnim { 0%{transform:translateX(-100%)} 100%{transform:translateX(350%)} } @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }`;

const font = “‘Palatino Linotype’,‘Book Antiqua’,Georgia,serif”;
const BG   = “#04090f”;
const CARD = “#0c1825”;
const GRN  = “#00e5a0”;

// SPLASH
if (screen === “splash”) return (
<div style={{ minHeight:“100vh”, background:BG, display:“flex”, flexDirection:“column”, alignItems:“center”, justifyContent:“center”, fontFamily:font }}>
<style>{css}</style>
<div style={{ fontSize:52, letterSpacing:-2 }}>
<span style={{ color:GRN }}>Vexa</span><span style={{ color:”#fff7” }}>Bank</span>
</div>
<div style={{ color:”#ffffff28”, fontSize:11, letterSpacing:4, textTransform:“uppercase”, marginTop:8, marginBottom:40 }}>
Digital Banking · No Sign-up
</div>
<div style={{ width:100, height:2, background:”#ffffff08”, borderRadius:2, overflow:“hidden” }}>
<div style={{ height:“100%”, width:“45%”, background:`linear-gradient(90deg,transparent,${GRN})`, animation:“barAnim 1.4s ease-in-out infinite”, borderRadius:2 }} />
</div>
</div>
);

// ENTER NAME
if (screen === “enter”) return (
<div style={{ minHeight:“100vh”, background:`linear-gradient(155deg,${BG} 55%,#071420)`, display:“flex”, alignItems:“center”, justifyContent:“center”, padding:16, fontFamily:font }}>
<style>{css}</style>
<div style={{ width:“100%”, maxWidth:400, background:CARD, borderRadius:24, padding:“38px 30px”, border:“1px solid #ffffff0d”, boxShadow:“0 32px 80px #00000095”, animation:“fadeUp .4s ease” }}>
<div style={{ fontSize:28, textAlign:“center”, marginBottom:32, fontWeight:300, letterSpacing:-0.5 }}>
<span style={{ color:GRN }}>Vexa</span><span style={{ color:”#fff5” }}>Bank</span>
</div>

```
    <div style={{ fontSize:24, color:"#e8f4ff", fontWeight:700, marginBottom:8 }}>What's your name?</div>
    <div style={{ fontSize:13, color:"#ffffff30", lineHeight:1.75, marginBottom:26 }}>
      Returning? We'll find your account automatically.<br />
      New here? We'll create one in seconds.
    </div>

    <input
      style={{ width:"100%", background:"#07111c", border:"1px solid #ffffff10", borderRadius:13, padding:"15px 18px", color:"#ddeeff", fontSize:18, marginBottom:10, transition:"border .2s" }}
      placeholder="Your name…"
      value={name}
      onChange={e => setName(e.target.value)}
      onKeyDown={e => e.key === "Enter" && handleEnter()}
      autoFocus
    />

    {error && <div style={{ background:"#ff757518", border:"1px solid #ff757540", color:"#ffaaaa", fontSize:13, padding:"10px 14px", borderRadius:9, marginBottom:10 }}>{error}</div>}

    <button
      onClick={handleEnter}
      style={{ width:"100%", marginTop:4, background:`linear-gradient(135deg,${GRN},#00c4ff)`, border:"none", borderRadius:13, padding:"15px 0", color:"#040d18", fontSize:16, fontWeight:800, letterSpacing:.3 }}
    >
      Enter Bank →
    </button>

    <div style={{ marginTop:20, fontSize:12, color:"#ffffff18", textAlign:"center", lineHeight:1.9 }}>
      🔒 No password · No sign-up · $500 welcome gift for new users
    </div>
  </div>
</div>
```

);

// DASHBOARD
if (screen === “dashboard” && me) return (
<div style={{ minHeight:“100vh”, background:BG, fontFamily:font, color:”#ddeeff”, paddingBottom:50 }}>
<style>{css}</style>

```
  {/* Header */}
  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:"24px 20px 0" }}>
    <div>
      <div style={{ fontSize:22, fontWeight:700, color:"#e8f5ff" }}>Hey, {me.name.split(" ")[0]} 👋</div>
      <div style={{ fontSize:11, color:"#ffffff25", letterSpacing:1.5, marginTop:3 }}>{me.accountNo}</div>
    </div>
    <button onClick={() => { setMe(null); setName(""); go("enter"); }}
      style={{ background:"transparent", border:"1px solid #ffffff10", color:"#ffffff28", padding:"7px 14px", borderRadius:20, fontSize:12 }}>
      ← Exit
    </button>
  </div>

  {/* Balance */}
  <div style={{ margin:"20px 16px", background:`linear-gradient(135deg,#0d2035,#091828)`, borderRadius:22, padding:"28px 24px", border:`1px solid ${GRN}16`, position:"relative", overflow:"hidden" }}>
    <div style={{ fontSize:10, color:`${GRN}60`, letterSpacing:3, marginBottom:8 }}>YOUR BALANCE</div>
    <div style={{ fontSize:44, fontWeight:300, color:"#fff", letterSpacing:-1.5 }}>${fmt(me.balance)}</div>
    <div style={{ position:"absolute", top:-30, right:-30, width:110, height:110, background:`${GRN}08`, borderRadius:"50%", filter:"blur(26px)", pointerEvents:"none" }} />
  </div>

  {/* Actions */}
  <div style={{ display:"flex", gap:10, padding:"0 16px 22px" }}>
    {[
      { icon:"↑", label:"Send",    fn: () => { refresh(me.accountNo); go("send"); } },
      { icon:"↓", label:"Receive", fn: () => { refresh(me.accountNo); setSuccess(`Share your name "${me.name}" or account: ${me.accountNo}`); } },
      { icon:"≡", label:"History", fn: () => { refresh(me.accountNo); go("history"); } },
      { icon:"✦", label:"AI Help", fn: () => go("ai") },
    ].map(a => (
      <button key={a.label} onClick={a.fn}
        style={{ flex:1, background:CARD, border:"1px solid #ffffff0c", borderRadius:16, padding:"14px 4px", display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
        <span style={{ fontSize:18, color:GRN }}>{a.icon}</span>
        <span style={{ fontSize:11, color:"#b0c8e0" }}>{a.label}</span>
      </button>
    ))}
  </div>

  {success && (
    <div onClick={() => setSuccess("")} style={{ margin:"0 16px 16px", background:"#00e5a015", border:"1px solid #00e5a035", color:GRN, fontSize:13, padding:"11px 14px", borderRadius:10, cursor:"pointer" }}>
      {success}
    </div>
  )}

  {/* Recent */}
  <div style={{ padding:"0 16px" }}>
    <div style={{ fontSize:11, color:"#ffffff25", letterSpacing:3, textTransform:"uppercase", marginBottom:12 }}>Recent</div>
    {me.transactions.length === 0 && <div style={{ color:"#ffffff15", textAlign:"center", padding:"28px 0" }}>No transactions yet.</div>}
    {me.transactions.slice(0,6).map(tx => (
      <div key={tx.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 0", borderBottom:"1px solid #ffffff06" }}>
        <div style={{ width:34, height:34, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0, color:txC(tx), background:txC(tx)+"18" }}>
          {tx.type==="credit" ? "↓" : "↑"}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, color:"#b0c8e0", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{tx.desc}</div>
          <div style={{ fontSize:11, color:"#ffffff20", marginTop:2 }}>{tx.date}</div>
        </div>
        <div style={{ fontSize:14, fontWeight:700, color:txC(tx), flexShrink:0 }}>{txS(tx)}${fmt(tx.amount)}</div>
      </div>
    ))}
    {me.transactions.length > 6 && (
      <button onClick={() => go("history")} style={{ width:"100%", background:"transparent", border:"none", color:`${GRN}45`, fontSize:13, padding:"12px 0" }}>
        View all →
      </button>
    )}
  </div>
</div>
```

);

// SEND
if (screen === “send” && me) return (
<div style={{ minHeight:“100vh”, background:BG, fontFamily:font, color:”#ddeeff”, paddingBottom:40 }}>
<style>{css}</style>
<div style={{ display:“flex”, alignItems:“center”, padding:“20px 20px 16px”, gap:14 }}>
<button onClick={() => go(“dashboard”)} style={{ background:“transparent”, border:“none”, color:GRN, fontSize:14, padding:0 }}>← Back</button>
<div style={{ fontSize:17, fontWeight:700, color:”#e8f5ff” }}>Send Money</div>
</div>

```
  <div style={{ margin:"0 16px", background:CARD, borderRadius:18, padding:"22px 18px", border:"1px solid #ffffff08" }}>
    <div style={{ fontSize:13, color:"#ffffff30", textAlign:"right", marginBottom:20 }}>
      Balance: <b style={{ color:GRN }}>${fmt(me.balance)}</b>
    </div>

    <div style={{ fontSize:11, color:"#ffffff38", letterSpacing:1, textTransform:"uppercase", marginBottom:6 }}>To (name or account number)</div>
    <input
      style={{ width:"100%", background:"#070f1a", border:"1px solid #ffffff10", borderRadius:11, padding:"13px 15px", color:"#ddeeff", fontSize:15, marginBottom:16, transition:"border .2s" }}
      placeholder="e.g. Sara or VX123…"
      value={form.to||""}
      onChange={e => setForm(f=>({...f,to:e.target.value}))}
      onKeyDown={e => e.key==="Enter" && handleSend()}
    />

    <div style={{ fontSize:11, color:"#ffffff38", letterSpacing:1, textTransform:"uppercase", marginBottom:6 }}>Amount (USD)</div>
    <input
      style={{ width:"100%", background:"#070f1a", border:"1px solid #ffffff10", borderRadius:11, padding:"13px 15px", color:"#ddeeff", fontSize:15, marginBottom:6, transition:"border .2s" }}
      type="number" placeholder="0.00"
      value={form.amount||""}
      onChange={e => setForm(f=>({...f,amount:e.target.value}))}
      onKeyDown={e => e.key==="Enter" && handleSend()}
    />

    <button onClick={handleSend} disabled={busy}
      style={{ width:"100%", marginTop:14, background:`linear-gradient(135deg,${GRN},#00c4ff)`, border:"none", borderRadius:12, padding:"14px 0", color:"#040d18", fontSize:15, fontWeight:800 }}>
      {busy ? "Sending…" : "Send →"}
    </button>
  </div>

  {error   && <div style={{ margin:"12px 16px", background:"#ff757518", border:"1px solid #ff757538", color:"#ffaaaa", fontSize:13, padding:"10px 14px", borderRadius:9 }}>{error}</div>}
  {success && <div style={{ margin:"12px 16px", background:"#00e5a015", border:"1px solid #00e5a035", color:GRN, fontSize:13, padding:"10px 14px", borderRadius:9 }}>{success}</div>}

  <div style={{ margin:"16px", fontSize:12, color:"#ffffff18", textAlign:"center" }}>
    💡 Send by name or account number
  </div>
</div>
```

);

// HISTORY
if (screen === “history” && me) return (
<div style={{ minHeight:“100vh”, background:BG, fontFamily:font, color:”#ddeeff”, paddingBottom:40 }}>
<style>{css}</style>
<div style={{ display:“flex”, alignItems:“center”, padding:“20px 20px 16px”, gap:14 }}>
<button onClick={() => go(“dashboard”)} style={{ background:“transparent”, border:“none”, color:GRN, fontSize:14, padding:0 }}>← Back</button>
<div style={{ fontSize:17, fontWeight:700, color:”#e8f5ff” }}>All Transactions</div>
</div>
<div style={{ padding:“0 16px” }}>
{me.transactions.length === 0 && <div style={{ color:”#ffffff15”, textAlign:“center”, padding:“28px 0” }}>No transactions yet.</div>}
{me.transactions.map(tx => (
<div key={tx.id} style={{ display:“flex”, alignItems:“center”, gap:12, padding:“12px 0”, borderBottom:“1px solid #ffffff06” }}>
<div style={{ width:34, height:34, borderRadius:10, display:“flex”, alignItems:“center”, justifyContent:“center”, fontSize:15, flexShrink:0, color:txC(tx), background:txC(tx)+“18” }}>
{tx.type===“credit” ? “↓” : “↑”}
</div>
<div style={{ flex:1, minWidth:0 }}>
<div style={{ fontSize:13, color:”#b0c8e0”, whiteSpace:“nowrap”, overflow:“hidden”, textOverflow:“ellipsis” }}>{tx.desc}</div>
<div style={{ fontSize:11, color:”#ffffff20”, marginTop:2 }}>{tx.date} · bal ${fmt(tx.balance)}</div>
</div>
<div style={{ fontSize:14, fontWeight:700, color:txC(tx), flexShrink:0 }}>{txS(tx)}${fmt(tx.amount)}</div>
</div>
))}
</div>
</div>
);

// AI
if (screen === “ai” && me) return (
<div style={{ height:“100vh”, background:BG, fontFamily:font, color:”#ddeeff”, display:“flex”, flexDirection:“column” }}>
<style>{css}</style>
<div style={{ display:“flex”, alignItems:“center”, padding:“20px 20px 14px”, gap:14, borderBottom:“1px solid #ffffff07” }}>
<button onClick={() => go(“dashboard”)} style={{ background:“transparent”, border:“none”, color:GRN, fontSize:14, padding:0 }}>← Back</button>
<div style={{ fontSize:17, fontWeight:700, color:”#e8f5ff” }}>✦ Vexa AI</div>
</div>

```
  <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:10, padding:"14px 16px" }}>
    {aiChat.length === 0 && (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"40px 16px", gap:12 }}>
        <div style={{ fontSize:32, color:GRN }}>✦</div>
        <div style={{ color:"#ffffff28", fontSize:14, textAlign:"center", lineHeight:1.7, maxWidth:270 }}>
          Hi {me.name.split(" ")[0]}! I'm Vexa. Ask about your balance, transactions, or anything banking-related.
        </div>
      </div>
    )}
    {aiChat.map((m,i) => (
      <div key={i} style={{
        maxWidth:"82%", padding:"11px 15px", borderRadius:16, fontSize:14, lineHeight:1.65,
        alignSelf: m.role==="user" ? "flex-end" : "flex-start",
        background: m.role==="user" ? GRN : "#111e2d",
        color: m.role==="user" ? "#040d18" : "#cce0f5",
      }}>{m.content}</div>
    ))}
    {aiLoading && <div style={{ maxWidth:"82%", padding:"11px 15px", borderRadius:16, fontSize:14, alignSelf:"flex-start", background:"#111e2d", color:`${GRN}55` }}>Thinking…</div>}
    <div ref={chatEndRef} />
  </div>

  <div style={{ display:"flex", gap:10, padding:"12px 16px", borderTop:"1px solid #ffffff07", background:BG }}>
    <input
      style={{ flex:1, background:"#0c1825", border:"1px solid #ffffff10", borderRadius:12, padding:"13px 16px", color:"#ddeeff", fontSize:14, transition:"border .2s" }}
      value={aiInput}
      onChange={e => setAiInput(e.target.value)}
      onKeyDown={e => e.key==="Enter" && handleAi()}
      placeholder="Ask anything…"
    />
    <button onClick={handleAi} disabled={aiLoading}
      style={{ background:GRN, border:"none", borderRadius:12, width:46, color:"#040d18", fontSize:18, fontWeight:800 }}>↑</button>
  </div>
</div>
```

);

return null;
}
