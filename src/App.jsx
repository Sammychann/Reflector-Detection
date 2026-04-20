import { useState, useRef, useCallback } from "react";

const DUMMY_RESULTS = [
  {
    id: 1,
    vehicle: "MH12AB1234",
    reflector: false,
    placement: false,
    vendor: false,
    compliant: false,
    date: "Today, 14:22",
  },
  {
    id: 2,
    vehicle: "DL01CD5678",
    reflector: true,
    placement: true,
    vendor: true,
    compliant: true,
    date: "Today, 13:45",
  },
  {
    id: 3,
    vehicle: "KA05EF9012",
    reflector: true,
    placement: false,
    vendor: true,
    compliant: false,
    date: "Today, 12:10",
  },
  {
    id: 4,
    vehicle: "GJ18GH3456",
    reflector: true,
    placement: true,
    vendor: true,
    compliant: true,
    date: "Yesterday",
  },
  {
    id: 5,
    vehicle: "TN22JK7890",
    reflector: true,
    placement: true,
    vendor: false,
    compliant: false,
    date: "Yesterday",
  },
];

const APPROVED_VENDORS = [
  { name: "ReflexTech India Pvt Ltd", id: "VND-001", status: "Active" },
  { name: "SafeGlow Solutions", id: "VND-002", status: "Active" },
  { name: "VisionMark Automotive", id: "VND-003", status: "Active" },
  { name: "NightSafe Industries", id: "VND-004", status: "Suspended" },
  { name: "BrightPath Reflectors", id: "VND-005", status: "Active" },
];

const INSTALL_RECORDS = [
  { vehicle: "DL01CD5678", vendor: "ReflexTech India", date: "12 Jan 2025", cert: "RT-2025-0041", valid: "12 Jan 2026" },
  { vehicle: "GJ18GH3456", vendor: "SafeGlow Solutions", date: "03 Mar 2025", cert: "SG-2025-0189", valid: "03 Mar 2026" },
  { vehicle: "KA05EF9012", vendor: "VisionMark Auto", date: "18 Feb 2025", cert: "VM-2025-0092", valid: "18 Feb 2026" },
  { vehicle: "MH12AB1234", vendor: "—", date: "—", cert: "—", valid: "No record" },
];

function StatusBadge({ compliant }) {
  return compliant ? (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: "linear-gradient(135deg, #052e16, #14532d)",
      color: "#86efac", padding: "6px 16px", borderRadius: 999,
      fontSize: 13, fontWeight: 700, letterSpacing: "0.08em",
      border: "1px solid #16a34a", textTransform: "uppercase"
    }}>
      <span style={{ fontSize: 15 }}>✓</span> Compliant
    </span>
  ) : (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: "linear-gradient(135deg, #450a0a, #7f1d1d)",
      color: "#fca5a5", padding: "6px 16px", borderRadius: 999,
      fontSize: 13, fontWeight: 700, letterSpacing: "0.08em",
      border: "1px solid #dc2626", textTransform: "uppercase"
    }}>
      <span style={{ fontSize: 15 }}>⚠</span> Non-Compliant
    </span>
  );
}

function CheckRow({ label, value, icon }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "12px 0", borderBottom: "1px solid rgba(148,163,184,0.08)"
    }}>
      <span style={{ color: "#94a3b8", fontSize: 13, fontFamily: "'DM Mono', monospace" }}>{label}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: value ? "#4ade80" : "#f87171" }}>
        {icon && <span style={{ fontSize: 15 }}>{value ? "✅" : "❌"}</span>}
        {label === "Vehicle Number" ? (
          <span style={{ color: "#e2e8f0", fontFamily: "'DM Mono', monospace", fontSize: 14 }}>{value}</span>
        ) : (
          <span>{value ? "Detected" : "Not Detected"}</span>
        )}
      </span>
    </div>
  );
}

function BoundingBoxOverlay({ result, imageUrl }) {
  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", background: "#0a0f1a", borderRadius: 12, overflow: "hidden" }}>
      {imageUrl ? (
        <img src={imageUrl} alt="Vehicle" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }} />
      ) : (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 40, opacity: 0.3 }}>🚚</div>
          <span style={{ color: "#475569", fontSize: 13, fontFamily: "'DM Mono', monospace" }}>No image loaded</span>
        </div>
      )}

      {result && (
        <>
          {/* Vehicle box — blue */}
          <div style={{
            position: "absolute", top: "10%", left: "8%", width: "84%", height: "78%",
            border: "2.5px solid #3b82f6", borderRadius: 4,
            boxShadow: "0 0 16px rgba(59,130,246,0.4)",
            pointerEvents: "none"
          }}>
            <span style={{
              position: "absolute", top: -22, left: 0, background: "#1d4ed8",
              color: "#bfdbfe", fontSize: 11, fontFamily: "'DM Mono', monospace",
              padding: "2px 8px", borderRadius: "4px 4px 0 0", fontWeight: 600
            }}>VEHICLE  97.3%</span>
          </div>

          {/* Valid placement zone — green transparent */}
          <div style={{
            position: "absolute", top: "14%", right: "10%", width: "28%", height: "40%",
            background: "rgba(34,197,94,0.1)", border: "1.5px dashed #22c55e", borderRadius: 4,
            pointerEvents: "none"
          }}>
            <span style={{
              position: "absolute", bottom: -20, left: 0, background: "#14532d",
              color: "#86efac", fontSize: 10, fontFamily: "'DM Mono', monospace",
              padding: "2px 6px", borderRadius: "0 0 4px 4px", fontWeight: 600, whiteSpace: "nowrap"
            }}>VALID ZONE</span>
          </div>

          {/* Reflector box */}
          {result.reflector && (
            <div style={{
              position: "absolute",
              top: result.placement ? "55%" : "65%",
right: result.placement ? "20%" : "30%",
              width: "18%", height: "22%",
              border: `2px solid ${result.placement ? "#22c55e" : "#ef4444"}`,
              borderRadius: 4,
              boxShadow: `0 0 14px ${result.placement ? "rgba(34,197,94,0.5)" : "rgba(239,68,68,0.5)"}`,
              background: result.placement ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
              pointerEvents: "none"
            }}>
              <span style={{
                position: "absolute", top: -20, left: 0,
                background: result.placement ? "#14532d" : "#7f1d1d",
                color: result.placement ? "#86efac" : "#fca5a5",
                fontSize: 10, fontFamily: "'DM Mono', monospace",
                padding: "2px 6px", borderRadius: "4px 4px 0 0", fontWeight: 600, whiteSpace: "nowrap"
              }}>{result.placement ? "REFLECTOR ✓" : "REFLECTOR ✗"}</span>
            </div>
          )}

          {/* Confidence overlay */}
          <div style={{
            position: "absolute", bottom: 10, left: 10,
            background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)",
            borderRadius: 8, padding: "6px 12px", display: "flex", gap: 16
          }}>
            <span style={{ color: "#94a3b8", fontSize: 11, fontFamily: "'DM Mono', monospace" }}>Model: YOLOv8-nano</span>
            <span style={{ color: "#94a3b8", fontSize: 11, fontFamily: "'DM Mono', monospace" }}>Conf: 0.87</span>
            <span style={{ color: "#94a3b8", fontSize: 11, fontFamily: "'DM Mono', monospace" }}>Latency: 43ms</span>
          </div>
        </>
      )}
    </div>
  );
}

function ProgressBar({ progress }) {
  return (
    <div style={{ width: "100%", height: 4, background: "rgba(148,163,184,0.1)", borderRadius: 4, overflow: "hidden" }}>
      <div style={{
        height: "100%", width: `${progress}%`,
        background: "linear-gradient(90deg, #3b82f6, #8b5cf6, #06b6d4)",
        borderRadius: 4, transition: "width 0.3s ease",
        boxShadow: "0 0 8px rgba(139,92,246,0.6)"
      }} />
    </div>
  );
}

export default function App() {
  const [imageUrl, setImageUrl] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState(DUMMY_RESULTS);
  const [adminOpen, setAdminOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  const handleFile = useCallback((file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setResult(null);
    setProgress(0);
  }, []);

  const runInspection = useCallback(async () => {
    setLoading(true);
    setResult(null);
    setProgress(0);

    // Simulate progress
    const steps = [10, 25, 45, 60, 75, 88, 96, 100];
    for (const step of steps) {
      await new Promise(r => setTimeout(r, 280));
      setProgress(step);
    }

    await new Promise(r => setTimeout(r, 300));

    const pick = DUMMY_RESULTS[Math.floor(Math.random() * DUMMY_RESULTS.length)];
    const newResult = { ...pick, id: Date.now(), date: "Just now" };
    setResult(newResult);
    setLog(prev => [newResult, ...prev]);
    setLoading(false);
  }, []);

  const downloadReport = useCallback(() => {
    if (!result) return;
    const text = `REFLECTOR COMPLIANCE INSPECTION REPORT
=====================================
Vehicle Number : ${result.vehicle}
Date           : ${result.date}
Reflector      : ${result.reflector ? "Detected" : "Not Detected"}
Placement      : ${result.placement ? "Correct" : "Incorrect"}
Vendor Record  : ${result.vendor ? "Found" : "Not Found"}
Status         : ${result.compliant ? "COMPLIANT" : "NON-COMPLIANT"}
Model          : YOLOv8-nano | Latency: 43ms | Confidence: 0.87
=====================================
Generated by Reflector Compliance Detection System v2.1`;
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `inspection_${result.vehicle}_${Date.now()}.txt`;
    a.click();
  }, [result]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #020617 0%, #0a0f1e 40%, #0c0a1e 100%)",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      color: "#e2e8f0",
      padding: "0 0 60px"
    }}>
      {/* Import fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0a0f1a; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
        @keyframes pulse-glow { 0%,100% { box-shadow: 0 0 20px rgba(99,102,241,0.3); } 50% { box-shadow: 0 0 40px rgba(99,102,241,0.6); } }
        @keyframes fadein { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .fade-in { animation: fadein 0.5s ease forwards; }
        .row-hover:hover { background: rgba(148,163,184,0.05) !important; cursor: pointer; }
        .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(99,102,241,0.4); }
        .btn-secondary:hover { background: rgba(148,163,184,0.1); }
      `}</style>

      {/* Header */}
      <div style={{
        background: "rgba(2,6,23,0.8)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(148,163,184,0.08)",
        padding: "0 40px", position: "sticky", top: 0, zIndex: 50
      }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18
            }}>🔍</div>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 800, color: "#f1f5f9", lineHeight: 1 }}>
                Reflector Compliance Detection System
              </div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 3, fontFamily: "'DM Mono', monospace" }}>
                AI-powered inspection for commercial vehicle safety
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)", padding: "3px 10px", borderRadius: 999, fontSize: 11, fontFamily: "'DM Mono', monospace" }}>
              ● LIVE
            </span>
            <span style={{ background: "rgba(99,102,241,0.15)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.3)", padding: "3px 10px", borderRadius: 999, fontSize: 11, fontFamily: "'DM Mono', monospace" }}>
              v2.1.0
            </span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "32px 40px" }}>

        {/* Stats Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
          {[
            { label: "Total Inspections", value: log.length + 143, color: "#a5b4fc", icon: "📋" },
            { label: "Compliant", value: log.filter(r => r.compliant).length + 112, color: "#4ade80", icon: "✅" },
            { label: "Non-Compliant", value: log.filter(r => !r.compliant).length + 31, color: "#f87171", icon: "🚨" },
            { label: "Avg. Latency", value: "43ms", color: "#67e8f9", icon: "⚡" },
          ].map((s, i) => (
            <div key={i} style={{
              background: "rgba(15,23,42,0.8)", border: "1px solid rgba(148,163,184,0.08)",
              borderRadius: 16, padding: "20px 24px",
              backdropFilter: "blur(10px)"
            }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: s.color, fontFamily: "'Syne', sans-serif" }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Upload + Results */}
        <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 20, marginBottom: 24 }}>

          {/* Upload Card */}
          <div style={{
            background: "rgba(15,23,42,0.9)", border: "1px solid rgba(148,163,184,0.1)",
            borderRadius: 20, padding: 24, backdropFilter: "blur(12px)"
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16, fontFamily: "'DM Mono', monospace" }}>
              Upload Vehicle
            </div>

            {/* Drop Zone */}
            <div
              onClick={() => fileRef.current.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
              style={{
                border: `2px dashed ${dragOver ? "#6366f1" : "rgba(148,163,184,0.2)"}`,
                borderRadius: 14, padding: "28px 16px", textAlign: "center",
                cursor: "pointer", transition: "all 0.2s",
                background: dragOver ? "rgba(99,102,241,0.05)" : "rgba(2,6,23,0.4)",
                marginBottom: 14
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 10 }}>📁</div>
              <div style={{ fontSize: 13, color: "#94a3b8" }}>Drop image or video here</div>
              <div style={{ fontSize: 11, color: "#475569", marginTop: 6, fontFamily: "'DM Mono', monospace" }}>JPG · PNG · MP4 · max 50MB</div>
              <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display: "none" }}
                onChange={e => handleFile(e.target.files[0])} />
            </div>

            {/* Camera Button */}
            <button
              className="btn-secondary"
              onClick={() => fileRef.current.click()}
              style={{
                width: "100%", padding: "10px", background: "rgba(148,163,184,0.06)",
                border: "1px solid rgba(148,163,184,0.15)", borderRadius: 10,
                color: "#94a3b8", fontSize: 13, cursor: "pointer", marginBottom: 14,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "all 0.2s"
              }}
            >
              📷 Open Camera
            </button>

            {/* Image Preview */}
            {imageUrl && (
              <div style={{ marginBottom: 14, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(148,163,184,0.1)" }}>
                <img src={imageUrl} alt="Preview" style={{ width: "100%", height: 120, objectFit: "cover" }} />
              </div>
            )}

            {/* Progress */}
            {loading && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: "#64748b", fontFamily: "'DM Mono', monospace" }}>Running AI inspection…</span>
                  <span style={{ fontSize: 11, color: "#6366f1", fontFamily: "'DM Mono', monospace" }}>{progress}%</span>
                </div>
                <ProgressBar progress={progress} />
              </div>
            )}

            {/* Run Button */}
            <button
              className="btn-primary"
              onClick={runInspection}
              disabled={loading}
              style={{
                width: "100%", padding: "13px",
                background: loading ? "rgba(99,102,241,0.4)" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                border: "none", borderRadius: 12, color: "#fff",
                fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                transition: "all 0.2s", letterSpacing: "0.02em"
              }}
            >
              {loading ? (
                <>
                  <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} />
                  Analyzing…
                </>
              ) : "🔍 Run Inspection"}
            </button>

            {/* Download */}
            {result && (
              <button
                className="btn-secondary"
                onClick={downloadReport}
                style={{
                  width: "100%", padding: "10px", marginTop: 10,
                  background: "rgba(148,163,184,0.06)",
                  border: "1px solid rgba(148,163,184,0.15)", borderRadius: 10,
                  color: "#94a3b8", fontSize: 13, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  transition: "all 0.2s"
                }}
              >
                ⬇ Download Report
              </button>
            )}
          </div>

          {/* Detection + Results Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Detection Canvas */}
            <div style={{
              background: "rgba(15,23,42,0.9)", border: "1px solid rgba(148,163,184,0.1)",
              borderRadius: 20, padding: 20, backdropFilter: "blur(12px)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'DM Mono', monospace" }}>
                  Detection Overlay
                </div>
                <div style={{ display: "flex", gap: 14, fontSize: 11, color: "#475569", fontFamily: "'DM Mono', monospace" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, background: "#3b82f6", borderRadius: 2, display: "inline-block" }} /> Vehicle</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, background: "#ef4444", borderRadius: 2, display: "inline-block" }} /> Reflector</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, background: "#22c55e", borderRadius: 2, display: "inline-block" }} /> Valid Zone</span>
                </div>
              </div>
              <BoundingBoxOverlay result={result} imageUrl={imageUrl} />
            </div>

            {/* Results Panel */}
            {result && (
              <div className="fade-in" style={{
                background: "rgba(15,23,42,0.9)", border: `1px solid ${result.compliant ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
                borderRadius: 20, padding: 24, backdropFilter: "blur(12px)"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'DM Mono', monospace" }}>
                    Inspection Results
                  </div>
                  <StatusBadge compliant={result.compliant} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 32px" }}>
                  <div>
                    {/* Vehicle Number */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid rgba(148,163,184,0.08)" }}>
                      <span style={{ color: "#64748b", fontSize: 13, fontFamily: "'DM Mono', monospace" }}>Vehicle Number</span>
                      <span style={{ color: "#e2e8f0", fontSize: 14, fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{result.vehicle}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid rgba(148,163,184,0.08)" }}>
                      <span style={{ color: "#64748b", fontSize: 13, fontFamily: "'DM Mono', monospace" }}>Reflector</span>
                      <span style={{ color: result.reflector ? "#4ade80" : "#f87171", fontSize: 13, fontWeight: 600 }}>{result.reflector ? "✅ Detected" : "❌ Not Detected"}</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid rgba(148,163,184,0.08)" }}>
                      <span style={{ color: "#64748b", fontSize: 13, fontFamily: "'DM Mono', monospace" }}>Placement</span>
                      <span style={{ color: result.placement ? "#4ade80" : "#f87171", fontSize: 13, fontWeight: 600 }}>{result.placement ? "✅ Correct" : "❌ Incorrect"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid rgba(148,163,184,0.08)" }}>
                      <span style={{ color: "#64748b", fontSize: 13, fontFamily: "'DM Mono', monospace" }}>Vendor Record</span>
                      <span style={{ color: result.vendor ? "#4ade80" : "#f87171", fontSize: 13, fontWeight: 600 }}>{result.vendor ? "✅ Found" : "❌ Not Found"}</span>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(148,163,184,0.08)", display: "flex", gap: 24, fontSize: 12, color: "#475569", fontFamily: "'DM Mono', monospace" }}>
                  <span>Model: YOLOv8-nano</span>
                  <span>Confidence: 0.87</span>
                  <span>Latency: 43ms</span>
                  <span>Timestamp: {result.date}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Inspection Log */}
        <div style={{
          background: "rgba(15,23,42,0.9)", border: "1px solid rgba(148,163,184,0.08)",
          borderRadius: 20, overflow: "hidden", backdropFilter: "blur(12px)", marginBottom: 20
        }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(148,163,184,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: "#f1f5f9" }}>Inspection Log</div>
              <div style={{ fontSize: 12, color: "#475569", marginTop: 2, fontFamily: "'DM Mono', monospace" }}>{log.length} records</div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-secondary" style={{ padding: "7px 16px", background: "rgba(148,163,184,0.06)", border: "1px solid rgba(148,163,184,0.15)", borderRadius: 8, color: "#94a3b8", fontSize: 12, cursor: "pointer", transition: "all 0.2s" }}>
                Export CSV
              </button>
            </div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(2,6,23,0.4)" }}>
                {["Vehicle Number", "Status", "Reflector", "Placement", "Date", "Action"].map(h => (
                  <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, color: "#475569", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'DM Mono', monospace" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {log.map((row, i) => (
                <tr
                  key={row.id || i}
                  className="row-hover"
                  style={{
                    borderTop: "1px solid rgba(148,163,184,0.06)",
                    background: selectedRow === i ? "rgba(99,102,241,0.05)" : "transparent",
                    transition: "background 0.15s"
                  }}
                  onClick={() => setSelectedRow(i === selectedRow ? null : i)}
                >
                  <td style={{ padding: "14px 20px", fontSize: 13, fontFamily: "'DM Mono', monospace", color: "#e2e8f0" }}>{row.vehicle}</td>
                  <td style={{ padding: "14px 20px" }}>
                    <span style={{
                      display: "inline-block", padding: "3px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                      background: row.compliant ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                      color: row.compliant ? "#4ade80" : "#f87171",
                      border: `1px solid ${row.compliant ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                      fontFamily: "'DM Mono', monospace", textTransform: "uppercase"
                    }}>
                      {row.compliant ? "Compliant" : "Non-Compliant"}
                    </span>
                  </td>
                  <td style={{ padding: "14px 20px", fontSize: 13 }}>{row.reflector ? "✅" : "❌"}</td>
                  <td style={{ padding: "14px 20px", fontSize: 13 }}>{row.placement ? "✅" : "❌"}</td>
                  <td style={{ padding: "14px 20px", fontSize: 12, color: "#64748b", fontFamily: "'DM Mono', monospace" }}>{row.date}</td>
                  <td style={{ padding: "14px 20px" }}>
                    <button
                      className="btn-secondary"
                      onClick={e => { e.stopPropagation(); setResult(row); }}
                      style={{
                        padding: "5px 14px", background: "rgba(99,102,241,0.1)",
                        border: "1px solid rgba(99,102,241,0.3)", borderRadius: 8,
                        color: "#a5b4fc", fontSize: 12, cursor: "pointer", transition: "all 0.2s",
                        fontFamily: "'DM Mono', monospace"
                      }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Admin Panel */}
        <div style={{
          background: "rgba(15,23,42,0.9)", border: "1px solid rgba(148,163,184,0.08)",
          borderRadius: 20, overflow: "hidden", backdropFilter: "blur(12px)"
        }}>
          <button
            onClick={() => setAdminOpen(o => !o)}
            style={{
              width: "100%", padding: "20px 24px",
              background: "transparent", border: "none", cursor: "pointer",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              borderBottom: adminOpen ? "1px solid rgba(148,163,184,0.08)" : "none"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 18 }}>🔐</span>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: "#f1f5f9" }}>Admin Panel</div>
                <div style={{ fontSize: 12, color: "#475569", fontFamily: "'DM Mono', monospace" }}>Vendors & Installation Records</div>
              </div>
            </div>
            <span style={{ color: "#64748b", fontSize: 18, transition: "transform 0.2s", transform: adminOpen ? "rotate(180deg)" : "none" }}>▾</span>
          </button>

          {adminOpen && (
            <div className="fade-in" style={{ padding: 24 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                {/* Vendors */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'DM Mono', monospace", marginBottom: 14 }}>
                    Approved Vendors
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {APPROVED_VENDORS.map(v => (
                      <div key={v.id} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "10px 14px", background: "rgba(2,6,23,0.5)",
                        border: "1px solid rgba(148,163,184,0.08)", borderRadius: 10
                      }}>
                        <div>
                          <div style={{ fontSize: 13, color: "#e2e8f0" }}>{v.name}</div>
                          <div style={{ fontSize: 11, color: "#475569", fontFamily: "'DM Mono', monospace" }}>{v.id}</div>
                        </div>
                        <span style={{
                          fontSize: 11, padding: "2px 10px", borderRadius: 999,
                          background: v.status === "Active" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                          color: v.status === "Active" ? "#4ade80" : "#f87171",
                          border: `1px solid ${v.status === "Active" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                          fontFamily: "'DM Mono', monospace"
                        }}>{v.status}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Installation Records */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'DM Mono', monospace", marginBottom: 14 }}>
                    Installation Records
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr>
                        {["Vehicle", "Vendor", "Install Date", "Valid Until"].map(h => (
                          <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: "#475569", fontFamily: "'DM Mono', monospace", fontSize: 11, borderBottom: "1px solid rgba(148,163,184,0.08)" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {INSTALL_RECORDS.map(r => (
                        <tr key={r.vehicle} style={{ borderBottom: "1px solid rgba(148,163,184,0.06)" }}>
                          <td style={{ padding: "10px 10px", fontFamily: "'DM Mono', monospace", color: "#e2e8f0" }}>{r.vehicle}</td>
                          <td style={{ padding: "10px 10px", color: "#94a3b8" }}>{r.vendor}</td>
                          <td style={{ padding: "10px 10px", color: "#64748b", fontFamily: "'DM Mono', monospace" }}>{r.date}</td>
                          <td style={{ padding: "10px 10px" }}>
                            {r.valid === "No record" ? (
                              <span style={{ color: "#f87171", fontFamily: "'DM Mono', monospace", fontSize: 11 }}>❌ No record</span>
                            ) : (
                              <span style={{ color: "#4ade80", fontFamily: "'DM Mono', monospace", fontSize: 11 }}>{r.valid}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}