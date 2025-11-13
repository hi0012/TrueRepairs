import { useEffect, useState } from "react";
import "../styles/AIScanModal.css";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const usd = (n) =>
  typeof n === "number" ? n.toLocaleString(undefined, {style: "currency", currency: "USD", maximumFractionDigits: 0,}): n;
export default function AIScanModal({ open, onClose, userEmail }) {
  const [laborRate, setLaborRate] = useState(110);
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (open) {
      setMsg("");
      setResult(null);
      loadHistory();
    }
  }, [open]);

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

    if (!file || !userEmail) {
      setMsg("Email and image are required.");
      return;
    }

    try {
      setSubmitting(true);
      setResult(null);

      const fd = new FormData();
      fd.append("email", userEmail);
      fd.append("laborRate", String(laborRate));
      fd.append("file", file);

      const r = await fetch(`${API}/api/estimate`, {
        method: "POST",
        body: fd,
      });

      const j = await r.json();
      setResult(j);
      await loadHistory();
    } catch {
      setMsg("Upload failed.");
    } finally {
      setSubmitting(false);
    }
  };

  // DELETE estimate
  async function handleDelete(id) {
    try {
      await fetch(`${API}/api/estimates/${id}`, { method: "DELETE" });
      setHistory((h) => h.filter((x) => x._id !== id));
    } catch (e) {
      console.error("Delete failed", e);
      setMsg("Failed to delete.");
    }
  }

  // PDF download
  async function handleDownload(est) {
    // 1. Force open dropdown
    setExpanded(est._id);

    // 2. Wait for element to mount
    let element = null;
    for (let i = 0; i < 40; i++) {
      element = document.getElementById(`aiscan-report-${est._id}`);
      if (element) break;
      await new Promise((res) => setTimeout(res, 50));
    }

    if (!element) {
      alert("Unable to locate details for download.");
      return;
    }

    try {
      // Load logos
      const logoImg = new Image();
      logoImg.src = "/logo.png";     // same as Reports.jsx
      const brandImg = new Image();
      brandImg.src = "/TrueRepairs.png";

      await Promise.all([logoImg.decode(), brandImg.decode()]);

      // Screenshot
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true
      });

      const snap = canvas.toDataURL("image/png");

      // PDF setup
      const pdf = new jsPDF("p", "pt", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 40;
      const dateStr = new Date().toLocaleString();

      // === HEADER (logos + timestamp + title) ===
      const logoY = 30;
      pdf.addImage(logoImg, "PNG", margin, logoY, 45, 45);
      pdf.addImage(brandImg, "PNG", margin + 45, logoY - 20, 100, 100);

      pdf.setFontSize(11);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`Date: ${dateStr}`, pdfWidth - 170, logoY + 20);

      pdf.setFontSize(18);
      pdf.text("AI Damage Estimate", margin, 100);

      pdf.setFontSize(13);
      pdf.text(
        `${est.selection?.[0]?.part || est.selection?.part || "Damage"} Estimate`,
        margin,
        118
      );

      // SNAPSHOT IMAGE
      const imgProps = pdf.getImageProperties(snap);
      const imgHeight =
        (imgProps.height * (pdfWidth - 2 * margin)) / imgProps.width;

      pdf.addImage(snap, "PNG", margin, 135, pdfWidth - 2 * margin, imgHeight);

      // Save
      pdf.save(`AI_Estimate_${est._id}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      setMsg("Failed to generate PDF.");
    }
  }

  if (!open) return null;
  return (
    <div className="aiscan-overlay">
      <div className="aiscan-popup">
        {/* Header */}
        <div className="aiscan-header">
          <h1>AI Scan</h1>
        </div>

        <div className="aiscan-columns">
          {/* LEFT SIDE */}
          <div className="aiscan-left">
            <form onSubmit={onSubmit} className="aiscan-form">
              <p className="aiscan-email">{userEmail || "No email"}</p>

              <input type="number" min="30" step="1" value={laborRate} onChange={(e) => setLaborRate(Number(e.target.value))} placeholder="Labor rate" className="aiscan-input"/>
              <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="aiscan-input"/>

              <button className="aiscan-btn" disabled={submitting}>
                {submitting ? "Estimating..." : "Upload & Estimate"}
              </button>

              {msg && <div className="aiscan-msg">{msg}</div>}
            </form>

            {/* RESULTS PANEL (unchanged) */}
            <div className="aiscan-results">
              <h2>Results</h2>
              {!result ? (
                <p className="aiscan-placeholder">
                  Upload an image to get an estimate.
                </p>) : (
                <div className="aiscan-resultbox">
                  {(result.thumbUrl || result.imageUrl) && (
                    <img src={result.thumbUrl || result.imageUrl} className="aiscan-image"/>
                  )}

                  {Array.isArray(result.selection) && ( <>
                      <h4>Detected Parts</h4>
                      <ul>
                        {result.selection.map((sel, i) => (
                          <li key={i}>
                            {sel.part} • {sel.defaultOp || sel.operation}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  {result.breakdown && (<>
                      <h4>Breakdown</h4>

                      {Array.isArray(result.breakdown) ? (
                        <table className="aiscan-table">
                          <thead>
                            <tr>
                              <th>Part</th>
                              <th>Op</th>
                              <th>Parts</th>
                              <th>Labor</th>
                              <th>Paint</th>
                              <th>Misc</th>
                              <th>Subtotal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.breakdown.map((b, i) => (
                              <tr key={i}>
                                <td>{b.part}</td>
                                <td>{b.operation}</td>
                                <td>{usd(b.parts)}</td>
                                <td>{b.hours}</td>
                                <td>{usd(b.paint)}</td>
                                <td>{usd(b.misc)}</td>
                                <td>{usd(b.subtotal)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>) : (
                        <table className="aiscan-table">
                          <tbody>
                            <tr>
                              <td>Labor Hours</td>
                              <td>{result.breakdown.laborHours ?? "—"}</td>
                            </tr>
                            <tr>
                              <td>Labor Rate</td>
                              <td>{usd(result.breakdown.laborRate)}</td>
                            </tr>
                            <tr>
                              <td>Parts</td>
                              <td>{usd(result.breakdown.parts)}</td>
                            </tr>
                            <tr>
                              <td>Paint/Materials</td>
                              <td>{usd(result.breakdown.paintMaterials)}</td>
                            </tr>
                            <tr>
                              <td>Misc</td>
                              <td>{usd(result.breakdown.misc)}</td>
                            </tr>
                          </tbody>
                        </table>
                      )}

                      <p>
                        <b>Total:</b> {usd(result.totalEstimated)}
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT SIDE - HISTORY */}
          <div className="aiscan-right">
            <h2>History</h2>

            <div className="aiscan-history">
              {history.map((est) => {
                const isOpen = expanded === est._id;

                return (
                  <div key={est._id} className="aiscan-history-item-wrapper">
                    <div className="aiscan-history-item">
                      <img src={est.thumbUrl || est.imageUrl} className="aiscan-thumb"/>
                      <div>
                        {Array.isArray(est.selection) ? (
                          <strong>{est.selection .map((s) =>`${s.part} • ${s.defaultOp || s.operation}`) .join(", ")}</strong>) : (
                          <strong>{est.selection?.part} • {est.selection?.operation}</strong>
                        )}
                        <div>{usd(est.totalEstimated)}</div>
                        <div className="aiscan-date">
                          {new Date(est.createdAt).toLocaleString()}
                        </div>
                      </div>

                      {/* ACTION BUTTONS */}
                      <div className="aiscan-actions">
                        <button
                          onClick={() => setExpanded(isOpen ? null : est._id)}
                          className="aiscan-action-btn">{isOpen ? "Hide" : "View"}
                        </button>

                        <button onClick={() => handleDownload(est)} className="aiscan-action-btn">
                          Download
                        </button>

                        <a href={est.imageUrl} target="_blank" rel="noreferrer" className="aiscan-action-btn"> Open Image</a>
                        <button onClick={() => handleDelete(est._id)} className="aiscan-action-btn-danger">
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* DROPDOWN CONTENT */}
                    {isOpen && (
                      <div id={`aiscan-report-${est._id}`} className="aiscan-dropdown">
                        {(est.thumbUrl || est.imageUrl) && (
                          <img src={est.thumbUrl || est.imageUrl} className="aiscan-large-image"/>
                        )}

                        <h4>Breakdown</h4>

                        {Array.isArray(est.breakdown) ? (
                          <table className="aiscan-table">
                            <thead>
                              <tr>
                                <th>Part</th>
                                <th>Op</th>
                                <th>Parts</th>
                                <th>Labor</th>
                                <th>Paint</th>
                                <th>Misc</th>
                                <th>Subtotal</th>
                              </tr>
                            </thead>
                            <tbody>
                              {est.breakdown.map((b, i) => (
                                <tr key={i}>
                                  <td>{b.part}</td>
                                  <td>{b.operation}</td>
                                  <td>{usd(b.parts)}</td>
                                  <td>{b.hours}</td>
                                  <td>{usd(b.paint)}</td>
                                  <td>{usd(b.misc)}</td>
                                  <td>{usd(b.subtotal)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>) : (
                          <table className="aiscan-table">
                            <tbody>
                              <tr>
                                <td>Labor Hours</td>
                                <td>{est.breakdown.laborHours ?? "—"}</td>
                              </tr>
                              <tr>
                                <td>Labor Rate</td>
                                <td>{usd(est.breakdown.laborRate)}</td>
                              </tr>
                              <tr>
                                <td>Parts</td>
                                <td>{usd(est.breakdown.parts)}</td>
                              </tr>
                              <tr>
                                <td>Paint/Materials</td>
                                <td>{usd(est.breakdown.paintMaterials)}</td>
                              </tr>
                              <tr>
                                <td>Misc</td>
                                <td>{usd(est.breakdown.misc)}</td>
                              </tr>
                            </tbody>
                          </table>
                        )}

                        <p>
                          <b>Total:</b> {usd(est.totalEstimated)}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}

              {history.length === 0 && (
                <div className="aiscan-placeholder">
                  No saved estimates yet.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="aiscan-bottom">
          <button className="aiscan-cancelbtn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
