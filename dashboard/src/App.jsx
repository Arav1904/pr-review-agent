import { useState, useEffect, useRef, useCallback } from "react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, Cell,
  PieChart, Pie
} from "recharts";

// ─── DEMO DATA ───────────────────────────────────────────────────────────────
const DEMO = {
  owner: "Arav1904", repo: "pr-review-agent",
  prs: [
    { number:12, title:"feat: add multi-language support",          author:"Arav1904",      score:88, labels:["enhancement","feature"],      state:"open",   created:"2024-06-08", comments:3,  additions:142, deletions:28  },
    { number:11, title:"fix: memory leak in score tracker",         author:"Arav1904",      score:72, labels:["bug","fix"],                  state:"closed", created:"2024-06-07", comments:5,  additions:34,  deletions:19  },
    { number:10, title:"refactor: groq fallback mechanism",         author:"Arav1904",      score:91, labels:["refactor"],                   state:"closed", created:"2024-06-05", comments:2,  additions:67,  deletions:45  },
    { number:9,  title:"docs: update SOUL.md config guide",         author:"dev-contrib",   score:65, labels:["documentation"],              state:"closed", created:"2024-06-03", comments:1,  additions:89,  deletions:12  },
    { number:8,  title:"feat: 8-label auto-classification system",  author:"Arav1904",      score:95, labels:["enhancement","feature"],      state:"closed", created:"2024-06-01", comments:4,  additions:230, deletions:11  },
    { number:7,  title:"security: sanitize inputs in review script",author:"security-bot",  score:58, labels:["security","critical"],        state:"closed", created:"2024-05-30", comments:7,  additions:55,  deletions:33  },
    { number:6,  title:"perf: optimize gemini prompt token count",  author:"Arav1904",      score:82, labels:["performance"],                state:"closed", created:"2024-05-28", comments:2,  additions:21,  deletions:48  },
    { number:5,  title:"feat: health score badge generation",       author:"Arav1904",      score:79, labels:["feature"],                    state:"closed", created:"2024-05-25", comments:3,  additions:118, deletions:7   },
    { number:4,  title:"fix: workflow trigger condition mismatch",  author:"dev-contrib",   score:44, labels:["bug","critical"],             state:"closed", created:"2024-05-22", comments:9,  additions:8,   deletions:22  },
    { number:3,  title:"chore: update core dependencies",          author:"security-bot",  score:71, labels:["chore"],                      state:"closed", created:"2024-05-20", comments:0,  additions:12,  deletions:12  },
    { number:2,  title:"feat: dual LLM fallback Gemini → Groq",    author:"Arav1904",      score:93, labels:["feature","enhancement"],      state:"closed", created:"2024-05-18", comments:6,  additions:312, deletions:89  },
    { number:1,  title:"init: project bootstrap and CI setup",     author:"Arav1904",      score:61, labels:["chore"],                      state:"closed", created:"2024-05-15", comments:0,  additions:445, deletions:0   },
  ]
};

const LABEL_PALETTE = {
  enhancement:"#00e5ff", feature:"#00b4d8", bug:"#ff4560", fix:"#ffc107",
  security:"#ff4560", critical:"#ff4560", refactor:"#a78bfa",
  performance:"#39ff14", documentation:"#74b9ff", chore:"#4a5568",
  test:"#f472b6"
};

const scoreColor = (s) => s >= 80 ? "#39ff14" : s >= 60 ? "#ffc107" : "#ff4560";
const scoreLabel = (s) => s >= 80 ? "Excellent" : s >= 60 ? "Good" : "Needs Work";

// ─── ANIMATED HEALTH RING ────────────────────────────────────────────────────
function HealthRing({ score, size = 180 }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef(null);

  useEffect(() => {
    let start = null;
    const dur = 1400;
    const run = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / dur, 1);
      const ease = 1 - Math.pow(1 - p, 4);
      setDisplay(Math.round(ease * score));
      if (p < 1) raf.current = requestAnimationFrame(run);
    };
    raf.current = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf.current);
  }, [score]);

  const r = size / 2 - 18;
  const circ = 2 * Math.PI * r;
  const arc = circ * 0.75;
  const dash = arc - (display / 100) * arc;
  const color = scoreColor(display);

  return (
    <div style={{ position:"relative", width:size, height:size, flexShrink:0 }}>
      {/* Outer glow ring */}
      <svg width={size} height={size} style={{ position:"absolute", inset:0 }}>
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        {/* Track */}
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1a2234"
          strokeWidth={12} strokeDasharray={`${arc} ${circ - arc}`} strokeDashoffset={0}
          strokeLinecap="round" transform={`rotate(135 ${size/2} ${size/2})`} />
        {/* Progress */}
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
          strokeWidth={12} strokeDasharray={`${arc} ${circ - arc}`} strokeDashoffset={dash}
          strokeLinecap="round" transform={`rotate(135 ${size/2} ${size/2})`}
          filter="url(#glow)"
          style={{ transition:"stroke 0.4s ease" }} />
        {/* Inner decorative ring */}
        <circle cx={size/2} cy={size/2} r={r-16} fill="none"
          stroke={`${color}18`} strokeWidth={1} />
      </svg>
      {/* Center content */}
      <div style={{
        position:"absolute", inset:0, display:"flex",
        flexDirection:"column", alignItems:"center", justifyContent:"center",
        marginTop:10
      }}>
        <span style={{
          fontSize: size * 0.24, fontWeight:800, color, lineHeight:1,
          fontFamily:"var(--font-mono)", letterSpacing:-2,
          textShadow:`0 0 20px ${color}80`
        }}>{display}</span>
        <span style={{
          fontSize: size * 0.07, color:"var(--text-muted)",
          letterSpacing:3, marginTop:4, fontFamily:"var(--font-mono)"
        }}>HEALTH</span>
        <span style={{
          fontSize: size * 0.09, color, marginTop:2, fontWeight:600,
          fontFamily:"var(--font-head)"
        }}>{scoreLabel(display)}</span>
      </div>
    </div>
  );
}

// ─── STAT CARD ───────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, accent="#00e5ff", onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? "var(--bg-card-hover)" : "var(--bg-card)",
        border:`1px solid ${hov ? accent+"44" : "var(--border)"}`,
        borderRadius:"var(--radius-lg)", padding:"22px 24px",
        cursor: onClick ? "pointer" : "default",
        transition:"all 0.2s ease", position:"relative", overflow:"hidden"
      }}
    >
      {/* Top shimmer line */}
      <div style={{
        position:"absolute", top:0, left:0, right:0, height:2,
        background:`linear-gradient(90deg, transparent, ${accent}88, transparent)`,
        opacity: hov ? 1 : 0.4, transition:"opacity 0.2s"
      }}/>
      <div style={{ display:"flex", alignItems:"flex-start", gap:16 }}>
        <div style={{
          width:46, height:46, borderRadius:12,
          background:`${accent}14`, border:`1px solid ${accent}28`,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:20, flexShrink:0
        }}>{icon}</div>
        <div>
          <div style={{
            fontSize:28, fontWeight:800, color:"var(--text-primary)",
            fontFamily:"var(--font-mono)", lineHeight:1.1, letterSpacing:-1
          }}>{value}</div>
          <div style={{ fontSize:12, color:"var(--text-muted)", marginTop:3, letterSpacing:0.5 }}>
            {label}
          </div>
          {sub && <div style={{ fontSize:11, color:accent, marginTop:5, fontWeight:500 }}>{sub}</div>}
        </div>
      </div>
    </div>
  );
}

// ─── LABEL CHIP ──────────────────────────────────────────────────────────────
function LabelChip({ label }) {
  const c = LABEL_PALETTE[label] || "#a78bfa";
  return (
    <span style={{
      background:`${c}16`, color:c, border:`1px solid ${c}38`,
      borderRadius:20, padding:"2px 10px", fontSize:11, fontWeight:600,
      letterSpacing:0.3, whiteSpace:"nowrap", flexShrink:0
    }}>{label}</span>
  );
}

// ─── SCORE BADGE ─────────────────────────────────────────────────────────────
function ScoreBadge({ score }) {
  const c = scoreColor(score);
  return (
    <span style={{
      background:`${c}14`, color:c, border:`1px solid ${c}38`,
      borderRadius:8, padding:"3px 12px", fontSize:13,
      fontFamily:"var(--font-mono)", fontWeight:700, flexShrink:0
    }}>{score}</span>
  );
}

// ─── CUSTOM TOOLTIP ──────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background:"#0d1117", border:"1px solid #1a2234",
      borderRadius:10, padding:"10px 14px",
      boxShadow:"0 8px 32px #00000080"
    }}>
      <div style={{ color:"var(--text-muted)", fontSize:11, marginBottom:6 }}>{label}</div>
      {payload.map((p,i) => (
        <div key={i} style={{
          color:p.color, fontSize:13,
          fontFamily:"var(--font-mono)", display:"flex", gap:8
        }}>
          <span style={{ color:"var(--text-secondary)" }}>{p.name}:</span>
          <strong>{typeof p.value === "number" ? Math.round(p.value) : p.value}</strong>
        </div>
      ))}
    </div>
  );
}

// ─── CONNECT SCREEN ──────────────────────────────────────────────────────────
function ConnectScreen({ onConnect, onDemo }) {
  const [tok, setTok] = useState("");
  const [own, setOwn] = useState("Arav1904");
  const [rep, setRep] = useState("pr-review-agent");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleConnect = async () => {
    if (!tok || !own || !rep) { setErr("Please fill all fields."); return; }
    setLoading(true); setErr("");
    try {
      const res = await fetch(
        `https://api.github.com/repos/${own}/${rep}/pulls?state=all&per_page=30`,
        { headers:{ Authorization:`Bearer ${tok}`, Accept:"application/vnd.github+json" } }
      );
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      const data = await res.json();
      const enriched = await Promise.all(data.slice(0,25).map(async (pr) => {
        let score = null;
        try {
          const cr = await fetch(pr.comments_url, { headers:{ Authorization:`Bearer ${tok}` } });
          const comments = await cr.json();
          for (const c of comments) {
            const m = c.body?.match(/[Hh]ealth[^:]*:\s*\*?\*?(\d{1,3})/);
            if (m) { score = parseInt(m[1]); break; }
          }
        } catch(_) {}
        if (score === null) {
          const sz = (pr.additions||0) + (pr.deletions||0);
          score = Math.max(25, Math.min(97, 87 - Math.floor(sz/60)));
        }
        return {
          number:pr.number, title:pr.title, author:pr.user.login,
          score, labels:pr.labels.map(l=>l.name), state:pr.state,
          created:pr.created_at?.split("T")[0],
          comments:pr.comments, additions:pr.additions||0, deletions:pr.deletions||0
        };
      }));
      onConnect(enriched, own, rep, tok);
    } catch(e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight:"100vh", background:"var(--bg-base)",
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:"40px 24px", position:"relative", overflow:"hidden"
    }}>
      {/* Background noise */}
      <div style={{
        position:"absolute", inset:0, pointerEvents:"none",
        backgroundImage:`radial-gradient(circle at 20% 20%, #00e5ff06 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, #39ff1406 0%, transparent 50%),
          radial-gradient(circle, #1a223408 1px, transparent 1px)`,
        backgroundSize:"100% 100%, 100% 100%, 32px 32px"
      }}/>

      <div style={{ width:"100%", maxWidth:460, position:"relative", zIndex:1 }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{
            display:"inline-flex", alignItems:"center", gap:14,
            background:"var(--bg-card)", border:"1px solid var(--border)",
            borderRadius:20, padding:"12px 22px", marginBottom:20
          }}>
            <div style={{
              width:44, height:44, borderRadius:12,
              background:"linear-gradient(135deg,#00e5ff,#0066ff)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:22, boxShadow:"0 0 24px #00e5ff40"
            }}>🤖</div>
            <div style={{ textAlign:"left" }}>
              <div style={{
                fontSize:20, fontWeight:800, fontFamily:"var(--font-head)",
                letterSpacing:-0.5
              }}>ReviewBot</div>
              <div style={{
                fontSize:10, color:"var(--cyan)", letterSpacing:3,
                fontFamily:"var(--font-mono)", marginTop:1
              }}>ANALYTICS DASHBOARD</div>
            </div>
          </div>
          <p style={{ color:"var(--text-secondary)", fontSize:14, lineHeight:1.7, maxWidth:340, margin:"0 auto" }}>
            AI-powered PR health scores, contributor leaderboards, and code quality trends — all in one place.
          </p>
        </div>

        {/* Card */}
        <div style={{
          background:"var(--bg-card)", border:"1px solid var(--border)",
          borderRadius:"var(--radius-xl)", padding:32,
          boxShadow:"0 0 0 1px #00e5ff08, 0 32px 64px #00000060"
        }}>
          <div style={{ height:1, background:"linear-gradient(90deg,transparent,var(--cyan),transparent)", marginBottom:28 }}/>

          {err && (
            <div style={{
              background:"var(--coral-dim)", border:"1px solid #ff456030",
              borderRadius:"var(--radius-md)", padding:"12px 16px", marginBottom:18,
              color:"var(--coral)", fontSize:13, display:"flex", gap:8
            }}>⚠ {err}</div>
          )}

          {[
            { label:"GitHub Personal Access Token", val:tok, set:setTok, type:"password", ph:"ghp_xxxxxxxxxxxxxxxxxxxx" },
            { label:"Repository Owner",              val:own, set:setOwn, type:"text",     ph:"Arav1904" },
            { label:"Repository Name",               val:rep, set:setRep, type:"text",     ph:"pr-review-agent" },
          ].map(({ label, val, set, type, ph }) => (
            <div key={label} style={{ marginBottom:18 }}>
              <label style={{ display:"block", fontSize:11, color:"var(--text-secondary)", marginBottom:6, letterSpacing:0.8, fontWeight:500 }}>
                {label.toUpperCase()}
              </label>
              <input
                type={type} value={val} onChange={e=>set(e.target.value)}
                placeholder={ph}
                style={{
                  width:"100%", background:"var(--bg-base)",
                  border:"1px solid var(--border)", borderRadius:"var(--radius-md)",
                  padding:"11px 14px", color:"var(--text-primary)",
                  fontSize:13, fontFamily:"var(--font-mono)", outline:"none",
                  boxSizing:"border-box", transition:"border-color 0.2s"
                }}
                onFocus={e=>e.target.style.borderColor="var(--cyan)"}
                onBlur={e=>e.target.style.borderColor="var(--border)"}
                onKeyDown={e=>e.key==="Enter" && handleConnect()}
              />
            </div>
          ))}

          <button onClick={handleConnect} disabled={loading} style={{
            width:"100%", padding:"13px 0",
            background: loading ? "var(--border)" : "linear-gradient(135deg,#00e5ff,#0055ff)",
            color: loading ? "var(--text-muted)" : "#05070f",
            border:"none", borderRadius:"var(--radius-md)", fontWeight:700,
            fontSize:14, cursor: loading ? "not-allowed" : "pointer",
            fontFamily:"var(--font-head)", letterSpacing:0.3,
            boxShadow: loading ? "none" : "0 0 24px #00e5ff30",
            transition:"all 0.2s"
          }}>
            {loading ? "Connecting to GitHub..." : "Connect Repository →"}
          </button>

          <div style={{ position:"relative", margin:"22px 0", textAlign:"center" }}>
            <div style={{ height:1, background:"var(--border)" }}/>
            <span style={{
              position:"absolute", top:-9, left:"50%", transform:"translateX(-50%)",
              background:"var(--bg-card)", padding:"0 14px",
              color:"var(--text-muted)", fontSize:12
            }}>or</span>
          </div>

          <button onClick={onDemo} style={{
            width:"100%", padding:"12px 0",
            background:"transparent", color:"var(--cyan)",
            border:"1px solid var(--cyan-glow)", borderRadius:"var(--radius-md)",
            fontWeight:600, fontSize:13, cursor:"pointer",
            fontFamily:"var(--font-head)", letterSpacing:0.3,
            transition:"all 0.2s"
          }}
            onMouseEnter={e=>e.target.style.background="var(--cyan-dim)"}
            onMouseLeave={e=>e.target.style.background="transparent"}
          >
            🎬 Explore with Live Demo Data
          </button>

          <p style={{ textAlign:"center", fontSize:11, color:"var(--text-muted)", marginTop:16, lineHeight:1.6 }}>
            Token needs <code style={{ color:"var(--purple)" }}>repo</code> scope only.
            Never stored — session only.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────
function Sidebar({ owner, repo, activeTab, setActiveTab, onDisconnect, isDemo }) {
  const navItems = [
    { id:"overview",      icon:"◉", label:"Overview" },
    { id:"trends",        icon:"↗", label:"Score Trends" },
    { id:"leaderboard",   icon:"⬡", label:"Leaderboard" },
    { id:"pull-requests", icon:"⑂", label:"Pull Requests" },
  ];

  return (
    <aside style={{
      width:"var(--sidebar-w)", flexShrink:0,
      background:"var(--bg-sidebar)",
      borderRight:"1px solid var(--border)",
      display:"flex", flexDirection:"column",
      height:"100vh", position:"sticky", top:0, overflowY:"auto"
    }}>
      {/* Logo */}
      <div style={{ padding:"24px 20px 20px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:4 }}>
          <div style={{
            width:36, height:36, borderRadius:10,
            background:"linear-gradient(135deg,#00e5ff,#0055ff)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:18, boxShadow:"0 0 16px #00e5ff30", flexShrink:0
          }}>🤖</div>
          <div>
            <div style={{ fontFamily:"var(--font-head)", fontWeight:800, fontSize:15 }}>ReviewBot</div>
            <div style={{ fontSize:9, color:"var(--cyan)", letterSpacing:3, fontFamily:"var(--font-mono)" }}>ANALYTICS</div>
          </div>
        </div>
      </div>

      {/* Repo badge */}
      <div style={{ padding:"0 16px 20px" }}>
        <div style={{
          background:"var(--bg-card)", border:"1px solid var(--border)",
          borderRadius:10, padding:"10px 12px"
        }}>
          {isDemo && (
            <div style={{
              fontSize:9, color:"var(--amber)", background:"var(--amber-dim)",
              border:"1px solid #ffc10730", borderRadius:4, padding:"2px 7px",
              letterSpacing:2, fontFamily:"var(--font-mono)", marginBottom:6,
              display:"inline-block"
            }}>DEMO MODE</div>
          )}
          <div style={{ fontSize:12, color:"var(--text-muted)", marginBottom:2 }}>Repository</div>
          <div style={{ fontSize:13, fontWeight:600, fontFamily:"var(--font-mono)", color:"var(--text-primary)" }}>
            {owner}<span style={{ color:"var(--text-muted)" }}>/</span>{repo}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding:"0 12px", flex:1 }}>
        <div style={{ fontSize:10, color:"var(--text-muted)", letterSpacing:2, padding:"0 8px 8px", fontWeight:600 }}>
          ANALYTICS
        </div>
        {navItems.map(item => {
          const active = activeTab === item.id;
          return (
            <button key={item.id} onClick={()=>setActiveTab(item.id)} style={{
              width:"100%", display:"flex", alignItems:"center", gap:12,
              padding:"10px 12px", borderRadius:10, marginBottom:2,
              background: active ? "var(--cyan-dim)" : "transparent",
              border: active ? "1px solid var(--cyan-glow)" : "1px solid transparent",
              color: active ? "var(--cyan)" : "var(--text-secondary)",
              fontWeight: active ? 600 : 400, fontSize:14,
              cursor:"pointer", fontFamily:"var(--font-body)",
              textAlign:"left", transition:"all 0.15s"
            }}
              onMouseEnter={e=>{ if(!active) { e.currentTarget.style.background="var(--bg-card)"; e.currentTarget.style.color="var(--text-primary)"; }}}
              onMouseLeave={e=>{ if(!active) { e.currentTarget.style.background="transparent"; e.currentTarget.style.color="var(--text-secondary)"; }}}
            >
              <span style={{ fontSize:16, width:20, textAlign:"center" }}>{item.icon}</span>
              {item.label}
              {active && <div style={{ width:5, height:5, borderRadius:"50%", background:"var(--cyan)", marginLeft:"auto", boxShadow:"0 0 6px var(--cyan)" }}/>}
            </button>
          );
        })}
      </nav>

      {/* Bottom disconnect */}
      <div style={{ padding:"16px 12px" }}>
        <button onClick={onDisconnect} style={{
          width:"100%", padding:"10px 12px", background:"transparent",
          border:"1px solid var(--border)", borderRadius:10,
          color:"var(--text-muted)", fontSize:13, cursor:"pointer",
          fontFamily:"var(--font-body)", transition:"all 0.15s",
          display:"flex", alignItems:"center", gap:8
        }}
          onMouseEnter={e=>{ e.currentTarget.style.borderColor="var(--coral-dim)"; e.currentTarget.style.color="var(--coral)"; }}
          onMouseLeave={e=>{ e.currentTarget.style.borderColor="var(--border)"; e.currentTarget.style.color="var(--text-muted)"; }}
        >
          ← Disconnect
        </button>
      </div>
    </aside>
  );
}

// ─── SECTION HEADER ──────────────────────────────────────────────────────────
function PageHeader({ title, sub }) {
  return (
    <div style={{ marginBottom:28 }}>
      <h1 style={{
        fontFamily:"var(--font-head)", fontWeight:800, fontSize:26,
        letterSpacing:-0.5, marginBottom:4
      }}>{title}</h1>
      <p style={{ color:"var(--text-secondary)", fontSize:14 }}>{sub}</p>
    </div>
  );
}

// ─── CARD WRAPPER ─────────────────────────────────────────────────────────────
function Card({ children, style={} }) {
  return (
    <div style={{
      background:"var(--bg-card)", border:"1px solid var(--border)",
      borderRadius:"var(--radius-lg)", padding:24,
      ...style
    }}>
      {children}
    </div>
  );
}
function CardTitle({ children }) {
  return (
    <div style={{
      fontSize:11, fontWeight:700, color:"var(--text-muted)",
      letterSpacing:2, marginBottom:20, fontFamily:"var(--font-mono)"
    }}>{children}</div>
  );
}

// ─── OVERVIEW PAGE ────────────────────────────────────────────────────────────
function OverviewPage({ prs }) {
  const avg    = prs.length ? Math.round(prs.reduce((a,b)=>a+b.score,0)/prs.length) : 0;
  const open   = prs.filter(p=>p.state==="open").length;
  const high   = prs.filter(p=>p.score>=80).length;
  const low    = prs.filter(p=>p.score<60).length;
  const medium = prs.filter(p=>p.score>=60&&p.score<80).length;

  const distData = [
    { range:"0-20",  count:prs.filter(p=>p.score<20).length },
    { range:"20-40", count:prs.filter(p=>p.score>=20&&p.score<40).length },
    { range:"40-60", count:prs.filter(p=>p.score>=40&&p.score<60).length },
    { range:"60-80", count:prs.filter(p=>p.score>=60&&p.score<80).length },
    { range:"80-100",count:prs.filter(p=>p.score>=80).length },
  ];

  const labelDist = Object.entries(
    prs.flatMap(p=>p.labels).reduce((a,l)=>({ ...a, [l]:(a[l]||0)+1 }),{})
  ).map(([name,count])=>({ name, count })).sort((a,b)=>b.count-a.count);

  const radarData = [
    { subject:"Security",      score: Math.round(avg * 0.92) },
    { subject:"Performance",   score: Math.round(avg * 1.04) },
    { subject:"Code Quality",  score: avg },
    { subject:"Docs",          score: Math.round(avg * 0.88) },
    { subject:"Test Coverage", score: Math.round(avg * 0.78) },
    { subject:"Reliability",   score: Math.round(avg * 0.96) },
  ];

  const pieData = [
    { name:"Excellent (80+)", value:high,   color:"#39ff14" },
    { name:"Good (60-79)",    value:medium, color:"#ffc107" },
    { name:"Needs Work (<60)",value:low,    color:"#ff4560" },
  ].filter(d=>d.value>0);

  return (
    <>
      <PageHeader
        title="Repository Overview"
        sub={`Analytics for ${prs.length} pull requests · ReviewBot AI/ML Track`}
      />

      {/* Hero row: dial + stats */}
      <div style={{ display:"grid", gridTemplateColumns:"auto 1fr", gap:20, marginBottom:20, alignItems:"stretch" }}>
        {/* Dial card */}
        <Card style={{
          display:"flex", flexDirection:"column", alignItems:"center",
          justifyContent:"center", gap:16, padding:"32px 36px",
          border:"1px solid #39ff1420",
          background:"linear-gradient(135deg,var(--bg-card) 0%,#39ff1406 100%)",
          boxShadow:"0 0 48px #39ff1408"
        }}>
          <HealthRing score={avg} size={180} />
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:12, color:"var(--text-muted)", letterSpacing:1 }}>
              {prs.length} PRs ANALYZED
            </div>
            <div style={{ display:"flex", gap:6, marginTop:10, justifyContent:"center", flexWrap:"wrap" }}>
              {["Dual-LLM","Agent Memory","Auto-Label"].map(t=>(
                <span key={t} style={{
                  fontSize:10, background:"var(--cyan-dim)", color:"var(--cyan)",
                  border:"1px solid var(--cyan-glow)", borderRadius:20, padding:"2px 8px",
                  fontFamily:"var(--font-mono)", letterSpacing:0.3
                }}>{t}</span>
              ))}
            </div>
          </div>
        </Card>

        {/* Stats grid */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <StatCard icon="⑂" label="Total PRs Reviewed"  value={prs.length}       sub={`${open} currently open`}    accent="var(--cyan)"   />
          <StatCard icon="★" label="Excellent Quality"    value={high}             sub="Score ≥ 80 — production ready" accent="var(--lime)"   />
          <StatCard icon="⚡" label="Repository Avg Score" value={`${avg}/100`}    sub="Across all PRs"              accent="var(--purple)" />
          <StatCard icon="⚠" label="Flagged PRs"          value={low}              sub="Score < 60 — needs attention" accent="var(--coral)"  />
        </div>
      </div>

      {/* Charts row */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:20, marginBottom:20 }}>
        {/* Distribution bar */}
        <Card style={{ gridColumn:"1 / 3" }}>
          <CardTitle>HEALTH SCORE DISTRIBUTION</CardTitle>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={distData} barSize={40}>
              <defs>
                <linearGradient id="bgrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00e5ff"/>
                  <stop offset="100%" stopColor="#0044ff"/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
              <XAxis dataKey="range" tick={{ fill:"var(--text-muted)", fontSize:11 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill:"var(--text-muted)", fontSize:11 }} axisLine={false} tickLine={false}/>
              <Tooltip content={<ChartTooltip/>}/>
              <Bar dataKey="count" name="PRs" fill="url(#bgrad)" radius={[6,6,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Quality Pie */}
        <Card>
          <CardTitle>QUALITY BREAKDOWN</CardTitle>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={70}
                innerRadius={40} paddingAngle={4} strokeWidth={0}>
                {pieData.map((d,i)=><Cell key={i} fill={d.color} fillOpacity={0.85}/>)}
              </Pie>
              <Tooltip content={<ChartTooltip/>}/>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display:"flex", flexDirection:"column", gap:6, marginTop:4 }}>
            {pieData.map(d=>(
              <div key={d.name} style={{ display:"flex", alignItems:"center", gap:8, fontSize:11 }}>
                <div style={{ width:8, height:8, borderRadius:2, background:d.color, flexShrink:0 }}/>
                <span style={{ color:"var(--text-secondary)", flex:1 }}>{d.name}</span>
                <span style={{ color:d.color, fontFamily:"var(--font-mono)", fontWeight:700 }}>{d.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Radar + Labels */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
        <Card>
          <CardTitle>QUALITY DIMENSIONS RADAR</CardTitle>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--border)"/>
              <PolarAngleAxis dataKey="subject" tick={{ fill:"var(--text-muted)", fontSize:10 }}/>
              <Radar name="Score" dataKey="score" stroke="var(--cyan)" fill="var(--cyan)"
                fillOpacity={0.12} strokeWidth={2}/>
              <Tooltip content={<ChartTooltip/>}/>
            </RadarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardTitle>LABEL DISTRIBUTION</CardTitle>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {labelDist.map(({ name, count })=>(
              <div key={name} style={{
                display:"flex", alignItems:"center", gap:7,
                background:`${LABEL_PALETTE[name]||"#a78bfa"}10`,
                border:`1px solid ${LABEL_PALETTE[name]||"#a78bfa"}25`,
                borderRadius:30, padding:"5px 12px"
              }}>
                <LabelChip label={name}/>
                <span style={{
                  fontSize:13, fontWeight:700, fontFamily:"var(--font-mono)",
                  color:"var(--text-primary)"
                }}>{count}</span>
              </div>
            ))}
          </div>
          {/* Recent activity */}
          <div style={{ marginTop:20 }}>
            <div style={{ fontSize:11, color:"var(--text-muted)", letterSpacing:1, marginBottom:12, fontFamily:"var(--font-mono)", fontWeight:700 }}>
              RECENT ACTIVITY
            </div>
            {prs.slice(0,4).map(pr=>(
              <div key={pr.number} style={{
                display:"flex", alignItems:"center", gap:10,
                padding:"8px 0", borderBottom:"1px solid var(--border)"
              }}>
                <div style={{
                  width:7, height:7, borderRadius:"50%", flexShrink:0,
                  background: pr.state==="open" ? "var(--lime)" : "var(--text-muted)",
                  boxShadow: pr.state==="open" ? "0 0 6px var(--lime)" : "none"
                }}/>
                <span style={{ flex:1, fontSize:12, color:"var(--text-secondary)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  #{pr.number} {pr.title}
                </span>
                <ScoreBadge score={pr.score}/>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

// ─── TRENDS PAGE ─────────────────────────────────────────────────────────────
function TrendsPage({ prs }) {
  const sorted = [...prs].sort((a,b)=>new Date(a.created)-new Date(b.created));

  const trendData = sorted.map((p,i)=>({
    name:`#${p.number}`,
    score: p.score,
    rolling: i >= 2
      ? Math.round(sorted.slice(i-2,i+1).reduce((s,x)=>s+x.score,0)/3)
      : p.score,
    date: p.created
  }));

  const activityData = sorted.map(p=>({
    name:`#${p.number}`,
    additions: p.additions,
    deletions: p.deletions,
    net: p.additions - p.deletions
  }));

  const avg = prs.length ? Math.round(prs.reduce((a,b)=>a+b.score,0)/prs.length) : 0;
  const best = Math.max(...prs.map(p=>p.score));
  const worst = Math.min(...prs.map(p=>p.score));
  const variance = Math.round(Math.sqrt(prs.reduce((s,p)=>s+Math.pow(p.score-avg,2),0)/prs.length));
  const improving = prs.filter(p=>p.score>avg).length;

  const statsData = [
    { icon:"🏆", label:"Best Score",       value:best,              color:"var(--lime)"  },
    { icon:"⚠",  label:"Lowest Score",     value:worst,             color:"var(--coral)" },
    { icon:"〜",  label:"Std Deviation",    value:`±${variance}`,    color:"var(--amber)" },
    { icon:"↑",  label:"Above Average",    value:`${improving}/${prs.length}`, color:"var(--cyan)" },
  ];

  return (
    <>
      <PageHeader title="Score Trends" sub="Track code quality evolution across your PR history."/>

      {/* Quick stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:20 }}>
        {statsData.map(({ icon, label, value, color })=>(
          <Card key={label} style={{ border:`1px solid ${color}18`, textAlign:"center", padding:20 }}>
            <div style={{ fontSize:26, marginBottom:8 }}>{icon}</div>
            <div style={{ fontSize:24, fontWeight:800, color, fontFamily:"var(--font-mono)", letterSpacing:-1 }}>{value}</div>
            <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:4 }}>{label}</div>
          </Card>
        ))}
      </div>

      {/* Area chart */}
      <Card style={{ marginBottom:20 }}>
        <CardTitle>HEALTH SCORE PER PR + 3-PR ROLLING AVERAGE</CardTitle>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={trendData}>
            <defs>
              <linearGradient id="ag1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#00e5ff" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="#00e5ff" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="ag2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#a78bfa" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#a78bfa" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
            <XAxis dataKey="name" tick={{ fill:"var(--text-muted)", fontSize:11 }} axisLine={false} tickLine={false}/>
            <YAxis domain={[0,100]} tick={{ fill:"var(--text-muted)", fontSize:11 }} axisLine={false} tickLine={false}/>
            {/* Threshold lines */}
            <CartesianGrid horizontal={false} stroke="transparent"/>
            <Tooltip content={<ChartTooltip/>}/>
            <Area type="monotone" dataKey="score"   name="Health Score" stroke="#00e5ff" strokeWidth={2.5}
              fill="url(#ag1)" dot={{ fill:"#00e5ff", r:4, strokeWidth:0 }} activeDot={{ r:6, strokeWidth:0 }}/>
            <Area type="monotone" dataKey="rolling" name="Rolling Avg"  stroke="#a78bfa" strokeWidth={1.5}
              strokeDasharray="5 4" fill="url(#ag2)" dot={false}/>
          </AreaChart>
        </ResponsiveContainer>
        {/* Legend */}
        <div style={{ display:"flex", gap:20, marginTop:12 }}>
          {[{ c:"#00e5ff", l:"Health Score per PR" },{ c:"#a78bfa", l:"3-PR Rolling Avg", dash:true }].map(({ c, l, dash })=>(
            <div key={l} style={{ display:"flex", alignItems:"center", gap:8, fontSize:12, color:"var(--text-secondary)" }}>
              <div style={{
                width:24, height:2, background:c,
                borderRadius:2, flexShrink:0,
                borderTop: dash ? `2px dashed ${c}` : undefined,
                background: dash ? "none" : c
              }}/>
              {l}
            </div>
          ))}
        </div>
      </Card>

      {/* Line chart + Bar chart */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
        <Card>
          <CardTitle>SCORE TRAJECTORY (LINE)</CardTitle>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
              <XAxis dataKey="name" tick={{ fill:"var(--text-muted)", fontSize:11 }} axisLine={false} tickLine={false}/>
              <YAxis domain={[0,100]} tick={{ fill:"var(--text-muted)", fontSize:11 }} axisLine={false} tickLine={false}/>
              <Tooltip content={<ChartTooltip/>}/>
              <Line type="monotone" dataKey="score" name="Score" stroke="#39ff14" strokeWidth={2}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  const c = scoreColor(payload.score);
                  return <circle key={cx} cx={cx} cy={cy} r={5} fill={c} stroke="var(--bg-card)" strokeWidth={2}/>;
                }}/>
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardTitle>CODE CHANGES PER PR (ADDITIONS vs DELETIONS)</CardTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={activityData} barSize={12}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
              <XAxis dataKey="name" tick={{ fill:"var(--text-muted)", fontSize:10 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill:"var(--text-muted)", fontSize:11 }} axisLine={false} tickLine={false}/>
              <Tooltip content={<ChartTooltip/>}/>
              <Bar dataKey="additions" name="Additions" fill="#39ff14" fillOpacity={0.75} radius={[3,3,0,0]}/>
              <Bar dataKey="deletions" name="Deletions" fill="#ff4560" fillOpacity={0.75} radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </>
  );
}

// ─── LEADERBOARD PAGE ─────────────────────────────────────────────────────────
function LeaderboardPage({ prs }) {
  const board = Object.values(
    prs.reduce((acc, pr)=>{
      if (!acc[pr.author]) acc[pr.author] = { author:pr.author, scores:[], prs:0 };
      acc[pr.author].scores.push(pr.score);
      acc[pr.author].prs++;
      return acc;
    },{})
  ).map(a=>({
    ...a,
    avg:  Math.round(a.scores.reduce((s,x)=>s+x,0)/a.scores.length),
    best: Math.max(...a.scores),
    worst:Math.min(...a.scores),
  })).sort((a,b)=>b.avg-a.avg);

  const MEDALS = ["🥇","🥈","🥉"];

  return (
    <>
      <PageHeader title="Team Leaderboard" sub="Contributors ranked by average PR health score."/>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:20, alignItems:"start" }}>
        {/* Ranked list */}
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {board.map((dev, i)=>{
            const color = scoreColor(dev.avg);
            const isTop = i < 3;
            const pct = dev.avg;
            return (
              <Card key={dev.author} style={{
                border: isTop ? `1px solid ${color}28` : "1px solid var(--border)",
                background: isTop
                  ? `linear-gradient(135deg, var(--bg-card), ${color}06)`
                  : "var(--bg-card)",
                transition:"transform 0.15s",
                cursor:"default",
                position:"relative", overflow:"hidden"
              }}
                onMouseEnter={e=>e.currentTarget.style.transform="translateX(4px)"}
                onMouseLeave={e=>e.currentTarget.style.transform="translateX(0)"}
              >
                {isTop && (
                  <div style={{
                    position:"absolute", top:0, left:0, right:0, height:1,
                    background:`linear-gradient(90deg,transparent,${color},transparent)`
                  }}/>
                )}
                <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                  {/* Rank */}
                  <div style={{ width:40, textAlign:"center", fontSize:22, flexShrink:0 }}>
                    {MEDALS[i] || (
                      <span style={{ fontSize:14, color:"var(--text-muted)", fontFamily:"var(--font-mono)", fontWeight:600 }}>
                        #{i+1}
                      </span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div style={{
                    width:48, height:48, borderRadius:"50%",
                    background:`linear-gradient(135deg,${color}30,${color}10)`,
                    border:`2px solid ${color}40`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:20, fontWeight:800, color, flexShrink:0,
                    fontFamily:"var(--font-head)"
                  }}>{dev.author[0].toUpperCase()}</div>

                  {/* Info */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                      <div>
                        <span style={{ fontWeight:700, fontSize:16, fontFamily:"var(--font-head)" }}>{dev.author}</span>
                        <span style={{
                          fontSize:12, color:"var(--text-muted)", marginLeft:10,
                          fontFamily:"var(--font-mono)"
                        }}>
                          {dev.prs} PR{dev.prs!==1?"s":""} · best {dev.best} · worst {dev.worst}
                        </span>
                      </div>
                      <ScoreBadge score={dev.avg}/>
                    </div>
                    {/* Progress bar */}
                    <div style={{ height:6, background:"var(--border)", borderRadius:3, overflow:"hidden" }}>
                      <div style={{
                        height:"100%", width:`${pct}%`,
                        background:`linear-gradient(90deg,${color}80,${color})`,
                        borderRadius:3, boxShadow:`0 0 8px ${color}50`,
                        transition:"width 1.2s cubic-bezier(0.4,0,0.2,1)"
                      }}/>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Side charts */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <Card>
            <CardTitle>AVG SCORE COMPARISON</CardTitle>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={board} layout="vertical" barSize={18}>
                <defs>
                  <linearGradient id="lbg" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#0044ff"/>
                    <stop offset="100%" stopColor="#00e5ff"/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false}/>
                <XAxis type="number" domain={[0,100]} tick={{ fill:"var(--text-muted)", fontSize:10 }} axisLine={false} tickLine={false}/>
                <YAxis type="category" dataKey="author" tick={{ fill:"var(--text-secondary)", fontSize:12 }} axisLine={false} tickLine={false} width={70}/>
                <Tooltip content={<ChartTooltip/>}/>
                <Bar dataKey="avg" name="Avg Score" radius={[0,6,6,0]} fill="url(#lbg)"/>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <CardTitle>PR COUNT BY CONTRIBUTOR</CardTitle>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={board} dataKey="prs" cx="50%" cy="50%" outerRadius={60}
                  innerRadius={30} paddingAngle={4} strokeWidth={0}
                  nameKey="author">
                  {board.map((_,i)=>(
                    <Cell key={i} fill={["#00e5ff","#a78bfa","#39ff14","#ffc107","#ff4560"][i%5]}
                      fillOpacity={0.85}/>
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip/>}/>
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>
    </>
  );
}

// ─── PR ROW ───────────────────────────────────────────────────────────────────
function PRRow({ pr }) {
  const [hov, setHov] = useState(false);
  const c = scoreColor(pr.score);
  return (
    <div
      onMouseEnter={()=>setHov(true)}
      onMouseLeave={()=>setHov(false)}
      style={{
        background: hov ? "var(--bg-card-hover)" : "var(--bg-card)",
        border:`1px solid ${hov ? "var(--border-bright)" : "var(--border)"}`,
        borderRadius:"var(--radius-md)", padding:"14px 20px",
        display:"flex", alignItems:"center", gap:14,
        transition:"all 0.15s", cursor:"default"
      }}
    >
      <div style={{
        width:3, height:40, borderRadius:2, flexShrink:0,
        background:`linear-gradient(180deg,${c},${c}44)`,
        boxShadow:`0 0 8px ${c}50`
      }}/>
      <div style={{ fontFamily:"var(--font-mono)", color:"var(--text-muted)", fontSize:12, width:36, flexShrink:0 }}>
        #{pr.number}
      </div>
      <div style={{
        width:8, height:8, borderRadius:"50%", flexShrink:0,
        background: pr.state==="open" ? "var(--lime)" : "var(--text-muted)",
        boxShadow: pr.state==="open" ? "0 0 6px var(--lime)" : "none"
      }}/>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{
          fontWeight:600, fontSize:14, marginBottom:5, color:"var(--text-primary)",
          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"
        }}>{pr.title}</div>
        <div style={{ display:"flex", gap:6, alignItems:"center", overflow:"hidden" }}>
          {pr.labels.slice(0,3).map(l=><LabelChip key={l} label={l}/>)}
          <span style={{ fontSize:11, color:"var(--text-muted)", whiteSpace:"nowrap" }}>
            {pr.author} · {pr.created}
          </span>
        </div>
      </div>
      <div style={{ display:"flex", gap:14, alignItems:"center", flexShrink:0 }}>
        <div style={{ textAlign:"right", fontSize:11 }}>
          <span style={{ color:"var(--lime)" }}>+{pr.additions}</span>
          <span style={{ color:"var(--text-muted)", margin:"0 4px" }}>/</span>
          <span style={{ color:"var(--coral)" }}>-{pr.deletions}</span>
        </div>
        {pr.comments > 0 && (
          <span style={{ fontSize:11, color:"var(--text-muted)", whiteSpace:"nowrap" }}>💬 {pr.comments}</span>
        )}
        <ScoreBadge score={pr.score}/>
      </div>
    </div>
  );
}

// ─── PULL REQUESTS PAGE ───────────────────────────────────────────────────────
function PullRequestsPage({ prs }) {
  const [filterLabel, setFilterLabel] = useState("all");
  const [filterState, setFilterState] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [search, setSearch] = useState("");

  const allLabels = [...new Set(prs.flatMap(p=>p.labels))];

  const filtered = prs
    .filter(p=> filterLabel==="all" || p.labels.includes(filterLabel))
    .filter(p=> filterState==="all" || p.state===filterState)
    .filter(p=> !search || p.title.toLowerCase().includes(search.toLowerCase()) || `#${p.number}`.includes(search))
    .sort((a,b)=>{
      if (sortBy==="newest")     return new Date(b.created)-new Date(a.created);
      if (sortBy==="score-high") return b.score-a.score;
      if (sortBy==="score-low")  return a.score-b.score;
      return 0;
    });

  const selectStyle = {
    background:"var(--bg-base)", border:"1px solid var(--border)",
    color:"var(--text-secondary)", borderRadius:"var(--radius-sm)",
    padding:"8px 12px", fontSize:12, cursor:"pointer",
    fontFamily:"var(--font-body)", outline:"none"
  };

  return (
    <>
      <PageHeader
        title="Pull Requests"
        sub={`${filtered.length} of ${prs.length} shown`}
      />

      {/* Filter bar */}
      <div style={{
        background:"var(--bg-card)", border:"1px solid var(--border)",
        borderRadius:"var(--radius-md)", padding:"14px 18px",
        display:"flex", gap:10, flexWrap:"wrap", alignItems:"center",
        marginBottom:16
      }}>
        {/* Search */}
        <div style={{ position:"relative", flex:"1 1 200px", minWidth:160 }}>
          <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"var(--text-muted)", fontSize:14 }}>⌕</span>
          <input
            type="text" placeholder="Search PRs…"
            value={search} onChange={e=>setSearch(e.target.value)}
            style={{
              ...selectStyle, width:"100%", paddingLeft:30,
              boxSizing:"border-box", color:"var(--text-primary)"
            }}
            onFocus={e=>e.target.style.borderColor="var(--cyan)"}
            onBlur={e=>e.target.style.borderColor="var(--border)"}
          />
        </div>
        <select value={filterLabel} onChange={e=>setFilterLabel(e.target.value)} style={selectStyle}>
          <option value="all">All Labels</option>
          {allLabels.map(l=><option key={l} value={l}>{l}</option>)}
        </select>
        <select value={filterState} onChange={e=>setFilterState(e.target.value)} style={selectStyle}>
          <option value="all">All States</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
        <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={selectStyle}>
          <option value="newest">Newest First</option>
          <option value="score-high">Highest Score</option>
          <option value="score-low">Lowest Score</option>
        </select>
      </div>

      {/* PR list */}
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {filtered.length === 0 ? (
          <Card style={{ textAlign:"center", padding:"48px 24px", color:"var(--text-muted)" }}>
            No pull requests match your filters.
          </Card>
        ) : filtered.map(pr=>(
          <PRRow key={pr.number} pr={pr}/>
        ))}
      </div>

      {/* Summary bar */}
      {filtered.length > 0 && (
        <div style={{
          marginTop:16, display:"flex", gap:6, justifyContent:"flex-end",
          fontSize:12, color:"var(--text-muted)"
        }}>
          Showing {filtered.length} PR{filtered.length!==1?"s":""} ·
          Avg score{" "}
          <span style={{ color:"var(--cyan)", fontFamily:"var(--font-mono)", fontWeight:600 }}>
            {Math.round(filtered.reduce((a,b)=>a+b.score,0)/filtered.length)}
          </span>
        </div>
      )}
    </>
  );
}

// ─── ROOT APP ────────────────────────────────────────────────────────────────
export default function App() {
  const [prs,         setPrs]         = useState([]);
  const [owner,       setOwner]       = useState("");
  const [repo,        setRepo]        = useState("");
  const [connected,   setConnected]   = useState(false);
  const [isDemo,      setIsDemo]      = useState(false);
  const [activeTab,   setActiveTab]   = useState("overview");

  const handleConnect = (data, own, rep) => {
    setPrs(data); setOwner(own); setRepo(rep);
    setConnected(true); setIsDemo(false); setActiveTab("overview");
  };
  const handleDemo = () => {
    setPrs(DEMO.prs); setOwner(DEMO.owner); setRepo(DEMO.repo);
    setConnected(true); setIsDemo(true); setActiveTab("overview");
  };
  const handleDisconnect = () => {
    setPrs([]); setOwner(""); setRepo(""); setConnected(false); setIsDemo(false);
  };

  if (!connected) return <ConnectScreen onConnect={handleConnect} onDemo={handleDemo}/>;

  return (
    <div style={{ display:"flex", minHeight:"100vh" }}>
      <Sidebar
        owner={owner} repo={repo}
        activeTab={activeTab} setActiveTab={setActiveTab}
        onDisconnect={handleDisconnect} isDemo={isDemo}
      />
      <main style={{
        flex:1, overflowY:"auto", padding:"32px 36px",
        background:"var(--bg-base)", minWidth:0,
        position:"relative"
      }}>
        {/* Subtle grid overlay */}
        <div style={{
          position:"fixed", inset:0, pointerEvents:"none", zIndex:0,
          backgroundImage:`radial-gradient(circle, #1a223408 1px, transparent 1px)`,
          backgroundSize:"28px 28px"
        }}/>
        {/* Ambient glow orbs */}
        <div style={{
          position:"fixed", top:"10%", right:"15%", width:400, height:400,
          borderRadius:"50%", background:"#00e5ff04",
          filter:"blur(80px)", pointerEvents:"none", zIndex:0
        }}/>
        <div style={{
          position:"fixed", bottom:"20%", left:"20%", width:300, height:300,
          borderRadius:"50%", background:"#39ff1404",
          filter:"blur(60px)", pointerEvents:"none", zIndex:0
        }}/>

        <div style={{ position:"relative", zIndex:1 }}>
          {activeTab === "overview"      && <OverviewPage      prs={prs}/>}
          {activeTab === "trends"        && <TrendsPage        prs={prs}/>}
          {activeTab === "leaderboard"   && <LeaderboardPage   prs={prs}/>}
          {activeTab === "pull-requests" && <PullRequestsPage  prs={prs}/>}
        </div>
      </main>
    </div>
  );
}