import { useState, useRef, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// ── Supabase client ───────────────────────────────────────────────────────────
const supabase = createClient(
  "https://rxfwwmqutybninaqypwj.supabase.co",
  "sb_publishable_JmUTYmMU0AjJyGk8C2t8ww_URNDmcYA"
);

const makeCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const AVATARS = ["🥪","🍞","🥓","🧀","🥬","🍅","🫙","🥒","🌶","🧅","🥩","🫒"];
const SENTIMENTS = ["🤩","😋","😌","🥹","🔥","😐","😬","💀"];
const BREAD_TYPES = ["Sourdough","Ciabatta","Baguette","Focaccia","Brioche","Rye","Cuban","Hoagie","Wrap","White","Wheat","Other"];

// ── Photo Carousel ────────────────────────────────────────────────────────────
function PhotoCarousel({ photos, name }) {
  const [idx, setIdx] = useState(0);
  const list = photos && photos.length > 0 ? photos : null;
  if (!list) return <div className="card-photo-placeholder">🥪</div>;
  return (
    <div className="photo-carousel">
      <div className="photo-carousel-track" style={{ transform:`translateX(-${idx * 100}%)` }}>
        {list.map((p, i) => <img key={i} src={p} className="card-photo" alt={`${name} ${i+1}`} />)}
      </div>
      {list.length > 1 && (<>
        {idx > 0 && <button className="photo-nav prev" onClick={() => setIdx(i => i-1)}>‹</button>}
        {idx < list.length-1 && <button className="photo-nav next" onClick={() => setIdx(i => i+1)}>›</button>}
        <div className="photo-dot-row">
          {list.map((_, i) => <button key={i} className={`photo-dot ${i===idx?"active":""}`} onClick={() => setIdx(i)} />)}
        </div>
      </>)}
    </div>
  );
}

// ── Leaflet Map ───────────────────────────────────────────────────────────────
function SandwichMap({ entries, currentUser }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const heatLayerRef = useRef(null);
  const markersRef = useRef([]);
  const [heatmap, setHeatmap] = useState(false);
  const [filter, setFilter] = useState("all");

  const visible = entries.filter(e => {
    if (!e.coords) return false;
    if (filter === "mine") return e.user === currentUser;
    if (filter === "friends") return e.user !== currentUser;
    return true;
  });

  useEffect(() => {
    if (mapInstanceRef.current) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    script.onload = () => {
      const hs = document.createElement("script");
      hs.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet.heat/0.2.0/leaflet-heat.js";
      hs.onload = () => {
        const L = window.L;
        const map = L.map(mapRef.current, { zoomControl:true }).setView([42.36,-71.06], 11);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution:"© OpenStreetMap", maxZoom:19 }).addTo(map);
        mapInstanceRef.current = map;
        renderMarkers();
      };
      document.head.appendChild(hs);
    };
    document.head.appendChild(script);
  }, []);

  useEffect(() => { if (mapInstanceRef.current) renderMarkers(); }, [visible, heatmap]);

  function renderMarkers() {
    const L = window.L; if (!L || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    markersRef.current.forEach(m => map.removeLayer(m)); markersRef.current = [];
    if (heatLayerRef.current) { map.removeLayer(heatLayerRef.current); heatLayerRef.current = null; }
    if (heatmap && L.heatLayer) {
      heatLayerRef.current = L.heatLayer(visible.map(e => [...e.coords, e.rating/5]), { radius:35, blur:25, gradient:{0.2:"#7DD8D0",0.5:"#F07828",1:"#1A2744"} }).addTo(map);
    } else {
      visible.forEach(e => {
        const isMe = e.user === currentUser;
        const icon = L.divIcon({ className:"", html:`<div style="width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${isMe?"#F07828":"#7DD8D0"};border:2.5px solid #1A2744;display:flex;align-items:center;justify-content:center"><span style="transform:rotate(45deg);font-size:14px">${e.sentiment}</span></div>`, iconSize:[32,32], iconAnchor:[16,32], popupAnchor:[0,-34] });
        const popup = L.popup({ maxWidth:220 }).setContent(`<div style="font-family:'Courier Prime',monospace"><div style="font-family:'Alfa Slab One',serif;font-size:15px;color:#1A2744">${e.sandwichName}</div><div style="font-size:11px;color:#3AADA4;font-style:italic">📍 ${e.location||""}</div><div style="font-size:13px;color:#F07828">${"★".repeat(e.rating)}${"☆".repeat(5-e.rating)} ${e.sentiment}</div>${e.notes?`<div style="font-size:11px;font-style:italic;border-left:3px solid #F07828;padding-left:6px;margin-top:4px">"${e.notes}"</div>`:""}<div style="font-size:10px;color:#888;margin-top:4px">by ${e.user} · ${e.date}</div></div>`);
        markersRef.current.push(L.marker(e.coords, { icon }).addTo(map).bindPopup(popup));
      });
      if (visible.length > 0) map.fitBounds(L.latLngBounds(visible.map(e => e.coords)), { padding:[40,40], maxZoom:14 });
    }
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 140px)" }}>
      <div style={{ padding:"10px 14px", background:"white", borderBottom:"1px solid rgba(26,39,68,0.1)", display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
        <div style={{ display:"flex", gap:4 }}>
          {[["all","All"],["mine","Mine"],["friends","Friends"]].map(([v,l]) => (
            <button key={v} onClick={() => setFilter(v)} style={{ fontFamily:"'Special Elite',serif", fontSize:10, letterSpacing:1, padding:"4px 10px", border:"2px solid #1A2744", borderRadius:2, background:filter===v?"#1A2744":"transparent", color:filter===v?"#F07828":"#1A2744", cursor:"pointer", textTransform:"uppercase" }}>{l}</button>
          ))}
        </div>
        <button onClick={() => setHeatmap(h => !h)} style={{ fontFamily:"'Special Elite',serif", fontSize:10, letterSpacing:1, padding:"4px 10px", border:"2px solid #1A2744", borderRadius:2, background:heatmap?"#F07828":"transparent", color:"#1A2744", cursor:"pointer", textTransform:"uppercase", marginLeft:"auto" }}>🌡 Heatmap {heatmap?"On":"Off"}</button>
      </div>
      <div style={{ padding:"6px 14px", background:"#FFFDF8", borderBottom:"1px solid #E3F7F5", display:"flex", gap:14, fontSize:11, fontFamily:"'Special Elite',serif", color:"#1A2744", letterSpacing:1 }}>
        <span><span style={{ color:"#F07828" }}>●</span> Yours</span>
        <span><span style={{ color:"#7DD8D0" }}>●</span> Friends'</span>
        <span style={{ marginLeft:"auto", color:"#888" }}>{visible.length} pins</span>
      </div>
      <div ref={mapRef} style={{ flex:1 }} />
    </div>
  );
}

// ── Auth Screen ───────────────────────────────────────────────────────────────
function AuthScreen() {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [invite, setInvite] = useState("");
  const [emoji, setEmoji] = useState("🥪");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const inputStyle = { width:"100%", fontFamily:"'Courier Prime',monospace", fontSize:13, padding:"8px 10px", border:"2px solid #7DD8D0", borderRadius:2, background:"white", color:"#1A2744" };
  const labelStyle = { fontFamily:"'Special Elite',serif", fontSize:10, letterSpacing:2, textTransform:"uppercase", color:"#1A2744", display:"block", marginBottom:4 };
  const cardStyle = { background:"#FFFDF8", border:"2px solid #7DD8D0", borderRadius:4, padding:24, width:"100%", maxWidth:360 };
  const btnPrimary = { width:"100%", fontFamily:"'Alfa Slab One',serif", fontSize:15, letterSpacing:2, padding:13, background: loading ? "#ccc" : "#F07828", color:"#1A2744", border:"3px solid #1A2744", borderRadius:2, cursor: loading ? "wait" : "pointer", textTransform:"uppercase", boxShadow:"3px 3px 0 #1A2744", marginTop:4 };

  async function doLogin() {
    if (!email.trim() || !password.trim()) { setError("Email and password required"); return; }
    setLoading(true); setError("");
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setLoading(false); setError(err.message); return; }
    // onAuthStateChange in the main app will handle the rest
  }

  async function doSignup() {
    if (!username.trim() || !email.trim() || !password.trim()) { setError("All fields required"); return; }
    if (username.length < 3) { setError("Username must be at least 3 characters"); return; }
    if (!email.includes("@")) { setError("Please enter a valid email"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }

    setLoading(true); setError("");

    try {
      // Check invite code (unless first user)
      const { count } = await supabase.from("profiles").select("*", { count:"exact", head:true });
      if (count > 0) {
        const { data: inv } = await supabase.from("invites").select("*").eq("code", invite.toUpperCase()).eq("used", false).single();
        if (!inv) { setLoading(false); setError("Invalid or already used invite code"); return; }
      }

      // Check username not taken
      const { data: existing } = await supabase.from("profiles").select("username").eq("username", username).maybeSingle();
      if (existing) { setLoading(false); setError("Username already taken"); return; }

      // Create auth user — email confirmation disabled so session is returned immediately
      const { data: authData, error: authErr } = await supabase.auth.signUp({ email, password });
      if (authErr) { setLoading(false); setError(authErr.message); return; }
      if (!authData.user) { setLoading(false); setError("Signup failed — please try again"); return; }

      // Insert profile using service-style upsert
      const { error: profileErr } = await supabase.from("profiles").upsert({
        username,
        email: email.toLowerCase(),
        emoji,
        joined_at: new Date().toISOString().split("T")[0]
      });
      if (profileErr) { setLoading(false); setError("Profile creation failed: " + profileErr.message); return; }

      // Mark invite used
      if (count > 0) {
        await supabase.from("invites").update({ used: true }).eq("code", invite.toUpperCase());
      }

      // If session exists immediately (email confirm disabled), load straight in
      if (authData.session) {
        // onAuthStateChange will fire and handle the rest
        return;
      }

      setLoading(false);
      setSuccess("Account created! Check your email to confirm, then sign in.");
      setMode("login");

    } catch (e) {
      setLoading(false);
      setError("Something went wrong: " + e.message);
    }
  }

  async function doResetRequest() {
    if (!email.trim()) { setError("Please enter your email"); return; }
    setLoading(true); setError("");
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "?reset=true"
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setSuccess("Check your email for a password reset link!");
  }

  return (
    <div style={{ minHeight:"100vh", background:"#1A2744", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, overflowY:"auto" }}>
      <div style={{ marginBottom:24, textAlign:"center" }}>
        <div style={{ fontFamily:"'Alfa Slab One',serif", fontSize:32, color:"#F07828", textShadow:"2px 2px 0 rgba(0,0,0,0.4)", letterSpacing:1 }}>Stacked</div>
        <div style={{ fontFamily:"'Special Elite',serif", fontSize:9, color:"#7DD8D0", letterSpacing:2, textTransform:"uppercase", marginTop:4 }}>a good sandwich is like an old friend</div>
      </div>

      {mode === "reset" && (
        <div style={cardStyle}>
          <div style={{ fontFamily:"'Alfa Slab One',serif", fontSize:18, color:"#1A2744", marginBottom:4 }}>Reset Password</div>
          <div style={{ fontFamily:"'Special Elite',serif", fontSize:10, color:"#3AADA4", letterSpacing:2, textTransform:"uppercase", marginBottom:16 }}>we'll email you a link</div>
          {error && <div style={{ background:"#FEF0E6", border:"1.5px solid #F07828", borderRadius:2, padding:"8px 10px", marginBottom:12, fontSize:12, color:"#C85E10", fontFamily:"'Courier Prime',monospace" }}>{error}</div>}
          {success && <div style={{ background:"#E3F7F5", border:"1.5px solid #7DD8D0", borderRadius:2, padding:"8px 10px", marginBottom:12, fontSize:12, color:"#1A2744", fontFamily:"'Courier Prime',monospace" }}>{success}</div>}
          <div style={{ marginBottom:12 }}>
            <label style={labelStyle}>Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" style={inputStyle} />
          </div>
          <button onClick={doResetRequest} style={btnPrimary} disabled={loading}>
            {loading ? "Sending…" : "Send Reset Link"}
          </button>
          <button onClick={() => { setMode("login"); setError(""); setSuccess(""); }} style={{ width:"100%", marginTop:8, padding:"9px 0", fontFamily:"'Special Elite',serif", fontSize:12, background:"transparent", border:"none", color:"#3AADA4", cursor:"pointer", letterSpacing:1 }}>← Back to sign in</button>
        </div>
      )}

      {(mode === "login" || mode === "signup") && (
        <div style={cardStyle}>
          <div style={{ display:"flex", marginBottom:20, border:"2px solid #1A2744", borderRadius:2, overflow:"hidden" }}>
            {[["login","Sign In"],["signup","Join"]].map(([m,l]) => (
              <button key={m} onClick={() => { setMode(m); setError(""); setSuccess(""); }} style={{ flex:1, padding:"9px 0", fontFamily:"'Alfa Slab One',serif", fontSize:13, border:"none", background:mode===m?"#1A2744":"transparent", color:mode===m?"#F07828":"#1A2744", cursor:"pointer", letterSpacing:1 }}>{l}</button>
            ))}
          </div>

          {error && <div style={{ background:"#FEF0E6", border:"1.5px solid #F07828", borderRadius:2, padding:"8px 10px", marginBottom:12, fontSize:12, color:"#C85E10", fontFamily:"'Courier Prime',monospace" }}>{error}</div>}
          {success && <div style={{ background:"#E3F7F5", border:"1.5px solid #7DD8D0", borderRadius:2, padding:"8px 10px", marginBottom:12, fontSize:12, color:"#1A2744", fontFamily:"'Courier Prime',monospace" }}>{success}</div>}

          {mode === "signup" && (
            <div style={{ marginBottom:12 }}>
              <label style={labelStyle}>Username</label>
              <input value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g. SandwichSally" style={inputStyle} />
            </div>
          )}

          <div style={{ marginBottom:12 }}>
            <label style={labelStyle}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" style={inputStyle}
              onKeyDown={e => e.key==="Enter" && mode==="login" && doLogin()} />
          </div>

          <div style={{ marginBottom: mode==="login" ? 6 : 12 }}>
            <label style={labelStyle}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={inputStyle}
              onKeyDown={e => e.key==="Enter" && mode==="login" && doLogin()} />
          </div>

          {mode === "login" && (
            <div style={{ textAlign:"right", marginBottom:14 }}>
              <button onClick={() => { setMode("reset"); setError(""); setSuccess(""); }} style={{ background:"none", border:"none", fontFamily:"'Special Elite',serif", fontSize:10, color:"#3AADA4", cursor:"pointer", letterSpacing:1, textDecoration:"underline" }}>Forgot password?</button>
            </div>
          )}

          {mode === "signup" && (<>
            <div style={{ marginBottom:12 }}>
              <label style={labelStyle}>Invite Code</label>
              <input value={invite} onChange={e => setInvite(e.target.value)} placeholder="e.g. SANDWICH"
                style={{ ...inputStyle, textTransform:"uppercase", letterSpacing:2 }} />
              <div style={{ fontSize:10, color:"#3AADA4", fontStyle:"italic", marginTop:3, fontFamily:"'Special Elite',serif" }}>Not needed if you're the first member</div>
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={labelStyle}>Pick your emoji</label>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {AVATARS.map(a => (
                  <span key={a} onClick={() => setEmoji(a)} style={{ fontSize:22, cursor:"pointer", padding:4, border:`2px solid ${emoji===a?"#F07828":"transparent"}`, borderRadius:4, background:emoji===a?"#FEF0E6":"transparent" }}>{a}</span>
                ))}
              </div>
            </div>
          </>)}

          <button onClick={mode==="login" ? doLogin : doSignup} style={btnPrimary} disabled={loading}>
            {loading ? "Please wait…" : mode==="login" ? "Sign In" : "Create Account"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=Special+Elite&family=Courier+Prime:ital,wght@0,400;0,700;1,400&display=swap');
  * { box-sizing:border-box; margin:0; padding:0; }
  :root {
    --orange:#F07828; --orange-dark:#C85E10; --orange-pale:#FEF0E6;
    --navy:#1A2744; --navy-light:#2A3A60;
    --mint:#7DD8D0; --mint-dark:#3AADA4; --mint-pale:#E3F7F5;
    --cream:#FFFDF8;
    --stripe:repeating-linear-gradient(45deg,transparent,transparent 5px,rgba(0,0,0,0.04) 5px,rgba(0,0,0,0.04) 10px);
  }
  body { background:#1A2744; min-height:100vh; }
  .app { font-family:'Courier Prime',monospace; max-width:480px; margin:0 auto; min-height:100vh; background:var(--cream); box-shadow:0 0 50px rgba(0,0,0,0.4); padding-bottom:80px; }
  .header { background:var(--navy); padding:14px 16px 12px; border-bottom:4px solid var(--mint); position:sticky; top:0; z-index:100; }
  .header-inner { display:flex; align-items:center; justify-content:space-between; }
  .logo { font-family:'Alfa Slab One',serif; font-size:22px; color:var(--orange); letter-spacing:1px; line-height:1; text-shadow:2px 2px 0 rgba(0,0,0,0.4); }
  .logo-sub { font-family:'Special Elite',serif; font-size:8px; color:var(--mint); letter-spacing:1.5px; text-transform:uppercase; margin-top:2px; }
  .header-user { display:flex; align-items:center; gap:6px; }
  .header-avatar { font-size:20px; }
  .header-username { font-family:'Special Elite',serif; font-size:10px; color:var(--mint); letter-spacing:1px; }
  .signout-btn { font-family:'Special Elite',serif; font-size:9px; padding:3px 7px; border:1px solid rgba(125,216,208,0.4); color:rgba(125,216,208,0.6); background:transparent; border-radius:2px; cursor:pointer; letter-spacing:1px; text-transform:uppercase; }
  .signout-btn:hover { border-color:var(--mint); color:var(--mint); }
  .feed { padding:14px 0 0; }
  .section-label { font-family:'Special Elite',serif; font-size:11px; letter-spacing:3px; text-transform:uppercase; color:var(--navy); border-bottom:2px solid var(--orange); padding-bottom:5px; margin:0 14px 14px; display:flex; align-items:center; gap:6px; }
  .section-label::before { content:'★'; color:var(--orange); font-size:12px; }
  .card { background:white; border:none; border-top:1px solid rgba(26,39,68,0.08); border-bottom:1px solid rgba(26,39,68,0.08); margin-bottom:8px; overflow:hidden; }
  .card-header { background:var(--orange); padding:8px 16px; display:flex; align-items:center; justify-content:space-between; }
  .card-user { font-family:'Alfa Slab One',serif; font-size:13px; color:var(--navy); }
  .card-date { font-size:10px; color:var(--navy); opacity:0.65; font-family:'Special Elite',serif; letter-spacing:1px; }
  .card-photo { width:100%; height:240px; object-fit:cover; display:block; flex-shrink:0; }
  .card-photo-placeholder { width:100%; height:160px; background:var(--mint-pale); display:flex; align-items:center; justify-content:center; font-size:64px; }
  .photo-carousel { position:relative; overflow:hidden; }
  .photo-carousel-track { display:flex; transition:transform 0.3s ease; }
  .photo-dot-row { position:absolute; bottom:8px; left:0; right:0; display:flex; justify-content:center; gap:5px; }
  .photo-dot { width:6px; height:6px; border-radius:50%; background:rgba(255,255,255,0.5); border:none; cursor:pointer; padding:0; transition:background 0.15s; }
  .photo-dot.active { background:white; }
  .photo-nav { position:absolute; top:50%; transform:translateY(-50%); background:rgba(26,39,68,0.5); border:none; color:white; font-size:16px; width:30px; height:30px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; }
  .photo-nav.prev { left:8px; } .photo-nav.next { right:8px; }
  .card-body { padding:14px 16px 10px; }
  .card-title { font-family:'Alfa Slab One',serif; font-size:24px; color:var(--navy); margin-bottom:4px; line-height:1.05; letter-spacing:-0.5px; }
  .card-location { font-size:11px; color:var(--mint-dark); font-style:italic; margin-bottom:10px; cursor:pointer; }
  .card-location:hover { text-decoration:underline; }
  .card-meta { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:10px; }
  .tag { font-family:'Special Elite',serif; font-size:10px; padding:3px 9px; border:1.5px solid; border-radius:2px; letter-spacing:0.5px; }
  .tag-bread { border-color:var(--mint-dark); color:var(--mint-dark); background:var(--mint-pale); }
  .tag-homemade { border-color:var(--orange-dark); color:var(--orange-dark); background:var(--orange-pale); }
  .tag-price { border-color:var(--navy); color:var(--navy); background:#EEF1F8; }
  .stars { display:flex; gap:1px; margin-bottom:10px; align-items:center; font-size:17px; color:var(--orange); }
  .sentiment-badge { font-size:22px; margin-left:10px; }
  .again-badge { font-size:10px; padding:2px 8px; border:1.5px solid var(--mint-dark); color:var(--mint-dark); border-radius:2px; font-family:'Special Elite',serif; margin-left:8px; }
  .ingredients { font-size:11px; color:#666; margin-bottom:10px; line-height:1.7; }
  .card-notes { font-family:'Special Elite',serif; font-style:italic; font-size:15px; color:var(--navy); background:var(--orange-pale); border-left:4px solid var(--orange); padding:10px 12px; margin-bottom:12px; line-height:1.5; }
  .card-actions { display:flex; gap:8px; align-items:center; border-top:1px solid rgba(26,39,68,0.08); padding-top:10px; }
  .action-btn { background:none; border:1.5px solid transparent; cursor:pointer; font-family:'Courier Prime',monospace; font-size:12px; color:var(--navy); display:flex; align-items:center; gap:4px; padding:4px 8px; border-radius:2px; transition:all 0.1s; }
  .action-btn:hover { background:var(--mint-pale); border-color:var(--mint); }
  .action-btn.liked { color:var(--orange); font-weight:bold; }
  .comments-section { padding:0 16px 12px; border-top:1px solid rgba(26,39,68,0.06); }
  .comment { font-size:11px; border-top:1px dashed #ddd; padding:5px 0; color:#444; }
  .comment-user { font-weight:bold; color:var(--navy); margin-right:4px; }
  .comment-input-row { display:flex; gap:6px; margin-top:6px; }
  .comment-input { flex:1; font-family:'Courier Prime',monospace; font-size:11px; padding:5px 8px; border:1.5px solid var(--mint); border-radius:2px; background:var(--mint-pale); color:var(--navy); }
  .comment-input:focus { outline:none; border-color:var(--mint-dark); }
  .comment-submit { font-family:'Special Elite',serif; font-size:10px; padding:5px 10px; background:var(--navy); color:var(--orange); border:none; border-radius:2px; cursor:pointer; letter-spacing:1px; text-transform:uppercase; }
  .fab { position:fixed; bottom:90px; right:calc(50% - 240px + 14px); width:54px; height:54px; background:var(--orange); border:3px solid var(--navy); border-radius:50%; color:var(--navy); font-size:28px; font-weight:bold; cursor:pointer; box-shadow:3px 3px 0 var(--navy); display:flex; align-items:center; justify-content:center; z-index:200; transition:transform 0.15s; line-height:1; }
  .fab:hover { transform:scale(1.1) rotate(8deg); }
  .bottom-nav { position:fixed; bottom:0; left:50%; transform:translateX(-50%); width:480px; background:var(--navy); border-top:3px solid var(--orange); display:flex; z-index:100; }
  .bnav-btn { flex:1; background:none; border:none; color:rgba(125,216,208,0.5); padding:10px 0 8px; cursor:pointer; font-family:'Special Elite',serif; font-size:9px; letter-spacing:1px; text-transform:uppercase; display:flex; flex-direction:column; align-items:center; gap:3px; transition:color 0.15s; }
  .bnav-btn .icon { font-size:18px; }
  .bnav-btn.active { color:var(--orange); }
  .bnav-btn:hover { color:var(--mint); }
  .modal-overlay { position:fixed; inset:0; background:rgba(26,39,68,0.75); z-index:300; display:flex; align-items:flex-end; justify-content:center; }
  .modal { width:480px; max-height:92vh; background:var(--cream); border-top:5px solid var(--orange); border-radius:6px 6px 0 0; overflow-y:auto; padding:20px 16px 40px; animation:slideUp 0.22s ease; }
  @keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
  .modal-title { font-family:'Alfa Slab One',serif; font-size:22px; color:var(--navy); margin-bottom:2px; }
  .modal-sub { font-family:'Special Elite',serif; font-size:10px; letter-spacing:3px; color:var(--mint-dark); text-transform:uppercase; margin-bottom:18px; }
  .form-group { margin-bottom:14px; }
  .form-label { font-family:'Special Elite',serif; font-size:11px; letter-spacing:2px; text-transform:uppercase; color:var(--navy); display:block; margin-bottom:4px; }
  .form-input,.form-textarea,.form-select { width:100%; font-family:'Courier Prime',monospace; font-size:13px; padding:8px 10px; border:2px solid var(--mint); border-radius:2px; background:white; color:var(--navy); }
  .form-input:focus,.form-textarea:focus,.form-select:focus { outline:none; border-color:var(--orange); }
  .form-textarea { min-height:70px; resize:vertical; }
  .location-row { display:flex; gap:6px; }
  .gps-btn { font-family:'Special Elite',serif; font-size:10px; padding:8px 10px; background:var(--navy); color:var(--mint); border:2px solid var(--navy); border-radius:2px; cursor:pointer; white-space:nowrap; letter-spacing:1px; flex-shrink:0; }
  .gps-btn:disabled { opacity:0.5; cursor:wait; }
  .gps-status { font-size:10px; color:var(--mint-dark); font-style:italic; margin-top:3px; font-family:'Special Elite',serif; }
  .sentiment-picker { display:flex; gap:8px; flex-wrap:wrap; }
  .sentiment-opt { font-size:24px; cursor:pointer; padding:4px; border:2px solid transparent; border-radius:4px; transition:all 0.1s; }
  .sentiment-opt.selected { border-color:var(--orange); background:var(--orange-pale); }
  .star-rating { display:flex; gap:6px; }
  .star-opt { font-size:26px; cursor:pointer; color:#ccc; transition:color 0.1s,transform 0.1s; }
  .star-opt.filled { color:var(--orange); }
  .star-opt:hover { transform:scale(1.2); }
  .toggle-row { display:flex; align-items:center; gap:10px; margin-bottom:8px; }
  .toggle { width:40px; height:22px; background:#ccc; border-radius:11px; border:2px solid var(--navy); cursor:pointer; position:relative; transition:background 0.2s; flex-shrink:0; }
  .toggle.on { background:var(--orange); }
  .toggle::after { content:''; position:absolute; width:14px; height:14px; background:white; border-radius:50%; top:2px; left:2px; transition:left 0.2s; }
  .toggle.on::after { left:20px; }
  .toggle-label { font-size:13px; color:var(--navy); font-family:'Courier Prime',monospace; }
  .photo-upload { width:100%; height:80px; border:2px dashed var(--mint-dark); border-radius:2px; display:flex; align-items:center; justify-content:center; cursor:pointer; background:var(--mint-pale); color:var(--navy); font-family:'Special Elite',serif; font-size:12px; letter-spacing:1px; gap:8px; transition:all 0.15s; }
  .photo-upload:hover { border-color:var(--orange); background:var(--orange-pale); }
  .photo-upload.full { opacity:0.4; cursor:not-allowed; }
  .photo-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; margin-bottom:6px; }
  .photo-thumb { position:relative; aspect-ratio:1; border-radius:2px; overflow:hidden; border:1.5px solid var(--mint); }
  .photo-thumb img { width:100%; height:100%; object-fit:cover; display:block; }
  .photo-thumb-remove { position:absolute; top:3px; right:3px; background:rgba(26,39,68,0.75); color:white; border:none; border-radius:50%; width:18px; height:18px; font-size:11px; cursor:pointer; display:flex; align-items:center; justify-content:center; line-height:1; }
  .ingredients-input-row { display:flex; gap:6px; }
  .ingredient-tag { display:inline-flex; align-items:center; gap:4px; background:var(--mint-pale); border:1.5px solid var(--mint-dark); border-radius:2px; padding:2px 7px; font-size:11px; margin:3px 3px 3px 0; color:var(--navy); }
  .ingredient-remove { background:none; border:none; cursor:pointer; color:var(--orange-dark); font-size:14px; padding:0; line-height:1; }
  .submit-btn { width:100%; font-family:'Alfa Slab One',serif; font-size:16px; letter-spacing:2px; padding:14px; background:var(--orange); color:var(--navy); border:3px solid var(--navy); border-radius:2px; cursor:pointer; text-transform:uppercase; box-shadow:3px 3px 0 var(--navy); transition:transform 0.1s,box-shadow 0.1s; margin-top:10px; }
  .submit-btn:hover { transform:translate(2px,2px); box-shadow:1px 1px 0 var(--navy); }
  .cancel-btn { width:100%; font-family:'Special Elite',serif; font-size:13px; padding:10px; background:transparent; color:var(--navy); border:2px solid var(--mint); border-radius:2px; cursor:pointer; margin-top:8px; text-transform:uppercase; letter-spacing:1px; }
  .cancel-btn:hover { background:var(--mint-pale); }
  .profile-card { background:white; border:1px solid rgba(26,39,68,0.1); margin:14px; overflow:hidden; border-radius:3px; }
  .profile-header { background:var(--navy); padding:22px 16px 18px; text-align:center; }
  .profile-avatar { font-size:48px; margin-bottom:8px; }
  .profile-name { font-family:'Alfa Slab One',serif; font-size:22px; color:var(--orange); }
  .profile-tagline { font-family:'Special Elite',serif; font-size:10px; color:var(--mint); letter-spacing:3px; text-transform:uppercase; margin-top:4px; }
  .profile-stats { display:flex; border-top:1px solid rgba(26,39,68,0.08); }
  .stat { flex:1; padding:14px 8px; text-align:center; border-right:1px solid rgba(26,39,68,0.08); }
  .stat:last-child { border-right:none; }
  .stat-num { font-family:'Alfa Slab One',serif; font-size:24px; color:var(--orange); display:block; }
  .stat-label { font-family:'Special Elite',serif; font-size:10px; letter-spacing:2px; text-transform:uppercase; color:var(--navy); opacity:0.6; }
  .invite-box { margin:0 14px 14px; padding:14px; background:white; border:1px solid rgba(26,39,68,0.1); border-radius:3px; }
  .invite-title { font-family:'Special Elite',serif; font-size:10px; letter-spacing:2px; text-transform:uppercase; color:var(--navy); margin-bottom:10px; }
  .invite-code { font-family:'Alfa Slab One',serif; font-size:20px; color:var(--orange); background:var(--orange-pale); border:2px dashed var(--orange); border-radius:2px; padding:8px 14px; display:inline-block; letter-spacing:4px; margin-bottom:4px; cursor:pointer; }
  .invite-hint { font-size:10px; color:#888; font-style:italic; }
  .gen-invite-btn { font-family:'Special Elite',serif; font-size:10px; letter-spacing:1px; padding:6px 12px; border:2px solid var(--navy); background:transparent; color:var(--navy); cursor:pointer; border-radius:2px; text-transform:uppercase; margin-top:8px; }
  .gen-invite-btn:hover { background:var(--mint-pale); }
  .people-list { padding:0 14px; }
  .person-row { display:flex; align-items:center; gap:12px; padding:10px 12px; background:white; border:1px solid rgba(26,39,68,0.1); border-radius:3px; margin-bottom:8px; }
  .person-avatar-lg { font-size:28px; flex-shrink:0; }
  .person-info { flex:1; }
  .person-name { font-family:'Alfa Slab One',serif; font-size:14px; color:var(--navy); }
  .person-count { font-size:10px; color:#888; font-family:'Special Elite',serif; letter-spacing:1px; }
  .follow-btn { font-family:'Special Elite',serif; font-size:10px; letter-spacing:1px; padding:5px 12px; border:2px solid var(--navy); background:transparent; color:var(--navy); cursor:pointer; border-radius:2px; text-transform:uppercase; transition:all 0.15s; }
  .follow-btn:hover { background:var(--mint-pale); }
  .follow-btn.following { background:var(--orange); color:var(--navy); border-color:var(--orange); }
  .empty-state { text-align:center; padding:50px 20px; color:#aaa; font-style:italic; font-size:14px; }
  .empty-state .big { font-size:48px; display:block; margin-bottom:10px; }
  .loading-screen { min-height:100vh; background:#1A2744; display:flex; align-items:center; justify-content:center; font-family:'Alfa Slab One',serif; font-size:22px; color:#F07828; letter-spacing:1px; }
  .leaflet-popup-content-wrapper { border:2px solid #1A2744 !important; border-radius:3px !important; box-shadow:3px 3px 0 #7DD8D0 !important; }
  .leaflet-popup-tip { background:#1A2744 !important; }
  @media(max-width:480px) { .bottom-nav,.modal{width:100%} .fab{right:14px} }
`;

// ── Main App ──────────────────────────────────────────────────────────────────
export default function SandwichDiary() {
  const [profile, setProfile] = useState(null);   // { id, username, emoji, email, joined_at }
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("feed");
  const [entries, setEntries] = useState([]);
  const [following, setFollowing] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [inviteCodes, setInviteCodes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [commentInputs, setCommentInputs] = useState({});
  const [gpsStatus, setGpsStatus] = useState("");
  const [copied, setCopied] = useState(null);
  const [peopleSearch, setPeopleSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  const [form, setForm] = useState({
    sandwichName:"", location:"", coords:null, breadType:"Sourdough",
    homemade:false, price:"", rating:5, sentiment:"😋",
    wouldOrderAgain:true, notes:"", ingredients:[], photos:[], newIngredient:"",
  });

  // ── On mount: check session ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) loadProfile(session.user.id);
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
        setEntries([]);
        setFollowing([]);
        setAllUsers([]);
        setLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(userId) {
    try {
      // Get the auth user's email, then find matching profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data, error } = await supabase.from("profiles").select("*").eq("email", user.email.toLowerCase()).maybeSingle();
      if (error || !data) { setLoading(false); return; }
      setProfile(data);
      await Promise.all([
        loadEntries(),
        loadFollowing(data.username),
        loadAllUsers(data.username),
        loadInvites(data.username)
      ]);
    } catch (e) {
      console.error("loadProfile error:", e);
    } finally {
      setLoading(false);
    }
  }

  async function loadEntries() {
    const { data } = await supabase.from("entries").select(`*, likes(username), comments(id,username,text,created_at)`).order("created_at", { ascending:false });
    if (data) setEntries(data.map(normalizeEntry));
  }

  async function loadFollowing(username) {
    const { data } = await supabase.from("follows").select("following").eq("follower", username);
    if (data) setFollowing(data.map(r => r.following));
  }

  async function loadAllUsers(myUsername) {
    const { data } = await supabase.from("profiles").select("username,emoji,joined_at").neq("username", myUsername);
    if (data) setAllUsers(data);
  }

  async function loadInvites(username) {
    const { data } = await supabase.from("invites").select("code").eq("created_by", username).eq("used", false);
    if (data) setInviteCodes(data.map(r => r.code));
  }

  // Normalize DB row → app shape
  function normalizeEntry(e) {
    return {
      id: e.id,
      user: e.user_id,
      sandwichName: e.sandwich_name,
      location: e.location,
      coords: e.coords,
      ingredients: e.ingredients || [],
      breadType: e.bread_type,
      homemade: e.homemade,
      price: e.price,
      rating: e.rating,
      sentiment: e.sentiment,
      wouldOrderAgain: e.would_order_again,
      notes: e.notes,
      photos: e.photos || [],
      date: e.date,
      likes: (e.likes || []).map(l => l.username),
      comments: (e.comments || []).map(c => ({ user: c.username, text: c.text, date: c.created_at?.split("T")[0] })),
    };
  }

  async function handleSignout() {
    await supabase.auth.signOut();
    setProfile(null); setEntries([]); setFollowing([]); setAllUsers([]); setTab("feed");
  }

  async function toggleFollow(username) {
    const isFollowing = following.includes(username);
    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower", profile.username).eq("following", username);
      setFollowing(f => f.filter(u => u !== username));
    } else {
      await supabase.from("follows").insert({ follower: profile.username, following: username });
      setFollowing(f => [...f, username]);
    }
  }

  async function toggleLike(entryId) {
    const entry = entries.find(e => e.id === entryId);
    const liked = entry.likes.includes(profile.username);
    if (liked) {
      await supabase.from("likes").delete().eq("entry_id", entryId).eq("username", profile.username);
    } else {
      await supabase.from("likes").insert({ entry_id: entryId, username: profile.username });
    }
    setEntries(prev => prev.map(e => e.id !== entryId ? e : {
      ...e, likes: liked ? e.likes.filter(u => u !== profile.username) : [...e.likes, profile.username]
    }));
  }

  async function submitComment(entryId) {
    const text = commentInputs[entryId]?.trim();
    if (!text) return;
    const { data } = await supabase.from("comments").insert({ entry_id: entryId, username: profile.username, text }).select().single();
    if (data) {
      setEntries(prev => prev.map(e => e.id !== entryId ? e : {
        ...e, comments: [...e.comments, { user: data.username, text: data.text, date: data.created_at?.split("T")[0] }]
      }));
      setCommentInputs(prev => ({ ...prev, [entryId]:"" }));
    }
  }

  function addIngredient() {
    if (!form.newIngredient.trim()) return;
    setForm(f => ({ ...f, ingredients:[...f.ingredients, f.newIngredient.trim()], newIngredient:"" }));
  }

  function removeIngredient(i) {
    setForm(f => ({ ...f, ingredients:f.ingredients.filter((_,idx) => idx !== i) }));
  }

  function handlePhoto(e) {
    Array.from(e.target.files || []).forEach(file => {
      setForm(f => {
        if (f.photos.length >= 5) return f;
        const reader = new FileReader();
        reader.onload = ev => setForm(f2 => ({ ...f2, photos: f2.photos.length < 5 ? [...f2.photos, ev.target.result] : f2.photos }));
        reader.readAsDataURL(file);
        return f;
      });
    });
    e.target.value = "";
  }

  function removePhoto(idx) {
    setForm(f => ({ ...f, photos:f.photos.filter((_,i) => i !== idx) }));
  }

  function grabGPS() {
    if (!navigator.geolocation) { setGpsStatus("GPS not available"); return; }
    setGpsStatus("📡 Locating…");
    navigator.geolocation.getCurrentPosition(async pos => {
      const { latitude:lat, longitude:lon } = pos.coords;
      setForm(f => ({ ...f, coords:[lat,lon] }));
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
        const data = await res.json();
        const addr = data.display_name?.split(",").slice(0,3).join(", ") || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
        setForm(f => ({ ...f, location:addr, coords:[lat,lon] }));
        setGpsStatus("✓ Location set");
      } catch {
        setForm(f => ({ ...f, location:`${lat.toFixed(4)}, ${lon.toFixed(4)}`, coords:[lat,lon] }));
        setGpsStatus("✓ Coords saved");
      }
      setTimeout(() => setGpsStatus(""), 3000);
    }, () => { setGpsStatus("⚠ Permission denied"); setTimeout(() => setGpsStatus(""), 3000); });
  }

  async function submitEntry() {
    if (!form.sandwichName.trim() || saving) return;
    setSaving(true);
    const { data, error } = await supabase.from("entries").insert({
      user_id: profile.username,
      sandwich_name: form.sandwichName,
      location: form.location,
      coords: form.coords,
      ingredients: form.ingredients,
      bread_type: form.breadType,
      homemade: form.homemade,
      price: form.price,
      rating: form.rating,
      sentiment: form.sentiment,
      would_order_again: form.wouldOrderAgain,
      notes: form.notes,
      photos: form.photos,
      date: new Date().toISOString().split("T")[0],
    }).select(`*, likes(username), comments(id,username,text,created_at)`).single();

    setSaving(false);
    if (error) { alert("Error saving: " + error.message); return; }
    setEntries(prev => [normalizeEntry(data), ...prev]);
    setForm({ sandwichName:"", location:"", coords:null, breadType:"Sourdough", homemade:false, price:"", rating:5, sentiment:"😋", wouldOrderAgain:true, notes:"", ingredients:[], photos:[], newIngredient:"" });
    setShowModal(false);
    setTab("feed");
  }

  async function generateInvite() {
    const code = makeCode();
    await supabase.from("invites").insert({ code, created_by: profile.username });
    setInviteCodes(c => [...c, code]);
  }

  function copyCode(code) {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  // ── Derived ──
  const myEntries = entries.filter(e => e.user === profile?.username);
  const feedEntries = entries.filter(e => e.user === profile?.username || following.includes(e.user));

  function renderCard(entry) {
    const liked = entry.likes.includes(profile.username);
    return (
      <div key={entry.id} className="card">
        <div className="card-header">
          <span className="card-user">★ {entry.user}</span>
          <span className="card-date">{entry.date}</span>
        </div>
        <PhotoCarousel photos={entry.photos} name={entry.sandwichName} />
        <div className="card-body">
          <div className="card-title">{entry.sandwichName}</div>
          {entry.location && <div className="card-location" onClick={() => setTab("map")}>📍 {entry.location}{entry.coords?" ↗":""}</div>}
          <div className="stars">
            {"★".repeat(entry.rating)}{"☆".repeat(5-entry.rating)}
            <span className="sentiment-badge">{entry.sentiment}</span>
            {entry.wouldOrderAgain && <span className="again-badge">↩ Again</span>}
          </div>
          <div className="card-meta">
            {entry.breadType && <span className="tag tag-bread">🍞 {entry.breadType}</span>}
            {entry.homemade && <span className="tag tag-homemade">🏠 Homemade</span>}
            {entry.price && <span className="tag tag-price">{entry.price}</span>}
          </div>
          {entry.ingredients?.length > 0 && <div className="ingredients">{entry.ingredients.join(" · ")}</div>}
          {entry.notes && <div className="card-notes">{entry.notes}</div>}
          <div className="card-actions">
            <button className={`action-btn ${liked?"liked":""}`} onClick={() => toggleLike(entry.id)}>
              {liked?"♥":"♡"} {entry.likes.length}
            </button>
            <button className="action-btn">💬 {entry.comments.length}</button>
            {entry.coords && <button className="action-btn" onClick={() => setTab("map")}>🗺</button>}
          </div>
        </div>
        <div className="comments-section">
          {entry.comments.map((c,i) => (
            <div key={i} className="comment"><span className="comment-user">{c.user}</span>{c.text}</div>
          ))}
          <div className="comment-input-row">
            <input className="comment-input" placeholder="Add a comment…"
              value={commentInputs[entry.id]||""}
              onChange={e => setCommentInputs(prev => ({ ...prev, [entry.id]:e.target.value }))}
              onKeyDown={e => e.key==="Enter" && submitComment(entry.id)} />
            <button className="comment-submit" onClick={() => submitComment(entry.id)}>Post</button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <div className="loading-screen">Stacked ★</div>;
  if (!profile) return <AuthScreen />;

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        <div className="header">
          <div className="header-inner">
            <div>
              <div className="logo">Stacked</div>
              <div className="logo-sub">a good sandwich is like an old friend</div>
            </div>
            <div className="header-user">
              <span className="header-avatar">{profile.emoji||"🥪"}</span>
              <div>
                <div className="header-username">{profile.username}</div>
                <button className="signout-btn" onClick={handleSignout}>sign out</button>
              </div>
            </div>
          </div>
        </div>

        {tab === "feed" && (
          <div className="feed">
            <div className="section-label">Your Feed</div>
            {feedEntries.length === 0
              ? <div className="empty-state"><span className="big">🥪</span>Follow friends or log your first sandwich!</div>
              : feedEntries.map(renderCard)}
          </div>
        )}

        {tab === "map" && <SandwichMap entries={entries} currentUser={profile.username} />}

        {tab === "people" && (
          <>
            <div className="feed"><div className="section-label">Sandwich Artists</div></div>
            <div style={{ padding:"0 14px 12px" }}>
              <input className="form-input" placeholder="🔍 Search by username…" value={peopleSearch}
                onChange={e => setPeopleSearch(e.target.value)} style={{ width:"100%" }} />
            </div>
            <div className="people-list">
              {allUsers.length === 0
                ? <div className="empty-state"><span className="big">🥪</span>No other sandwich artists yet — invite your friends!</div>
                : (() => {
                    const filtered = allUsers.filter(u => u.username.toLowerCase().includes(peopleSearch.toLowerCase()));
                    if (filtered.length === 0) return <div className="empty-state"><span className="big">🔍</span>No one matching "{peopleSearch}"</div>;
                    return filtered.map(u => (
                      <div key={u.username} className="person-row">
                        <div className="person-avatar-lg">{u.emoji}</div>
                        <div className="person-info">
                          <div className="person-name">{u.username}</div>
                          <div className="person-count">{entries.filter(e => e.user === u.username).length} sandwiches logged</div>
                        </div>
                        <button className={`follow-btn ${following.includes(u.username)?"following":""}`} onClick={() => toggleFollow(u.username)}>
                          {following.includes(u.username) ? "✓ Following" : "+ Follow"}
                        </button>
                      </div>
                    ));
                  })()
              }
            </div>
          </>
        )}

        {tab === "profile" && (
          <>
            <div className="profile-card">
              <div className="profile-header">
                <div className="profile-avatar">{profile.emoji||"🥪"}</div>
                <div className="profile-name">{profile.username}</div>
                <div className="profile-tagline">sandwich enthusiast · since {profile.joined_at||"2026"}</div>
                {profile.email && <div style={{ fontFamily:"'Courier Prime',monospace", fontSize:11, color:"rgba(125,216,208,0.6)", marginTop:4 }}>{profile.email}</div>}
              </div>
              <div className="profile-stats">
                <div className="stat"><span className="stat-num">{myEntries.length}</span><span className="stat-label">Logged</span></div>
                <div className="stat"><span className="stat-num">{following.length}</span><span className="stat-label">Following</span></div>
                <div className="stat"><span className="stat-num">{myEntries.reduce((a,e) => a+e.likes.length,0)}</span><span className="stat-label">Likes</span></div>
                <div className="stat">
                  <span className="stat-num">{myEntries.length?(myEntries.reduce((a,e)=>a+e.rating,0)/myEntries.length).toFixed(1):"—"}</span>
                  <span className="stat-label">Avg ★</span>
                </div>
              </div>
            </div>

            <div className="invite-box">
              <div className="invite-title">Invite Friends</div>
              {inviteCodes.length === 0
                ? <div style={{ fontSize:12, color:"#aaa", fontStyle:"italic", marginBottom:8 }}>No invite codes — generate one below</div>
                : inviteCodes.map(code => (
                  <div key={code} style={{ marginBottom:6 }}>
                    <div className="invite-code" onClick={() => copyCode(code)}>{code}</div>
                    <div className="invite-hint">{copied===code?"✓ Copied!":"Tap to copy — share with a friend"}</div>
                  </div>
                ))
              }
              <button className="gen-invite-btn" onClick={generateInvite}>+ Generate invite code</button>
            </div>

            <div className="feed" style={{ paddingTop:0 }}>
              <div className="section-label">Top-Rated</div>
              {myEntries.length === 0
                ? <div className="empty-state"><span className="big">⭐</span>Log some sandwiches!</div>
                : [...myEntries].sort((a,b) => b.rating-a.rating).slice(0,3).map(renderCard)}
            </div>
            <div className="feed" style={{ paddingTop:0 }}>
              <div className="section-label">All My Sandwiches ({myEntries.length})</div>
              {myEntries.length === 0
                ? <div className="empty-state"><span className="big">📖</span>Nothing logged yet!</div>
                : myEntries.map(renderCard)}
            </div>
          </>
        )}

        <button className="fab" onClick={() => setShowModal(true)}>+</button>

        <div className="bottom-nav">
          {[["feed","📰","Feed"],["map","🗺","Map"],["people","👥","Artists"],["profile","🧑","Me"]].map(([id,icon,label]) => (
            <button key={id} className={`bnav-btn ${tab===id?"active":""}`} onClick={() => setTab(id)}>
              <span className="icon">{icon}</span>{label}
            </button>
          ))}
        </div>

        {showModal && (
          <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowModal(false)}>
            <div className="modal">
              <div className="modal-title">Log a Sandwich</div>
              <div className="modal-sub">add to the hall of fame</div>

              <div className="form-group">
                <label className="form-label">Sandwich Name *</label>
                <input className="form-input" placeholder="e.g. The Italian Stallion" value={form.sandwichName}
                  onChange={e => setForm(f => ({ ...f, sandwichName:e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Location</label>
                <div className="location-row">
                  <input className="form-input" placeholder="e.g. Mike's Deli, Boston" value={form.location}
                    onChange={e => setForm(f => ({ ...f, location:e.target.value }))} />
                  <button className="gps-btn" onClick={grabGPS} disabled={gpsStatus==="📡 Locating…"}>📡 GPS</button>
                </div>
                {gpsStatus && <div className="gps-status">{gpsStatus}</div>}
                {form.coords && <div className="gps-status" style={{ color:"var(--orange)" }}>📍 Pin set on map</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Photos ({form.photos.length}/5)</label>
                <input type="file" accept="image/*" multiple ref={fileRef} style={{ display:"none" }} onChange={handlePhoto} />
                {form.photos.length > 0 && (
                  <div className="photo-grid">
                    {form.photos.map((p,i) => (
                      <div key={i} className="photo-thumb">
                        <img src={p} alt={`photo ${i+1}`} />
                        <button className="photo-thumb-remove" onClick={() => removePhoto(i)}>×</button>
                      </div>
                    ))}
                  </div>
                )}
                <div className={`photo-upload ${form.photos.length>=5?"full":""}`}
                  onClick={() => form.photos.length < 5 && fileRef.current.click()}>
                  📷 {form.photos.length>=5?"5 photos max":`Add photo${form.photos.length>0?"s":""}`}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Ingredients</label>
                <div className="ingredients-input-row">
                  <input className="form-input" placeholder="e.g. Mortadella" value={form.newIngredient}
                    onChange={e => setForm(f => ({ ...f, newIngredient:e.target.value }))}
                    onKeyDown={e => e.key==="Enter" && addIngredient()} />
                  <button className="comment-submit" style={{ whiteSpace:"nowrap", borderRadius:2 }} onClick={addIngredient}>Add</button>
                </div>
                <div style={{ marginTop:6 }}>
                  {form.ingredients.map((ing,i) => (
                    <span key={i} className="ingredient-tag">{ing}<button className="ingredient-remove" onClick={() => removeIngredient(i)}>×</button></span>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Bread Type</label>
                <select className="form-select" value={form.breadType} onChange={e => setForm(f => ({ ...f, breadType:e.target.value }))}>
                  {BREAD_TYPES.map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Rating</label>
                <div className="star-rating">
                  {[1,2,3,4,5].map(n => (
                    <span key={n} className={`star-opt ${n<=form.rating?"filled":""}`} onClick={() => setForm(f => ({ ...f, rating:n }))}>★</span>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Vibe</label>
                <div className="sentiment-picker">
                  {SENTIMENTS.map(s => (
                    <span key={s} className={`sentiment-opt ${form.sentiment===s?"selected":""}`} onClick={() => setForm(f => ({ ...f, sentiment:s }))}>{s}</span>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <div className="toggle-row">
                  <button className={`toggle ${form.homemade?"on":""}`} onClick={() => setForm(f => ({ ...f, homemade:!f.homemade }))} />
                  <span className="toggle-label">🏠 Homemade</span>
                </div>
                <div className="toggle-row">
                  <button className={`toggle ${form.wouldOrderAgain?"on":""}`} onClick={() => setForm(f => ({ ...f, wouldOrderAgain:!f.wouldOrderAgain }))} />
                  <span className="toggle-label">↩ Would eat again</span>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Price</label>
                <input className="form-input" placeholder="e.g. $12" value={form.price}
                  onChange={e => setForm(f => ({ ...f, price:e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-textarea" placeholder="What made it special? What would you change?"
                  value={form.notes} onChange={e => setForm(f => ({ ...f, notes:e.target.value }))} />
              </div>
              <button className="submit-btn" onClick={submitEntry} disabled={saving}>
                {saving ? "Saving…" : "Log This Sandwich"}
              </button>
              <button className="cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
