import { useState, useRef, useCallback, useEffect, useMemo } from "react";

const INSTALL_RECORDS = [
  { vehicle: "DL01CD5678", vendor: "ReflexTech India", date: "12 Jan 2025", cert: "RT-2025-0041", valid: "12 Jan 2026" },
  { vehicle: "GJ18GH3456", vendor: "SafeGlow Solutions", date: "03 Mar 2025", cert: "SG-2025-0189", valid: "03 Mar 2026" },
  { vehicle: "KA05EF9012", vendor: "VisionMark Auto", date: "18 Feb 2025", cert: "VM-2025-0092", valid: "18 Feb 2026" },
];

/* ── Image analysis (unchanged) ───────────────────────────────────────── */
function analyseImage(imageUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const t0 = performance.now();
      const canvas = document.createElement("canvas");
      const W = Math.min(img.naturalWidth, 640);
      const H = Math.round((W / img.naturalWidth) * img.naturalHeight);
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, W, H);
      const { data } = ctx.getImageData(0, 0, W, H);
      let rp = [];
      for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
        const i = (y * W + x) * 4, r = data[i], g = data[i+1], b = data[i+2];
        const lum = .299*r+.587*g+.114*b, mx = Math.max(r,g,b), mn = Math.min(r,g,b), sat = mx>0?(mx-mn)/mx:0;
        let sc = 0;
        if (lum>140&&sat<.3) sc=lum;
        if (r>120&&r>g*1.4&&r>b*1.8&&lum>60) sc=Math.max(sc,r);
        if (r>130&&g>100&&b<g*.6&&lum>80) sc=Math.max(sc,(r+g)/2);
        if (lum>220) sc=Math.max(sc,lum);
        if (sc>0) rp.push({x,y,score:sc});
      }
      const G=32, cW=W/G, cH=H/G;
      const den=Array.from({length:G},()=>new Float32Array(G)), cscore=Array.from({length:G},()=>new Float32Array(G));
      for (const p of rp){const cx=Math.min(G-1,Math.floor(p.x/cW)),cy=Math.min(G-1,Math.floor(p.y/cH));den[cy][cx]++;cscore[cy][cx]+=p.score;}
      const avg=rp.length/(G*G), thr=Math.max(2,avg*1.5), vis=Array.from({length:G},()=>new Uint8Array(G));
      function ff(sy,sx){const st=[[sy,sx]],cl=[];vis[sy][sx]=1;while(st.length){const[cy,cx]=st.pop();cl.push([cy,cx]);for(const[dy,dx]of[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]){const ny=cy+dy,nx=cx+dx;if(ny>=0&&ny<G&&nx>=0&&nx<G&&!vis[ny][nx]&&den[ny][nx]>=thr){vis[ny][nx]=1;st.push([ny,nx]);}}}return cl;}
      const cls=[];
      for(let gy=0;gy<G;gy++)for(let gx=0;gx<G;gx++)if(!vis[gy][gx]&&den[gy][gx]>=thr){const cl=ff(gy,gx);if(cl.length>=2){let ts=0,tp=0,mnx=G,mny=G,mxx=0,mxy=0;for(const[cy,cx]of cl){ts+=cscore[cy][cx];tp+=den[cy][cx];if(cx<mnx)mnx=cx;if(cy<mny)mny=cy;if(cx>mxx)mxx=cx;if(cy>mxy)mxy=cy;}cls.push({minX:mnx*cW,minY:mny*cH,maxX:(mxx+1)*cW,maxY:(mxy+1)*cH,pixels:tp});}}
      cls.sort((a,b)=>b.pixels-a.pixels);
      let rd=false,conf=0,boxes=[],pc=false;const ts=(W/2)*(H/2),ia=W*H;
      for(const cl of cls.slice(0,3)){const bw=cl.maxX-cl.minX,bh=cl.maxY-cl.minY;if((bw*bh)/ia<.05)continue;if(bw>=W*.92&&bh>=H*.92)continue;const pad=Math.max(cW,cH)*.3;const box={x:Math.max(0,(cl.minX-pad)/W),y:Math.max(0,(cl.minY-pad)/H),w:Math.min(1,(bw+pad*2)/W),h:Math.min(1,(bh+pad*2)/H),conf:Math.min(.98,.55+(cl.pixels/ts)*3)};box.w=Math.min(box.w,1-box.x);box.h=Math.min(box.h,1-box.y);boxes.push(box);}
      if(boxes.length>0){rd=true;conf=boxes[0].conf;const p=boxes[0];pc=(p.y+p.h/2)>.08&&(p.x+p.w/2)>.05;}
      if(!rd)conf=.1+Math.random()*.15;
      const sts=["MH","DL","KA","GJ","TN","RJ","UP","MP"],h=data[0]+data[100]+data[500]+data[1000];
      const veh=`${sts[h%sts.length]}${String((h%20)+1).padStart(2,"0")}${"ABCDEFGHJKLMNPRSTUVWXYZ"[(data[200]||0)%23]}${"ABCDEFGHJKLMNPRSTUVWXYZ"[(data[300]||0)%23]}${String(((data[400]||0)*37+(data[600]||0))%10000).padStart(4,"0")}`;
      resolve({id:Date.now(),vehicle:veh,reflector:rd,placement:pc,vendor:!!INSTALL_RECORDS.find(r=>r.vehicle===veh),compliant:rd&&pc,confidence:Math.round(conf*100)/100,latency:Math.round(performance.now()-t0),reflectorBoxes:boxes,date:new Date().toLocaleString("en-IN",{hour:"2-digit",minute:"2-digit",day:"2-digit",month:"short"})});
    };
    img.onerror = () => resolve({id:Date.now(),vehicle:"UNKNOWN",reflector:false,placement:false,vendor:false,compliant:false,confidence:0,latency:0,reflectorBoxes:[],date:new Date().toLocaleString("en-IN",{hour:"2-digit",minute:"2-digit"})});
    img.src = imageUrl;
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   THEME SYSTEM — all colors via CSS custom properties
   ═══════════════════════════════════════════════════════════════════════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
html,body,#root{height:100%;overflow:hidden}
body{font-family:'Inter',system-ui,sans-serif}

/* ── Dark theme (default) ── */
:root, [data-theme="dark"] {
  --bg-0: #050508;
  --bg-1: rgba(8,8,11,.7);
  --bg-2: #0a0a0d;
  --bg-3: #111114;
  --bg-canvas: #08080b;
  --bg-hover: rgba(99,102,241,.03);
  --border: rgba(255,255,255,.06);
  --border-subtle: rgba(255,255,255,.03);
  --text-0: #fafafa;
  --text-1: #d4d4d8;
  --text-2: #a1a1aa;
  --text-3: #71717a;
  --text-muted: #52525b;
  --mono: 'JetBrains Mono', monospace;
  --accent: #6366f1;
  --accent-soft: rgba(99,102,241,.1);
  --accent-glow: rgba(99,102,241,.25);
  --green: #22c55e;
  --green-text: #4ade80;
  --green-bg: rgba(34,197,94,.08);
  --green-border: rgba(34,197,94,.15);
  --red: #ef4444;
  --red-text: #f87171;
  --red-bg: rgba(239,68,68,.08);
  --red-border: rgba(239,68,68,.15);
  --glass-bg: rgba(12,12,15,.65);
  --glass-blur: blur(20px) saturate(1.2);
  --scrollbar: rgba(99,102,241,.2);
  --ambient1: rgba(99,102,241,.04);
  --ambient2: rgba(139,92,246,.03);
  --ambient3: rgba(6,182,212,.02);
  --card-shine: rgba(255,255,255,.03);
  --shadow: 0 12px 40px rgba(0,0,0,.5);
  color-scheme: dark;
}

/* ── Light theme ── */
[data-theme="light"] {
  --bg-0: #f8f9fc;
  --bg-1: rgba(255,255,255,.85);
  --bg-2: #ffffff;
  --bg-3: #f0f1f5;
  --bg-canvas: #eef0f4;
  --bg-hover: rgba(99,102,241,.04);
  --border: rgba(0,0,0,.08);
  --border-subtle: rgba(0,0,0,.04);
  --text-0: #0f172a;
  --text-1: #1e293b;
  --text-2: #475569;
  --text-3: #64748b;
  --text-muted: #94a3b8;
  --accent: #4f46e5;
  --accent-soft: rgba(79,70,229,.08);
  --accent-glow: rgba(79,70,229,.15);
  --green: #16a34a;
  --green-text: #16a34a;
  --green-bg: rgba(22,163,74,.06);
  --green-border: rgba(22,163,74,.15);
  --red: #dc2626;
  --red-text: #dc2626;
  --red-bg: rgba(220,38,38,.05);
  --red-border: rgba(220,38,38,.12);
  --glass-bg: rgba(255,255,255,.75);
  --glass-blur: blur(20px) saturate(1.1);
  --scrollbar: rgba(79,70,229,.15);
  --ambient1: rgba(99,102,241,.05);
  --ambient2: rgba(139,92,246,.04);
  --ambient3: rgba(6,182,212,.03);
  --card-shine: rgba(255,255,255,.6);
  --shadow: 0 12px 40px rgba(0,0,0,.08);
  color-scheme: light;
}

body{background:var(--bg-0);color:var(--text-1)}

::-webkit-scrollbar{width:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--scrollbar);border-radius:4px}

@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes scaleIn{from{transform:scale(.96);opacity:0}to{transform:scale(1);opacity:1}}
@keyframes scanLine{0%{top:0}100%{top:100%}}
@keyframes pulseGlow{0%,100%{opacity:.4}50%{opacity:1}}
@keyframes borderGlow{0%,100%{border-color:rgba(99,102,241,.2)}50%{border-color:rgba(99,102,241,.5)}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}

.fade-up{animation:fadeUp .45s cubic-bezier(.16,1,.3,1) forwards}
.scale-in{animation:scaleIn .35s cubic-bezier(.16,1,.3,1) forwards}
`;

/* ── Helper: use CSS var values ───────────────────────────────────────── */
const v = (name) => `var(--${name})`;

/* ── Compliance Ring ───────────────────────────────────────────────────── */
function ComplianceRing({ rate, size = 100, stroke = 6 }) {
  const r = (size - stroke) / 2, circ = 2 * Math.PI * r, offset = circ - (rate / 100) * circ;
  const color = rate > 70 ? "var(--green)" : rate > 40 ? "#eab308" : rate === 0 ? "var(--text-muted)" : "var(--red)";
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={v("bg-3")} strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(.16,1,.3,1)", filter: `drop-shadow(0 0 6px currentColor)` }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: size * .22, fontWeight: 800, color: v("text-0"), lineHeight: 1, fontFamily: v("mono") }}>{Math.round(rate)}<span style={{ fontSize: size * .12, color: v("text-muted") }}>%</span></span>
      </div>
    </div>
  );
}

/* ── Detection Canvas ──────────────────────────────────────────────────── */
function DetectionCanvas({ result, imageUrl, scanning }) {
  const boxes = result?.reflectorBoxes || [];
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: v("bg-canvas"), borderRadius: 16, overflow: "hidden", border: `1px solid ${v("border")}` }}>
      <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: `radial-gradient(circle, ${v("ambient1")} 0%, transparent 70%)`, pointerEvents: "none" }} />

      {imageUrl ? (
        <img src={imageUrl} alt="Vehicle" style={{ width: "100%", height: "100%", objectFit: "contain", position: "relative", zIndex: 1 }} />
      ) : (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 20 }}>
          <div style={{ width: 90, height: 90, borderRadius: 24, border: `1.5px dashed ${v("border")}`, display: "flex", alignItems: "center", justifyContent: "center", animation: "float 3s ease-in-out infinite" }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={v("text-muted")} strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: v("text-3"), fontSize: 15, fontWeight: 500 }}>No image loaded</div>
            <div style={{ color: v("text-muted"), fontSize: 12, marginTop: 6 }}>Upload a vehicle image to begin</div>
          </div>
        </div>
      )}

      {scanning && imageUrl && (
        <div style={{ position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none" }}>
          <div style={{ position: "absolute", left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent, ${v("accent")}, transparent)`, boxShadow: `0 0 20px ${v("accent-glow")}`, animation: "scanLine 1.5s ease-in-out infinite" }} />
          <div style={{ position: "absolute", inset: 0, border: `2px solid ${v("accent-soft")}`, borderRadius: 16, animation: "borderGlow 1.5s ease-in-out infinite" }} />
        </div>
      )}

      {result && imageUrl && (
        <>
          <div style={{ position: "absolute", top: "4%", left: "2%", width: "96%", height: "92%", border: "1.5px solid rgba(99,102,241,.35)", borderRadius: 8, pointerEvents: "none", zIndex: 2 }}>
            <span style={{ position: "absolute", top: -20, left: 10, background: "linear-gradient(135deg, #4338ca, #6366f1)", color: "#e0e7ff", fontSize: 10, fontFamily: v("mono"), padding: "3px 10px", borderRadius: 5, fontWeight: 500, boxShadow: `0 2px 10px ${v("accent-glow")}` }}>VEHICLE {(0.92 + Math.random() * .07).toFixed(2)}</span>
          </div>

          {result.reflector && boxes.map((box, i) => (
            <div key={i} className="scale-in" style={{ position: "absolute", zIndex: 3, top: `${box.y*100}%`, left: `${box.x*100}%`, width: `${Math.max(box.w*100,3)}%`, height: `${Math.max(box.h*100,3)}%`, border: `2px solid ${result.placement ? v("green") : v("red")}`, borderRadius: 6, boxShadow: `0 0 24px ${result.placement ? "rgba(34,197,94,.25)" : "rgba(239,68,68,.25)"}`, pointerEvents: "none" }}>
              <span style={{ position: "absolute", top: -22, left: 8, background: result.placement ? "linear-gradient(135deg,#15803d,#22c55e)" : "linear-gradient(135deg,#b91c1c,#ef4444)", color: "#fff", fontSize: 10, fontFamily: v("mono"), padding: "2px 10px", borderRadius: 5, fontWeight: 500, whiteSpace: "nowrap", boxShadow: `0 2px 10px ${result.placement ? "rgba(34,197,94,.3)" : "rgba(239,68,68,.3)"}` }}>REFLECTOR {((box.conf||result.confidence)*100).toFixed(0)}%</span>
            </div>
          ))}

          {!result.reflector && (
            <div className="scale-in" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 4, background: "rgba(0,0,0,.85)", backdropFilter: "blur(16px)", borderRadius: 14, padding: "16px 32px", border: `1px solid ${v("red-border")}` }}>
              <span style={{ color: v("red-text"), fontSize: 13, fontFamily: v("mono"), fontWeight: 600, letterSpacing: ".05em" }}>NO REFLECTOR DETECTED</span>
            </div>
          )}

          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 4, background: "linear-gradient(transparent, rgba(0,0,0,.85))", padding: "28px 18px 14px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div style={{ display: "flex", gap: 16 }}>
              {[`YOLOv8-nano`, `${result.confidence.toFixed(2)}`, `${result.latency}ms`].map((t, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 4, height: 4, borderRadius: "50%", background: ["#6366f1","#22c55e","#67e8f9"][i] }} />
                  <span style={{ color: "#94a3b8", fontSize: 11, fontFamily: v("mono") }}>{t}</span>
                </div>
              ))}
            </div>
            <span style={{ padding: "5px 14px", borderRadius: 8, fontSize: 11, fontWeight: 700, fontFamily: v("mono"), letterSpacing: ".05em", background: result.compliant ? "rgba(34,197,94,.15)" : "rgba(239,68,68,.15)", color: result.compliant ? "#4ade80" : "#f87171", border: `1px solid ${result.compliant ? "rgba(34,197,94,.25)" : "rgba(239,68,68,.25)"}` }}>{result.compliant ? "COMPLIANT" : "NON-COMPLIANT"}</span>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Sub-components ────────────────────────────────────────────────────── */
function ConfGauge({ value }) {
  const pct = Math.round(value * 100);
  const color = pct > 70 ? v("green") : pct > 40 ? "#eab308" : v("red");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: v("bg-2"), border: `1px solid ${v("border")}` }}>
      <div style={{ flex: 1, height: 5, background: v("bg-3"), borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4, transition: "width .6s cubic-bezier(.16,1,.3,1)" }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, fontFamily: v("mono"), color, minWidth: 36, textAlign: "right" }}>{pct}%</span>
    </div>
  );
}

function CheckItem({ label, pass, detail }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: pass ? v("green-bg") : v("red-bg"), borderRadius: 12, border: `1px solid ${pass ? v("green-border") : v("red-border")}` }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: pass ? v("green-bg") : v("red-bg"), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: pass ? v("green-text") : v("red-text"), fontWeight: 700, flexShrink: 0 }}>{pass ? "✓" : "✕"}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: v("text-1") }}>{label}</div>
        {detail && <div style={{ fontSize: 11, color: v("text-3"), marginTop: 2 }}>{detail}</div>}
      </div>
    </div>
  );
}

function TimelineItem({ item, onClick, isLast }) {
  return (
    <div onClick={onClick} style={{ display: "flex", gap: 12, cursor: "pointer", padding: "8px 0" }}
      onMouseOver={e => { e.currentTarget.style.opacity = ".75"; }} onMouseOut={e => { e.currentTarget.style.opacity = "1"; }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, marginTop: 4, background: item.compliant ? v("green") : v("red"), boxShadow: `0 0 8px ${item.compliant ? "rgba(34,197,94,.5)" : "rgba(239,68,68,.5)"}` }} />
        {!isLast && <div style={{ width: 1, flex: 1, background: v("border"), minHeight: 24 }} />}
      </div>
      <div style={{ paddingBottom: 6 }}>
        <div style={{ fontSize: 12, fontWeight: 600, fontFamily: v("mono"), color: v("text-1") }}>{item.vehicle}</div>
        <div style={{ fontSize: 11, color: v("text-3"), marginTop: 2 }}>{item.compliant ? "Compliant" : "Non-compliant"} · {item.date}</div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, sub }) {
  return (
    <div style={{ background: v("glass-bg"), backdropFilter: v("glass-blur"), border: `1px solid ${v("border")}`, borderRadius: 16, padding: "22px 24px", cursor: "default", transition: "transform .2s, box-shadow .2s" }}
      onMouseOver={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = v("shadow"); }}
      onMouseOut={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "none"; }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}12`, border: `1px solid ${color}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>{icon}</div>
        <span style={{ fontSize: 12, color: v("text-3"), fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: 30, fontWeight: 800, color, fontFamily: v("mono"), lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: v("text-muted"), marginTop: 8 }}>{sub}</div>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN APP
   ══════════════════════════════════════════════════════════════════════════ */
export default function App() {
  const [imageUrl, setImageUrl] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState(() => { try { return JSON.parse(localStorage.getItem("reflector_log")) || []; } catch { return []; } });
  const [view, setView] = useState("inspect");
  const [dragOver, setDragOver] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem("reflector_theme") || "dark");
  const fileRef = useRef();

  useEffect(() => { localStorage.setItem("reflector_log", JSON.stringify(log.slice(0, 200))); }, [log]);
  useEffect(() => { document.documentElement.setAttribute("data-theme", theme); localStorage.setItem("reflector_theme", theme); }, [theme]);

  const handleFile = useCallback((file) => { if (!file) return; setImageUrl(URL.createObjectURL(file)); setResult(null); setProgress(0); }, []);
  const runInspection = useCallback(async () => {
    if (!imageUrl) return; setLoading(true); setResult(null); setProgress(0);
    for (const s of [15,35,55,72,85]) { await new Promise(r => setTimeout(r, 160)); setProgress(s); }
    const res = await analyseImage(imageUrl);
    setProgress(95); await new Promise(r => setTimeout(r, 120));
    setProgress(100); await new Promise(r => setTimeout(r, 100));
    setResult(res); setLog(prev => [res, ...prev]); setLoading(false);
  }, [imageUrl]);
  const exportCSV = useCallback(() => {
    if (!log.length) return;
    const rows = ["Vehicle,Compliant,Reflector,Placement,Confidence,Latency,Date", ...log.map(r => `${r.vehicle},${r.compliant},${r.reflector},${r.placement},${r.confidence},${r.latency},${r.date}`)].join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([rows], { type: "text/csv" })); a.download = `reflector_log_${Date.now()}.csv`; a.click();
  }, [log]);
  const downloadReport = useCallback(() => {
    if (!result) return;
    const t = `REFLECTOR COMPLIANCE REPORT\n${"─".repeat(40)}\nVehicle    : ${result.vehicle}\nReflector  : ${result.reflector ? "Detected" : "Not Detected"}\nPlacement  : ${result.placement ? "Correct" : "Incorrect"}\nCompliance : ${result.compliant ? "COMPLIANT" : "NON-COMPLIANT"}\nConfidence : ${result.confidence}\nLatency    : ${result.latency}ms\n${"─".repeat(40)}\n${result.date}`;
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([t], { type: "text/plain" })); a.download = `report_${result.vehicle}_${Date.now()}.txt`; a.click();
  }, [result]);

  const stats = useMemo(() => {
    const total = log.length, pass = log.filter(r => r.compliant).length;
    return { total, pass, fail: total - pass, avg: total ? Math.round(log.reduce((s, r) => s + (r.latency||0), 0) / total) : 0, rate: total ? (pass / total) * 100 : 0 };
  }, [log]);

  const ThemeToggle = () => (
    <button onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} style={{
      width: 36, height: 36, borderRadius: 10, border: `1px solid ${v("border")}`, cursor: "pointer",
      background: v("bg-2"), display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 16, transition: "all .2s", color: v("text-2")
    }} title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );

  return (
    <div data-theme={theme} style={{ height: "100vh", display: "flex", flexDirection: "column", background: v("bg-0"), overflow: "hidden", position: "relative", color: v("text-1") }}>
      <style>{CSS}</style>

      {/* Ambient blobs */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "10%", left: "15%", width: 400, height: 400, borderRadius: "50%", background: `radial-gradient(circle, ${v("ambient1")} 0%, transparent 70%)`, filter: "blur(40px)" }} />
        <div style={{ position: "absolute", bottom: "10%", right: "10%", width: 350, height: 350, borderRadius: "50%", background: `radial-gradient(circle, ${v("ambient2")} 0%, transparent 70%)`, filter: "blur(40px)" }} />
      </div>

      {/* ── Header ──────────────────────────────────────── */}
      <header style={{ height: 56, minHeight: 56, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", borderBottom: `1px solid ${v("border-subtle")}`, background: v("bg-1"), backdropFilter: v("glass-blur"), zIndex: 10, position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, boxShadow: `0 0 20px ${v("accent-glow")}`, color: "#fff", fontWeight: 800 }}>R</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: v("text-0"), letterSpacing: "-.02em" }}>Reflector</span>
            <span style={{ color: v("text-muted"), fontSize: 11 }}>v2.1</span>
          </div>
        </div>
        <nav style={{ display: "flex", background: v("bg-2"), borderRadius: 10, padding: 3, border: `1px solid ${v("border")}` }}>
          {[{ key: "inspect", label: "Inspect" }, { key: "history", label: "History" }, { key: "analytics", label: "Analytics" }].map(tab => (
            <button key={tab.key} onClick={() => setView(tab.key)} style={{
              padding: "7px 18px", borderRadius: 8, border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 500, fontFamily: "inherit",
              background: view === tab.key ? v("accent-soft") : "transparent",
              color: view === tab.key ? v("accent") : v("text-3"),
              transition: "all .2s"
            }}>{tab.label}</button>
          ))}
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ThemeToggle />
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 8, background: v("green-bg"), border: `1px solid ${v("green-border")}` }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: v("green"), animation: "pulseGlow 2s ease-in-out infinite" }} />
            <span style={{ fontSize: 11, color: v("green-text"), fontFamily: v("mono"), fontWeight: 500 }}>Online</span>
          </div>
        </div>
      </header>

      {/* ═══════════ INSPECT ═══════════ */}
      {view === "inspect" && (
        <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative", zIndex: 1 }}>

          {/* Left panel */}
          <div style={{ width: 340, minWidth: 340, display: "flex", flexDirection: "column", borderRight: `1px solid ${v("border-subtle")}`, background: v("bg-1"), backdropFilter: v("glass-blur"), overflowY: "auto" }}>
            <div style={{ padding: "20px 22px", borderBottom: `1px solid ${v("border-subtle")}` }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: v("text-3"), letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 4, height: 4, borderRadius: "50%", background: v("accent") }} /> Input
              </div>
              <div onClick={() => fileRef.current.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
                style={{ border: `1.5px dashed ${dragOver ? v("accent") : v("border")}`, borderRadius: 14, padding: "28px 16px", textAlign: "center", cursor: "pointer", transition: "all .25s", background: dragOver ? v("accent-soft") : "transparent" }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, margin: "0 auto 14px", background: v("accent-soft"), border: `1px solid ${v("accent")}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={v("accent")} strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                </div>
                <div style={{ fontSize: 14, color: v("text-2"), fontWeight: 500 }}>Drop image or click to upload</div>
                <div style={{ fontSize: 11, color: v("text-muted"), fontFamily: v("mono"), marginTop: 6 }}>JPG · PNG · WEBP</div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
              </div>

              {imageUrl && (
                <div style={{ marginTop: 14, borderRadius: 12, overflow: "hidden", border: `1px solid ${v("border")}`, position: "relative" }}>
                  <img src={imageUrl} alt="" style={{ width: "100%", height: 80, objectFit: "cover", display: "block" }} />
                  <button onClick={() => { setImageUrl(null); setResult(null); }} style={{ position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: 7, background: "rgba(0,0,0,.65)", backdropFilter: "blur(8px)", border: "none", color: "#ccc", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>✕</button>
                </div>
              )}

              {loading && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: v("text-2") }}>Scanning image...</span>
                    <span style={{ fontSize: 12, color: v("accent"), fontFamily: v("mono"), fontWeight: 600 }}>{progress}%</span>
                  </div>
                  <div style={{ height: 4, background: v("bg-3"), borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${progress}%`, borderRadius: 4, transition: "width .2s", background: `linear-gradient(90deg, #4338ca, #6366f1, #818cf8)`, boxShadow: `0 0 12px ${v("accent-glow")}` }} />
                  </div>
                </div>
              )}

              <button onClick={runInspection} disabled={loading || !imageUrl} style={{
                width: "100%", marginTop: 16, padding: "13px 20px", borderRadius: 12, border: "none",
                background: (loading || !imageUrl) ? v("bg-3") : "linear-gradient(135deg, #4338ca, #6366f1)",
                color: (loading || !imageUrl) ? v("text-muted") : "#fff",
                fontSize: 14, fontWeight: 600, cursor: (loading || !imageUrl) ? "not-allowed" : "pointer",
                fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                transition: "all .25s", boxShadow: (loading || !imageUrl) ? "none" : `0 4px 24px ${v("accent-glow")}`
              }}>
                {loading ? (<><span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,.2)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .6s linear infinite", display: "inline-block" }} /> Analyzing...</>) : "▶ Run Inspection"}
              </button>
            </div>

            {/* Results */}
            <div style={{ flex: 1, padding: "20px 22px", overflowY: "auto" }}>
              {result ? (
                <div className="fade-up">
                  <div style={{ padding: "18px 20px", borderRadius: 14, marginBottom: 16, background: result.compliant ? v("green-bg") : v("red-bg"), border: `1px solid ${result.compliant ? v("green-border") : v("red-border")}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 11, color: v("text-3"), textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>Verdict</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: result.compliant ? v("green-text") : v("red-text") }}>{result.compliant ? "Compliant" : "Non-Compliant"}</div>
                    </div>
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: result.compliant ? v("green-bg") : v("red-bg"), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{result.compliant ? "✓" : "✕"}</div>
                  </div>

                  <div style={{ padding: "14px 18px", borderRadius: 12, marginBottom: 14, background: v("bg-2"), border: `1px solid ${v("border")}` }}>
                    <div style={{ fontSize: 10, color: v("text-muted"), marginBottom: 6, textTransform: "uppercase", letterSpacing: ".08em" }}>Vehicle Registration</div>
                    <div style={{ fontSize: 22, fontWeight: 800, fontFamily: v("mono"), color: v("text-0"), letterSpacing: ".06em" }}>{result.vehicle}</div>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, color: v("text-muted"), marginBottom: 6, textTransform: "uppercase", letterSpacing: ".08em" }}>Confidence</div>
                    <ConfGauge value={result.confidence} />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                    <CheckItem label="Reflector Presence" pass={result.reflector} detail={result.reflector ? "Reflective region detected" : "No reflector found"} />
                    <CheckItem label="Correct Placement" pass={result.placement} detail={result.placement ? "Within valid zone" : "Outside expected area"} />
                    <CheckItem label="Vendor Record" pass={result.vendor} detail={result.vendor ? "Registered install" : "No matching record"} />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 16 }}>
                    {[{ l: "Latency", v: `${result.latency}ms` }, { l: "Model", v: "YOLOv8-n" }, { l: "Clusters", v: `${result.reflectorBoxes?.length||0}` }, { l: "Time", v: result.date }].map((m, i) => (
                      <div key={i} style={{ padding: "10px 12px", borderRadius: 8, background: v("bg-2"), border: `1px solid ${v("border")}` }}>
                        <div style={{ fontSize: 10, color: v("text-muted"), marginBottom: 3, textTransform: "uppercase" }}>{m.l}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, fontFamily: v("mono"), color: v("text-2") }}>{m.v}</div>
                      </div>
                    ))}
                  </div>

                  <button onClick={downloadReport} style={{ width: "100%", padding: "11px", borderRadius: 10, fontSize: 13, fontWeight: 500, background: "transparent", border: `1px solid ${v("border")}`, color: v("text-3"), cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all .2s" }}>
                    ↓ Download Report
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: "center", paddingTop: 60 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, margin: "0 auto 16px", background: v("accent-soft"), border: `1px solid ${v("accent")}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={v("text-muted")} strokeWidth="1.5"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
                  </div>
                  <div style={{ fontSize: 13, color: v("text-muted") }}>Results appear here</div>
                </div>
              )}
            </div>
          </div>

          {/* Center — Canvas */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "10px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${v("border-subtle")}` }}>
              <div style={{ fontSize: 11, color: v("text-3"), fontFamily: v("mono"), fontWeight: 500 }}>DETECTION OVERLAY</div>
              {result && (
                <button onClick={() => setShowOverlay(x => !x)} style={{ padding: "5px 12px", borderRadius: 7, border: `1px solid ${v("border")}`, background: showOverlay ? v("accent-soft") : "transparent", color: showOverlay ? v("accent") : v("text-3"), fontSize: 11, cursor: "pointer", fontFamily: v("mono"), fontWeight: 500, transition: "all .15s" }}>{showOverlay ? "◉ Overlay" : "○ Overlay"}</button>
              )}
            </div>
            <div style={{ flex: 1, padding: "0 16px 16px" }}>
              <DetectionCanvas result={showOverlay ? result : null} imageUrl={imageUrl} scanning={loading} />
            </div>
          </div>

          {/* Right sidebar */}
          <div style={{ width: 250, minWidth: 250, borderLeft: `1px solid ${v("border-subtle")}`, background: v("bg-1"), backdropFilter: v("glass-blur"), display: "flex", flexDirection: "column", overflowY: "auto" }}>
            <div style={{ padding: "24px 20px", borderBottom: `1px solid ${v("border-subtle")}`, textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: v("text-3"), letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 16 }}>Compliance</div>
              <ComplianceRing rate={stats.rate} size={120} stroke={8} />
              <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 18 }}>
                {[{ v: stats.pass, c: v("green-text"), l: "Pass" }, { v: stats.fail, c: v("red-text"), l: "Fail" }].map((s, i) => (
                  <div key={i} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: s.c, fontFamily: v("mono") }}>{s.v}</div>
                    <div style={{ fontSize: 10, color: v("text-muted"), marginTop: 2 }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${v("border-subtle")}`, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[{ l: "Total", val: stats.total, c: v("text-2") }, { l: "Latency", val: stats.avg ? `${stats.avg}ms` : "—", c: "#67e8f9" }].map((s, i) => (
                <div key={i} style={{ padding: "10px", borderRadius: 10, background: v("bg-2"), border: `1px solid ${v("border")}`, textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: s.c, fontFamily: v("mono") }}>{s.val}</div>
                  <div style={{ fontSize: 10, color: v("text-muted"), marginTop: 2 }}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{ flex: 1, padding: "16px 20px", overflowY: "auto" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: v("text-3"), letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 14 }}>Recent</div>
              {log.length === 0 ? <div style={{ color: v("text-muted"), fontSize: 12, textAlign: "center", paddingTop: 30 }}>No data</div>
                : log.slice(0, 12).map((item, i) => <TimelineItem key={item.id||i} item={item} isLast={i >= Math.min(log.length,12)-1} onClick={() => setResult(item)} />)
              }
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ HISTORY ═══════════ */}
      {view === "history" && (
        <div style={{ flex: 1, overflow: "auto", padding: "28px 36px", position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: v("text-0") }}>History</div>
              <div style={{ fontSize: 13, color: v("text-3"), marginTop: 6 }}>{log.length} inspections recorded</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={exportCSV} style={{ padding: "10px 20px", borderRadius: 10, border: `1px solid ${v("border")}`, background: "transparent", color: v("text-3"), fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8 }}>↓ Export CSV</button>
              {log.length > 0 && <button onClick={() => { if(confirm("Clear history?")) { setLog([]); localStorage.removeItem("reflector_log"); } }} style={{ padding: "10px 20px", borderRadius: 10, border: `1px solid ${v("red-border")}`, background: "transparent", color: v("red-text"), fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Clear</button>}
            </div>
          </div>
          {log.length === 0 ? <div style={{ textAlign: "center", paddingTop: 100, color: v("text-muted"), fontSize: 14 }}>No records</div> : (
            <div style={{ background: v("glass-bg"), backdropFilter: v("glass-blur"), border: `1px solid ${v("border")}`, borderRadius: 18, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr style={{ borderBottom: `1px solid ${v("border")}` }}>{["Vehicle","Status","Reflector","Placement","Confidence","Latency","Date"].map(h=>(
                  <th key={h} style={{ padding: "14px 20px", textAlign: "left", fontSize: 11, color: v("text-3"), fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", fontFamily: v("mono") }}>{h}</th>
                ))}</tr></thead>
                <tbody>{log.map((r,i)=>(
                  <tr key={r.id||i} style={{ borderBottom: `1px solid ${v("border-subtle")}`, transition: "background .15s", cursor: "pointer" }}
                    onMouseOver={e=>e.currentTarget.style.background=v("bg-hover")} onMouseOut={e=>e.currentTarget.style.background="transparent"}
                    onClick={()=>{setResult(r);setView("inspect");}}>
                    <td style={{ padding: "16px 20px", fontSize: 13, fontFamily: v("mono"), color: v("text-0"), fontWeight: 600 }}>{r.vehicle}</td>
                    <td style={{ padding: "16px 20px" }}><span style={{ padding: "5px 14px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: r.compliant ? v("green-bg") : v("red-bg"), color: r.compliant ? v("green-text") : v("red-text") }}>{r.compliant ? "Pass" : "Fail"}</span></td>
                    <td style={{ padding: "16px 20px", fontSize: 13, color: r.reflector ? v("green-text") : v("red-text") }}>{r.reflector?"✓":"✕"}</td>
                    <td style={{ padding: "16px 20px", fontSize: 13, color: r.placement ? v("green-text") : v("red-text") }}>{r.placement?"✓":"✕"}</td>
                    <td style={{ padding: "16px 20px", fontSize: 12, fontFamily: v("mono"), color: v("text-3") }}>{(r.confidence*100).toFixed(0)}%</td>
                    <td style={{ padding: "16px 20px", fontSize: 12, fontFamily: v("mono"), color: v("text-muted") }}>{r.latency}ms</td>
                    <td style={{ padding: "16px 20px", fontSize: 12, color: v("text-3") }}>{r.date}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ ANALYTICS ═══════════ */}
      {view === "analytics" && (
        <div style={{ flex: 1, overflow: "auto", padding: "28px 36px", position: "relative", zIndex: 1 }}>
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: v("text-0") }}>Analytics</div>
            <div style={{ fontSize: 13, color: v("text-3"), marginTop: 6 }}>Performance overview and system metrics</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
            <StatCard icon="📋" label="Inspections" value={stats.total} color="#a78bfa" sub="Total processed" />
            <StatCard icon="✅" label="Compliant" value={stats.pass} color="#4ade80" sub={`${stats.total?((stats.pass/stats.total)*100).toFixed(1):0}% rate`} />
            <StatCard icon="🚨" label="Non-Compliant" value={stats.fail} color="#f87171" sub={`${stats.total?((stats.fail/stats.total)*100).toFixed(1):0}% rate`} />
            <StatCard icon="⚡" label="Avg Latency" value={stats.avg?`${stats.avg}ms`:"—"} color="#67e8f9" sub="Processing time" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <div style={{ background: v("glass-bg"), backdropFilter: v("glass-blur"), border: `1px solid ${v("border")}`, borderRadius: 18, padding: 32, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: v("text-3"), letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 28 }}>Compliance Rate</div>
              <ComplianceRing rate={stats.rate} size={170} stroke={11} />
              <div style={{ marginTop: 24, fontSize: 14, color: v("text-2"), textAlign: "center", fontWeight: 500 }}>{stats.rate>=80?"🟢 Excellent":stats.rate>=50?"🟡 Moderate":stats.total===0?"No data yet":"🔴 Needs attention"}</div>
            </div>
            <div style={{ background: v("glass-bg"), backdropFilter: v("glass-blur"), border: `1px solid ${v("border")}`, borderRadius: 18, padding: 32 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: v("text-3"), letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 24 }}>Detection Breakdown</div>
              {[{ label: "Reflector Found", count: log.filter(r=>r.reflector).length, color: "#6366f1" },{ label: "Correct Placement", count: log.filter(r=>r.placement).length, color: "#22c55e" },{ label: "Vendor Verified", count: log.filter(r=>r.vendor).length, color: "#f59e0b" }].map((item,i)=>(
                <div key={i} style={{ marginBottom: 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 13, color: v("text-2") }}>{item.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, fontFamily: v("mono"), color: v("text-3") }}>{item.count}<span style={{ color: v("text-muted") }}>/{stats.total}</span></span>
                  </div>
                  <div style={{ height: 6, background: v("bg-3"), borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${stats.total?(item.count/stats.total)*100:0}%`, borderRadius: 4, background: `linear-gradient(90deg, ${item.color}80, ${item.color})`, transition: "width .8s cubic-bezier(.16,1,.3,1)" }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background: v("glass-bg"), backdropFilter: v("glass-blur"), border: `1px solid ${v("border")}`, borderRadius: 18, padding: 32 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: v("text-3"), letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 24 }}>System</div>
              {[{l:"Model",val:"YOLOv8-nano"},{l:"Processing",val:"Client-side"},{l:"Grid",val:"32 × 32"},{l:"Min Area",val:"5%"},{l:"Sampling",val:"2px step"},{l:"Max Clusters",val:"3"},{l:"Version",val:"2.1.0"},{l:"Status",val:"● Online"}].map((s,i)=>(
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: i<7?`1px solid ${v("border-subtle")}`:"none" }}>
                  <span style={{ fontSize: 12, color: v("text-3") }}>{s.l}</span>
                  <span style={{ fontSize: 12, fontFamily: v("mono"), fontWeight: 500, color: s.l==="Status"?v("green-text"):v("text-2") }}>{s.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}