import { useEffect, useState } from "react";

console.log("API base URL:", import.meta.env.VITE_API_URL);
const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const usd = (n) =>
  typeof n === "number"
    ? n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 })
    : "-";

export default function AIScanModal({ open, onClose, userEmail }) {
  const [laborRate, setLaborRate] = useState(110);
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [msg, setMsg] = useState("");

  useEffect(() => { if (open) { setMsg(""); setResult(null); loadHistory(); } }, [open]);

  const loadHistory = async () => {
    try {
      if (!userEmail) return;
      const r = await fetch(`${API}/api/estimates?email=${encodeURIComponent(userEmail)}`);
      const j = await r.json();
      setHistory(Array.isArray(j.items) ? j.items : []);
    } catch {
      setMsg("Failed to load history.");
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    if (!file || !userEmail) { setMsg("Email and image are required."); return; }
    try {
      setSubmitting(true);
      setResult(null);
      const fd = new FormData();
      fd.append("email", userEmail);
      fd.append("laborRate", String(laborRate));
      fd.append("file", file);
      const r = await fetch(`${API}/api/estimate`, { method: "POST", body: fd });
      const j = await r.json();
      setResult(j);
      await loadHistory();
    } catch {
      setMsg("Upload failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.42)", display: "grid", placeItems: "center", zIndex: 1000 }}>
      <div style={{ width: "min(980px,96vw)", maxHeight: "92vh", overflow: "auto", background: "#fff", borderRadius: 16, boxShadow: "0 10px 40px rgba(0,0,0,.25)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #eee" }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>AI Scan</div>
          <button onClick={onClose} style={{ border: "1px solid #e5e7eb", background: "#fff", padding: "8px 12px", borderRadius: 8, cursor: "pointer" }}>Close</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 20, padding: 20 }}>
          <div style={{ border: "1px solid #eee", padding: 16, borderRadius: 12, display: "grid", gap: 14 }}>
            <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
              <div style={{ fontSize: 14, color: "#374151" }}>{userEmail || "No email"}</div>
              <input type="number" min="30" step="1" value={laborRate} onChange={(e) => setLaborRate(Number(e.target.value))} placeholder="Labor rate (USD/hr)" style={{ padding: 10, borderRadius: 8, border: "1px solid #e5e7eb" }} />
              <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ padding: 10, borderRadius: 8, border: "1px solid #e5e7eb" }} />
              <button disabled={submitting || !userEmail} style={{ background: "#2563eb", color: "#fff", border: 0, padding: "10px 14px", borderRadius: 8, cursor: "pointer" }}>
                {submitting ? "Estimating..." : "Upload & Estimate"}
              </button>
              {msg && <div style={{ color: "#ef4444", fontSize: 13 }}>{msg}</div>}
            </form>

            <div style={{ borderTop: "1px solid #eee", paddingTop: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Results</div>
              {!result && <div style={{ color: "#6b7280" }}>Upload a photo to see the AI estimate here.</div>}
              {result && (result.detected === false ? (
                <div style={{ color: "#b91c1c" }}>{result.message || "Detection not confident. Try another photo."}</div>
              ) : (
                <div style={{ display: "grid", gap: 10, border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, background: "#fff", color: "#111827" }}>
                  {(result.thumbUrl || result.imageUrl) && (
                    <img src={result.thumbUrl || result.imageUrl} alt="" style={{ maxWidth: "100%", borderRadius: 8, border: "1px solid #e5e7eb" }} />
                  )}
                  <div><b>Part/Operation:</b> {result.selection?.part || "—"} • {result.selection?.operation || "—"}</div>
                  <div><b>Confidence:</b> {typeof result.confidence === "number" ? `${Math.round(result.confidence * 100)}%` : "—"}</div>
                  <div style={{ fontSize: 12, letterSpacing: ".06em", textTransform: "uppercase", opacity: 0.7 }}>Labels</div>
                  <div>
                    {(result.visionLabels || []).map((l, i) => (
                      <span key={i} style={{ display: "inline-block", padding: "4px 10px", border: "1px solid #e5e7eb", borderRadius: 999, margin: "4px 6px 0 0", fontSize: 12 }}>
                        {l.description} {l.score ? `· ${Math.round(l.score * 100)}%` : ""}
                      </span>
                    ))}
                    {(result.visionLabels || []).length === 0 && <span style={{ color: "#6b7280" }}>—</span>}
                  </div>
                  <div style={{ fontSize: 12, letterSpacing: ".06em", textTransform: "uppercase", opacity: 0.7 }}>Objects</div>
                  <div>
                    {(result.visionObjects || []).map((o, i) => (
                      <span key={i} style={{ display: "inline-block", padding: "4px 10px", border: "1px solid #e5e7eb", borderRadius: 999, margin: "4px 6px 0 0", fontSize: 12 }}>
                        {o.name} {o.score ? `· ${Math.round(o.score * 100)}%` : ""}
                      </span>
                    ))}
                    {(result.visionObjects || []).length === 0 && <span style={{ color: "#6b7280" }}>—</span>}
                  </div>
                  <div style={{ fontSize: 12, letterSpacing: ".06em", textTransform: "uppercase", opacity: 0.7 }}>Estimate</div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                    <tbody>
                      <tr><td style={{ padding: "6px 4px" }}>Labor Hours</td><td style={{ padding: "6px 4px" }}>{result.breakdown?.laborHours ?? "—"}</td></tr>
                      <tr><td style={{ padding: "6px 4px" }}>Labor Rate</td><td style={{ padding: "6px 4px" }}>{usd(result.breakdown?.laborRate)}</td></tr>
                      <tr><td style={{ padding: "6px 4px" }}>Parts</td><td style={{ padding: "6px 4px" }}>{usd(result.breakdown?.parts)}</td></tr>
                      <tr><td style={{ padding: "6px 4px" }}>Paint/Materials</td><td style={{ padding: "6px 4px" }}>{usd(result.breakdown?.paintMaterials)}</td></tr>
                      <tr><td style={{ padding: "6px 4px" }}>Misc</td><td style={{ padding: "6px 4px" }}>{usd(result.breakdown?.misc)}</td></tr>
                      <tr><td style={{ padding: "6px 4px", fontWeight: 700 }}>Total</td><td style={{ padding: "6px 4px", fontWeight: 900 }}>{usd(result.totalEstimated)}</td></tr>
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>

          <div style={{ border: "1px solid #eee", padding: 16, borderRadius: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontWeight: 700 }}>History</div>
              <button onClick={loadHistory} style={{ border: "1px solid #e5e7eb", background: "#fff", padding: "6px 10px", borderRadius: 8, cursor: "pointer" }}>Refresh</button>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {history.map((it) => (
                <div key={it._id} style={{ display: "grid", gridTemplateColumns: "120px 1fr auto", alignItems: "center", border: "1px solid #f3f4f6", padding: 10, borderRadius: 10, background: "#fff", color: "#111827" }}>
                  <img src={it.thumbUrl || it.imageUrl} alt="" style={{ width: 110, height: 82, objectFit: "cover", borderRadius: 8 }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{it.selection?.part} • {it.selection?.operation}</div>
                    <div>{usd(it.totalEstimated)}</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>{new Date(it.createdAt).toLocaleString()}</div>
                  </div>
                  <a href={it.imageUrl} target="_blank" rel="noreferrer" style={{ textDecoration: "none", color: "#2563eb" }}>Open</a>
                </div>
              ))}
              {history.length === 0 && <div style={{ color: "#6b7280" }}>No saved estimates yet.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
