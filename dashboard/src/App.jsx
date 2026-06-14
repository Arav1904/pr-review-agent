import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, Cell,
  PieChart, Pie, Legend
} from "recharts";

// ════════════════════════════════════════════════════════════════════════════
// DEMO DATA — richer dataset for v2
// ════════════════════════════════════════════════════════════════════════════
const DEMO = {
  owner: "Arav1904", repo: "pr-review-agent",
  prs: [
    { number:14, title:"feat: add multi-language support for Go and Rust", author:"Arav1904", score:88, labels:["enhancement","feature"], state:"open",   created:"2024-06-10", merged:null,        comments:3, additions:142, deletions:28, files:["src/agent/reviewer.py","src/agent/scoring.py","README.md"] },
    { number:13, title:"feat: analytics dashboard with live GitHub sync",    author:"Arav1904", score:92, labels:["feature","enhancement"], state:"open",  created:"2024-06-09", merged:null,        comments:2, additions:890, deletions:40, files:["dashboard/src/App.jsx","dashboard/src/index.css"] },
    { number:12, title:"feat: inline PR comment annotations",               author:"Arav1904", score:88, labels:["enhancement","feature"], state:"closed", created:"2024-06-08", merged:"2024-06-08", comments:3, additions:142, deletions:28, files:["scripts/post_inline_comments.py",".github/workflows/pr-review.yml"] },
    { number:11, title:"fix: memory leak in score tracker",                 author:"Arav1904", score:72, labels:["bug","fix"],            state:"closed", created:"2024-06-07", merged:"2024-06-07", comments:5, additions:34,  deletions:19, files:["src/agent/memory.py"] },
    { number:10, title:"refactor: groq fallback mechanism",                 author:"Arav1904", score:91, labels:["refactor"],             state:"closed", created:"2024-06-05", merged:"2024-06-06", comments:2, additions:67,  deletions:45, files:["src/agent/fallback_llm.py"] },
    { number:9,  title:"docs: update SOUL.md config guide",                 author:"dev-contrib", score:65, labels:["documentation"],      state:"closed", created:"2024-06-03", merged:"2024-06-04", comments:1, additions:89,  deletions:12, files:["SOUL.md","README.md"] },
    { number:8,  title:"feat: 8-label auto-classification system",          author:"Arav1904", score:95, labels:["enhancement","feature"], state:"closed", created:"2024-06-01", merged:"2024-06-02", comments:4, additions:230, deletions:11, files:["src/agent/scoring.py","src/agent/reviewer.py"] },
    { number:7,  title:"security: sanitize inputs in review script",        author:"security-bot", score:58, labels:["security","critical"], state:"closed", created:"2024-05-30", merged:"2024-06-01", comments:7, additions:55,  deletions:33, files:["src/api/github_client.py"] },
    { number:6,  title:"perf: optimize gemini prompt token count",          author:"Arav1904", score:82, labels:["performance"],          state:"closed", created:"2024-05-28", merged:"2024-05-29", comments:2, additions:21,  deletions:48, files:["src/agent/reviewer.py"] },
    { number:5,  title:"feat: health score badge generation",               author:"Arav1904", score:79, labels:["feature"],              state:"closed", created:"2024-05-25", merged:"2024-05-26", comments:3, additions:118, deletions:7,  files:["src/agent/scoring.py","scripts/notify.py"] },
    { number:4,  title:"fix: workflow trigger condition mismatch",          author:"dev-contrib", score:44, labels:["bug","critical"],      state:"closed", created:"2024-05-22", merged:"2024-05-24", comments:9, additions:8,   deletions:22, files:[".github/workflows/pr-review.yml"] },
    { number:3,  title:"chore: update core dependencies",                   author:"security-bot", score:71, labels:["chore"],            state:"closed", created:"2024-05-20", merged:"2024-05-21", comments:0, additions:12,  deletions:12, files:["package.json"] },
    { number:2,  title:"feat: dual LLM fallback Gemini to Groq",            author:"Arav1904", score:93, labels:["feature","enhancement"], state:"closed", created:"2024-05-18", merged:"2024-05-19", comments:6, additions:312, deletions:89, files:["src/agent/fallback_llm.py","src/agent/reviewer.py",".env.example"] },
    { number:1,  title:"init: project bootstrap and CI setup",              author:"Arav1904", score:61, labels:["chore"],                state:"closed", created:"2024-05-15", merged:"2024-05-16", comments:0, additions:445, deletions:0,  files:["README.md",".github/workflows/pr-review.yml","agent.yaml"] },
  ]
};

const LABEL_PALETTE = {
  enhancement:"#2de2ff", feature:"#5ec8ff", bug:"#ff5d7a", fix:"#ffcb47",
  security:"#ff5d7a", critical:"#ff3355", refactor:"#b39bff",
  performance:"#4dff7a", documentation:"#7fb8ff", chore:"#6d7a99",
  test:"#ff8fd6"
};

const scoreColor = (s) => s >= 80 ? "#4dff7a" : s >= 60 ? "#ffcb47" : "#ff5d7a";
const scoreLabel = (s) => s >= 80 ? "Excellent" : s >= 60 ? "Good" : "Needs Work";
const scoreGrade = (s) => s >= 90 ? "A+" : s >= 80 ? "A" : s >= 70 ? "B" : s >= 60 ? "C" : s >= 50 ? "D" : "F";

const fmtDate = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const daysAgo = (d) => {
  const diff = Math.floor((Date.now() - new Date(d)) / 86400000);
  if (diff <= 0) return "today";
  if (diff === 1) return "yesterday";
  return `${diff}d ago`;
};

// ════════════════════════════════════════════════════════════════════════════
// ANIMATED COUNTER
// ════════════════════════════════════════════════════════════════════════════
function Counter({ value, duration = 1000, decimals = 0, suffix = "", prefix = "" }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef(null);

  useEffect(() => {
    let startTime = null;
    const start = 0;
    const end = value;
    const animate = (ts) => {
      if (!startTime) startTime = ts;
      const p = Math.min((ts - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setDisplay(start + (end - start) * ease);
      if (p < 1) raf.current = requestAnimationFrame(animate);
    };
    raf.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration]);

  return <span>{prefix}{display.toFixed(decimals)}{suffix}</span>;
}

// ════════════════════════════════════════════════════════════════════════════
// HEALTH RING — animated SVG dial
// ════════════════════════════════════════════════════════════════════════════
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
      <svg width={size} height={size} style={{ position:"absolute", inset:0 }}>
        <defs>
          <filter id="ringGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1d2740"
          strokeWidth={12} strokeDasharray={`${arc} ${circ - arc}`} strokeDashoffset={0}
          strokeLinecap="round" transform={`rotate(135 ${size/2} ${size/2})`} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
          strokeWidth={12} strokeDasharray={`${arc} ${circ - arc}`} strokeDashoffset={dash}
          strokeLinecap="round" transform={`rotate(135 ${size/2} ${size/2})`}
          filter="url(#ringGlow)"
          style={{ transition:"stroke 0.4s ease" }} />
        <circle cx={size/2} cy={size/2} r={r-16} fill="none"
          stroke={`${color}22`} strokeWidth={1} />
      </svg>
      <div style={{
        position:"absolute", inset:0, display:"flex",
        flexDirection:"column", alignItems:"center", justifyContent:"center",
        marginTop:10
      }}>
        <span style={{
          fontSize: size * 0.24, fontWeight:800, color, lineHeight:1,
          fontFamily:"var(--font-mono)", letterSpacing:-2,
          textShadow:`0 0 24px ${color}90`
        }}>{display}</span>
        <span style={{
          fontSize: size * 0.065, color:"var(--text-faint)",
          letterSpacing:3, marginTop:4, fontFamily:"var(--font-mono)", fontWeight:600
        }}>HEALTH SCORE</span>
        <span style={{
          fontSize: size * 0.095, color, marginTop:3, fontWeight:700,
          fontFamily:"var(--font-head)"
        }}>{scoreLabel(display)} · {scoreGrade(display)}</span>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SHARED PRIMITIVES
// ════════════════════════════════════════════════════════════════════════════
function StatCard({ icon, label, value, sub, accent="#2de2ff", isCounter=false, decimals=0, suffix="", delay=0 }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      className="fade-up"
      style={{ animationDelay:`${delay}ms`, height:"100%" }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <div style={{
        background: hov ? "var(--bg-card-hover)" : "var(--bg-card)",
        border:`1px solid ${hov ? accent+"50" : "var(--border)"}`,
        borderRadius:"var(--radius-lg)", padding:"22px 24px",
        transition:"all 0.2s ease", position:"relative", overflow:"hidden",
        transform: hov ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hov ? `0 12px 32px ${accent}18` : "none",
        height:"100%"
      }}>
        <div style={{
          position:"absolute", top:0, left:0, right:0, height:2,
          background:`linear-gradient(90deg, transparent, ${accent}aa, transparent)`,
          opacity: hov ? 1 : 0.45, transition:"opacity 0.2s"
        }}/>
        <div style={{ display:"flex", alignItems:"flex-start", gap:16 }}>
          <div style={{
            width:46, height:46, borderRadius:12,
            background:`${accent}1a`, border:`1px solid ${accent}35`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:20, flexShrink:0
          }}>{icon}</div>
          <div style={{ minWidth:0 }}>
            <div style={{
              fontSize:28, fontWeight:800, color:"var(--text-primary)",
              fontFamily:"var(--font-mono)", lineHeight:1.1, letterSpacing:-1
            }}>
              {isCounter ? <Counter value={value} decimals={decimals} suffix={suffix} /> : value}
            </div>
            <div style={{ fontSize:12, color:"var(--text-secondary)", marginTop:4, letterSpacing:0.4, fontWeight:500 }}>
              {label}
            </div>
            {sub && <div style={{ fontSize:11.5, color:accent, marginTop:6, fontWeight:600 }}>{sub}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function LabelChip({ label, size = "md" }) {
  const c = LABEL_PALETTE[label] || "#b39bff";
  const pad = size === "sm" ? "2px 8px" : "3px 11px";
  const fs = size === "sm" ? 10.5 : 11.5;
  return (
    <span style={{
      background:`${c}1c`, color:c, border:`1px solid ${c}45`,
      borderRadius:20, padding:pad, fontSize:fs, fontWeight:700,
      letterSpacing:0.3, whiteSpace:"nowrap", flexShrink:0
    }}>{label}</span>
  );
}

function ScoreBadge({ score, size = "md" }) {
  const c = scoreColor(score);
  const pad = size === "sm" ? "2px 9px" : "4px 13px";
  const fs = size === "sm" ? 12 : 14;
  return (
    <span style={{
      background:`${c}1c`, color:c, border:`1px solid ${c}45`,
      borderRadius:8, padding:pad, fontSize:fs,
      fontFamily:"var(--font-mono)", fontWeight:800, flexShrink:0
    }}>{score}</span>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background:"#0a0e1a", border:"1px solid var(--border-bright)",
      borderRadius:10, padding:"11px 15px",
      boxShadow:"0 12px 40px #000000a0"
    }}>
      <div style={{ color:"var(--text-secondary)", fontSize:11.5, marginBottom:6, fontWeight:600 }}>{label}</div>
      {payload.map((p,i) => (
        <div key={i} style={{
          color:p.color, fontSize:13.5,
          fontFamily:"var(--font-mono)", display:"flex", gap:10, alignItems:"center",
          marginTop: i > 0 ? 3 : 0
        }}>
          <span style={{ width:8, height:8, borderRadius:2, background:p.color, display:"inline-block", flexShrink:0 }}/>
          <span style={{ color:"var(--text-secondary)" }}>{p.name}:</span>
          <strong style={{ color:"var(--text-primary)" }}>{typeof p.value === "number" ? Math.round(p.value) : p.value}</strong>
        </div>
      ))}
    </div>
  );
}

function Card({ children, style={}, className="", delay=0 }) {
  return (
    <div
      className={`fade-up ${className}`}
      style={{
        background:"var(--bg-card)", border:"1px solid var(--border)",
        borderRadius:"var(--radius-lg)", padding:24,
        animationDelay:`${delay}ms`,
        ...style
      }}
    >
      {children}
    </div>
  );
}

function CardTitle({ children, icon, action }) {
  return (
    <div style={{
      display:"flex", alignItems:"center", justifyContent:"space-between",
      marginBottom:20, flexWrap:"wrap", gap:8
    }}>
      <div style={{
        fontSize:11.5, fontWeight:700, color:"var(--text-secondary)",
        letterSpacing:2, fontFamily:"var(--font-mono)",
        display:"flex", alignItems:"center", gap:8
      }}>
        {icon && <span style={{ fontSize:14 }}>{icon}</span>}
        {children}
      </div>
      {action}
    </div>
  );
}

function PageHeader({ title, sub, accent="#2de2ff" }) {
  return (
    <div className="fade-up" style={{ marginBottom:28 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
        <div style={{ width:4, height:24, borderRadius:2, background:accent, boxShadow:`0 0 12px ${accent}` }}/>
        <h1 style={{
          fontFamily:"var(--font-head)", fontWeight:800, fontSize:27,
          letterSpacing:-0.5, color:"var(--text-primary)"
        }}>{title}</h1>
      </div>
      <p style={{ color:"var(--text-secondary)", fontSize:14, marginLeft:14 }}>{sub}</p>
    </div>
  );
}

// Inline sparkline
function Sparkline({ data, color = "#2de2ff", width = 100, height = 32 }) {
  if (!data?.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={width} height={height} style={{ overflow:"visible" }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth={2}
        strokeLinecap="round" strokeLinejoin="round"
        style={{ filter:`drop-shadow(0 0 4px ${color}80)` }}/>
      {data.map((v,i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((v - min) / range) * height;
        return i === data.length - 1
          ? <circle key={i} cx={x} cy={y} r={3} fill={color} style={{ filter:`drop-shadow(0 0 6px ${color})` }}/>
          : null;
      })}
    </svg>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ACTIVITY HEATMAP — GitHub-contribution-style grid
// ════════════════════════════════════════════════════════════════════════════
function ActivityHeatmap({ prs }) {
  // Build a map of date -> count for the last 35 days
  const today = new Date();
  const days = [];
  for (let i = 34; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  const counts = days.map(day => prs.filter(p => p.created === day).length);
  const max = Math.max(...counts, 1);

  const cellColor = (c) => {
    if (c === 0) return "var(--border)";
    const intensity = c / max;
    if (intensity > 0.66) return "#4dff7a";
    if (intensity > 0.33) return "#2de2ff";
    return "#2de2ff60";
  };

  // Group into weeks (columns of 7)
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7).map((d, idx) => ({ date: d, count: counts[i+idx] })));
  }

  return (
    <div>
      <div style={{ display:"flex", gap:4 }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display:"flex", flexDirection:"column", gap:4 }}>
            {week.map(({ date, count }) => (
              <div key={date} title={`${date}: ${count} PR${count!==1?"s":""}`} style={{
                width:13, height:13, borderRadius:3,
                background: cellColor(count),
                boxShadow: count > 0 ? `0 0 6px ${cellColor(count)}60` : "none",
                transition:"transform 0.1s", cursor:"pointer"
              }}
                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.3)"}
                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
              />
            ))}
          </div>
        ))}
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:14, fontSize:11, color:"var(--text-muted)" }}>
        <span>Less</span>
        {["var(--border)","#2de2ff60","#2de2ff","#4dff7a"].map((c,i) => (
          <div key={i} style={{ width:11, height:11, borderRadius:2, background:c }}/>
        ))}
        <span>More</span>
        <span style={{ marginLeft:"auto", fontFamily:"var(--font-mono)" }}>Last 35 days</span>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// COMMAND PALETTE — global search (Cmd/Ctrl+K)
// ════════════════════════════════════════════════════════════════════════════
function CommandPalette({ open, onClose, prs, onNavigate, onSelectPR }) {
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const results = useMemo(() => {
    if (!query.trim()) {
      return [
        { type:"nav", id:"overview",      label:"Go to Overview",     icon:"◉" },
        { type:"nav", id:"trends",        label:"Go to Score Trends", icon:"↗" },
        { type:"nav", id:"leaderboard",   label:"Go to Leaderboard",  icon:"⬡" },
        { type:"nav", id:"pull-requests", label:"Go to Pull Requests",icon:"⑂" },
      ];
    }
    const q = query.toLowerCase();
    const out = [];

    // PR matches
    prs.forEach(pr => {
      const hay = `${pr.title} #${pr.number} ${pr.author} ${pr.labels.join(" ")} ${(pr.files||[]).join(" ")}`.toLowerCase();
      if (hay.includes(q)) {
        out.push({ type:"pr", pr, label:`#${pr.number} ${pr.title}`, icon: pr.state==="open" ? "🟢" : "⚪" });
      }
    });

    // Author matches (deduped)
    const authors = [...new Set(prs.map(p => p.author))];
    authors.forEach(a => {
      if (a.toLowerCase().includes(q)) {
        out.push({ type:"author", author:a, label:`Contributor: ${a}`, icon:"👤" });
      }
    });

    // Label matches
    const labels = [...new Set(prs.flatMap(p => p.labels))];
    labels.forEach(l => {
      if (l.toLowerCase().includes(q)) {
        out.push({ type:"label", label2:l, label:`Label: ${l}`, icon:"🏷" });
      }
    });

    // Nav matches
    [
      { id:"overview", label:"Overview", icon:"◉" },
      { id:"trends", label:"Score Trends", icon:"↗" },
      { id:"leaderboard", label:"Leaderboard", icon:"⬡" },
      { id:"pull-requests", label:"Pull Requests", icon:"⑂" },
    ].forEach(n => {
      if (n.label.toLowerCase().includes(q)) {
        out.push({ type:"nav", id:n.id, label:`Go to ${n.label}`, icon:n.icon });
      }
    });

    return out.slice(0, 8);
  }, [query, prs]);

  const handleSelect = (r) => {
    if (r.type === "nav") onNavigate(r.id);
    else if (r.type === "pr") { onNavigate("pull-requests"); onSelectPR?.(r.pr); }
    else if (r.type === "author") onNavigate("leaderboard");
    else if (r.type === "label") onNavigate("pull-requests");
    onClose();
  };

  const handleKey = (e) => {
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(i => Math.min(i+1, results.length-1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIdx(i => Math.max(i-1, 0)); }
    if (e.key === "Enter" && results[activeIdx]) handleSelect(results[activeIdx]);
  };

  if (!open) return null;

  return (
    <div className="cmdk-overlay" onClick={onClose}>
      <div className="cmdk-panel" onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex", alignItems:"center", gap:12, padding:"16px 20px", borderBottom:"1px solid var(--border)" }}>
          <span style={{ fontSize:18, color:"var(--cyan)" }}>⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveIdx(0); }}
            onKeyDown={handleKey}
            placeholder="Search PRs, contributors, labels, or pages…"
            style={{
              flex:1, background:"transparent", border:"none", outline:"none",
              color:"var(--text-primary)", fontSize:15, fontFamily:"var(--font-body)"
            }}
          />
          <kbd style={{
            fontSize:11, color:"var(--text-muted)", border:"1px solid var(--border)",
            borderRadius:6, padding:"2px 7px", fontFamily:"var(--font-mono)"
          }}>ESC</kbd>
        </div>
        <div style={{ maxHeight:360, overflowY:"auto", padding:8 }}>
          {results.length === 0 && (
            <div style={{ padding:"32px 20px", textAlign:"center", color:"var(--text-muted)", fontSize:13 }}>
              No results for "{query}"
            </div>
          )}
          {results.map((r, i) => (
            <div
              key={i}
              onClick={() => handleSelect(r)}
              onMouseEnter={() => setActiveIdx(i)}
              style={{
                display:"flex", alignItems:"center", gap:12,
                padding:"11px 14px", borderRadius:10, cursor:"pointer",
                background: i === activeIdx ? "var(--cyan-dim)" : "transparent",
                border: i === activeIdx ? "1px solid var(--cyan-glow)" : "1px solid transparent",
                transition:"all 0.1s"
              }}
            >
              <span style={{ fontSize:15, width:22, textAlign:"center" }}>{r.icon}</span>
              <span style={{
                flex:1, fontSize:13.5, color: i === activeIdx ? "var(--cyan)" : "var(--text-primary)",
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", fontWeight: i === activeIdx ? 600 : 400
              }}>{r.label}</span>
              {r.type === "pr" && <ScoreBadge score={r.pr.score} size="sm"/>}
              {i === activeIdx && (
                <kbd style={{ fontSize:10, color:"var(--text-muted)", border:"1px solid var(--border)", borderRadius:5, padding:"1px 5px", fontFamily:"var(--font-mono)" }}>↵</kbd>
              )}
            </div>
          ))}
        </div>
        <div style={{
          padding:"10px 18px", borderTop:"1px solid var(--border)",
          display:"flex", gap:16, fontSize:11, color:"var(--text-muted)"
        }}>
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>ESC Close</span>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// CONNECT SCREEN
// ════════════════════════════════════════════════════════════════════════════
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
        let files = [];
        try {
          const cr = await fetch(pr.comments_url, { headers:{ Authorization:`Bearer ${tok}` } });
          const comments = await cr.json();
          for (const c of comments) {
            const m = c.body?.match(/[Hh]ealth[^:]*:\s*\*?\*?(\d{1,3})/);
            if (m) { score = parseInt(m[1]); break; }
          }
        } catch(_) {}
        try {
          const fr = await fetch(`https://api.github.com/repos/${own}/${rep}/pulls/${pr.number}/files`, { headers:{ Authorization:`Bearer ${tok}` } });
          const fd = await fr.json();
          files = Array.isArray(fd) ? fd.map(f=>f.filename) : [];
        } catch(_) {}
        if (score === null) {
          const sz = (pr.additions||0) + (pr.deletions||0);
          score = Math.max(25, Math.min(97, 87 - Math.floor(sz/60)));
        }
        return {
          number:pr.number, title:pr.title, author:pr.user.login,
          score, labels:pr.labels.map(l=>l.name), state:pr.state,
          created:pr.created_at?.split("T")[0],
          merged: pr.merged_at ? pr.merged_at.split("T")[0] : null,
          comments:pr.comments, additions:pr.additions||0, deletions:pr.deletions||0,
          files
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
      <div style={{
        position:"absolute", inset:0, pointerEvents:"none",
        backgroundImage:`radial-gradient(circle at 20% 20%, #2de2ff09 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, #4dff7a08 0%, transparent 50%),
          radial-gradient(circle, #1d274008 1px, transparent 1px)`,
        backgroundSize:"100% 100%, 100% 100%, 32px 32px"
      }}/>

      <div style={{ width:"100%", maxWidth:460, position:"relative", zIndex:1 }}>
        <div className="fade-up" style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{
            display:"inline-flex", alignItems:"center", gap:14,
            background:"var(--bg-card)", border:"1px solid var(--border)",
            borderRadius:20, padding:"12px 22px", marginBottom:20
          }}>
            <div style={{
              width:44, height:44, borderRadius:12,
              background:"linear-gradient(135deg,#2de2ff,#0066ff)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:22, boxShadow:"0 0 24px #2de2ff50"
            }}>🤖</div>
            <div style={{ textAlign:"left" }}>
              <div style={{
                fontSize:20, fontWeight:800, fontFamily:"var(--font-head)",
                letterSpacing:-0.5
              }}>PR ReviewBot</div>
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

        <div className="fade-up" style={{
          background:"var(--bg-card)", border:"1px solid var(--border)",
          borderRadius:"var(--radius-xl)", padding:32,
          boxShadow:"0 0 0 1px #2de2ff08, 0 32px 64px #00000080",
          animationDelay:"100ms"
        }}>
          <div style={{ height:1, background:"linear-gradient(90deg,transparent,var(--cyan),transparent)", marginBottom:28 }}/>

          {err && (
            <div style={{
              background:"var(--coral-dim)", border:"1px solid #ff5d7a40",
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
              <label style={{ display:"block", fontSize:11, color:"var(--text-secondary)", marginBottom:6, letterSpacing:0.8, fontWeight:600 }}>
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
            background: loading ? "var(--border)" : "linear-gradient(135deg,#2de2ff,#0055ff)",
            color: loading ? "var(--text-muted)" : "#05070f",
            border:"none", borderRadius:"var(--radius-md)", fontWeight:700,
            fontSize:14, cursor: loading ? "not-allowed" : "pointer",
            fontFamily:"var(--font-head)", letterSpacing:0.3,
            boxShadow: loading ? "none" : "0 0 24px #2de2ff35",
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

// ════════════════════════════════════════════════════════════════════════════
// SIDEBAR
// ════════════════════════════════════════════════════════════════════════════
function Sidebar({ owner, repo, activeTab, setActiveTab, onDisconnect, isDemo, prs, onOpenSearch }) {
  const navItems = [
    { id:"overview",      icon:"◉", label:"Overview" },
    { id:"trends",        icon:"↗", label:"Score Trends" },
    { id:"leaderboard",   icon:"⬡", label:"Leaderboard" },
    { id:"pull-requests", icon:"⑂", label:"Pull Requests" },
  ];

  const avg = prs.length ? Math.round(prs.reduce((a,b)=>a+b.score,0)/prs.length) : 0;
  const sparkData = [...prs].sort((a,b)=>new Date(a.created)-new Date(b.created)).map(p=>p.score).slice(-8);

  return (
    <aside style={{
      width:"var(--sidebar-w)", flexShrink:0,
      background:"var(--bg-sidebar)",
      borderRight:"1px solid var(--border)",
      display:"flex", flexDirection:"column",
      height:"100vh", position:"sticky", top:0, overflowY:"auto"
    }}>
      <div style={{ padding:"24px 20px 18px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{
            width:38, height:38, borderRadius:10,
            background:"linear-gradient(135deg,#2de2ff,#0055ff)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:18, boxShadow:"0 0 18px #2de2ff40", flexShrink:0
          }}>🤖</div>
          <div>
            <div style={{ fontFamily:"var(--font-head)", fontWeight:800, fontSize:15.5, color:"var(--text-primary)" }}>PR ReviewBot</div>
            <div style={{ fontSize:9, color:"var(--cyan)", letterSpacing:3, fontFamily:"var(--font-mono)", fontWeight:600 }}>ANALYTICS</div>
          </div>
        </div>
      </div>

      {/* Search trigger */}
      <div style={{ padding:"0 16px 16px" }}>
        <button onClick={onOpenSearch} style={{
          width:"100%", display:"flex", alignItems:"center", gap:10,
          background:"var(--bg-card)", border:"1px solid var(--border)",
          borderRadius:10, padding:"9px 12px", cursor:"pointer",
          color:"var(--text-muted)", fontSize:12.5, transition:"all 0.15s"
        }}
          onMouseEnter={e=>{ e.currentTarget.style.borderColor="var(--cyan-glow)"; e.currentTarget.style.color="var(--text-secondary)"; }}
          onMouseLeave={e=>{ e.currentTarget.style.borderColor="var(--border)"; e.currentTarget.style.color="var(--text-muted)"; }}
        >
          <span style={{ fontSize:14 }}>⌕</span>
          <span style={{ flex:1, textAlign:"left" }}>Search...</span>
          <kbd style={{
            fontSize:10, border:"1px solid var(--border)", borderRadius:5,
            padding:"1px 5px", fontFamily:"var(--font-mono)"
          }}>⌘K</kbd>
        </button>
      </div>

      {/* Repo + mini health */}
      <div style={{ padding:"0 16px 18px" }}>
        <div style={{
          background:"var(--bg-card)", border:"1px solid var(--border)",
          borderRadius:12, padding:"12px 14px"
        }}>
          {isDemo && (
            <div style={{
              fontSize:9, color:"var(--amber)", background:"var(--amber-dim)",
              border:"1px solid #ffcb4730", borderRadius:4, padding:"2px 7px",
              letterSpacing:2, fontFamily:"var(--font-mono)", marginBottom:8,
              display:"inline-block", fontWeight:700
            }}>DEMO MODE</div>
          )}
          <div style={{ fontSize:11, color:"var(--text-muted)", marginBottom:3, fontWeight:500 }}>Repository</div>
          <div style={{ fontSize:13, fontWeight:700, fontFamily:"var(--font-mono)", color:"var(--text-primary)", marginBottom:12 }}>
            {owner}<span style={{ color:"var(--text-faint)" }}>/</span>{repo}
          </div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div>
              <div style={{ fontSize:20, fontWeight:800, color:scoreColor(avg), fontFamily:"var(--font-mono)" }}>
                {avg}
              </div>
              <div style={{ fontSize:10, color:"var(--text-muted)", letterSpacing:0.5 }}>AVG HEALTH</div>
            </div>
            <Sparkline data={sparkData} color={scoreColor(avg)} width={70} height={28}/>
          </div>
        </div>
      </div>

      <nav style={{ padding:"0 12px", flex:1 }}>
        <div style={{ fontSize:10, color:"var(--text-faint)", letterSpacing:2, padding:"0 8px 8px", fontWeight:700 }}>
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
              fontWeight: active ? 700 : 500, fontSize:14,
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

      <div style={{ padding:"16px 12px" }}>
        <button onClick={onDisconnect} style={{
          width:"100%", padding:"10px 12px", background:"transparent",
          border:"1px solid var(--border)", borderRadius:10,
          color:"var(--text-muted)", fontSize:13, cursor:"pointer",
          fontFamily:"var(--font-body)", transition:"all 0.15s",
          display:"flex", alignItems:"center", gap:8, fontWeight:500
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

// ════════════════════════════════════════════════════════════════════════════
// INSIGHTS PANEL — auto-generated plain-English takeaways
// ════════════════════════════════════════════════════════════════════════════
function InsightsPanel({ prs }) {
  const avg = prs.length ? Math.round(prs.reduce((a,b)=>a+b.score,0)/prs.length) : 0;
  const sorted = [...prs].sort((a,b)=>new Date(a.created)-new Date(b.created));
  const recent = sorted.slice(-5);
  const recentAvg = recent.length ? Math.round(recent.reduce((a,b)=>a+b.score,0)/recent.length) : avg;
  const older = sorted.slice(0, -5);
  const olderAvg = older.length ? Math.round(older.reduce((a,b)=>a+b.score,0)/older.length) : avg;
  const trend = recentAvg - olderAvg;

  const security = prs.filter(p=>p.labels.includes("security")||p.labels.includes("critical"));
  const topAuthor = Object.entries(
    prs.reduce((acc,p)=>{ acc[p.author]=(acc[p.author]||0)+1; return acc; },{})
  ).sort((a,b)=>b[1]-a[1])[0];

  const fileFreq = prs.flatMap(p=>p.files||[]).reduce((acc,f)=>{ acc[f]=(acc[f]||0)+1; return acc; },{});
  const hotspot = Object.entries(fileFreq).sort((a,b)=>b[1]-a[1])[0];

  const insights = [
    {
      icon: trend >= 0 ? "📈" : "📉",
      color: trend >= 0 ? "var(--lime)" : "var(--coral)",
      text: trend >= 0
        ? `Code quality is trending up — the last 5 PRs average ${recentAvg}, up ${Math.abs(trend)} pts from earlier PRs (${olderAvg}).`
        : `Code quality dipped recently — last 5 PRs average ${recentAvg}, down ${Math.abs(trend)} pts from earlier PRs (${olderAvg}). Worth a closer look.`
    },
    {
      icon: "🔒",
      color: security.length > 0 ? "var(--coral)" : "var(--lime)",
      text: security.length > 0
        ? `${security.length} PR${security.length!==1?"s":""} touched security-sensitive code. Average score for these was ${Math.round(security.reduce((a,b)=>a+b.score,0)/security.length)} — review carefully before merge.`
        : `No security-flagged PRs in this window. Security posture looks stable.`
    },
    {
      icon: "👤",
      color: "var(--cyan)",
      text: topAuthor
        ? `${topAuthor[0]} is the most active contributor with ${topAuthor[1]} PR${topAuthor[1]!==1?"s":""} reviewed — driving most of the recent velocity.`
        : "No contributor data yet."
    },
    {
      icon: "🔥",
      color: "var(--amber)",
      text: hotspot
        ? `${hotspot[0]} is your hottest file — touched in ${hotspot[1]} different PRs. Consider extra test coverage here.`
        : "No file-level hotspots detected yet."
    },
  ];

  return (
    <Card delay={250}>
      <CardTitle icon="✨">AI INSIGHTS</CardTitle>
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        {insights.map((ins, i) => (
          <div key={i} style={{
            display:"flex", gap:12, alignItems:"flex-start",
            padding:"12px 14px", background:"var(--bg-elevated)",
            borderRadius:10, border:`1px solid ${ins.color}20`
          }}>
            <span style={{ fontSize:18, flexShrink:0, lineHeight:1.4 }}>{ins.icon}</span>
            <p style={{ fontSize:13, color:"var(--text-secondary)", lineHeight:1.6, margin:0 }}>
              {ins.text}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// OVERVIEW PAGE
// ════════════════════════════════════════════════════════════════════════════
function OverviewPage({ prs, onNavigate }) {
  const avg    = prs.length ? Math.round(prs.reduce((a,b)=>a+b.score,0)/prs.length) : 0;
  const open   = prs.filter(p=>p.state==="open").length;
  const high   = prs.filter(p=>p.score>=80).length;
  const low    = prs.filter(p=>p.score<60).length;
  const medium = prs.filter(p=>p.score>=60&&p.score<80).length;
  const totalAdd = prs.reduce((a,b)=>a+b.additions,0);
  const totalDel = prs.reduce((a,b)=>a+b.deletions,0);
  const totalComments = prs.reduce((a,b)=>a+b.comments,0);
  const mergedCount = prs.filter(p=>p.merged).length;

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
    { subject:"Security",      score: security_score(prs) },
    { subject:"Performance",   score: Math.round(avg * 1.04) },
    { subject:"Code Quality",  score: avg },
    { subject:"Docs",          score: Math.round(avg * 0.88) },
    { subject:"Test Coverage", score: Math.round(avg * 0.78) },
    { subject:"Reliability",   score: Math.round(avg * 0.96) },
  ];

  const pieData = [
    { name:"Excellent (80+)", value:high,   color:"#4dff7a" },
    { name:"Good (60-79)",    value:medium, color:"#ffcb47" },
    { name:"Needs Work (<60)",value:low,    color:"#ff5d7a" },
  ].filter(d=>d.value>0);

  // File hotspots
  const fileFreq = Object.entries(
    prs.flatMap(p=>p.files||[]).reduce((acc,f)=>{ acc[f]=(acc[f]||0)+1; return acc; },{})
  ).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const maxFileFreq = fileFreq.length ? fileFreq[0][1] : 1;

  return (
    <>
      <PageHeader
        title="Repository Overview"
        sub={`Live analytics for ${prs.length} pull requests · ${prs[0]?.owner || ""} ReviewBot AI/ML Track`}
      />

      {/* Hero row: dial + stats */}
      <div style={{ display:"grid", gridTemplateColumns:"auto 1fr", gap:20, marginBottom:20, alignItems:"stretch" }}>
        <Card delay={0} style={{
          display:"flex", flexDirection:"column", alignItems:"center",
          justifyContent:"center", gap:16, padding:"32px 36px",
          border:"1px solid #4dff7a30",
          background:"linear-gradient(135deg,var(--bg-card) 0%,#4dff7a08 100%)",
          boxShadow:"0 0 48px #4dff7a10"
        }}>
          <HealthRing score={avg} size={180} />
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:12, color:"var(--text-secondary)", letterSpacing:1, fontWeight:600 }}>
              {prs.length} PRs ANALYZED · {mergedCount} MERGED
            </div>
            <div style={{ display:"flex", gap:6, marginTop:10, justifyContent:"center", flexWrap:"wrap" }}>
              {["Dual-LLM","Agent Memory","Auto-Label","Inline Comments"].map(t=>(
                <span key={t} style={{
                  fontSize:10, background:"var(--cyan-dim)", color:"var(--cyan)",
                  border:"1px solid var(--cyan-glow)", borderRadius:20, padding:"3px 9px",
                  fontFamily:"var(--font-mono)", letterSpacing:0.3, fontWeight:600
                }}>{t}</span>
              ))}
            </div>
          </div>
        </Card>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <StatCard icon="⑂" label="Total PRs Reviewed"  value={prs.length} isCounter sub={`${open} currently open`}    accent="var(--cyan)"   delay={50}  />
          <StatCard icon="★" label="Excellent Quality"    value={high}       isCounter sub="Score ≥ 80 — production ready" accent="var(--lime)" delay={100} />
          <StatCard icon="⚡" label="Repository Avg Score" value={avg}       isCounter suffix="/100" sub="Across all PRs" accent="var(--purple)" delay={150} />
          <StatCard icon="⚠" label="Flagged PRs"          value={low}        isCounter sub="Score < 60 — needs attention" accent="var(--coral)" delay={200} />
        </div>
      </div>

      {/* Secondary stat row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:20 }}>
        <StatCard icon="➕" label="Lines Added"   value={totalAdd} isCounter accent="var(--lime)"   sub="across all PRs" delay={0}/>
        <StatCard icon="➖" label="Lines Removed" value={totalDel} isCounter accent="var(--coral)"  sub="across all PRs" delay={50}/>
        <StatCard icon="💬" label="Review Comments" value={totalComments} isCounter accent="var(--purple)" sub="AI + human combined" delay={100}/>
        <StatCard icon="✓" label="Merge Rate" value={prs.length ? Math.round((mergedCount/prs.length)*100) : 0} isCounter suffix="%" accent="var(--cyan)" sub={`${mergedCount} of ${prs.length} merged`} delay={150}/>
      </div>

      {/* Charts row */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:20, marginBottom:20 }}>
        <Card style={{ gridColumn:"1 / 3" }} delay={100}>
          <CardTitle icon="📊">HEALTH SCORE DISTRIBUTION</CardTitle>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={distData} barSize={42}>
              <defs>
                <linearGradient id="bgrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2de2ff"/>
                  <stop offset="100%" stopColor="#0044ff"/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
              <XAxis dataKey="range" tick={{ fill:"var(--text-secondary)", fontSize:12, fontWeight:600 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill:"var(--text-secondary)", fontSize:11 }} axisLine={false} tickLine={false}/>
              <Tooltip content={<ChartTooltip/>}/>
              <Bar dataKey="count" name="PRs" fill="url(#bgrad)" radius={[6,6,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card delay={150}>
          <CardTitle icon="🥧">QUALITY BREAKDOWN</CardTitle>
          <ResponsiveContainer width="100%" height={170}>
            <PieChart>
              <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={68}
                innerRadius={42} paddingAngle={4} strokeWidth={0}>
                {pieData.map((d,i)=><Cell key={i} fill={d.color} fillOpacity={0.9}/>)}
              </Pie>
              <Tooltip content={<ChartTooltip/>}/>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display:"flex", flexDirection:"column", gap:7, marginTop:6 }}>
            {pieData.map(d=>(
              <div key={d.name} style={{ display:"flex", alignItems:"center", gap:8, fontSize:12 }}>
                <div style={{ width:9, height:9, borderRadius:2, background:d.color, flexShrink:0, boxShadow:`0 0 6px ${d.color}80` }}/>
                <span style={{ color:"var(--text-secondary)", flex:1, fontWeight:500 }}>{d.name}</span>
                <span style={{ color:d.color, fontFamily:"var(--font-mono)", fontWeight:800 }}>{d.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Radar + Activity Heatmap */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:20 }}>
        <Card delay={200}>
          <CardTitle icon="🎯">QUALITY DIMENSIONS RADAR</CardTitle>
          <ResponsiveContainer width="100%" height={230}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--border)"/>
              <PolarAngleAxis dataKey="subject" tick={{ fill:"var(--text-secondary)", fontSize:11.5, fontWeight:600 }}/>
              <Radar name="Score" dataKey="score" stroke="var(--cyan)" fill="var(--cyan)"
                fillOpacity={0.18} strokeWidth={2.5}/>
              <Tooltip content={<ChartTooltip/>}/>
            </RadarChart>
          </ResponsiveContainer>
        </Card>

        <Card delay={250}>
          <CardTitle icon="🗓">PR ACTIVITY (LAST 35 DAYS)</CardTitle>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"8px 0 4px" }}>
            <ActivityHeatmap prs={prs}/>
          </div>
          <div style={{ marginTop:16, paddingTop:16, borderTop:"1px solid var(--border)" }}>
            <div style={{ fontSize:11, color:"var(--text-muted)", letterSpacing:1, marginBottom:10, fontFamily:"var(--font-mono)", fontWeight:700 }}>
              FILE HOTSPOTS
            </div>
            {fileFreq.map(([file, count]) => (
              <div key={file} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                <span style={{
                  fontSize:11.5, color:"var(--text-secondary)", fontFamily:"var(--font-mono)",
                  flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"
                }}>{file}</span>
                <div style={{ width:60, height:5, background:"var(--border)", borderRadius:3, overflow:"hidden", flexShrink:0 }}>
                  <div style={{
                    height:"100%", width:`${(count/maxFileFreq)*100}%`,
                    background:"linear-gradient(90deg,#2de2ff80,#2de2ff)", borderRadius:3
                  }}/>
                </div>
                <span style={{ fontSize:11, color:"var(--cyan)", fontFamily:"var(--font-mono)", fontWeight:700, width:14, textAlign:"right" }}>{count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Label distribution + Insights */}
      <div style={{ display:"grid", gridTemplateColumns:"1.3fr 1fr", gap:20 }}>
        <Card delay={300}>
          <CardTitle icon="🏷">LABEL DISTRIBUTION & RECENT ACTIVITY</CardTitle>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:20 }}>
            {labelDist.map(({ name, count })=>(
              <div key={name} style={{
                display:"flex", alignItems:"center", gap:7,
                background:`${LABEL_PALETTE[name]||"#b39bff"}14`,
                border:`1px solid ${LABEL_PALETTE[name]||"#b39bff"}35`,
                borderRadius:30, padding:"6px 13px"
              }}>
                <LabelChip label={name}/>
                <span style={{
                  fontSize:13, fontWeight:800, fontFamily:"var(--font-mono)",
                  color:"var(--text-primary)"
                }}>{count}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize:11, color:"var(--text-muted)", letterSpacing:1, marginBottom:10, fontFamily:"var(--font-mono)", fontWeight:700 }}>
            RECENT ACTIVITY
          </div>
          {prs.slice(0,5).map(pr=>(
            <div key={pr.number} style={{
              display:"flex", alignItems:"center", gap:10,
              padding:"9px 0", borderBottom:"1px solid var(--border)"
            }}>
              <div style={{
                width:7, height:7, borderRadius:"50%", flexShrink:0,
                background: pr.state==="open" ? "var(--lime)" : "var(--text-muted)",
                boxShadow: pr.state==="open" ? "0 0 6px var(--lime)" : "none"
              }}/>
              <span style={{ flex:1, fontSize:13, color:"var(--text-secondary)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", fontWeight:500 }}>
                #{pr.number} {pr.title}
              </span>
              <span style={{ fontSize:11, color:"var(--text-faint)", flexShrink:0 }}>{daysAgo(pr.created)}</span>
              <ScoreBadge score={pr.score} size="sm"/>
            </div>
          ))}
          <button onClick={()=>onNavigate("pull-requests")} style={{
            marginTop:14, width:"100%", padding:"9px 0",
            background:"var(--cyan-dim)", border:"1px solid var(--cyan-glow)",
            borderRadius:10, color:"var(--cyan)", fontSize:12.5, fontWeight:700,
            cursor:"pointer", fontFamily:"var(--font-head)", letterSpacing:0.3,
            transition:"all 0.15s"
          }}
            onMouseEnter={e=>e.currentTarget.style.background="var(--cyan-glow)"}
            onMouseLeave={e=>e.currentTarget.style.background="var(--cyan-dim)"}
          >
            View All Pull Requests →
          </button>
        </Card>

        <InsightsPanel prs={prs}/>
      </div>
    </>
  );
}

// Helper: estimate "security score" from security-labeled PR average
function security_score(prs) {
  const sec = prs.filter(p=>p.labels.includes("security")||p.labels.includes("critical"));
  if (!sec.length) {
    const avg = prs.length ? Math.round(prs.reduce((a,b)=>a+b.score,0)/prs.length) : 0;
    return Math.round(avg * 0.92);
  }
  return Math.round(sec.reduce((a,b)=>a+b.score,0)/sec.length);
}

// ════════════════════════════════════════════════════════════════════════════
// TRENDS PAGE
// ════════════════════════════════════════════════════════════════════════════
function TrendsPage({ prs }) {
  const sorted = [...prs].sort((a,b)=>new Date(a.created)-new Date(b.created));

  const trendData = sorted.map((p,i)=>({
    name:`#${p.number}`,
    score: p.score,
    rolling: i >= 2
      ? Math.round(sorted.slice(i-2,i+1).reduce((s,x)=>s+x.score,0)/3)
      : p.score,
    additions: p.additions,
    deletions: -p.deletions, // negative for diverging bars
    date: p.created
  }));

  const avg = prs.length ? Math.round(prs.reduce((a,b)=>a+b.score,0)/prs.length) : 0;
  const best = Math.max(...prs.map(p=>p.score));
  const worst = Math.min(...prs.map(p=>p.score));
  const variance = Math.round(Math.sqrt(prs.reduce((s,p)=>s+Math.pow(p.score-avg,2),0)/prs.length));
  const improving = prs.filter(p=>p.score>avg).length;

  // Score by label (avg)
  const labelScores = Object.entries(
    prs.reduce((acc,p)=>{
      p.labels.forEach(l=>{
        if(!acc[l]) acc[l]={ sum:0, count:0 };
        acc[l].sum += p.score; acc[l].count++;
      });
      return acc;
    },{})
  ).map(([label,{sum,count}])=>({ label, avg: Math.round(sum/count), count }))
   .sort((a,b)=>b.avg-a.avg);

  const statsData = [
    { icon:"🏆", label:"Best Score",       value:best,              color:"var(--lime)"  },
    { icon:"⚠",  label:"Lowest Score",     value:worst,             color:"var(--coral)" },
    { icon:"〜",  label:"Std Deviation",    value:`±${variance}`,    color:"var(--amber)" },
    { icon:"↑",  label:"Above Average",    value:`${improving}/${prs.length}`, color:"var(--cyan)" },
  ];

  return (
    <>
      <PageHeader title="Score Trends" sub="Track code quality evolution, contribution velocity, and label-level performance." accent="var(--purple)"/>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:20 }}>
        {statsData.map(({ icon, label, value, color }, i)=>(
          <Card key={label} delay={i*40} style={{ border:`1px solid ${color}25`, textAlign:"center", padding:20 }}>
            <div style={{ fontSize:26, marginBottom:8 }}>{icon}</div>
            <div style={{ fontSize:25, fontWeight:800, color, fontFamily:"var(--font-mono)", letterSpacing:-1 }}>{value}</div>
            <div style={{ fontSize:11.5, color:"var(--text-secondary)", marginTop:4, fontWeight:600 }}>{label}</div>
          </Card>
        ))}
      </div>

      {/* Main composed chart — score + code churn together */}
      <Card style={{ marginBottom:20 }} delay={100}>
        <CardTitle icon="📈">HEALTH SCORE + CODE CHURN PER PR</CardTitle>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={trendData}>
            <defs>
              <linearGradient id="ag1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#2de2ff" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#2de2ff" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
            <XAxis dataKey="name" tick={{ fill:"var(--text-secondary)", fontSize:11.5, fontWeight:600 }} axisLine={false} tickLine={false}/>
            <YAxis yAxisId="left" domain={[0,100]} tick={{ fill:"var(--text-secondary)", fontSize:11 }} axisLine={false} tickLine={false}/>
            <YAxis yAxisId="right" orientation="right" tick={{ fill:"var(--text-secondary)", fontSize:11 }} axisLine={false} tickLine={false}/>
            <Tooltip content={<ChartTooltip/>}/>
            <Bar yAxisId="right" dataKey="additions" name="Lines Added"   fill="#4dff7a" fillOpacity={0.55} radius={[3,3,0,0]} barSize={14}/>
            <Bar yAxisId="right" dataKey="deletions" name="Lines Removed" fill="#ff5d7a" fillOpacity={0.55} radius={[0,0,3,3]} barSize={14}/>
            <Area yAxisId="left" type="monotone" dataKey="score" name="Health Score" stroke="#2de2ff" strokeWidth={3}
              fill="url(#ag1)" dot={{ fill:"#2de2ff", r:4, strokeWidth:0 }} activeDot={{ r:6, strokeWidth:0 }}/>
            <Line yAxisId="left" type="monotone" dataKey="rolling" name="3-PR Rolling Avg" stroke="#b39bff" strokeWidth={2}
              strokeDasharray="5 4" dot={false}/>
          </ComposedChart>
        </ResponsiveContainer>
        <div style={{ display:"flex", gap:20, marginTop:14, flexWrap:"wrap" }}>
          {[
            { c:"#2de2ff", l:"Health Score (left axis)" },
            { c:"#b39bff", l:"3-PR Rolling Avg", dash:true },
            { c:"#4dff7a", l:"Lines Added (right axis)" },
            { c:"#ff5d7a", l:"Lines Removed (right axis)" },
          ].map(({ c, l, dash })=>(
            <div key={l} style={{ display:"flex", alignItems:"center", gap:8, fontSize:12, color:"var(--text-secondary)", fontWeight:500 }}>
              <div style={{
                width:22, height: dash ? 0 : 10, background: dash ? "none" : c,
                borderRadius:2, flexShrink:0,
                borderTop: dash ? `2.5px dashed ${c}` : undefined,
              }}/>
              {l}
            </div>
          ))}
        </div>
      </Card>

      {/* Line + Label performance */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
        <Card delay={150}>
          <CardTitle icon="📉">SCORE TRAJECTORY</CardTitle>
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
              <XAxis dataKey="name" tick={{ fill:"var(--text-secondary)", fontSize:11.5, fontWeight:600 }} axisLine={false} tickLine={false}/>
              <YAxis domain={[0,100]} tick={{ fill:"var(--text-secondary)", fontSize:11 }} axisLine={false} tickLine={false}/>
              <Tooltip content={<ChartTooltip/>}/>
              <Line type="monotone" dataKey="score" name="Score" stroke="#4dff7a" strokeWidth={2.5}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  const c = scoreColor(payload.score);
                  return <circle key={cx} cx={cx} cy={cy} r={5} fill={c} stroke="var(--bg-card)" strokeWidth={2}
                    style={{ filter:`drop-shadow(0 0 4px ${c}90)` }}/>;
                }}/>
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card delay={200}>
          <CardTitle icon="🏷">AVG SCORE BY LABEL</CardTitle>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={labelScores} layout="vertical" barSize={16}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false}/>
              <XAxis type="number" domain={[0,100]} tick={{ fill:"var(--text-secondary)", fontSize:10.5 }} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="label" tick={{ fill:"var(--text-secondary)", fontSize:11.5, fontWeight:600 }} axisLine={false} tickLine={false} width={85}/>
              <Tooltip content={<ChartTooltip/>}/>
              <Bar dataKey="avg" name="Avg Score" radius={[0,6,6,0]}>
                {labelScores.map((entry,i)=>(
                  <Cell key={i} fill={LABEL_PALETTE[entry.label]||"#b39bff"} fillOpacity={0.85}/>
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// LEADERBOARD PAGE
// ════════════════════════════════════════════════════════════════════════════
function LeaderboardPage({ prs }) {
  const board = Object.values(
    prs.reduce((acc, pr)=>{
      if (!acc[pr.author]) acc[pr.author] = { author:pr.author, scores:[], prs:0, additions:0, deletions:0 };
      acc[pr.author].scores.push(pr.score);
      acc[pr.author].prs++;
      acc[pr.author].additions += pr.additions;
      acc[pr.author].deletions += pr.deletions;
      return acc;
    },{})
  ).map(a=>({
    ...a,
    avg:  Math.round(a.scores.reduce((s,x)=>s+x,0)/a.scores.length),
    best: Math.max(...a.scores),
    worst:Math.min(...a.scores),
    consistency: Math.round(100 - Math.sqrt(a.scores.reduce((s,x)=>s+Math.pow(x-(a.scores.reduce((p,q)=>p+q,0)/a.scores.length),2),0)/a.scores.length)),
  })).sort((a,b)=>b.avg-a.avg);

  const MEDALS = ["🥇","🥈","🥉"];
  const totalPRs = prs.length;

  return (
    <>
      <PageHeader title="Team Leaderboard" sub="Contributors ranked by average PR health score and consistency." accent="var(--lime)"/>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:20, alignItems:"start" }}>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {board.map((dev, i)=>{
            const color = scoreColor(dev.avg);
            const isTop = i < 3;
            const pct = dev.avg;
            const share = Math.round((dev.prs/totalPRs)*100);
            return (
              <Card key={dev.author} delay={i*60} style={{
                border: isTop ? `1px solid ${color}35` : "1px solid var(--border)",
                background: isTop
                  ? `linear-gradient(135deg, var(--bg-card), ${color}0c)`
                  : "var(--bg-card)",
                transition:"transform 0.15s",
                position:"relative", overflow:"hidden"
              }}
                onMouseEnter={e=>e.currentTarget.style.transform="translateX(4px)"}
                onMouseLeave={e=>e.currentTarget.style.transform="translateX(0)"}
              >
                {isTop && (
                  <div style={{
                    position:"absolute", top:0, left:0, right:0, height:2,
                    background:`linear-gradient(90deg,transparent,${color},transparent)`,
                    boxShadow:`0 0 12px ${color}`
                  }}/>
                )}
                <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:14 }}>
                  <div style={{ width:40, textAlign:"center", fontSize:22, flexShrink:0 }}>
                    {MEDALS[i] || (
                      <span style={{ fontSize:14, color:"var(--text-muted)", fontFamily:"var(--font-mono)", fontWeight:700 }}>
                        #{i+1}
                      </span>
                    )}
                  </div>

                  <div style={{
                    width:50, height:50, borderRadius:"50%",
                    background:`linear-gradient(135deg,${color}35,${color}10)`,
                    border:`2px solid ${color}50`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:21, fontWeight:800, color, flexShrink:0,
                    fontFamily:"var(--font-head)"
                  }}>{dev.author[0].toUpperCase()}</div>

                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8, gap:8 }}>
                      <div>
                        <span style={{ fontWeight:800, fontSize:16.5, fontFamily:"var(--font-head)", color:"var(--text-primary)" }}>{dev.author}</span>
                        <span style={{
                          fontSize:12, color:"var(--text-secondary)", marginLeft:10,
                          fontFamily:"var(--font-mono)", fontWeight:500
                        }}>
                          {dev.prs} PR{dev.prs!==1?"s":""} ({share}%) · best {dev.best} · worst {dev.worst}
                        </span>
                      </div>
                      <ScoreBadge score={dev.avg}/>
                    </div>
                    <div style={{ height:7, background:"var(--border)", borderRadius:4, overflow:"hidden" }}>
                      <div style={{
                        height:"100%", width:`${pct}%`,
                        background:`linear-gradient(90deg,${color}90,${color})`,
                        borderRadius:4, boxShadow:`0 0 10px ${color}60`,
                        transition:"width 1.2s cubic-bezier(0.4,0,0.2,1)"
                      }}/>
                    </div>
                  </div>
                </div>

                {/* Mini stat row */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, paddingLeft:106 }}>
                  {[
                    { label:"Avg Score",   val:dev.avg,                 color },
                    { label:"Consistency", val:`${Math.max(0,dev.consistency)}%`, color:"var(--cyan)" },
                    { label:"Lines +",     val:`+${dev.additions}`,     color:"var(--lime)" },
                    { label:"Lines -",     val:`-${dev.deletions}`,     color:"var(--coral)" },
                  ].map(s=>(
                    <div key={s.label} style={{
                      background:"var(--bg-elevated)", borderRadius:8, padding:"6px 10px"
                    }}>
                      <div style={{ fontSize:13, fontWeight:800, color:s.color, fontFamily:"var(--font-mono)" }}>{s.val}</div>
                      <div style={{ fontSize:9.5, color:"var(--text-muted)", marginTop:1, letterSpacing:0.3 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <Card delay={100}>
            <CardTitle icon="📊">AVG SCORE COMPARISON</CardTitle>
            <ResponsiveContainer width="100%" height={Math.max(160, board.length * 38)}>
              <BarChart data={board} layout="vertical" barSize={18}>
                <defs>
                  <linearGradient id="lbg" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#0044ff"/>
                    <stop offset="100%" stopColor="#2de2ff"/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false}/>
                <XAxis type="number" domain={[0,100]} tick={{ fill:"var(--text-secondary)", fontSize:10.5 }} axisLine={false} tickLine={false}/>
                <YAxis type="category" dataKey="author" tick={{ fill:"var(--text-secondary)", fontSize:12, fontWeight:600 }} axisLine={false} tickLine={false} width={75}/>
                <Tooltip content={<ChartTooltip/>}/>
                <Bar dataKey="avg" name="Avg Score" radius={[0,6,6,0]} fill="url(#lbg)"/>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card delay={150}>
            <CardTitle icon="🥧">PR SHARE BY CONTRIBUTOR</CardTitle>
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie data={board} dataKey="prs" cx="50%" cy="50%" outerRadius={64}
                  innerRadius={36} paddingAngle={4} strokeWidth={0}
                  nameKey="author">
                  {board.map((_,i)=>(
                    <Cell key={i} fill={["#2de2ff","#b39bff","#4dff7a","#ffcb47","#ff5d7a","#ff8fd6"][i%6]}
                      fillOpacity={0.9}/>
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip/>}/>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display:"flex", flexDirection:"column", gap:6, marginTop:6 }}>
              {board.map((d,i)=>(
                <div key={d.author} style={{ display:"flex", alignItems:"center", gap:8, fontSize:12 }}>
                  <div style={{ width:9, height:9, borderRadius:2, background:["#2de2ff","#b39bff","#4dff7a","#ffcb47","#ff5d7a","#ff8fd6"][i%6], flexShrink:0 }}/>
                  <span style={{ color:"var(--text-secondary)", flex:1, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{d.author}</span>
                  <span style={{ color:"var(--text-primary)", fontFamily:"var(--font-mono)", fontWeight:700 }}>{d.prs}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PR DETAIL DRAWER
// ════════════════════════════════════════════════════════════════════════════
function PRDrawer({ pr, onClose }) {
  if (!pr) return null;
  const c = scoreColor(pr.score);

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:200,
      display:"flex", justifyContent:"flex-end"
    }}>
      <div onClick={onClose} style={{
        position:"absolute", inset:0, background:"#02040ad0",
        backdropFilter:"blur(4px)", animation:"fadeIn 0.2s ease"
      }}/>
      <div className="fade-up" style={{
        position:"relative", width:"min(440px, 92vw)", height:"100vh",
        background:"var(--bg-elevated)", borderLeft:"1px solid var(--border-bright)",
        overflowY:"auto", boxShadow:"-24px 0 60px #000000a0",
        animationDuration:"0.25s"
      }}>
        {/* Header */}
        <div style={{
          padding:"22px 24px", borderBottom:"1px solid var(--border)",
          display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12
        }}>
          <div>
            <div style={{ fontSize:11, color:"var(--text-muted)", fontFamily:"var(--font-mono)", marginBottom:6 }}>
              PULL REQUEST #{pr.number}
            </div>
            <h2 style={{ fontFamily:"var(--font-head)", fontSize:18, fontWeight:800, color:"var(--text-primary)", lineHeight:1.4 }}>
              {pr.title}
            </h2>
          </div>
          <button onClick={onClose} style={{
            background:"var(--bg-card)", border:"1px solid var(--border)",
            borderRadius:8, width:32, height:32, color:"var(--text-secondary)",
            cursor:"pointer", fontSize:16, flexShrink:0
          }}>✕</button>
        </div>

        <div style={{ padding:24 }}>
          {/* Score hero */}
          <div style={{
            display:"flex", alignItems:"center", gap:20, marginBottom:24,
            padding:"20px", background:"var(--bg-card)", borderRadius:14,
            border:`1px solid ${c}30`
          }}>
            <HealthRing score={pr.score} size={100}/>
            <div>
              <div style={{ fontSize:13, color:"var(--text-secondary)", marginBottom:8, fontWeight:500 }}>
                Reviewed by ReviewBot AI
              </div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {pr.labels.map(l=><LabelChip key={l} label={l}/>)}
              </div>
            </div>
          </div>

          {/* Meta grid */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:24 }}>
            {[
              { label:"Author",   value: pr.author },
              { label:"State",    value: pr.state === "open" ? "🟢 Open" : "⚪ Closed" },
              { label:"Created",  value: fmtDate(pr.created) },
              { label:"Merged",   value: pr.merged ? fmtDate(pr.merged) : "—" },
              { label:"Comments", value: pr.comments },
              { label:"Net Lines",value: `${pr.additions - pr.deletions >= 0 ? "+" : ""}${pr.additions - pr.deletions}` },
            ].map(({ label, value })=>(
              <div key={label} style={{ background:"var(--bg-card)", borderRadius:10, padding:"10px 14px" }}>
                <div style={{ fontSize:10.5, color:"var(--text-muted)", letterSpacing:0.5, marginBottom:3 }}>{label.toUpperCase()}</div>
                <div style={{ fontSize:14, color:"var(--text-primary)", fontWeight:700, fontFamily:"var(--font-mono)" }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Diff bar */}
          <div style={{ marginBottom:24 }}>
            <div style={{ fontSize:11, color:"var(--text-muted)", letterSpacing:1, marginBottom:10, fontFamily:"var(--font-mono)", fontWeight:700 }}>
              CODE CHANGES
            </div>
            <div style={{ display:"flex", height:10, borderRadius:5, overflow:"hidden", marginBottom:8 }}>
              <div style={{ background:"var(--lime)", width:`${(pr.additions/(pr.additions+pr.deletions||1))*100}%`, boxShadow:"0 0 8px var(--lime)" }}/>
              <div style={{ background:"var(--coral)", width:`${(pr.deletions/(pr.additions+pr.deletions||1))*100}%`, boxShadow:"0 0 8px var(--coral)" }}/>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:12.5, fontFamily:"var(--font-mono)" }}>
              <span style={{ color:"var(--lime)" }}>+{pr.additions} additions</span>
              <span style={{ color:"var(--coral)" }}>-{pr.deletions} deletions</span>
            </div>
          </div>

          {/* Files changed */}
          {pr.files?.length > 0 && (
            <div style={{ marginBottom:24 }}>
              <div style={{ fontSize:11, color:"var(--text-muted)", letterSpacing:1, marginBottom:10, fontFamily:"var(--font-mono)", fontWeight:700 }}>
                FILES CHANGED ({pr.files.length})
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {pr.files.map(f=>(
                  <div key={f} style={{
                    fontSize:12.5, color:"var(--text-secondary)", fontFamily:"var(--font-mono)",
                    background:"var(--bg-card)", borderRadius:8, padding:"8px 12px",
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"
                  }}>{f}</div>
                ))}
              </div>
            </div>
          )}

          {/* AI verdict */}
          <div style={{
            padding:16, background:`${c}10`, border:`1px solid ${c}30`,
            borderRadius:12
          }}>
            <div style={{ fontSize:11, color:c, letterSpacing:1, marginBottom:8, fontFamily:"var(--font-mono)", fontWeight:700 }}>
              🤖 REVIEWBOT VERDICT
            </div>
            <p style={{ fontSize:13.5, color:"var(--text-secondary)", lineHeight:1.6, margin:0 }}>
              {pr.score >= 80
                ? `This PR scored ${pr.score}/100 — strong implementation with clean structure. ${pr.labels.includes("security") ? "Security-sensitive changes were reviewed with extra scrutiny and passed." : "Ready for merge with minimal follow-up."}`
                : pr.score >= 60
                ? `This PR scored ${pr.score}/100 — generally solid but has a few areas worth revisiting before merge, particularly around ${pr.labels[0] || "code style"}.`
                : `This PR scored ${pr.score}/100 — several issues were flagged that should be addressed before merging. ${pr.labels.includes("critical") ? "Critical-severity findings require immediate attention." : "Recommend a follow-up review pass."}`
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PR ROW
// ════════════════════════════════════════════════════════════════════════════
function PRRow({ pr, onOpen, delay=0 }) {
  const [hov, setHov] = useState(false);
  const c = scoreColor(pr.score);
  return (
    <div
      className="fade-up"
      style={{ animationDelay:`${delay}ms` }}
      onMouseEnter={()=>setHov(true)}
      onMouseLeave={()=>setHov(false)}
      onClick={()=>onOpen(pr)}
    >
      <div style={{
        background: hov ? "var(--bg-card-hover)" : "var(--bg-card)",
        border:`1px solid ${hov ? "var(--cyan-glow)" : "var(--border)"}`,
        borderRadius:"var(--radius-md)", padding:"14px 20px",
        display:"flex", alignItems:"center", gap:14,
        transition:"all 0.15s", cursor:"pointer",
        transform: hov ? "translateX(2px)" : "translateX(0)"
      }}>
        <div style={{
          width:3, height:40, borderRadius:2, flexShrink:0,
          background:`linear-gradient(180deg,${c},${c}44)`,
          boxShadow:`0 0 8px ${c}60`
        }}/>
        <div style={{ fontFamily:"var(--font-mono)", color:"var(--text-secondary)", fontSize:12, width:38, flexShrink:0, fontWeight:600 }}>
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
            {pr.labels.slice(0,3).map(l=><LabelChip key={l} label={l} size="sm"/>)}
            <span style={{ fontSize:11.5, color:"var(--text-muted)", whiteSpace:"nowrap" }}>
              {pr.author} · {daysAgo(pr.created)}
            </span>
          </div>
        </div>
        <div style={{ display:"flex", gap:14, alignItems:"center", flexShrink:0 }}>
          <div style={{ textAlign:"right", fontSize:12, fontFamily:"var(--font-mono)", fontWeight:600 }}>
            <span style={{ color:"var(--lime)" }}>+{pr.additions}</span>
            <span style={{ color:"var(--text-faint)", margin:"0 4px" }}>/</span>
            <span style={{ color:"var(--coral)" }}>-{pr.deletions}</span>
          </div>
          {pr.comments > 0 && (
            <span style={{ fontSize:11.5, color:"var(--text-secondary)", whiteSpace:"nowrap" }}>💬 {pr.comments}</span>
          )}
          <ScoreBadge score={pr.score}/>
          <span style={{ color:"var(--text-faint)", fontSize:14 }}>›</span>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PULL REQUESTS PAGE
// ════════════════════════════════════════════════════════════════════════════
function PullRequestsPage({ prs, onOpenPR }) {
  const [filterLabel, setFilterLabel] = useState("all");
  const [filterState, setFilterState] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [search, setSearch] = useState("");

  const allLabels = [...new Set(prs.flatMap(p=>p.labels))];

  const filtered = prs
    .filter(p=> filterLabel==="all" || p.labels.includes(filterLabel))
    .filter(p=> filterState==="all" || p.state===filterState)
    .filter(p=> !search || p.title.toLowerCase().includes(search.toLowerCase()) || `#${p.number}`.includes(search) || p.author.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b)=>{
      if (sortBy==="newest")     return new Date(b.created)-new Date(a.created);
      if (sortBy==="score-high") return b.score-a.score;
      if (sortBy==="score-low")  return a.score-b.score;
      if (sortBy==="churn")      return (b.additions+b.deletions)-(a.additions+a.deletions);
      return 0;
    });

  const selectStyle = {
    background:"var(--bg-base)", border:"1px solid var(--border)",
    color:"var(--text-secondary)", borderRadius:"var(--radius-sm)",
    padding:"8px 12px", fontSize:12.5, cursor:"pointer",
    fontFamily:"var(--font-body)", outline:"none", fontWeight:500
  };

  return (
    <>
      <PageHeader
        title="Pull Requests"
        sub={`${filtered.length} of ${prs.length} shown · click any row for full details`}
        accent="var(--coral)"
      />

      <div className="fade-up" style={{
        background:"var(--bg-card)", border:"1px solid var(--border)",
        borderRadius:"var(--radius-md)", padding:"14px 18px",
        display:"flex", gap:10, flexWrap:"wrap", alignItems:"center",
        marginBottom:16
      }}>
        <div style={{ position:"relative", flex:"1 1 220px", minWidth:160 }}>
          <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:"var(--text-muted)", fontSize:14 }}>⌕</span>
          <input
            type="text" placeholder="Search title, author, or #number…"
            value={search} onChange={e=>setSearch(e.target.value)}
            style={{
              ...selectStyle, width:"100%", paddingLeft:32,
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
          <option value="churn">Most Changed</option>
        </select>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {filtered.length === 0 ? (
          <Card style={{ textAlign:"center", padding:"48px 24px", color:"var(--text-muted)" }}>
            No pull requests match your filters.
          </Card>
        ) : filtered.map((pr,i)=>(
          <PRRow key={pr.number} pr={pr} onOpen={onOpenPR} delay={Math.min(i*30, 300)}/>
        ))}
      </div>

      {filtered.length > 0 && (
        <div className="fade-up" style={{
          marginTop:16, display:"flex", gap:6, justifyContent:"flex-end",
          fontSize:12.5, color:"var(--text-secondary)", fontWeight:500
        }}>
          Showing {filtered.length} PR{filtered.length!==1?"s":""} ·
          Avg score{" "}
          <span style={{ color:"var(--cyan)", fontFamily:"var(--font-mono)", fontWeight:800 }}>
            {Math.round(filtered.reduce((a,b)=>a+b.score,0)/filtered.length)}
          </span>
        </div>
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [prs,         setPrs]         = useState([]);
  const [owner,       setOwner]       = useState("");
  const [repo,        setRepo]        = useState("");
  const [connected,   setConnected]   = useState(false);
  const [isDemo,      setIsDemo]      = useState(false);
  const [activeTab,   setActiveTab]   = useState("overview");
  const [searchOpen,  setSearchOpen]  = useState(false);
  const [selectedPR,  setSelectedPR]  = useState(null);

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

  // Global Cmd/Ctrl+K shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (!connected) return <ConnectScreen onConnect={handleConnect} onDemo={handleDemo}/>;

  return (
    <div style={{ display:"flex", minHeight:"100vh" }}>
      <Sidebar
        owner={owner} repo={repo}
        activeTab={activeTab} setActiveTab={setActiveTab}
        onDisconnect={handleDisconnect} isDemo={isDemo}
        prs={prs} onOpenSearch={()=>setSearchOpen(true)}
      />
      <main style={{
        flex:1, overflowY:"auto", padding:"32px 36px",
        background:"var(--bg-base)", minWidth:0,
        position:"relative"
      }}>
        <div style={{
          position:"fixed", inset:0, pointerEvents:"none", zIndex:0,
          backgroundImage:`radial-gradient(circle, #1d274008 1px, transparent 1px)`,
          backgroundSize:"28px 28px"
        }}/>
        <div style={{
          position:"fixed", top:"8%", right:"15%", width:420, height:420,
          borderRadius:"50%", background:"#2de2ff05",
          filter:"blur(90px)", pointerEvents:"none", zIndex:0
        }}/>
        <div style={{
          position:"fixed", bottom:"15%", left:"22%", width:320, height:320,
          borderRadius:"50%", background:"#4dff7a05",
          filter:"blur(70px)", pointerEvents:"none", zIndex:0
        }}/>

        <div style={{ position:"relative", zIndex:1 }}>
          {activeTab === "overview"      && <OverviewPage      prs={prs} onNavigate={setActiveTab}/>}
          {activeTab === "trends"        && <TrendsPage        prs={prs}/>}
          {activeTab === "leaderboard"   && <LeaderboardPage   prs={prs}/>}
          {activeTab === "pull-requests" && <PullRequestsPage  prs={prs} onOpenPR={setSelectedPR}/>}
        </div>
      </main>

      <CommandPalette
        open={searchOpen}
        onClose={()=>setSearchOpen(false)}
        prs={prs}
        onNavigate={setActiveTab}
        onSelectPR={setSelectedPR}
      />

      <PRDrawer pr={selectedPR} onClose={()=>setSelectedPR(null)}/>
    </div>
  );
}